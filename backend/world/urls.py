from django.urls import path
from .views import my_world, regenerate_world, terrain_snapshot

urlpatterns = [
    path('snapshot/', terrain_snapshot, name='terrain_snapshot'),
    path('me/', my_world, name='my_world'),
    path('regenerate/', regenerate_world, name='regenerate_world'),
]
