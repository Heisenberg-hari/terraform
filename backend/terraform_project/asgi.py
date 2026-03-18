import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'terraform_project.settings')

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
from messaging.routing import websocket_urlpatterns
from terraform_project.jwt_ws_auth import JWTAuthMiddlewareStack

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter(
    {
        'http': django_asgi_app,
        'websocket': JWTAuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
    }
)
