import traceback
from rest_framework.views import exception_handler
from .logging_utils import log_error


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)

    request = context.get('request')
    view = context.get('view')
    user_id = str(getattr(getattr(request, 'user', None), 'id', '')) if request else ''

    log_error(
        service='backend',
        module='api',
        function=getattr(view, '__class__', type('V', (), {})).__name__,
        error_type=type(exc).__name__,
        message=str(exc),
        user_id=user_id,
        request_id=(request.headers.get('X-Request-ID', '') if request else ''),
        stack_trace=''.join(traceback.format_exception(type(exc), exc, exc.__traceback__)),
    )

    if response is None:
        return response

    if response.status_code >= 500:
        response.data = {'detail': 'Internal server error'}
    return response
