from rest_framework import serializers
from .models import WorldProfile


class WorldProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorldProfile
        fields = ('owner_id', 'seed', 'biome', 'radius')
