import random

from django.db.models.signals import post_save
from django.dispatch import receiver

from world.models import WorldProfile
from .models import User


@receiver(post_save, sender=User)
def bootstrap_user_world(sender, instance: User, created: bool, **kwargs):
    if not created:
        return

    if instance.world_seed == 1337:
        instance.world_seed = random.randint(1, 2_147_483_647)
        instance.save(update_fields=['world_seed'])

    WorldProfile.objects.get_or_create(
        owner_id=instance.id,
        defaults={
            'seed': instance.world_seed,
            'biome': instance.world_biome,
            'radius': instance.world_radius,
        },
    )
