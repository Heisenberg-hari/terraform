from django.contrib import admin
from django.urls import include, path
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response({'status': 'ok'})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', HealthView.as_view()),
    path('api/core/', include('core.urls')),
    path('api/messages/', include('messaging.urls')),
    path('api/world/', include('world.urls')),
    path('api/observatory/', include('observatory.urls')),
]
