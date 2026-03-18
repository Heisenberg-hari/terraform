from django.conf import settings
from django.db import models


class Contact(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='contacts')
    contact = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='in_contacts')
    nickname = models.CharField(max_length=100, blank=True)

    class Meta:
        unique_together = ('owner', 'contact')
