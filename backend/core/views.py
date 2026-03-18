from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .logging_utils import log_error, log_exception
from .serializers import RegisterSerializer, UserSerializer


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)

    log_error(
        service='backend',
        module='auth',
        function='register',
        error_type='ValidationError',
        message=str(serializer.errors),
        request_id=request.headers.get('X-Request-ID', ''),
    )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def me(request):
    return Response(UserSerializer(request.user).data)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def log_client_error(request):
    try:
        payload = request.data
        log_error(
            service='frontend',
            module=payload.get('module', 'ui'),
            function=payload.get('function', 'window.onerror'),
            error_type=payload.get('error_type', 'ClientError'),
            message=payload.get('message', 'Unknown client error'),
            user_id=str(payload.get('user_id', '')),
            request_id=request.headers.get('X-Request-ID', ''),
            stack_trace=payload.get('stack_trace', ''),
        )
        return Response({'status': 'logged'})
    except Exception as exc:
        log_exception(exc, service='backend', module='auth', function='log_client_error')
        return Response({'detail': 'Unable to log client error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
