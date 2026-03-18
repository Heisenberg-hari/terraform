from django.urls import path
from .views import add_contact, list_contacts, remove_contact, search_users

urlpatterns = [
    path('contacts/', list_contacts, name='list_contacts'),
    path('contacts/add/', add_contact, name='add_contact'),
    path('contacts/<uuid:contact_id>/', remove_contact, name='remove_contact'),
    path('search/', search_users, name='search_users'),
]
