import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { API_BASE } from '../api/client'

function toWsBaseUrl(httpBase) {
  if (httpBase.startsWith('https://')) return httpBase.replace('https://', 'wss://')
  if (httpBase.startsWith('http://')) return httpBase.replace('http://', 'ws://')
  return httpBase
}

export function useRealtime({
  enabled,
  accessToken,
  presenceUserIds,
  onMessage,
  onPresence,
  onMessageRead,
  onMessageDelivered,
  onTyping,
}) {
  const [status, setStatus] = useState('disconnected')
  const wsRef = useRef(null)
  const retryRef = useRef(null)

  const wsUrl = useMemo(() => {
    const base = toWsBaseUrl(API_BASE)
    if (!accessToken) return null
    return `${base}/ws/realtime/?token=${encodeURIComponent(accessToken)}`
  }, [accessToken])

  useEffect(() => {
    if (!enabled || !wsUrl) return

    let isCancelled = false

    const connect = () => {
      if (isCancelled) return
      setStatus('connecting')
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setStatus('connected')
        if (presenceUserIds?.length) {
          ws.send(JSON.stringify({ type: 'presence.subscribe', user_ids: presenceUserIds }))
        }
      }

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          if (payload.type === 'message.received') onMessage?.(payload.message)
          if (payload.type === 'presence.update') onPresence?.(payload.user)
          if (payload.type === 'message.read') onMessageRead?.(payload.message)
          if (payload.type === 'message.delivered') onMessageDelivered?.(payload.message)
          if (payload.type === 'typing.update') onTyping?.(payload.typing)
          if (payload.type === 'presence.snapshot' && Array.isArray(payload.users)) {
            payload.users.forEach((u) => onPresence?.(u))
          }
        } catch {
          // Ignore malformed websocket payloads.
        }
      }

      ws.onclose = () => {
        setStatus('disconnected')
        if (!isCancelled) {
          retryRef.current = setTimeout(connect, 2000)
        }
      }

      ws.onerror = () => {
        setStatus('error')
      }
    }

    connect()

    return () => {
      isCancelled = true
      if (retryRef.current) clearTimeout(retryRef.current)
      if (wsRef.current && wsRef.current.readyState <= 1) {
        wsRef.current.close()
      }
    }
  }, [enabled, wsUrl])

  useEffect(() => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: 'presence.subscribe', user_ids: presenceUserIds || [] }))
  }, [presenceUserIds])

  const sendEvent = useCallback((payload) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return false
    ws.send(JSON.stringify(payload))
    return true
  }, [])

  return { status, sendEvent }
}
