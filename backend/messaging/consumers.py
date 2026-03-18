from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth import get_user_model
from django.utils import timezone


def user_group(user_id):
    return f'user_{user_id}'


def presence_group(user_id):
    return f'presence_{user_id}'


class RealtimeConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get('user')
        if not user or not getattr(user, 'is_authenticated', False):
            await self.close(code=4401)
            return

        self.user = user
        self.subscribed_presence_groups = set()

        await self.channel_layer.group_add(user_group(self.user.id), self.channel_name)
        await self.channel_layer.group_add(presence_group(self.user.id), self.channel_name)

        await self.accept()
        await self._set_online(True)

        await self.send_json({
            'type': 'realtime.ready',
            'user_id': str(self.user.id),
        })
        await self._flush_pending_deliveries()

    async def disconnect(self, close_code):
        if hasattr(self, 'user') and self.user:
            await self._set_online(False)
            await self.channel_layer.group_discard(user_group(self.user.id), self.channel_name)
            await self.channel_layer.group_discard(presence_group(self.user.id), self.channel_name)

        for group in getattr(self, 'subscribed_presence_groups', set()):
            await self.channel_layer.group_discard(group, self.channel_name)

    async def receive_json(self, content, **kwargs):
        msg_type = content.get('type')
        if msg_type == 'presence.subscribe':
            user_ids = content.get('user_ids', [])
            if not isinstance(user_ids, list):
                return

            sanitized_ids = [str(uid) for uid in user_ids if uid]
            next_groups = {presence_group(uid) for uid in sanitized_ids}

            for group in next_groups - self.subscribed_presence_groups:
                await self.channel_layer.group_add(group, self.channel_name)
            for group in self.subscribed_presence_groups - next_groups:
                await self.channel_layer.group_discard(group, self.channel_name)

            self.subscribed_presence_groups = next_groups
            snapshot = await self._presence_snapshot(sanitized_ids)
            await self.send_json({'type': 'presence.snapshot', 'users': snapshot})
        elif msg_type in ('typing.start', 'typing.stop'):
            target_user_id = content.get('target_user_id')
            target_username = content.get('target_username')
            resolved_target = await self._resolve_target_user_id(target_user_id, target_username)
            if not resolved_target:
                return
            await self.channel_layer.group_send(
                user_group(resolved_target),
                {
                    'type': 'typing.update',
                    'typing': {
                        'from_user_id': str(self.user.id),
                        'is_typing': msg_type == 'typing.start',
                    },
                },
            )

    async def message_push(self, event):
        await self.send_json({
            'type': 'message.received',
            'message': event['message'],
        })

    async def presence_update(self, event):
        await self.send_json({
            'type': 'presence.update',
            'user': event['user'],
        })

    async def message_read(self, event):
        await self.send_json({
            'type': 'message.read',
            'message': event['message'],
        })

    async def message_delivered(self, event):
        await self.send_json({
            'type': 'message.delivered',
            'message': event['message'],
        })

    async def typing_update(self, event):
        await self.send_json(
            {
                'type': 'typing.update',
                'typing': event['typing'],
            }
        )

    async def _set_online(self, is_online: bool):
        await self._update_user_online(is_online)
        await self.channel_layer.group_send(
            presence_group(self.user.id),
            {
                'type': 'presence.update',
                'user': {
                    'id': str(self.user.id),
                    'is_online': is_online,
                },
            },
        )

    @database_sync_to_async
    def _update_user_online(self, is_online):
        User = get_user_model()
        User.objects.filter(id=self.user.id).update(is_online=is_online)

    @database_sync_to_async
    def _presence_snapshot(self, user_ids):
        User = get_user_model()
        if not user_ids:
            return []
        rows = User.objects.filter(id__in=user_ids).values('id', 'is_online')
        return [{'id': str(r['id']), 'is_online': bool(r['is_online'])} for r in rows]

    async def _flush_pending_deliveries(self):
        pending = await self._get_pending_for_user()
        for msg in pending:
            await self.send_json(
                {
                    'type': 'message.received',
                    'message': {
                        'id': str(msg['id']),
                        'sender_id': str(msg['sender_id']),
                        'receiver_id': str(msg['receiver_id']),
                        'content_preview': msg['content'][:80],
                        'sentiment_label': msg['sentiment_label'],
                        'terrain_type': msg['terrain_type'],
                        'delivered_at': msg['delivered_at'],
                        'is_read': msg['is_read'],
                        'read_at': msg['read_at'],
                        'elevation': msg['elevation'],
                        'lat': msg['latitude'],
                        'lon': msg['longitude'],
                        'created_at': msg['created_at'],
                    },
                }
            )
            await self.channel_layer.group_send(
                user_group(msg['sender_id']),
                {
                    'type': 'message.delivered',
                    'message': {
                        'id': str(msg['id']),
                        'receiver_id': str(msg['receiver_id']),
                        'delivered_at': msg['delivered_at'],
                    },
                },
            )

    @database_sync_to_async
    def _get_pending_for_user(self):
        from messaging.models import Message

        now = timezone.now()
        pending_qs = Message.objects.filter(receiver_id=self.user.id, delivered_at__isnull=True)
        pending_ids = list(pending_qs.values_list('id', flat=True))
        if pending_ids:
            Message.objects.filter(id__in=pending_ids).update(delivered_at=now)

        pending = Message.objects.filter(id__in=pending_ids).values(
            'id',
            'sender_id',
            'receiver_id',
            'content',
            'sentiment_label',
            'terrain_type',
            'delivered_at',
            'is_read',
            'read_at',
            'elevation',
            'latitude',
            'longitude',
            'created_at',
        )
        return [
            {
                **row,
                'delivered_at': row['delivered_at'].isoformat() if row['delivered_at'] else None,
                'read_at': row['read_at'].isoformat() if row['read_at'] else None,
                'created_at': row['created_at'].isoformat() if row['created_at'] else None,
            }
            for row in pending
        ]

    @database_sync_to_async
    def _resolve_target_user_id(self, target_user_id, target_username):
        User = get_user_model()
        if target_user_id:
            user = User.objects.filter(id=target_user_id).values('id').first()
            return str(user['id']) if user else None
        if target_username:
            user = User.objects.filter(username=target_username).values('id').first()
            return str(user['id']) if user else None
        return None
