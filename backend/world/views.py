from rest_framework.decorators import api_view
from rest_framework.response import Response
from messaging.models import Message
from .models import WorldProfile
from .serializers import WorldProfileSerializer


@api_view(['GET'])
def terrain_snapshot(request):
    data = [
        {
            'id': str(m.id),
            'terrain_type': m.terrain_type,
            'sentiment_label': m.sentiment_label,
            'elevation': m.elevation,
            'lat': m.latitude,
            'lon': m.longitude,
            'content_preview': m.content[:80],
        }
        for m in Message.objects.filter(receiver=request.user)[:200]
    ]
    return Response({'formations': data})


@api_view(['GET'])
def my_world(request):
    profile, _ = WorldProfile.objects.get_or_create(
        owner_id=request.user.id,
        defaults={
            'seed': request.user.world_seed,
            'biome': request.user.world_biome,
            'radius': request.user.world_radius,
        },
    )
    return Response(WorldProfileSerializer(profile).data)


@api_view(['POST'])
def regenerate_world(request):
    profile, _ = WorldProfile.objects.get_or_create(
        owner_id=request.user.id,
        defaults={
            'seed': request.user.world_seed,
            'biome': request.user.world_biome,
            'radius': request.user.world_radius,
        },
    )
    profile.seed = request.user.world_seed
    profile.biome = request.user.world_biome
    profile.radius = request.user.world_radius
    profile.save(update_fields=['seed', 'biome', 'radius'])
    return Response(WorldProfileSerializer(profile).data)
