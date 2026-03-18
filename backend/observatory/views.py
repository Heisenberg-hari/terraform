from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from core.logging_utils import log_exception
from .models import Contact

User = get_user_model()


@api_view(['GET'])
def list_contacts(request):
    contacts = Contact.objects.filter(owner=request.user).select_related('contact')
    data = [
        {
            'id': c.id,
            'contact_id': str(c.contact_id),
            'username': c.contact.username,
            'display_name': c.contact.display_name,
            'nickname': c.nickname,
        }
        for c in contacts
    ]
    return Response(data)


@api_view(['GET'])
def search_users(request):
    q = request.query_params.get('q', '').strip()
    if not q:
        return Response([])
    users = User.objects.filter(username__icontains=q).exclude(id=request.user.id)[:20]
    contact_ids = set(Contact.objects.filter(owner=request.user).values_list('contact_id', flat=True))
    return Response([
        {
            'id': str(u.id),
            'username': u.username,
            'display_name': u.display_name,
            'is_contact': u.id in contact_ids,
        }
        for u in users
    ])


@api_view(['POST'])
def add_contact(request):
    try:
        contact_id = request.data.get('contact_id', '').strip()
        nickname = request.data.get('nickname', '').strip()
        if not contact_id:
            return Response({'detail': 'contact_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        contact_user = User.objects.filter(id=contact_id).first()
        if not contact_user:
            return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        if contact_user.id == request.user.id:
            return Response({'detail': 'You cannot add yourself as a contact'}, status=status.HTTP_400_BAD_REQUEST)

        contact, _ = Contact.objects.get_or_create(
            owner=request.user,
            contact=contact_user,
            defaults={'nickname': nickname},
        )
        if nickname and contact.nickname != nickname:
            contact.nickname = nickname
            contact.save(update_fields=['nickname'])

        return Response({
            'id': contact.id,
            'contact_id': str(contact.contact_id),
            'username': contact.contact.username,
            'display_name': contact.contact.display_name,
            'nickname': contact.nickname,
        }, status=status.HTTP_201_CREATED)
    except Exception as exc:
        log_exception(exc, service='backend', module='observatory', function='add_contact', user_id=str(request.user.id))
        return Response({'detail': 'Unable to add contact'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
def remove_contact(request, contact_id):
    deleted, _ = Contact.objects.filter(owner=request.user, contact_id=contact_id).delete()
    if not deleted:
        return Response({'detail': 'Contact not found'}, status=status.HTTP_404_NOT_FOUND)
    return Response(status=status.HTTP_204_NO_CONTENT)
