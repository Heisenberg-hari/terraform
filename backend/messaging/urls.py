from django.urls import path
from .views import list_messages, list_sent_messages, mark_read, send_message

urlpatterns = [
    path('', list_messages, name='list_messages'),
    path('sent/', list_sent_messages, name='list_sent_messages'),
    path('send/', send_message, name='send_message'),
    path('<uuid:message_id>/read/', mark_read, name='mark_read'),
]
