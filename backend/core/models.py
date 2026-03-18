import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    display_name = models.CharField(max_length=100, blank=True)
    avatar_color = models.CharField(max_length=7, default='#4FC3F7')
    world_seed = models.IntegerField(default=1337)
    world_biome = models.CharField(max_length=30, default='TEMPERATE')
    world_capacity = models.IntegerField(default=500)
    world_radius = models.FloatField(default=1000.0)
    is_online = models.BooleanField(default=False)

    class Meta:
        db_table = 'users'
