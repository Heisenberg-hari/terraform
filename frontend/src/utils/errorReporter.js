import { API_BASE } from '../api/client'

async function postClientError(payload) {
  try {
    await fetch(`${API_BASE}/api/core/client-error/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    // Last-resort fallback: avoid infinite logging loops.
  }
}

export function installGlobalErrorHandlers() {
  window.addEventListener('error', (event) => {
    postClientError({
      module: 'frontend',
      function: 'window.error',
      error_type: event.error?.name || 'ClientError',
      message: event.message || 'Unhandled window error',
      stack_trace: event.error?.stack || '',
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    postClientError({
      module: 'frontend',
      function: 'window.unhandledrejection',
      error_type: reason?.name || 'UnhandledPromiseRejection',
      message: reason?.message || String(reason || 'Promise rejected'),
      stack_trace: reason?.stack || '',
    })
  })
}
