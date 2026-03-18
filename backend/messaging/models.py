import uuid
from django.conf import settings
from django.db import models


class Message(models.Model):
    TERRAIN_CHOICES = (
        ('VOLCANO', 'VOLCANO'),
        ('MEADOW', 'MEADOW'),
        ('RIDGE', 'RIDGE'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_messages')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    sentiment_label = models.CharField(max_length=20, default='NEUTRAL')
    terrain_type = models.CharField(max_length=30, choices=TERRAIN_CHOICES, default='MEADOW')
    elevation = models.FloatField(default=10.0)
    latitude = models.FloatField(default=0.0)
    longitude = models.FloatField(default=0.0)

    class Meta:
        ordering = ['-created_at']
