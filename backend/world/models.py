from django.db import models


class WorldProfile(models.Model):
    owner_id = models.UUIDField(unique=True)
    seed = models.IntegerField(default=1337)
    biome = models.CharField(max_length=30, default='TEMPERATE')
    radius = models.FloatField(default=1000.0)

    def __str__(self):
        return f'WorldProfile<{self.owner_id}>'
