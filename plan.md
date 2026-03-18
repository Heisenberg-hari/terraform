# 🌍 TerraForm — The Geospatial Messaging Platform

> *"Don't just read your messages. Explore them."*

A radical reimagining of messaging where every user owns a procedurally generated planet. Messages become mountains, valleys, and volcanoes — explored in first-person 3D.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Phase 1 — Project Scaffolding & DevOps](#2-phase-1--project-scaffolding--devops)
3. [Phase 2 — Database & PostGIS Foundation](#3-phase-2--database--postgis-foundation)
4. [Phase 3 — Authentication & World Genesis](#4-phase-3--authentication--world-genesis)
5. [Phase 4 — Backend API & NLP Engine](#5-phase-4--backend-api--nlp-engine)
6. [Phase 5 — Real-Time Infrastructure](#6-phase-5--real-time-infrastructure)
7. [Phase 6 — 3D World Engine (Frontend)](#7-phase-6--3d-world-engine-frontend)
8. [Phase 7 — Terrain & Message Visualization](#8-phase-7--terrain--message-visualization)
9. [Phase 8 — Player Controller & Physics](#9-phase-8--player-controller--physics)
10. [Phase 9 — The Observatory & Transmission](#10-phase-9--the-observatory--transmission)
11. [Phase 10 — Reading, Interacting & Weathering](#11-phase-10--reading-interacting--weathering)
12. [Phase 11 — Atmosphere, Audio & Polish](#12-phase-11--atmosphere-audio--polish)
13. [Phase 12 — Anti-Spam, Moderation & Security](#13-phase-12--anti-spam-moderation--security)
14. [Phase 13 — Performance & Optimization](#14-phase-13--performance--optimization)
15. [Phase 14 — Testing & QA](#15-phase-14--testing--qa)
16. [Phase 15 — Deployment](#16-phase-15--deployment)
17. [Phase 16 — Micro-Animations & Interaction Design Guide](#17-phase-16--micro-animations--interaction-design-guide)
18. [Improvised Features — Beyond the Original Vision](#18-improvised-features--beyond-the-original-vision)
19. [Error Logging Strategy](#19-error-logging-strategy)
20. [File & Folder Structure](#20-file--folder-structure)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│  React 18 + React-Three-Fiber + Drei + Rapier Physics + Zustand │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────────────┐  │
│  │ 3D World │  │ HUD/UI   │  │ WebSocket │  │ Audio Engine  │  │
│  │ Engine   │  │ Overlays │  │ Client    │  │ (Howler.js)   │  │
│  └──────────┘  └──────────┘  └───────────┘  └───────────────┘  │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTPS / WSS
┌──────────────────────▼──────────────────────────────────────────┐
│                     BACKEND (Python)                            │
│  Django + Channels + Django REST Framework + Celery Workers      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │ REST API │  │ WS Hub   │  │ NLP/     │  │ GeoCompute    │   │
│  │ Routes   │  │ Manager  │  │ Sentiment│  │ (PostGIS)     │   │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘   │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                     DATA LAYER                                  │
│  PostgreSQL 16 + PostGIS 3.4 │ Redis (Cache/PubSub) │ S3/Minio │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend Framework** | React 18 + Vite | UI overlays, state management |
| **3D Engine** | Three.js via React-Three-Fiber | World rendering |
| **3D Helpers** | Drei, three-stdlib | Camera, controls, shaders |
| **Physics** | @react-three/rapier (Rapier3D WASM) | Collision, gravity, player movement |
| **State** | Zustand | Global reactive state |
| **Audio** | Howler.js + Web Audio API | Spatial 3D sound |
| **Backend** | Django 5.1 + DRF + Channels (Python 3.12) | REST + WebSocket API |
| **Task Queue** | Celery + Redis | Async NLP processing |
| **NLP** | Transformers (HuggingFace) + VADER | Sentiment analysis |
| **Database** | PostgreSQL 16 + PostGIS 3.4 | Geospatial message storage |
| **Cache/PubSub** | Redis 7 | Session cache, real-time pub/sub |
| **Object Storage** | MinIO / AWS S3 | Attachments, textures |
| **Auth** | Django Auth + djangorestframework-simplejwt + Argon2 | Session + JWT auth |
| **Deployment** | Docker Compose → Kubernetes | Container orchestration |

---

## 2. Phase 1 — Project Scaffolding & DevOps

### Step 1.1: Initialize Monorepo

```bash
mkdir terraform-app && cd terraform-app
mkdir backend frontend infra docs
git init
```

### Step 1.2: Backend Setup (Django)

```bash
cd backend
python -m venv venv
# Activate venv (Windows: venv\Scripts\activate)
pip install django djangorestframework djangorestframework-simplejwt \
  django-channels channels-redis daphne django-contrib-gis \
  psycopg2-binary django-cors-headers django-filter \
  argon2-cffi python-dotenv celery[redis] redis \
  transformers torch vaderSentiment shapely \
  pytest pytest-django pytest-asyncio
```

Initialize the Django project:

```bash
django-admin startproject terraform_project .
python manage.py startapp core        # Users, auth, shared models
python manage.py startapp messaging    # Messages, geodata, NLP
python manage.py startapp world        # World generation, terrain
python manage.py startapp observatory  # Contacts, search
```

Create `backend/` structure:

```
backend/
├── terraform_project/
│   ├── __init__.py
│   ├── settings.py           # Django settings (DB, channels, DRF, etc.)
│   ├── urls.py               # Root URL configuration
│   ├── asgi.py               # ASGI entry point (Daphne + Channels)
│   └── wsgi.py               # WSGI fallback
├── core/
│   ├── models.py             # User model (extends AbstractUser)
│   ├── serializers.py        # DRF serializers for auth
│   ├── views.py              # Registration, login, JWT views
│   ├── urls.py               # Auth URL routes
│   ├── backends.py           # Custom Argon2 auth backend
│   └── admin.py              # Django admin customization
├── messaging/
│   ├── models.py             # Message + MessageGeodata models
│   ├── serializers.py        # DRF serializers for messages
│   ├── views.py              # Send, read, list, spatial query views
│   ├── urls.py               # Message URL routes
│   ├── consumers.py          # Django Channels WebSocket consumers
│   ├── routing.py            # WebSocket URL routing
│   ├── services/
│   │   ├── nlp.py            # Sentiment analysis engine
│   │   └── geocompute.py     # Coordinate & elevation calculator
│   └── tasks.py              # Celery async tasks
├── world/
│   ├── models.py             # World config models (if needed)
│   ├── serializers.py        # DRF serializers for terrain data
│   ├── views.py              # World seed, terrain data views
│   └── urls.py               # World URL routes
├── observatory/
│   ├── models.py             # Contact model
│   ├── serializers.py        # DRF serializers for contacts
│   ├── views.py              # Contact list, search views
│   └── urls.py               # Contact URL routes
├── templates/                # Django templates (admin, email, etc.)
├── tests/
│   ├── test_auth.py
│   ├── test_messages.py
│   ├── test_nlp.py
│   └── test_websocket.py
├── manage.py
├── requirements.txt
└── Dockerfile
```

### Step 1.3: Frontend Setup (Vite + React)

```bash
cd frontend
npx -y create-vite@latest ./ --template react
npm install three @react-three/fiber @react-three/drei @react-three/rapier \
  zustand simplex-noise howler three-stdlib socket.io-client \
  @react-three/postprocessing leva gsap
```

### Step 1.4: Docker Compose

Create `infra/docker-compose.yml` with services for:
- `postgres` (PostGIS image: `postgis/postgis:16-3.4`)
- `redis` (Redis 7 Alpine)
- `minio` (Object storage)
- `backend` (Django + Daphne ASGI server)
- `celery-worker` (Celery process)
- `celery-beat` (Celery Beat scheduler)
- `frontend` (Vite dev server)

### Step 1.5: Environment Configuration

Create `.env.example`:
```env
DJANGO_SECRET_KEY=your-django-secret-key
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgis://terraform:secret@localhost:5432/terraform_db
REDIS_URL=redis://localhost:6379/0
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
SENTIMENT_MODEL=nlptown/bert-base-multilingual-uncased-sentiment
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### Step 1.6: Django Settings Configuration

Key settings in `terraform_project/settings.py`:

```python
# INSTALLED_APPS
INSTALLED_APPS = [
    'daphne',                      # ASGI server (must be first)
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.gis',          # GeoDjango (PostGIS support)
    'rest_framework',              # Django REST Framework
    'rest_framework_simplejwt',    # JWT authentication
    'corsheaders',                 # CORS for frontend
    'channels',                    # Django Channels (WebSockets)
    'django_filters',              # API filtering
    'core',
    'messaging',
    'world',
    'observatory',
]

# DATABASE — Use PostGIS engine
DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': 'terraform_db',
        'USER': 'terraform',
        'PASSWORD': 'secret',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

# ASGI + Channels
ASGI_APPLICATION = 'terraform_project.asgi.application'
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {'hosts': [('localhost', 6379)]},
    },
}

# DRF Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
}

# Custom User Model
AUTH_USER_MODEL = 'core.User'

# Argon2 as default password hasher
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
]
```

---

## 3. Phase 2 — Database & PostGIS Foundation

### Step 2.1: Enable PostGIS

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For username fuzzy search
```

### Step 2.2: Django Models (GeoDjango ORM)

**`core/models.py`** — Custom User Model

```python
import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    display_name = models.CharField(max_length=100, blank=True)
    avatar_color = models.CharField(max_length=7, default='#4FC3F7')   # Hex color for star
    world_seed = models.IntegerField()                                  # Perlin noise seed
    world_biome = models.CharField(max_length=30, default='TEMPERATE')  # Base biome theme
    world_capacity = models.IntegerField(default=500)                   # Max messages before erosion
    world_radius = models.FloatField(default=1000.0)                    # Planet radius in units
    is_online = models.BooleanField(default=False)

    class Meta:
        db_table = 'users'
        indexes = [
            models.Index(fields=['username']),
        ]
```

**`messaging/models.py`** — Message + Geodata

```python
import uuid
from django.contrib.gis.db import models as gis_models
from django.db import models
from django.contrib.postgres.fields import ArrayField
from core.models import User

class Message(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    content = models.TextField()
    subject = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    thread_id = models.UUIDField(null=True, blank=True)                    # For reply chains
    parent = models.ForeignKey('self', null=True, blank=True,
                               on_delete=models.SET_NULL, related_name='replies')
    attachment_urls = ArrayField(models.URLField(), default=list, blank=True)

    class Meta:
        db_table = 'messages'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['receiver', 'is_read']),
            models.Index(fields=['thread_id']),
        ]


class MessageGeodata(models.Model):
    """The Core Innovation — messages as geographic objects."""
    message = models.OneToOneField(Message, on_delete=models.CASCADE,
                                   primary_key=True, related_name='geodata')
    geom = gis_models.PointField(srid=4326)                        # PostGIS Point
    elevation = models.FloatField()                                 # Height of formation
    base_radius = models.FloatField(default=5.0)                    # Footprint radius
    terrain_type = models.CharField(max_length=30)                  # VOLCANO, MEADOW, etc.
    sentiment_score = models.FloatField(null=True)                  # -1.0 to 1.0
    sentiment_label = models.CharField(max_length=20, blank=True)   # ANGRY, HAPPY, etc.
    color_primary = models.CharField(max_length=7, blank=True)      # Hex: main color
    color_secondary = models.CharField(max_length=7, blank=True)    # Hex: accent color
    particle_effect = models.CharField(max_length=30, default='NONE')  # SMOKE, SPARKLE, etc.
    glow_intensity = models.FloatField(default=1.0)                 # Beacon pulse strength
    weather_zone = models.CharField(max_length=20, default='CLEAR') # Local weather override
    erosion_level = models.IntegerField(default=0)                  # 0=fresh, 10=fully eroded

    class Meta:
        db_table = 'message_geodata'
```

### Step 2.3: PostGIS Indexes & Spatial Queries

```sql
CREATE INDEX idx_geodata_geom ON message_geodata USING GIST (geom);
CREATE INDEX idx_messages_receiver ON messages (receiver_id, is_read);
CREATE INDEX idx_messages_thread ON messages (thread_id);
```

Key spatial query — using Django ORM with GeoDjango:
```python
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from messaging.models import Message, MessageGeodata

# Get all messages within render distance
player_location = Point(player_lng, player_lat, srid=4326)

nearby_messages = Message.objects.filter(
    receiver=user,
    geodata__geom__dwithin=(player_location, D(m=radius))
).select_related('geodata').order_by(
    # Order by distance from player
    'geodata__geom'  # Use annotation for precise ordering
)
```

You can also use raw spatial queries for complex operations:
```python
from django.contrib.gis.db.models.functions import Distance

nearby = MessageGeodata.objects.filter(
    message__receiver=user,
    geom__dwithin=(player_location, D(m=radius))
).annotate(
    distance=Distance('geom', player_location)
).order_by('distance')
```

### Step 2.4: Django Migrations

```bash
python manage.py makemigrations core messaging world observatory
python manage.py migrate
python manage.py createsuperuser  # Create admin account
```

---

## 4. Phase 3 — Authentication & World Genesis

### Step 3.1: Registration Flow

1. User submits `username`, `email`, `password`.
2. Django's `User.objects.create_user()` automatically hashes with Argon2id (configured in `PASSWORD_HASHERS`).
3. Override the `save()` method or use a signal to generate a random `world_seed` (32-bit integer).
4. Assign a random `world_biome` from: `TEMPERATE`, `DESERT`, `ARCTIC`, `VOLCANIC`, `OCEANIC`.
5. Insert user record → return JWT token pair (access + refresh) via `djangorestframework-simplejwt`.

### Step 3.2: Login — "The Descent"

1. Validate credentials → issue JWT.
2. Return the user's `world_seed`, `world_biome`, and `world_radius`.
3. **Frontend animation sequence**:
   - Show starfield with slowly rotating camera.
   - Identify the user's planet (a glowing sphere among stars).
   - Camera accelerates toward the planet — atmospheric entry effects (glow, shake, heat distortion via post-processing bloom + chromatic aberration).
   - Camera punches through clouds → terrain fades in → land gently on the surface.
   - Transition from cinematic camera to first-person `PointerLockControls`.

### Step 3.3: JWT Authentication (DRF + SimpleJWT)

```python
# core/views.py — Registration + JWT
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import RegisterSerializer, UserSerializer

class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'world': {
                'seed': user.world_seed,
                'biome': user.world_biome,
                'radius': user.world_radius,
            }
        }, status=status.HTTP_201_CREATED)
```

```python
# core/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
```

All DRF views are automatically protected via the `DEFAULT_AUTHENTICATION_CLASSES` setting. No custom middleware needed — `request.user` is auto-populated by DRF's JWT backend.

---

## 5. Phase 4 — Backend API & NLP Engine

### Step 4.1: Sentiment Analysis Pipeline

Use a hybrid approach for accuracy + speed:

```python
# messaging/services/nlp.py
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from transformers import pipeline
from django.conf import settings

vader = SentimentIntensityAnalyzer()
bert_sentiment = pipeline("sentiment-analysis",
                          model=settings.SENTIMENT_MODEL)

def analyze_message(text: str) -> dict:
    # VADER for speed (rule-based)
    vader_scores = vader.polarity_scores(text)

    # BERT for accuracy (transformer-based) — run async via Celery
    bert_result = bert_sentiment(text[:512])

    # Weighted blend: 40% VADER, 60% BERT
    compound = vader_scores["compound"] * 0.4 + normalize_bert(bert_result) * 0.6

    label = classify_sentiment(compound)
    terrain = map_sentiment_to_terrain(label)

    return {
        "score": compound,              # -1.0 to 1.0
        "label": label,                 # ANGRY, HAPPY, SAD, NEUTRAL, EXCITED
        "terrain_type": terrain,         # VOLCANO, MEADOW, ICE_SPIRE, MESA, etc.
        "color_primary": TERRAIN_COLORS[terrain]["primary"],
        "color_secondary": TERRAIN_COLORS[terrain]["secondary"],
        "particle_effect": TERRAIN_PARTICLES[terrain],
    }
```

### Step 4.2: Terrain Mapping Table

| Sentiment | Score Range | Terrain Type | Primary Color | Particle | Weather |
|-----------|-----------|--------------|---------------|----------|---------|
| **Ecstatic** | 0.8 → 1.0 | `CRYSTAL_PEAK` | `#FFD700` | `SPARKLE` | `AURORA` |
| **Happy** | 0.4 → 0.8 | `MEADOW` | `#4CAF50` | `FIREFLY` | `CLEAR` |
| **Neutral** | -0.2 → 0.4 | `MESA` | `#9E9E9E` | `NONE` | `CLEAR` |
| **Sad** | -0.6 → -0.2 | `ICE_SPIRE` | `#64B5F6` | `SNOW` | `OVERCAST` |
| **Angry** | -1.0 → -0.6 | `VOLCANO` | `#F44336` | `SMOKE` | `STORM` |
| **Excited** | 0.6 → 0.8 | `GEYSER_FIELD` | `#FF9800` | `STEAM` | `WINDY` |

### Step 4.3: Geo-Coordinate Calculation

```python
# messaging/services/geocompute.py
import math, hashlib
from django.contrib.gis.geos import Point

def compute_message_position(user_seed: int, message_id: str,
                             world_radius: float) -> Point:
    """Returns a GeoDjango Point for PostGIS storage."""
    hash_input = f"{user_seed}-{message_id}"
    h = int(hashlib.sha256(hash_input.encode()).hexdigest(), 16)

    # Spherical coordinates → lat/lng
    lat = ((h % 180000) / 1000.0) - 90.0   # -90 to 90
    lng = (((h >> 20) % 360000) / 1000.0) - 180.0  # -180 to 180

    return Point(lng, lat, srid=4326)  # GeoDjango Point object

def compute_elevation(text: str) -> float:
    word_count = len(text.split())
    # Logarithmic scaling so huge emails don't break the world
    return min(5.0 + math.log2(max(word_count, 1)) * 8.0, 200.0)
```

### Step 4.4: API Endpoints (Django REST Framework)

| Method | Endpoint | DRF View | Description |
|--------|---------|----------|-------------|
| `POST` | `/api/auth/register/` | `RegisterView` | Create account + world |
| `POST` | `/api/auth/login/` | `TokenObtainPairView` | Authenticate → JWT pair |
| `POST` | `/api/auth/token/refresh/` | `TokenRefreshView` | Refresh access token |
| `GET` | `/api/world/terrain/` | `TerrainListView` | All message geodata for user |
| `GET` | `/api/world/nearby/?lat=&lng=&radius=` | `NearbyTerrainView` | Spatial query: messages in view |
| `POST` | `/api/messages/send/` | `MessageSendView` | Send → NLP → geodata → WS push |
| `GET` | `/api/messages/<uuid:pk>/` | `MessageDetailView` | Get single message content |
| `PATCH` | `/api/messages/<uuid:pk>/read/` | `MessageReadView` | Mark as read → update glow |
| `GET` | `/api/contacts/` | `ContactListView` | List saved contacts |
| `POST` | `/api/contacts/` | `ContactCreateView` | Add a contact |
| `GET` | `/api/contacts/search/?q=` | `ContactSearchView` | Fuzzy search users |
| `GET` | `/api/stats/mood/` | `MoodStatsView` | Aggregate sentiment → sky mood |

```python
# terraform_project/urls.py — Root URL Configuration
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('core.urls')),
    path('api/messages/', include('messaging.urls')),
    path('api/world/', include('world.urls')),
    path('api/contacts/', include('observatory.urls')),
]
```

---

## 6. Phase 5 — Real-Time Infrastructure

### Step 5.1: Django Channels WebSocket Consumer

```python
# messaging/consumers.py
import json
from channels.generic.websocket import AsyncJsonWebSocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from core.models import User

class TerraFormConsumer(AsyncJsonWebSocketConsumer):
    async def connect(self):
        # Authenticate via JWT token in query string
        token = self.scope['query_string'].decode().split('token=')[-1]
        try:
            access = AccessToken(token)
            self.user_id = str(access['user_id'])
            # Join user's personal channel group
            await self.channel_layer.group_add(
                f'user_{self.user_id}', self.channel_name
            )
            await self.accept()
            await self.update_online_status(True)
        except Exception:
            await self.close()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(
            f'user_{self.user_id}', self.channel_name
        )
        await self.update_online_status(False)

    async def receive_json(self, content):
        event_type = content.get('type')
        if event_type == 'message_read':
            await self.handle_message_read(content['message_id'])

    # Handler for server-pushed events
    async def terrain_event(self, event):
        await self.send_json(event['data'])

    @database_sync_to_async
    def update_online_status(self, is_online):
        User.objects.filter(id=self.user_id).update(is_online=is_online)
```

```python
# messaging/routing.py
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/terraform/$', consumers.TerraFormConsumer.as_asgi()),
]
```

```python
# terraform_project/asgi.py
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from messaging.routing import websocket_urlpatterns

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'terraform_project.settings')

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})
```

### Step 5.2: Real-Time Events

| Event | Direction | Payload | Visual Effect |
|-------|----------|---------|---------------|
| `METEOR_INCOMING` | Server → Client | `{message_id, direction, eta}` | Fireball streak across sky |
| `TERRAIN_RISE` | Server → Client | `{geodata}` | Mountain/volcano rising animation |
| `EARTHQUAKE` | Server → Client | `{intensity, epicenter}` | Screen shake + crack effects |
| `MESSAGE_READ` | Client → Server | `{message_id}` | Glow fades, moss begins |
| `USER_ONLINE` | Server → Client | `{user_id, username}` | Star brightens in Observatory |
| `USER_OFFLINE` | Server → Client | `{user_id}` | Star dims |
| `WORLD_MOOD_UPDATE` | Server → Client | `{mood, sky_color}` | Sky gradient transition |

### Step 5.3: Message Send Flow (Complete Pipeline)

```
User A types message
    → POST /api/messages/send/  (DRF ViewSet)
    → Celery task: analyze sentiment (BERT + VADER)
    → Compute geo-coordinates + elevation
    → Message.objects.create() + MessageGeodata.objects.create()
    → channel_layer.group_send(f'user_{receiver_id}', ...)
    → Django Channels pushes to WebSocket consumer
    → Push METEOR_INCOMING to User B
    → 3-second delay (via Celery countdown)
    → Push TERRAIN_RISE with full geodata
    → Push EARTHQUAKE if sentiment < -0.5
    → User B's world updates in real-time
```

```python
# messaging/tasks.py — Celery task for async message processing
from celery import shared_task
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

@shared_task
def process_message(message_id):
    from messaging.models import Message, MessageGeodata
    from messaging.services.nlp import analyze_message
    from messaging.services.geocompute import compute_message_position, compute_elevation

    message = Message.objects.select_related('receiver').get(id=message_id)
    analysis = analyze_message(message.content)
    position = compute_message_position(
        message.receiver.world_seed, str(message.id), message.receiver.world_radius
    )
    elevation = compute_elevation(message.content)

    geodata = MessageGeodata.objects.create(
        message=message,
        geom=position,
        elevation=elevation,
        terrain_type=analysis['terrain_type'],
        sentiment_score=analysis['score'],
        sentiment_label=analysis['label'],
        color_primary=analysis['color_primary'],
        color_secondary=analysis['color_secondary'],
        particle_effect=analysis['particle_effect'],
    )

    # Push real-time event via Django Channels
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'user_{message.receiver_id}',
        {
            'type': 'terrain_event',
            'data': {
                'event': 'METEOR_INCOMING',
                'message_id': str(message.id),
                'terrain_type': analysis['terrain_type'],
                'elevation': elevation,
                'position': {'lat': position.y, 'lng': position.x},
                'sentiment': analysis['label'],
            }
        }
    )
```

---

## 7. Phase 6 — 3D World Engine (Frontend)

### Step 6.1: Scene Setup with React-Three-Fiber

```
frontend/src/
├── App.jsx                        # Router: Login ↔ World
├── main.jsx
├── index.css                      # Global resets + CSS custom properties
├── store/
│   ├── useStore.js                # Zustand global state
│   └── useUIStore.js              # UI-specific state (panels, modals, toasts)
├── design/
│   ├── tokens.css                 # Design tokens: colors, spacing, radii, shadows
│   ├── typography.css             # Font-face declarations, type scale
│   ├── animations.css             # Keyframe library (fadeIn, slideUp, pulse, glow)
│   ├── glassmorphism.css          # Reusable glassmorphism utility classes
│   └── themes.js                  # Theme presets: Void, Aurora, Ember, Frost
├── components/
│   ├── Button.jsx                 # Sci-fi styled button (hover ripple, glow border)
│   ├── Input.jsx                  # Floating-label input with validation states
│   ├── Modal.jsx                  # Backdrop-blur modal with enter/exit transitions
│   ├── Toast.jsx                  # Auto-dismiss notification toasts
│   ├── Tooltip.jsx                # Context-aware tooltips with arrow
│   ├── ProgressBar.jsx            # Animated segmented progress bar
│   ├── Avatar.jsx                 # User avatar with online-status ring
│   ├── Badge.jsx                  # Notification count badge
│   ├── Spinner.jsx                # Orbital dot loading spinner
│   ├── ContextMenu.jsx            # Right-click radial context menu
│   └── KeyHint.jsx                # Inline keybinding hint chip (e.g. [E] Read)
├── layout/
│   ├── HUDLayout.jsx              # Fixed-position HUD container (z-indexed layers)
│   ├── PanelSlider.jsx            # Slide-in/out side panel wrapper
│   ├── OverlayManager.jsx         # Manages stacking of UI overlays
│   └── ResponsiveGuard.jsx        # Detects viewport + GPU tier, adjusts quality
├── scenes/
│   ├── LoginScene.jsx             # Starfield + glassmorphic login/register card
│   ├── DescentScene.jsx           # Planet approach cinematic
│   ├── WorldScene.jsx             # Main 3D gameplay scene
│   └── OnboardingScene.jsx        # First-time tutorial sequence
├── world/
│   ├── Planet.jsx                 # Sphere + terrain mesh
│   ├── Terrain.jsx                # Procedural ground plane
│   ├── Sky.jsx                    # Dynamic sky dome
│   ├── Water.jsx                  # Reflective water plane
│   ├── Clouds.jsx                 # Volumetric cloud layer
│   └── Fog.jsx                    # Distance fog
├── formations/
│   ├── FormationManager.jsx       # Spawns formations from geodata
│   ├── Volcano.jsx                # Red terrain + smoke particles
│   ├── Meadow.jsx                 # Green hills + flowers
│   ├── IceSpire.jsx               # Blue crystal pillars
│   ├── Mesa.jsx                   # Grey flat-topped rock
│   ├── CrystalPeak.jsx            # Golden glowing peak
│   └── GeyserField.jsx            # Steam vents + orange ground
├── effects/
│   ├── MeteorEffect.jsx           # Incoming message fireball
│   ├── EarthquakeEffect.jsx       # Screen shake
│   ├── GlowPulse.jsx              # Unread beacon animation
│   ├── ParticleSystem.jsx         # Smoke, snow, sparkle, etc.
│   ├── PostProcessing.jsx         # Bloom, SSAO, vignette
│   └── TransitionWipe.jsx         # Full-screen scene transition effects
├── player/
│   ├── PlayerController.jsx       # WASD + mouse + jump
│   ├── PlayerCamera.jsx           # First-person camera rig
│   └── PlayerHUD.jsx              # Compass, minimap, crosshair
├── ui/
│   ├── Observatory.jsx            # Tab-key contact globe
│   ├── TransmissionConsole.jsx    # Message compose panel
│   ├── MessageReader.jsx          # Floating text display
│   ├── Minimap.jsx                # 2D overhead radar
│   ├── MoodIndicator.jsx          # Sky mood display
│   ├── SettingsPanel.jsx          # Graphics, audio, controls
│   ├── NotificationCenter.jsx     # Slide-in notification log
│   ├── CommandPalette.jsx         # Ctrl+K searchable action launcher
│   ├── AchievementPopup.jsx       # Unlock celebration overlay
│   ├── WelcomeOverlay.jsx         # First-visit onboarding prompts
│   └── LoadingScreen.jsx          # Planet generation loading screen
├── hooks/
│   ├── useWebSocket.js            # WS connection + event handling
│   ├── useTerrainGen.js           # Simplex-noise terrain generation
│   ├── useWorldData.js            # Fetch geodata from API
│   ├── useAudio.js                # Spatial audio manager
│   ├── useMediaQuery.js           # Responsive breakpoint detection
│   ├── useGPUTier.js              # Detect GPU capability → auto quality
│   ├── useKeyboard.js             # Centralized keyboard shortcut registry
│   └── useAnimationQueue.js       # Queues sequential UI animations
└── shaders/
    ├── terrain.vert               # Custom vertex shader
    ├── terrain.frag               # Custom fragment shader
    ├── glow.frag                  # Beacon pulse shader
    ├── sky.frag                   # Dynamic sky gradient
    └── hologram.frag              # Holographic scanline UI shader
```

### Step 6.1b: Design System & Visual Language

TerraForm's UI follows a **"Sci-Fi Exploration Console"** aesthetic — dark translucent panels, glowing accent borders, subtle scan-line textures, and smooth micro-animations. Every UI element should feel like it belongs on the bridge of a starship exploring an alien world.

#### Design Tokens (`design/tokens.css`)

```css
:root {
  /* ── Color Palette ── */
  --color-void:         #0a0e1a;        /* Deepest background */
  --color-abyss:        #111827;        /* Panel backgrounds */
  --color-surface:      #1e2538;        /* Card/input surfaces */
  --color-surface-hover:#2a3347;        /* Hover states */
  --color-border:       rgba(255, 255, 255, 0.06);
  --color-border-glow:  rgba(79, 195, 247, 0.3);

  /* Accent palette — per-biome theming */
  --accent-primary:     #4FC3F7;        /* Cyan — default */
  --accent-secondary:   #7C4DFF;        /* Deep purple */
  --accent-success:     #69F0AE;        /* Mint green */
  --accent-warning:     #FFD740;        /* Amber */
  --accent-danger:      #FF5252;        /* Red */

  /* Text hierarchy */
  --text-primary:       #E8EAED;        /* Headings, primary content */
  --text-secondary:     #9AA0A6;        /* Labels, secondary info */
  --text-muted:         #5F6368;        /* Timestamps, hints */
  --text-glow:          #4FC3F7;        /* Interactive/highlighted text */

  /* ── Typography Scale (modular — 1.25 ratio) ── */
  --font-family:        'Outfit', 'Inter', -apple-system, sans-serif;
  --font-mono:          'JetBrains Mono', 'Fira Code', monospace;
  --text-xs:            0.75rem;        /* 12px — timestamps */
  --text-sm:            0.875rem;       /* 14px — labels */
  --text-base:          1rem;           /* 16px — body */
  --text-lg:            1.25rem;        /* 20px — subheadings */
  --text-xl:            1.563rem;       /* 25px — headings */
  --text-2xl:           1.953rem;       /* 31px — titles */
  --text-3xl:           2.441rem;       /* 39px — hero text */

  /* ── Spacing (8px grid) ── */
  --space-1:            0.25rem;        /* 4px */
  --space-2:            0.5rem;         /* 8px */
  --space-3:            0.75rem;        /* 12px */
  --space-4:            1rem;           /* 16px */
  --space-6:            1.5rem;         /* 24px */
  --space-8:            2rem;           /* 32px */
  --space-12:           3rem;           /* 48px */

  /* ── Effects ── */
  --radius-sm:          6px;
  --radius-md:          12px;
  --radius-lg:          20px;
  --radius-full:        9999px;
  --shadow-glow:        0 0 20px rgba(79, 195, 247, 0.15);
  --shadow-panel:       0 8px 32px rgba(0, 0, 0, 0.4);
  --blur-glass:         saturate(180%) blur(16px);
  --transition-fast:    150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-smooth:  300ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-spring:  500ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

#### Glassmorphism System (`design/glassmorphism.css`)

All floating panels use the glassmorphism pattern:

```css
.glass-panel {
  background: rgba(17, 24, 39, 0.75);
  backdrop-filter: var(--blur-glass);
  -webkit-backdrop-filter: var(--blur-glass);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-panel);
}

.glass-panel--glow {
  border-color: var(--color-border-glow);
  box-shadow: var(--shadow-panel), var(--shadow-glow);
}

.glass-panel--interactive:hover {
  border-color: rgba(79, 195, 247, 0.4);
  box-shadow: var(--shadow-panel), 0 0 30px rgba(79, 195, 247, 0.2);
  transform: translateY(-1px);
  transition: all var(--transition-smooth);
}
```

#### Theme Presets (`design/themes.js`)

Themes map to world biomes and can be overridden in Settings:

```javascript
export const THEMES = {
  void: {                           // Default — deep space
    accentPrimary: '#4FC3F7',
    accentSecondary: '#7C4DFF',
    panelBg: 'rgba(17, 24, 39, 0.75)',
    hudGlow: 'cyan',
  },
  aurora: {                         // TEMPERATE biome
    accentPrimary: '#69F0AE',
    accentSecondary: '#00E5FF',
    panelBg: 'rgba(13, 27, 23, 0.75)',
    hudGlow: 'emerald',
  },
  ember: {                          // VOLCANIC biome
    accentPrimary: '#FF6E40',
    accentSecondary: '#FFD740',
    panelBg: 'rgba(30, 15, 10, 0.75)',
    hudGlow: 'orange',
  },
  frost: {                          // ARCTIC biome
    accentPrimary: '#80D8FF',
    accentSecondary: '#B388FF',
    panelBg: 'rgba(15, 20, 35, 0.75)',
    hudGlow: 'ice-blue',
  },
  abyss: {                          // OCEANIC biome
    accentPrimary: '#448AFF',
    accentSecondary: '#1DE9B6',
    panelBg: 'rgba(10, 15, 30, 0.8)',
    hudGlow: 'deep-blue',
  },
};
```

#### Font Loading (`index.html`)

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

### Step 6.2: Procedural Terrain Generation

```javascript
// hooks/useTerrainGen.js
import { createNoise2D } from 'simplex-noise';
import Alea from 'alea';

export function generateTerrain(seed, width, depth, resolution) {
  const prng = Alea(seed);
  const noise = createNoise2D(prng);

  const vertices = [];
  for (let z = 0; z < depth; z += resolution) {
    for (let x = 0; x < width; x += resolution) {
      const nx = x / width - 0.5;
      const nz = z / depth - 0.5;

      // Multi-octave fractal noise
      let elevation =
        1.0  * noise(1 * nx, 1 * nz) +
        0.5  * noise(2 * nx, 2 * nz) +
        0.25 * noise(4 * nx, 4 * nz) +
        0.125 * noise(8 * nx, 8 * nz);

      // Normalize and apply world curvature
      elevation = Math.pow(Math.abs(elevation), 1.5) * 50;
      vertices.push(x - width/2, elevation, z - depth/2);
    }
  }
  return new Float32Array(vertices);
}
```

### Step 6.3: Dynamic Sky System

The sky color reflects the aggregate mood of the inbox:

```javascript
// Mood → Sky color mapping
const SKY_MOODS = {
  peaceful:  { top: '#1a237e', horizon: '#4FC3F7', sun: '#FFD54F' },
  anxious:   { top: '#4a148c', horizon: '#CE93D8', sun: '#FF8A65' },
  stormy:    { top: '#1b1b2f', horizon: '#B71C1C', sun: '#FF5722' },
  joyful:    { top: '#0D47A1', horizon: '#81D4FA', sun: '#FFF176' },
  melancholy:{ top: '#263238', horizon: '#78909C', sun: '#B0BEC5' },
};
```

The sky transitions smoothly using GSAP tweens when mood updates arrive via WebSocket.

### Step 6.4: Login & Registration UI

The entry point sets the visual tone for the entire experience:

```
┌──────────────────────────────────────────────────────────────┐
│                    ★  STARFIELD BACKGROUND  ★               │
│              (slowly rotating, parallax depth)              │
│                                                              │
│          ┌─────────────────────────────────────┐            │
│          │  ◆  glass-panel + glow border       │            │
│          │                                     │            │
│          │       🌍 TERRAFORM                  │            │
│          │   "Explore your messages"            │            │
│          │                                     │            │
│          │  ┌─ Username ────────────────────┐  │            │
│          │  │  floating label, icon prefix   │  │            │
│          │  └────────────────────────────────┘  │            │
│          │  ┌─ Password ────────────────────┐  │            │
│          │  │  eye toggle, strength meter    │  │            │
│          │  └────────────────────────────────┘  │            │
│          │                                     │            │
│          │  [ ▸ INITIATE DESCENT ]  ← glow btn │            │
│          │                                     │            │
│          │  ─── or sign up ───                 │            │
│          │  Subtle particle trail on hover      │            │
│          └─────────────────────────────────────┘            │
│                                                              │
│          Floating planet silhouettes in background           │
└──────────────────────────────────────────────────────────────┘
```

**Key UX details:**
- **Floating labels** on inputs — label animates up into a chip when focused.
- **Password strength meter** — animated bar (red → amber → green) below password field.
- **Form validation** — inline error messages slide in from below with red accent glow.
- **Submit button** — gradient border animation loops; on hover, inner glow intensifies.
- **Scene transition on success** — the login card dissolves into particles that fly toward a planet in the background, triggering the Descent cinematic.
- **Registration** — same card flips (3D CSS transform) to reveal sign-up fields: username, email, password, confirm password.

### Step 6.5: Loading & Transition Screens

Loading screens are not dead time — they are **world-building moments**:

```
┌──────────────────────────────────────────────────┐
│                                                  │
│         ◇ Procedurally generated planet          │
│           slowly rotating in center              │
│                                                  │
│       ── GENERATING YOUR WORLD ──                │
│       ▓▓▓▓▓▓▓▓▓▓░░░░░  62%                      │
│                                                  │
│   "Carving river valleys..."                     │
│   (Cycling flavor text from a curated list)      │
│                                                  │
│   TIP: "Press M to open the Cartography Map"     │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Flavor text examples** (cycle every 3 seconds with fade):
- *"Sculpting mountain ranges from your memories..."*
- *"Seeding biome textures based on your personality..."*
- *"Calibrating atmospheric pressure..."*
- *"Placing ancient ruins from forgotten conversations..."*
- *"Warming volcanic cores with unresolved arguments..."*

### Step 6.6: Onboarding Flow (First-Time User Experience)

The `OnboardingScene.jsx` guides new users through the core experience:

| Step | Trigger | Prompt | Highlight |
|------|---------|--------|-----------|
| 1 | First landing | "Welcome to your world. Every message someone sends you will become part of this landscape." | Panoramic camera sweep |
| 2 | First formation visible | "See that glowing mountain? That's a message waiting for you. Walk toward it." | Arrow pointing at nearest unread |
| 3 | Near formation | "Press `[E]` to read the message carved into this terrain." | Key hint chip pulses |
| 4 | After reading | "Press `[R]` to reply. Your response will grow as a new peak beside this one." | Reply prompt highlight |
| 5 | After reply | "Press `[Tab]` to open the Observatory and see your contacts as stars." | Tab key hint |
| 6 | Observatory open | "Click any star to send them a Transmission. Now go explore!" | Dismiss + confetti particles |

- Onboarding uses **non-modal coach marks** — floating tooltips that attach to in-world elements.
- Each step auto-advances when the user performs the action.
- A "Skip Tutorial" link is always visible (stored in `localStorage`).
- Onboarding can be replayed from Settings → "Replay Tutorial".

---

## 8. Phase 7 — Terrain & Message Visualization

### Step 7.1: Formation Generation Pipeline

For each message geodata record:

1. **Read geodata** from API: `terrain_type`, `elevation`, `sentiment_score`, `color_primary`, `particle_effect`.
2. **Select base geometry**: Each terrain type has a procedural geometry generator.
3. **Apply material**: Custom shader material using `color_primary`, `color_secondary`.
4. **Add particles**: Attach particle emitter based on `particle_effect`.
5. **Add glow**: If `is_read === false`, wrap in `GlowPulse` component (animated emissive shader).
6. **Position**: Convert lat/lng to 3D world coordinates using spherical-to-cartesian mapping.

### Step 7.2: Terrain Type Geometry Generators

| Type | Geometry Approach | Visual |
|------|------------------|--------|
| `VOLCANO` | Cone + crater boolean + irregular noise displacement | Smoking red peak with lava glow |
| `MEADOW` | Soft sine-wave hills + instanced grass blades | Rolling green with flowers |
| `ICE_SPIRE` | Elongated octahedron clusters + frost shader | Translucent blue crystal towers |
| `MESA` | Box geometry with layered horizontal bands + erosion | Flat-topped desert rock |
| `CRYSTAL_PEAK` | Icosahedron + faceted reflective material | Golden glowing gem-like peak |
| `GEYSER_FIELD` | Flat disk + animated steam columns (instanced cylinders) | Bubbling orange terrain |

### Step 7.3: Elevation Scaling (Improvised)

Instead of linear scaling, use a **landmark tier system**:

| Word Count | Tier | Visual Scale | Example |
|-----------|------|-------------|---------|
| 1–20 | **Pebble** | 1–3 units | Small stone you step over |
| 21–100 | **Boulder** | 4–10 units | Noticeable rock formation |
| 101–300 | **Hill** | 11–30 units | Rolling terrain, walkable |
| 301–800 | **Mountain** | 31–80 units | Requires climbing |
| 801–2000 | **Peak** | 81–150 units | Snow-capped, towering |
| 2000+ | **Colossus** | 151–200 units | Dominates the skyline |

### Step 7.4: Unread Glow Beacon (Shader)

```glsl
// shaders/glow.frag
uniform float uTime;
uniform vec3 uGlowColor;
uniform float uIntensity;

void main() {
  float pulse = sin(uTime * 2.0) * 0.5 + 0.5;
  float glow = pulse * uIntensity;
  gl_FragColor = vec4(uGlowColor * glow, glow * 0.6);
}
```

The beacon shoots a vertical light beam into the sky that is visible from far away, drawing the player toward unread messages.

---

## 9. Phase 8 — Player Controller & Physics

### Step 8.1: First-Person Controller

```javascript
// player/PlayerController.jsx
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { PointerLockControls } from '@react-three/drei';

function PlayerController() {
  // Capsule collider (radius 0.5, height 1.8)
  // WASD → apply impulse to rigid body
  // Space → upward impulse (only if grounded via raycast)
  // Mouse → PointerLockControls for camera rotation
  // Shift → sprint (2x speed)
  // Mouse wheel → zoom (adjusts FOV 60–90)
}
```

### Step 8.2: Movement Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| Walk speed | 8 units/s | Comfortable exploration pace |
| Sprint speed | 16 units/s | Double tap or hold Shift |
| Jump force | 12 | Single jump |
| Gravity | -30 | Slightly lower than Earth for floaty feel |
| Camera height | 1.7 units | Eye level |
| Collision capsule | r=0.4, h=1.8 | Player body |

### Step 8.3: Terrain Collision

- Generate a `TrimeshCollider` from the terrain geometry.
- Each message formation gets its own `ConvexHullCollider` auto-generated from its mesh.
- Player cannot walk through formations — must climb or walk around.

### Step 8.4: Climbing System (Improvised Enhancement)

When the player approaches a steep formation:
1. Detect slope angle via surface normal raycast.
2. If slope > 45°, switch to **climbing mode**: reduce gravity, allow wall-sticking, show handholds.
3. Reaching the summit triggers a particle burst + achievement sound.

---

## 10. Phase 9 — The Observatory & Transmission

### Step 9.1: In-World HUD Layout

The HUD is the persistent UI layer during exploration. It uses a **minimal, non-intrusive** design that keeps immersion intact:

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────────┐                         ┌──────────────────┐  │
│  │  ◎ MINIMAP  │                         │  ☀ MOOD: Joyful  │  │
│  │  ┌───────┐  │                         │  ████████░░ 78%  │  │
│  │  │ radar │  │                         │  Sky: Clear      │  │
│  │  │ dots  │  │                         └──────────────────┘  │
│  │  └───────┘  │                                               │
│  │  N ↑        │                                               │
│  └─────────────┘                                               │
│                                                                 │
│                                                                 │
│                         ╋ (crosshair)                           │
│                                                                 │
│                                                                 │
│  ┌─────────┐                                                    │
│  │ 🔔 3    │  ← notification badge (slides in on new events)  │
│  └─────────┘                                                    │
│                                                                 │
│  ┌──────────────────┐              ┌────────────────────────┐  │
│  │ Compass bar ───► │              │  [Tab] Observatory     │  │
│  │ N · NE · E · SE  │              │  [M] Map  [Esc] Menu   │  │
│  └──────────────────┘              └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**HUD Rules:**
- All HUD elements use `glass-panel` styling with very low opacity (`rgba(17,24,39,0.4)`).
- Elements fade to near-transparent when the player is idle (no input for 5s) — **auto-hide mode**.
- Crosshair changes shape near interactable formations (dot → ring → diamond).
- Notification badge slides in from the left with a bounce animation, then auto-hides after 5s.
- Compass bar at the bottom shows cardinal directions + icons for nearby unread beacons.
- All HUD elements respect `useGPUTier` — on low-end devices, shadows and blur are disabled.

### Step 9.2: Observatory (Tab Key)

Pressing `Tab` triggers:
1. Player movement freezes.
2. Camera zooms out to show a holographic wireframe globe.
3. Contacts appear as **colored stars** orbiting the globe.
   - Online contacts: bright, pulsing stars.
   - Offline contacts: dim, static stars.
4. Hover over a star → show username + last message preview.
5. Click a star → open Transmission Console.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    ✦ THE OBSERVATORY ✦                          │
│                                                                 │
│              ┌────────────────────────────┐                     │
│              │     ☆  ☆                  │                     │
│              │  ☆      wireframe   ★     │  ★ = online         │
│              │     globe with       ☆    │  ☆ = offline        │
│              │      contacts    ★        │                     │
│              │  ☆         ☆             │                     │
│              └────────────────────────────┘                     │
│                                                                 │
│  ┌────────────────────────────┐  ┌───────────────────────────┐  │
│  │  ★ alice_wonder            │  │  Search: [_________] 🔍  │  │
│  │  Online · Last: 2m ago     │  │                           │  │
│  │  "Hey, check out this..." │  │  Sort: Recent | Name | ●  │  │
│  │  ┌─────────────────────┐  │  │                           │  │
│  │  │  [Send Message]     │  │  │  Contacts: 12 online      │  │
│  │  │  [Visit World] 🔒  │  │  │  Total: 47                │  │
│  │  └─────────────────────┘  │  └───────────────────────────┘  │
│  └────────────────────────────┘                                 │
│                                                                 │
│  [Tab] Close                          [←→] Rotate  [Scroll] Zoom│
└─────────────────────────────────────────────────────────────────┘
```

**Observatory UX details:**
- **Entry animation**: World blurs out, globe materializes from particles with a spiral-in effect (800ms GSAP timeline).
- **Contact card**: Slides in from the right when hovering a star. Uses `glass-panel--glow` with the contact's `avatar_color` as the border glow.
- **Star sizing**: Stars are sized by message frequency — frequent contacts are larger stars.
- **Star trails**: Moving your cursor across stars leaves a faint connecting line trail (constellation effect).
- **Exit animation**: Globe explodes back into particles, world un-blurs.
- **Implementation**: Use a separate `<group>` that renders above the world with `OrbitControls` and a transparent background.

### Step 9.3: Transmission Console (Sending Messages)

A sci-fi themed compose panel with real-time terrain preview:

```
┌─────────────────────────────────────────────────────────────────┐
│  ◇ TRANSMISSION CONSOLE                              [✕ Close] │
│  ──────────────────────────────────────────────────────────────  │
│                                                                 │
│  TO:   ┌──────────────────────────────────────┐                 │
│        │  ★ alice_wonder                      │  auto-complete  │
│        └──────────────────────────────────────┘  dropdown       │
│                                                                 │
│  SUBJECT: (optional)                                            │
│        ┌──────────────────────────────────────┐                 │
│        │  Re: Weekend plans                   │                 │
│        └──────────────────────────────────────┘                 │
│                                                                 │
│  MESSAGE:                                                       │
│  ┌──────────────────────────────────┐  ┌─────────────────────┐  │
│  │                                  │  │  3D TERRAIN PREVIEW │  │
│  │  Type your message here...       │  │  ┌───────────────┐  │  │
│  │                                  │  │  │   🌋          │  │  │
│  │  (rich text area with            │  │  │  rotating     │  │  │
│  │   auto-expanding height)         │  │  │  preview mesh │  │  │
│  │                                  │  │  └───────────────┘  │  │
│  │                                  │  │                     │  │
│  └──────────────────────────────────┘  │  Terrain: Volcano   │  │
│                                        │  Sentiment: Angry   │  │
│  Words: 42  │  Chars: 238             │  Height: ~31 units  │  │
│                                        └─────────────────────┘  │
│                                                                 │
│  Sentiment Indicator:  🔴🟠🟡🟢🔵  ← live color bar            │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ▸▸▸ TRANSMIT ▸▸▸    ← animated gradient sweep on hover  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  [Ctrl+Enter] Send   │   [Esc] Cancel   │   [📎] Attach File   │
└─────────────────────────────────────────────────────────────────┘
```

**Transmission Console UX details:**
- **Real-time terrain preview**: As the user types, the 3D preview mesh updates every 500ms (debounced) using client-side VADER sentiment heuristics. The terrain type, color, and particle effect change live.
- **Sentiment bar**: A horizontal 5-segment bar below the text area that glows with the current message sentiment color. Transitions are animated.
- **Auto-complete dropdown**: Contact search with fuzzy matching — shows avatar color, online status, and last message timestamp.
- **Transmit button**: Has a gradient sweep animation that accelerates on hover. On click, a shockwave ripple animates outward and the console slides closed.
- **Keyboard shortcuts**: `Ctrl+Enter` to send, `Esc` to cancel, `Tab` for field navigation.
- **Entry animation**: Panel slides up from the bottom with spring easing (`transition-spring`).

### Step 9.4: Contact Search

```
GET /api/contacts/search/?q=john
```
Uses Django ORM with `pg_trgm` for fuzzy matching:
```python
# observatory/views.py
from rest_framework import generics
from django.contrib.postgres.search import TrigramSimilarity
from core.models import User
from .serializers import UserSearchSerializer

class ContactSearchView(generics.ListAPIView):
    serializer_class = UserSearchSerializer

    def get_queryset(self):
        query = self.request.query_params.get('q', '')
        return User.objects.annotate(
            similarity=TrigramSimilarity('username', query)
        ).filter(
            similarity__gt=0.3
        ).order_by('-similarity')[:10]
```

### Step 9.5: Notification System

Notifications are categorized and styled by type:

| Type | Icon | Color | Sound | Auto-dismiss |
|------|------|-------|-------|--------------|
| **New Message** | ☄️ | `--accent-primary` | Meteor whoosh | No — persists until read |
| **Contact Online** | ★ | `--accent-success` | Soft chime | 5 seconds |
| **Achievement** | 🏆 | `--accent-warning` | Fanfare | 8 seconds |
| **System Alert** | ⚠️ | `--accent-danger` | Alert tone | No — requires dismiss |
| **Reply Received** | ↩️ | `--accent-secondary` | Echo ping | No |

**Notification UX:**
- Toast notifications slide in from the top-right with spring easing.
- Stacking: max 3 visible at once, older ones collapse into a count badge (`+2 more`).
- Clicking a notification navigates to the relevant formation or opens the relevant panel.
- `NotificationCenter.jsx` (press `N` or click the bell) shows a scrollable full history with timestamps.

### Step 9.6: Command Palette (Ctrl+K)

A universal action launcher — type to search actions, contacts, formations, and settings:

```
┌─────────────────────────────────────────┐
│  🔍  Type a command...                 │
│  ─────────────────────────────────────  │
│  ★  Send message to alice_wonder       │
│  📍  Teleport to Crystal Peak #3       │
│  ⚙  Open Settings > Audio             │
│  🗺  Toggle Cartography Map            │
│  🔔  View all notifications            │
│  🌋  Jump to nearest unread            │
└─────────────────────────────────────────┘
```

- Fuzzy-match search across contacts, pinned monuments, recent messages, and all settings.
- Recent actions appear by default when opened.
- Arrow keys to navigate, Enter to execute, Esc to close.
- Styled as a centered `glass-panel--glow` overlay with backdrop blur.

---

## 11. Phase 10 — Reading, Interacting & Weathering

### Step 10.1: Read Trigger

When the player is within **3 units** of a formation AND facing it (dot product of look direction and formation direction > 0.7):
1. Show a floating prompt: `[E] Read Message` — uses `KeyHint.jsx` component with pulse animation.
2. On press `E`:
   - Fire `PATCH /api/messages/:id/read`.
   - WebSocket event `MESSAGE_READ` sent to server.
   - **Animation**: Formation glow fades out over 2 seconds. Text materializes letter-by-letter floating above the formation.

### Step 10.2: Message Display (MessageReader.jsx)

The message reader is a **floating glassmorphic panel** anchored above the formation:

```
              ┌───────────────────────────────────┐
              │ ◇ From: alice_wonder               │
              │ ◇ Sent: 2 hours ago                │
              │ ─────────────────────────────────  │
              │                                    │
              │  Hey! Did you see the sunset        │
              │  today? It was absolutely           │
              │  stunning from the hillside.        │
              │                                    │
              │  (holographic scanline overlay)     │
              │                                    │
              │ ─────────────────────────────────  │
              │ [R] Reply   [📌] Pin   [⚑] Report │
              └───────────────────────────────────┘
                          ▼ (pointer to formation)
```

**Message Reader UX details:**
- Panel uses `glass-panel--glow` with the message's `color_primary` as the border glow.
- Text appears with a **typewriter animation** (letter-by-letter, 20ms per char, skippable by clicking).
- Sender name is clickable → opens their star in the Observatory.
- The `hologram.frag` shader adds subtle horizontal scan lines moving vertically for a holographic feel.
- **Scroll behavior**: Long messages get a scrollable area (max-height 300px) with a custom thin scrollbar.
- **Attachments**: Images appear as floating holographic frames with a slight rotation on hover.
- **Actions row**: `[R]` Reply, `[📌]` Pin as Monument, `[⚑]` Report — each with tooltip on hover.
- Pressing `Esc` or walking away (distance > 5 units) closes the reader with a fade-out.

### Step 10.3: Weathering & Erosion System (Improvised)

After a message is read, it begins to **age**:

| Days Since Read | Erosion Level | Visual Change |
|----------------|--------------|---------------|
| 0 | 0 | Fresh, vibrant colors |
| 3 | 2 | Slight color desaturation |
| 7 | 4 | Moss/lichen appears (green patches) |
| 14 | 6 | Cracks form, edges round off |
| 30 | 8 | Heavy erosion, half-buried look |
| 60+ | 10 | Ancient ruin — nearly flat, overgrown |

Erosion is computed server-side via a **daily Celery cron task** and pushed to clients on login.

### Step 10.4: Reply Threading

- After reading, a `[R] Reply` prompt appears.
- Replying to a message spawns the new formation **adjacent** to the original (within 10-unit radius).
- Reply chains form **mountain ranges** — visually connecting conversations.
- A faint **glowing thread line** connects parent and reply formations at ground level (visible from map view).

---

## 12. Phase 11 — Atmosphere, Audio & Polish

### Step 11.1: Dynamic Lighting

- **Sun position**: Tracks real-world time of day using `Date()`.
  - Morning: warm east light, long shadows.
  - Noon: overhead, bright.
  - Evening: orange-red west light.
  - Night: moonlight + starfield + aurora if mood is positive.

- **Local weather**: Each formation can override nearby weather:
  - Volcano → nearby heat shimmer (refraction shader).
  - Ice Spire → localised snowfall particle zone.
  - Meadow → floating pollen / fireflies at night.

### Step 11.2: Spatial Audio

Using Howler.js + Web Audio API `PannerNode`:

| Source | Sound | Behavior |
|--------|-------|----------|
| Volcano | Low rumble + crackling | Grows louder as you approach |
| Meadow | Bird songs + wind | Soft ambient |
| Ice Spire | Crystalline chimes + wind | Echoing, reverb |
| Geyser | Bubbling + steam hiss | Periodic bursts |
| Unread beacon | Ethereal hum | Pulsing with glow |
| Meteor impact | Explosion + tremor | One-shot on arrival |
| Footsteps | Crunch/grass/snow | Changes with terrain type underfoot |
| Ambient | Wind + distant ocean | Always present, varies with altitude |

### Step 11.3: Post-Processing Pipeline

Using `@react-three/postprocessing`:

```jsx
<EffectComposer>
  <Bloom luminanceThreshold={0.6} intensity={0.5} />
  <SSAO radius={0.4} intensity={15} />
  <Vignette eskil={false} offset={0.1} darkness={0.4} />
  <ChromaticAberration offset={[0.001, 0.001]} />  {/* Subtle */}
  <ToneMapping mode={ACESFilmicToneMapping} />
</EffectComposer>
```

### Step 11.4: Settings Panel (Esc → Settings)

Comprehensive settings organized in a tabbed glassmorphic panel:

```
┌─────────────────────────────────────────────────────────────┐
│  ⚙ SETTINGS                                       [✕]     │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  [Graphics]  [Audio]  [Controls]  [Accessibility]  [About] │
│  ═══════════                                                │
│                                                             │
│  Quality Preset:  [ Ultra ▾ ]                               │
│    ├─ Ultra: All effects, 4K shadows, max particles         │
│    ├─ High:  Bloom + SSAO, 2K shadows, reduced particles   │
│    ├─ Medium: Bloom only, 1K shadows, billboard LOD early   │
│    └─ Low:   No post-processing, no shadows, no particles  │
│                                                             │
│  Render Scale:     ████████░░  80%                          │
│  Shadow Quality:   ████████████  High                       │
│  View Distance:    ██████░░░░  Medium                       │
│  Particle Density: ████████░░  80%                          │
│  Anti-Aliasing:    [FXAA ▾]                                 │
│                                                             │
│  FPS Counter:      [✓]                                      │
│  Show GPU Stats:   [ ]                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Settings tabs:**

| Tab | Settings |
|-----|----------|
| **Graphics** | Quality preset, render scale, shadow quality, view distance, particle density, anti-aliasing, FPS counter |
| **Audio** | Master volume, music volume, SFX volume, ambient volume, spatial audio toggle |
| **Controls** | Mouse sensitivity, invert Y-axis, sprint toggle vs hold, keybind remapping |
| **Accessibility** | Colorblind mode (Deuteranopia/Protanopia/Tritanopia filters), reduce motion (disables screen shake, particle effects), high-contrast HUD, font size scaling, screen reader hints |
| **About** | Version, credits, replay tutorial, clear local cache, export world data |

**Settings UX:**
- All sliders animate smoothly and show a live preview in a small 3D viewport in the corner.
- Changes apply instantly (no "Apply" button) — with an "Undo" toast for 5 seconds.
- Settings persist to `localStorage` and sync to user profile on the server.
- `useGPUTier.js` auto-detects GPU capability on first visit and picks the best default preset.

### Step 11.5: Ambient Music (Improvised)

Generate an adaptive soundtrack:
- Use Tone.js to create **procedural ambient music** that responds to the environment.
- Near volcanoes: add dissonant low synth drones.
- Near meadows: add pentatonic arpeggios.
- At high altitude: add reverb-heavy pad swells.
- The music is never the same twice — it's **terrain-driven generative audio**.

---

## 13. Phase 12 — Anti-Spam, Moderation & Security

### Step 12.1: Spam Protection — "The Wasteland Mechanic"

When spam floods a user's world:

1. **Rate limiting**: Max 10 messages per sender per hour. Max 50 total incoming messages per hour.
2. **Spam score**: If NLP detects repetitive/low-quality content, assign a spam score.
3. **Visual penalty**: Spam messages render as **dead grey rocks** in a quarantine zone at the edge of the map.
4. **Wasteland alert**: If spam exceeds threshold, trigger a "Wasteland Warning" — sky turns grey, ominous horn sound, UI alert.
5. **One-click purge**: Player can "Terraform the Wasteland" — select a region and delete all spam formations in it.

### Step 12.2: Content Moderation

- **Toxicity filter**: Run messages through a toxicity classifier before delivery.
- **Report button**: In the message reader UI, add a report option.
- **Block user**: Blocked users' formations disappear from your world.

### Step 12.3: Security Hardening

- All passwords hashed with Argon2id (memory-hard).
- JWT tokens with short expiry (24h) + refresh token rotation.
- CORS restricted to frontend origin.
- Rate limiting on all API endpoints (Django `django-ratelimit` or DRF throttling).
- SQL injection prevention via Django ORM parameterized queries.
- XSS prevention: sanitize all message content before rendering.
- WebSocket authentication: validate JWT on connection handshake.

---

## 14. Phase 13 — Performance & Optimization

### Step 13.1: Level of Detail (LOD)

```
Distance < 50 units    → Full geometry + particles + glow
Distance 50–200 units  → Reduced geometry, no particles
Distance 200–500 units → Billboard sprite (impostor)
Distance > 500 units   → Hidden (culled)
```

Use `<Detailed>` from Drei or custom distance-based LOD.

### Step 13.2: Instanced Rendering

- Grass blades: `<InstancedMesh>` with 10,000+ instances.
- Rocks/pebbles: Instanced with random rotation/scale.
- Particles: GPU-based particle system using custom shader + `InstancedBufferGeometry`.

### Step 13.3: Chunk Loading

Divide the world into **chunks** (100×100 unit tiles):
- Only load chunks within 3-chunk radius of the player.
- Unload chunks beyond 5-chunk radius.
- Pre-fetch chunks in the player's movement direction.
- This keeps the draw call count manageable even with 500+ messages.

### Step 13.4: Asset & Query Optimization

- **Texture atlas**: Combine terrain textures into a single atlas to reduce draw calls.
- **Geometry caching**: Cache generated formation geometries in IndexedDB.
- **API pagination**: Terrain endpoint returns chunks, not all geodata at once.
- **Redis caching**: Cache sentiment analysis results and geodata calculations.
- **Database connection pooling**: Use `django-db-connection-pool` or `pgBouncer` for pooling.

---

## 15. Phase 14 — Testing & QA

### Step 14.1: Backend Tests

```bash
# Run with Django's test runner or pytest-django
python manage.py test --verbosity=2
# Or with pytest:
pytest tests/ -v --cov=. --cov-report=html --ds=terraform_project.settings
```

| Test Suite | Covers |
|-----------|--------|
| `test_auth.py` | Registration, login, JWT validation |
| `test_messages.py` | Send, read, list, spatial queries |
| `test_nlp.py` | Sentiment analysis accuracy |
| `test_geocompute.py` | Coordinate generation, elevation calc |
| `test_websocket.py` | Event delivery, connection management |

### Step 14.2: Frontend Tests

```bash
npm run test  # Vitest
```

- Component tests for all UI overlays.
- Hook tests for terrain generation determinism.
- Integration tests for WebSocket event handling.

### Step 14.3: E2E Testing

Use Playwright:
1. Register User A and User B.
2. User A sends a negative message.
3. Verify User B receives WebSocket event.
4. Verify terrain type is `VOLCANO` in the database.
5. Verify the 3D scene renders the formation.

### Step 14.4: Performance Benchmarks

- Target **60 FPS** on mid-range GPU (GTX 1060 / M1).
- Target **30 FPS** on integrated graphics with reduced settings.
- API response time < 100ms for spatial queries.
- WebSocket event latency < 200ms.

---

## 16. Phase 15 — Deployment

### Step 15.1: Dockerize Everything

```yaml
# docker-compose.prod.yml
services:
  postgres:
    image: postgis/postgis:16-3.4
    volumes: [pgdata:/var/lib/postgresql/data]
  redis:
    image: redis:7-alpine
  backend:
    build: ./backend
    command: daphne -b 0.0.0.0 -p 8000 terraform_project.asgi:application
    # Daphne serves both HTTP and WebSocket via ASGI
  celery:
    build: ./backend
    command: celery -A terraform_project worker --loglevel=info
  celery-beat:
    build: ./backend
    command: celery -A terraform_project beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
  frontend:
    build: ./frontend
    # Serve built static files via nginx
  nginx:
    image: nginx:alpine
    ports: ["443:443", "80:80"]
    # Reverse proxy to backend (Daphne) + serve frontend static
```

### Step 15.2: Production Checklist

- [ ] SSL/TLS certificates (Let's Encrypt via Certbot)
- [ ] Environment variables in secrets manager
- [ ] Database backups (pg_dump daily cron)
- [ ] Redis persistence (AOF mode)
- [ ] Health check endpoints (`/health`, `/ready`)
- [ ] Logging aggregation (structured JSON logs → ELK or Loki)
- [ ] Application monitoring (Prometheus + Grafana)
- [ ] Error tracking (Sentry integration)
- [ ] CDN for static assets (CloudFront / Cloudflare)
- [ ] WebSocket scaling: use Redis PubSub adapter for multi-server deployment

---

## 17. Phase 16 — Micro-Animations & Interaction Design Guide

Every interaction in TerraForm should feel **alive, responsive, and intentional**. This section defines the animation language used across all UI components.

### Step 16.1: Animation Timing Reference

| Animation | Duration | Easing | CSS Variable | Usage |
|-----------|----------|--------|-------------|-------|
| **Button hover** | 150ms | `ease-out` | `--transition-fast` | Border glow + translateY(-1px) |
| **Button press** | 80ms | `ease-in` | — | Scale(0.97) + glow pulse |
| **Panel slide-in** | 500ms | `cubic-bezier(0.34, 1.56, 0.64, 1)` | `--transition-spring` | Observatory, Transmission Console, Settings |
| **Panel slide-out** | 300ms | `ease-in` | `--transition-smooth` | Reverse of slide-in |
| **Modal backdrop** | 300ms | `ease-out` | `--transition-smooth` | Opacity 0→1, backdrop-filter blur(0→16px) |
| **Toast enter** | 400ms | spring | `--transition-spring` | SlideX + fade from right |
| **Toast exit** | 200ms | `ease-in` | `--transition-fast` | SlideX + fade to right |
| **Tooltip appear** | 200ms | `ease-out` | `--transition-fast` | Scale(0.9→1) + opacity |
| **Card hover** | 300ms | `ease-out` | `--transition-smooth` | Border glow + shadow expand |
| **Crosshair morph** | 200ms | `ease-in-out` | — | Dot→Ring→Diamond via SVG path tween |
| **Scene transition** | 1200ms | `ease-in-out` | — | Full-screen wipe (GSAP timeline) |
| **3D formation rise** | 2000ms | `ease-out` | — | Scale Y from 0→1 + particle burst |
| **Typewriter text** | 20ms/char | linear | — | Letter-by-letter message reveal |
| **Sky mood change** | 4000ms | `ease-in-out` | — | GSAP gradient tween across sky dome |

### Step 16.2: Interaction State Machine

Every interactive element follows a consistent state flow:

```
  IDLE ──hover──▶ HOVER ──press──▶ ACTIVE ──release──▶ IDLE
   │                                  │
   │              focus               │
   └──────────────────────────────────┘
```

| State | Visual Treatment |
|-------|-----------------|
| **Idle** | Base colors, no glow, `border: 1px solid var(--color-border)` |
| **Hover** | Border transitions to `--color-border-glow`, subtle translateY(-1px), shadow expands |
| **Focus** | Cyan outline ring (2px, offset 2px) for keyboard navigation |
| **Active / Pressed** | Scale(0.97), glow pulse, ripple effect from click point |
| **Disabled** | Opacity 0.4, cursor: not-allowed, no hover effects |
| **Loading** | Content replaced with `Spinner.jsx`, border pulses slowly |

### Step 16.3: Keyframe Library (`design/animations.css`)

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(30px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 10px rgba(79, 195, 247, 0.2); }
  50%      { box-shadow: 0 0 25px rgba(79, 195, 247, 0.5); }
}

@keyframes orbitalSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@keyframes scanline {
  from { transform: translateY(-100%); }
  to   { transform: translateY(100%); }
}

@keyframes ripple {
  0%   { transform: scale(0); opacity: 0.5; }
  100% { transform: scale(4); opacity: 0; }
}
```

### Step 16.4: Reduced Motion Accessibility

When `prefers-reduced-motion: reduce` is active, all animations degrade gracefully:

| Normal Behavior | Reduced Motion Fallback |
|----------------|------------------------|
| Slide-in panels | Instant opacity fade (150ms) |
| Screen shake (earthquake) | Red border flash on viewport |
| Particle effects | Static sprites, no movement |
| Typewriter text | Instant full text display |
| Sky mood transitions | Instant color swap |
| Formation rise animation | Instant appearance |
| Loading spinner (orbital) | Simple pulsing dot |
| Glow pulse beacon | Solid colored ring, no pulse |

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 150ms !important;
  }
}
```

---

## 18. Improvised Features — Beyond the Original Vision

These features go beyond the original concept to make TerraForm truly extraordinary:

### 🌊 18.1: Biome Diversity
Instead of one flat plane, each user's world has **biomes** based on message density:
- **Sparse messages** → vast desert with distant formations.
- **Dense messages** → thick forest of overlapping peaks.
- **Water bodies** form in areas with no messages — tranquil lakes between mountain ranges.

### 🌋 18.2: Tectonic Events
When two users exchange heated messages rapidly:
- Their corresponding formations **push toward each other** like tectonic plates.
- The collision creates a **rift valley** between them with a visual fault line.
- Symbolizes conflict. Resolution (positive messages) heals the rift into a bridge.

### 🏗️ 18.3: Monuments
Users can **pin** important messages. Pinned messages become **Monuments** — larger, ornate structures that never erode. They glow permanently and have unique architecture (temple, lighthouse, obelisk).

### 🌌 18.4: The Night Sky as Archive
At night, the sky becomes a **star map of old messages**:
- Each archived/eroded message becomes a faint star.
- Constellations form from conversation threads.
- Clicking a star replays the message as a ghostly echo.

### 🎭 18.5: Emotion Trails
As you walk, your avatar leaves **footprints** that change color based on the sentiment of the last message you read. Other visitors (future multiplayer) could see your emotional journey.

### 🗺️ 18.6: Cartography Mode
Press `M` to enter a top-down **map view**:
- See your entire planet as a 2D relief map.
- Color-coded by sentiment.
- Unread messages pulse as dots.
- Click to teleport to any location.

### 📜 18.7: Message Archaeology
Very old, fully eroded messages can be "excavated":
- Walk to an ancient ruin and press `E`.
- An archaeology mini-animation plays (dust brushing away).
- The original message text is revealed, sepia-toned.

### 🎮 18.8: Achievement System

| Achievement | Condition | Reward |
|-------------|----------|--------|
| **First Steps** | Read your first message | Unlock sprint |
| **Mountaineer** | Climb a 100+ unit peak | Custom trail particles |
| **Vulcanologist** | Read 10 volcano messages | Heat-proof boots (no screen shake) |
| **Cartographer** | Explore 80% of your world | Golden compass HUD |
| **Peacemaker** | Send 50 positive messages | Your formations bloom with extra flowers |
| **Ancient Explorer** | Excavate a 60-day-old message | Archaeology tool for your avatar |

### 🌐 18.9: Multiplayer Visits (Future)
Allow users to **visit** each other's worlds (read-only):
- Send a "Visit Invitation" → recipient accepts.
- Visitor spawns as a ghost avatar on the host's planet.
- Can walk around and see the landscape but cannot read message content (privacy).
- Sees the *shape* of conversations — tall angry mountains, peaceful meadows — without reading the words.

### ⚡ 18.10: Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `W/A/S/D` | Move |
| `Space` | Jump |
| `Shift` | Sprint |
| `E` | Interact / Read |
| `R` | Reply (when reading) |
| `Tab` | Observatory |
| `M` | Map / Cartography Mode |
| `Esc` | Settings / Menu |
| `1–5` | Quick-warp to pinned monuments |
| `F` | Toggle flashlight (night mode) |

---

## 19. Error Logging Strategy

All errors are logged to `errors.log` with structured JSON:

```json
{
  "timestamp": "2026-03-17T14:30:00Z",
  "level": "ERROR",
  "service": "backend",
  "module": "nlp",
  "function": "analyze_message",
  "error_type": "SentimentAnalysisError",
  "message": "BERT model timeout after 30s",
  "user_id": "uuid-...",
  "request_id": "req-uuid-...",
  "stack_trace": "..."
}
```

### Error Categories

| Category | Module | Common Errors |
|----------|--------|---------------|
| **AUTH** | `auth.py` | Invalid credentials, expired JWT, refresh token reuse |
| **DB** | `database.py` | Connection pool exhausted, spatial query timeout |
| **NLP** | `nlp.py` | Model load failure, CUDA OOM, analysis timeout |
| **GEO** | `geocompute.py` | Coordinate out of bounds, hash collision |
| **WS** | `manager.py` | Connection drop, message serialization error |
| **3D** | Frontend | WebGL context lost, shader compile error, OOM |
| **PHYSICS** | Frontend | Collision mesh generation failure, NaN positions |

---

## 20. File & Folder Structure

```
terraform-app/
├── backend/
│   ├── terraform_project/          # Django project config
│   │   ├── __init__.py
│   │   ├── settings.py             # All Django settings
│   │   ├── urls.py                 # Root URL configuration
│   │   ├── asgi.py                 # ASGI entry (Daphne + Channels)
│   │   ├── wsgi.py                 # WSGI fallback
│   │   └── celery.py               # Celery app configuration
│   ├── core/                       # Users & authentication app
│   │   ├── __init__.py
│   │   ├── models.py               # Custom User (extends AbstractUser)
│   │   ├── serializers.py          # DRF serializers for auth
│   │   ├── views.py                # Register, login views
│   │   ├── urls.py                 # Auth URL routes
│   │   ├── backends.py             # Custom auth backend
│   │   ├── admin.py                # Django admin config
│   │   └── signals.py              # Post-save signals (world_seed)
│   ├── messaging/                  # Messages & geodata app
│   │   ├── __init__.py
│   │   ├── models.py               # Message + MessageGeodata
│   │   ├── serializers.py          # DRF serializers
│   │   ├── views.py                # Send, read, list views
│   │   ├── urls.py                 # Message URL routes
│   │   ├── consumers.py            # Django Channels WebSocket consumers
│   │   ├── routing.py              # WebSocket URL routing
│   │   ├── tasks.py                # Celery async tasks
│   │   └── services/
│   │       ├── nlp.py              # Sentiment analysis engine
│   │       └── geocompute.py       # Coordinate & elevation calculator
│   ├── world/                      # World generation app
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py                # Terrain data, nearby queries
│   │   └── urls.py
│   ├── observatory/                # Contacts & search app
│   │   ├── __init__.py
│   │   ├── models.py               # Contact model
│   │   ├── serializers.py
│   │   ├── views.py                # Contact list, fuzzy search
│   │   └── urls.py
│   ├── templates/                  # Django templates (admin, emails)
│   ├── static/                     # Django static files
│   ├── tests/
│   │   ├── test_auth.py
│   │   ├── test_messages.py
│   │   ├── test_nlp.py
│   │   ├── test_geodata.py
│   │   └── test_websocket.py
│   ├── manage.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── errors.log
├── frontend/
│   ├── public/
│   │   ├── textures/
│   │   ├── models/
│   │   ├── sounds/
│   │   └── fonts/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── design/                 # Design system tokens & themes
│   │   │   ├── tokens.css
│   │   │   ├── typography.css
│   │   │   ├── animations.css
│   │   │   ├── glassmorphism.css
│   │   │   └── themes.js
│   │   ├── components/             # Reusable UI primitives
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Toast.jsx
│   │   │   ├── Tooltip.jsx
│   │   │   ├── ProgressBar.jsx
│   │   │   ├── Avatar.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── Spinner.jsx
│   │   │   ├── ContextMenu.jsx
│   │   │   └── KeyHint.jsx
│   │   ├── layout/                 # Layout & overlay management
│   │   │   ├── HUDLayout.jsx
│   │   │   ├── PanelSlider.jsx
│   │   │   ├── OverlayManager.jsx
│   │   │   └── ResponsiveGuard.jsx
│   │   ├── store/
│   │   │   ├── useStore.js
│   │   │   └── useUIStore.js
│   │   ├── scenes/
│   │   │   ├── LoginScene.jsx
│   │   │   ├── DescentScene.jsx
│   │   │   ├── WorldScene.jsx
│   │   │   └── OnboardingScene.jsx
│   │   ├── world/
│   │   ├── formations/
│   │   ├── effects/
│   │   ├── player/
│   │   ├── ui/
│   │   │   ├── Observatory.jsx
│   │   │   ├── TransmissionConsole.jsx
│   │   │   ├── MessageReader.jsx
│   │   │   ├── Minimap.jsx
│   │   │   ├── MoodIndicator.jsx
│   │   │   ├── SettingsPanel.jsx
│   │   │   ├── NotificationCenter.jsx
│   │   │   ├── CommandPalette.jsx
│   │   │   ├── AchievementPopup.jsx
│   │   │   ├── WelcomeOverlay.jsx
│   │   │   └── LoadingScreen.jsx
│   │   ├── hooks/
│   │   │   ├── useWebSocket.js
│   │   │   ├── useTerrainGen.js
│   │   │   ├── useWorldData.js
│   │   │   ├── useAudio.js
│   │   │   ├── useMediaQuery.js
│   │   │   ├── useGPUTier.js
│   │   │   ├── useKeyboard.js
│   │   │   └── useAnimationQueue.js
│   │   └── shaders/
│   │       ├── terrain.vert
│   │       ├── terrain.frag
│   │       ├── glow.frag
│   │       ├── sky.frag
│   │       └── hologram.frag
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── infra/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── nginx/
│   │   └── nginx.conf
│   └── k8s/
│       ├── deployment.yaml
│       ├── service.yaml
│       └── ingress.yaml
├── docs/
│   ├── plan.md
│   ├── api-spec.yaml
│   └── design-system.md
├── .env.example
├── .gitignore
└── README.md
```

---

> **TerraForm** transforms the mundane act of reading messages into an adventure. Every inbox becomes a planet. Every message becomes a landmark. Every conversation becomes a mountain range. The database isn't just storing data — it's building worlds.

*Built with 🌋 by explorers, for explorers.*
