from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from core.logging_utils import log_exception
from .models import Message
from .serializers import MessageSerializer
from .services.nlp import analyze_sentiment, compute_coordinates

User = get_user_model()


def _message_payload(msg):
    return {
        'id': str(msg.id),
        'sender_id': str(msg.sender_id),
        'receiver_id': str(msg.receiver_id),
        'content_preview': msg.content[:80],
        'sentiment_label': msg.sentiment_label,
        'terrain_type': msg.terrain_type,
        'delivered_at': msg.delivered_at.isoformat() if msg.delivered_at else None,
        'is_read': msg.is_read,
        'read_at': msg.read_at.isoformat() if msg.read_at else None,
        'elevation': msg.elevation,
        'lat': msg.latitude,
        'lon': msg.longitude,
        'created_at': msg.created_at.isoformat(),
    }


@api_view(['GET'])
def list_messages(request):
    queryset = Message.objects.filter(receiver=request.user).select_related('sender', 'receiver')
    serializer = MessageSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def list_sent_messages(request):
    queryset = Message.objects.filter(sender=request.user).select_related('sender', 'receiver')
    serializer = MessageSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def send_message(request):
    try:
        content = (request.data.get('content') or '').strip()
        receiver_id = (request.data.get('receiver') or '').strip()
        receiver_username = (request.data.get('receiver_username') or '').strip()

        if not content:
            return Response({'detail': 'content is required'}, status=status.HTTP_400_BAD_REQUEST)
        if not receiver_id and not receiver_username:
            return Response({'detail': 'receiver or receiver_username is required'}, status=status.HTTP_400_BAD_REQUEST)

        receiver = None
        if receiver_id:
            receiver = User.objects.filter(id=receiver_id).first()
        if receiver is None and receiver_username:
            receiver = User.objects.filter(username=receiver_username).first()
        if receiver is None:
            return Response({'detail': 'Receiver not found'}, status=status.HTTP_404_NOT_FOUND)

        sentiment_label, terrain_type, elevation = analyze_sentiment(content)
        latitude, longitude = compute_coordinates(content)

        msg = Message.objects.create(
            sender=request.user,
            receiver=receiver,
            content=content,
            sentiment_label=sentiment_label,
            terrain_type=terrain_type,
            elevation=elevation,
            latitude=latitude,
            longitude=longitude,
        )

        channel_layer = get_channel_layer()
        if channel_layer is not None:
            if receiver.is_online and msg.delivered_at is None:
                msg.delivered_at = timezone.now()
                msg.save(update_fields=['delivered_at'])

            async_to_sync(channel_layer.group_send)(
                f'user_{receiver.id}',
                {
                    'type': 'message.push',
                    'message': _message_payload(msg),
                },
            )

            if msg.delivered_at is not None:
                async_to_sync(channel_layer.group_send)(
                    f'user_{msg.sender_id}',
                    {
                        'type': 'message.delivered',
                        'message': {
                            'id': str(msg.id),
                            'receiver_id': str(receiver.id),
                            'delivered_at': msg.delivered_at.isoformat(),
                        },
                    },
                )

        return Response(MessageSerializer(msg).data, status=status.HTTP_201_CREATED)
    except Exception as exc:
        log_exception(exc, service='backend', module='messaging', function='send_message', user_id=str(request.user.id))
        return Response({'detail': 'Unable to send message'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def mark_read(request, message_id):
    try:
        msg = Message.objects.get(id=message_id, receiver=request.user)
        if msg.is_read:
            return Response({'status': 'ok', 'already_read': True})

        msg.is_read = True
        msg.read_at = timezone.now()
        msg.save(update_fields=['is_read', 'read_at'])

        channel_layer = get_channel_layer()
        if channel_layer is not None:
            async_to_sync(channel_layer.group_send)(
                f'user_{msg.sender_id}',
                {
                    'type': 'message.read',
                    'message': {
                        'id': str(msg.id),
                        'reader_id': str(request.user.id),
                        'read_at': msg.read_at.isoformat(),
                    },
                },
            )

        return Response({'status': 'ok', 'read_at': msg.read_at.isoformat()})
    except Message.DoesNotExist:
        return Response({'detail': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        log_exception(exc, service='backend', module='messaging', function='mark_read', user_id=str(request.user.id))
        return Response({'detail': 'Unable to update message'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
