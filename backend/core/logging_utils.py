import json
import traceback
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
ERROR_FILE = BASE_DIR / 'errors.log'


def _safe_write(payload: dict) -> None:
    ERROR_FILE.parent.mkdir(parents=True, exist_ok=True)
    with ERROR_FILE.open('a', encoding='utf-8') as fh:
        fh.write(json.dumps(payload, ensure_ascii=True) + '\n')


def log_error(*, service: str, module: str, function: str, error_type: str, message: str, user_id: str = '', request_id: str = '', stack_trace: str = '') -> None:
    payload = {
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'level': 'ERROR',
        'service': service,
        'module': module,
        'function': function,
        'error_type': error_type,
        'message': message,
        'user_id': user_id,
        'request_id': request_id,
        'stack_trace': stack_trace,
    }
    _safe_write(payload)


def log_exception(exc: Exception, *, service: str, module: str, function: str, user_id: str = '', request_id: str = '') -> None:
    log_error(
        service=service,
        module=module,
        function=function,
        error_type=type(exc).__name__,
        message=str(exc),
        user_id=user_id,
        request_id=request_id,
        stack_trace=''.join(traceback.format_exception(type(exc), exc, exc.__traceback__)),
    )
