import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { fetchMe, fetchMyWorld, loginUser, registerUser } from './api/auth'
import { apiFetch } from './api/client'
import { fetchInboxMessages, fetchSentMessages, markMessageRead } from './api/messages'
import { useRealtime } from './hooks/useRealtime'
import { addContact, listContacts, removeContact, searchUsers } from './api/observatory'
import { useAuthStore } from './store/useAuthStore'
import { useWorldStore } from './store/useWorldStore'

const WorldExplorer = lazy(() => import('./world/WorldExplorer'))

export default function App() {
  const { formations, setFormations, prependFormation, loading, setLoading } = useWorldStore()
  const { user, world, isAuthenticated, setSession, clearSession, setUser, setWorld } = useAuthStore()

  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ username: '', display_name: '', password: '' })

  const [receiver, setReceiver] = useState('')
  const [receiverUsername, setReceiverUsername] = useState('')
  const [content, setContent] = useState('')

  const [error, setError] = useState('')
  const [authError, setAuthError] = useState('')

  const [contacts, setContacts] = useState([])
  const [presenceByUser, setPresenceByUser] = useState({})
  const [typingByUser, setTypingByUser] = useState({})
  const [inboxMessages, setInboxMessages] = useState([])
  const [sentMessages, setSentMessages] = useState([])
  const [contactQuery, setContactQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [liveMessage, setLiveMessage] = useState('')
  const [worldView, setWorldView] = useState('explorer')
  const typingTimersRef = useRef({})
  const typingStopTimerRef = useRef(null)
  const typingActiveRef = useRef(false)
  const typingTargetRef = useRef({ userId: '', username: '' })

  const accessToken = localStorage.getItem('terraform_access_token')
  const presenceUserIds = useMemo(
    () => contacts.map((c) => String(c.contact_id || c.id)),
    [contacts]
  )

  const { status: realtimeStatus, sendEvent } = useRealtime({
    enabled: isAuthenticated,
    accessToken,
    presenceUserIds,
    onMessage: (message) => {
      prependFormation(message)
      setInboxMessages((prev) => [{ ...message, is_read: false }, ...prev])
      setLiveMessage(`New message terrain: ${message.terrain_type} (${message.sentiment_label})`)
    },
    onPresence: (userPresence) => {
      if (!userPresence?.id) return
      setPresenceByUser((prev) => ({ ...prev, [userPresence.id]: Boolean(userPresence.is_online) }))
    },
    onMessageRead: (message) => {
      setSentMessages((prev) =>
        prev.map((item) =>
          String(item.id) === String(message.id)
            ? { ...item, is_read: true, read_at: message.read_at }
            : item
        )
      )
    },
    onMessageDelivered: (message) => {
      setSentMessages((prev) =>
        prev.map((item) =>
          String(item.id) === String(message.id)
            ? { ...item, delivered_at: message.delivered_at }
            : item
        )
      )
    },
    onTyping: (typing) => {
      const fromUserId = String(typing?.from_user_id || '')
      if (!fromUserId) return
      const isTyping = Boolean(typing?.is_typing)
      setTypingByUser((prev) => ({ ...prev, [fromUserId]: isTyping }))

      const existing = typingTimersRef.current[fromUserId]
      if (existing) clearTimeout(existing)

      if (isTyping) {
        typingTimersRef.current[fromUserId] = setTimeout(() => {
          setTypingByUser((prev) => ({ ...prev, [fromUserId]: false }))
        }, 2500)
      }
    },
  })

  useEffect(() => {
    async function bootstrap() {
      if (!localStorage.getItem('terraform_access_token')) return
      try {
        const me = await fetchMe()
        setUser(me)
        const myWorld = await fetchMyWorld()
        setWorld(myWorld)
      } catch {
        clearSession()
      }
    }
    bootstrap()
  }, [clearSession, setUser, setWorld])

  useEffect(() => {
    if (!isAuthenticated) return
    refreshContacts()
    refreshMessages()
  }, [isAuthenticated])

  const selectedContactLabel = useMemo(() => {
    if (!receiver) return ''
    const match = contacts.find((c) => String(c.contact_id || c.id) === String(receiver))
    return match ? (match.display_name || match.username) : ''
  }, [contacts, receiver])
  const selectedContactId = useMemo(() => String(receiver || ''), [receiver])

  const unreadCount = useMemo(
    () => inboxMessages.filter((m) => m.is_read === false).length,
    [inboxMessages]
  )

  useEffect(() => {
    return () => {
      Object.values(typingTimersRef.current).forEach((timer) => clearTimeout(timer))
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    const nextTarget = { userId: String(receiver || ''), username: receiver ? '' : receiverUsername.trim() }
    const prevTarget = typingTargetRef.current
    const targetChanged = prevTarget.userId !== nextTarget.userId || prevTarget.username !== nextTarget.username

    if (typingActiveRef.current && targetChanged && (prevTarget.userId || prevTarget.username)) {
      sendEvent({
        type: 'typing.stop',
        target_user_id: prevTarget.userId || undefined,
        target_username: prevTarget.userId ? undefined : prevTarget.username || undefined,
      })
      typingActiveRef.current = false
    }
    typingTargetRef.current = nextTarget
  }, [isAuthenticated, receiver, receiverUsername, sendEvent])

  useEffect(() => {
    if (!isAuthenticated) return
    const target = typingTargetRef.current
    const hasTarget = Boolean(target.userId || target.username)
    const hasText = Boolean(content.trim())

    if (!hasTarget) return

    if (hasText && !typingActiveRef.current) {
      sendEvent({
        type: 'typing.start',
        target_user_id: target.userId || undefined,
        target_username: target.userId ? undefined : target.username || undefined,
      })
      typingActiveRef.current = true
    }

    if (!hasText && typingActiveRef.current) {
      sendEvent({
        type: 'typing.stop',
        target_user_id: target.userId || undefined,
        target_username: target.userId ? undefined : target.username || undefined,
      })
      typingActiveRef.current = false
      return
    }

    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current)
    if (hasText) {
      typingStopTimerRef.current = setTimeout(() => {
        const currentTarget = typingTargetRef.current
        sendEvent({
          type: 'typing.stop',
          target_user_id: currentTarget.userId || undefined,
          target_username: currentTarget.userId ? undefined : currentTarget.username || undefined,
        })
        typingActiveRef.current = false
      }, 1300)
    }
  }, [content, isAuthenticated, sendEvent])

  async function refreshContacts() {
    setContactsLoading(true)
    try {
      const data = await listContacts()
      setContacts(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setContactsLoading(false)
    }
  }

  async function refreshMessages() {
    try {
      const [inbox, sent] = await Promise.all([fetchInboxMessages(), fetchSentMessages()])
      setInboxMessages(inbox)
      setSentMessages(sent)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSearchUsers() {
    if (!contactQuery.trim()) {
      setSearchResults([])
      return
    }
    try {
      const results = await searchUsers(contactQuery)
      setSearchResults(results)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleAddContact(userId) {
    try {
      await addContact(userId)
      await refreshContacts()
      await handleSearchUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleRemoveContact(contactId) {
    try {
      await removeContact(contactId)
      await refreshContacts()
      if (String(receiver) === String(contactId)) {
        setReceiver('')
      }
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleAuth(event) {
    event.preventDefault()
    setAuthError('')
    try {
      if (authMode === 'register') {
        const payload = await registerUser(authForm)
        setSession({ access: payload.access, refresh: payload.refresh })
        setUser(payload.user)
      } else {
        const payload = await loginUser(authForm)
        setSession({ access: payload.access, refresh: payload.refresh })
        const me = await fetchMe()
        setUser(me)
      }
      const myWorld = await fetchMyWorld()
      setWorld(myWorld)
      await refreshContacts()
      await refreshMessages()
    } catch (err) {
      setAuthError(err.message)
    }
  }

  async function loadTerrain() {
    setError('')
    setLoading(true)
    try {
      const data = await apiFetch('/api/world/snapshot/')
      setFormations(data.formations || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkRead(messageId) {
    try {
      const response = await markMessageRead(messageId)
      setInboxMessages((prev) =>
        prev.map((item) =>
          String(item.id) === String(messageId)
            ? { ...item, is_read: true, read_at: response?.read_at || item.read_at || new Date().toISOString() }
            : item
        )
      )
    } catch (err) {
      setError(err.message)
    }
  }

  async function sendMessage(event) {
    event.preventDefault()
    setError('')
    try {
      const msg = await apiFetch('/api/messages/send/', {
        method: 'POST',
        body: JSON.stringify({ receiver, receiver_username: receiverUsername, content }),
      })
      prependFormation({
        id: msg.id,
        terrain_type: msg.terrain_type,
        sentiment_label: msg.sentiment_label,
        elevation: msg.elevation,
        lat: msg.latitude,
        lon: msg.longitude,
        content_preview: msg.content?.slice(0, 80) || '',
      })
      setContent('')
      setSentMessages((prev) => [msg, ...prev])
      const target = typingTargetRef.current
      if (typingActiveRef.current && (target.userId || target.username)) {
        sendEvent({
          type: 'typing.stop',
          target_user_id: target.userId || undefined,
          target_username: target.userId ? undefined : target.username || undefined,
        })
        typingActiveRef.current = false
      }
    } catch (err) {
      setError(err.message)
    }
  }

  function deliveryLabel(item) {
    if (item.is_read) return 'Read'
    if (item.delivered_at) return 'Delivered'
    return 'Sent'
  }

  function logout() {
    const target = typingTargetRef.current
    if (typingActiveRef.current && (target.userId || target.username)) {
      sendEvent({
        type: 'typing.stop',
        target_user_id: target.userId || undefined,
        target_username: target.userId ? undefined : target.username || undefined,
      })
    }
    clearSession()
    setFormations([])
    setReceiver('')
    setReceiverUsername('')
    setContent('')
    setContacts([])
    setPresenceByUser({})
    setTypingByUser({})
    setInboxMessages([])
    setSentMessages([])
    setSearchResults([])
    setError('')
  }

  if (!isAuthenticated) {
    return (
      <div className="app-shell">
        <header className="hero">
          <h1>TerraForm</h1>
          <p>Sign in to generate and explore your message world.</p>
        </header>
        <main className="layout" style={{ gridTemplateColumns: '1fr' }}>
          <section className="panel" style={{ maxWidth: 520, margin: '0 auto' }}>
            <h2>{authMode === 'register' ? 'Create Account' : 'Login'}</h2>
            <form onSubmit={handleAuth}>
              <label className="field">
                Username
                <input
                  value={authForm.username}
                  onChange={(e) => setAuthForm((prev) => ({ ...prev, username: e.target.value }))}
                  required
                />
              </label>

              {authMode === 'register' ? (
                <label className="field">
                  Display Name
                  <input
                    value={authForm.display_name}
                    onChange={(e) => setAuthForm((prev) => ({ ...prev, display_name: e.target.value }))}
                  />
                </label>
              ) : null}

              <label className="field">
                Password
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm((prev) => ({ ...prev, password: e.target.value }))}
                  required
                />
              </label>

              <button className="btn" type="submit">
                {authMode === 'register' ? 'Register + Enter World' : 'Login'}
              </button>
            </form>

            <p>
              {authMode === 'register' ? 'Already have an account?' : 'Need an account?'}{' '}
              <button
                type="button"
                className="btn"
                onClick={() => setAuthMode((prev) => (prev === 'register' ? 'login' : 'register'))}
                style={{ marginLeft: 8 }}
              >
                {authMode === 'register' ? 'Switch to Login' : 'Switch to Register'}
              </button>
            </p>
            {authError ? <p role="alert">{authError}</p> : null}
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <h1>TerraForm</h1>
        <p>Welcome {user?.display_name || user?.username}. Messages become terrain formations.</p>
        <p>Realtime: {realtimeStatus} | Unread: {unreadCount}</p>
      </header>

      <main className="layout">
        <section className="panel">
          <h2>Transmission Console</h2>
          {world ? (
            <p>
              World Seed: {world.seed} | Biome: {world.biome} | Radius: {world.radius}
            </p>
          ) : null}
          <form onSubmit={sendMessage}>
            <label className="field">
              Receiver (from Contacts)
              <select value={receiver} onChange={(e) => setReceiver(e.target.value)}>
                <option value="">Select contact</option>
                {contacts.map((c) => (
                  <option key={c.contact_id || c.id} value={c.contact_id || c.id}>
                    {c.display_name || c.username} ({c.username})
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Receiver Username (fallback)
              <input
                value={receiverUsername}
                onChange={(e) => setReceiverUsername(e.target.value)}
                placeholder="username"
              />
            </label>
            {selectedContactLabel ? <p>Selected Contact: {selectedContactLabel}</p> : null}
            {selectedContactId && typingByUser[selectedContactId] ? <p>{selectedContactLabel || 'Contact'} is typing...</p> : null}
            <label className="field">
              Message
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write a message..."
                required
              />
            </label>
            <button className="btn" type="submit">Send Formation</button>
          </form>
          <hr />
          <button className="btn" type="button" onClick={loadTerrain} disabled={loading}>
            {loading ? 'Loading...' : 'Load Terrain Snapshot'}
          </button>
          <button className="btn" type="button" onClick={logout} style={{ marginLeft: 8 }}>
            Logout
          </button>
          {error ? <p role="alert">{error}</p> : null}
          {liveMessage ? <p>{liveMessage}</p> : null}
        </section>

        <section className="panel">
          <h2>Observatory</h2>
          <div className="field">
            <label htmlFor="search-user">Search Users</label>
            <input
              id="search-user"
              value={contactQuery}
              onChange={(e) => setContactQuery(e.target.value)}
              placeholder="Find by username"
            />
            <button className="btn" type="button" onClick={handleSearchUsers}>Search</button>
          </div>

          <h3>Search Results</h3>
          <div className="formations">
            {searchResults.map((u) => (
              <article className="card" key={u.id}>
                <div className="meta">
                  <span>{u.display_name || u.username}</span>
                  <span>@{u.username}</span>
                </div>
                <button className="btn" type="button" onClick={() => handleAddContact(u.id)}>
                  {u.is_contact ? 'Update Contact' : 'Add Contact'}
                </button>
              </article>
            ))}
            {!searchResults.length ? <p>No users searched yet.</p> : null}
          </div>

          <h3>Your Contacts {contactsLoading ? '(Loading...)' : ''}</h3>
          <div className="formations">
            {contacts.map((c) => (
              <article className="card" key={c.contact_id || c.id}>
                <div className="meta">
                  <span>{c.display_name || c.username}</span>
                  <span>
                    @{c.username} {presenceByUser[String(c.contact_id || c.id)] ? '(Online)' : '(Offline)'} {typingByUser[String(c.contact_id || c.id)] ? '(Typing...)' : ''}
                  </span>
                </div>
                <div>
                  <button className="btn" type="button" onClick={() => { setReceiver(c.contact_id || c.id); setReceiverUsername(c.username) }}>
                    Set Receiver
                  </button>
                  <button className="btn" type="button" style={{ marginLeft: 8 }} onClick={() => handleRemoveContact(c.contact_id || c.id)}>
                    Remove
                  </button>
                </div>
              </article>
            ))}
            {!contacts.length ? <p>No contacts yet.</p> : null}
          </div>
        </section>

        <section className="panel">
          <h2>World Formations</h2>
          <div className="field">
            <button className="btn" type="button" onClick={() => setWorldView((prev) => (prev === 'explorer' ? 'list' : 'explorer'))}>
              {worldView === 'explorer' ? 'Switch to List View' : 'Switch to Explorer View'}
            </button>
          </div>
          {worldView === 'explorer' ? (
            <Suspense fallback={<p>Loading explorer...</p>}>
              <WorldExplorer formations={formations} unreadCount={unreadCount} realtimeStatus={realtimeStatus} />
            </Suspense>
          ) : null}
          {worldView === 'list' ? (
            <div className="formations">
              {formations.map((item) => (
                <article className="card" key={item.id}>
                  <div className="meta">
                    <span>{item.terrain_type}</span>
                    <span>{item.sentiment_label}</span>
                  </div>
                  <p>{item.content_preview}</p>
                  <small>Elevation: {item.elevation} | {item.lat}, {item.lon}</small>
                </article>
              ))}
              {!formations.length ? <p>No formations loaded yet.</p> : null}
            </div>
          ) : null}
        </section>

        <section className="panel">
          <h2>Message Center</h2>
          <h3>Inbox ({unreadCount} unread)</h3>
          <div className="formations">
            {inboxMessages.slice(0, 30).map((item) => (
              <article className="card" key={`inbox-${item.id}`}>
                <div className="meta">
                  <span>{item.is_read ? 'Read' : 'Unread'}</span>
                  <span>{item.sentiment_label || 'NEUTRAL'}</span>
                </div>
                <p>{item.content_preview || item.content || ''}</p>
                {!item.is_read ? (
                  <button className="btn" type="button" onClick={() => handleMarkRead(item.id)}>
                    Mark Read
                  </button>
                ) : null}
              </article>
            ))}
            {!inboxMessages.length ? <p>No inbox messages yet.</p> : null}
          </div>

          <h3>Sent</h3>
          <div className="formations">
            {sentMessages.slice(0, 30).map((item) => (
              <article className="card" key={`sent-${item.id}`}>
                <div className="meta">
                  <span>To: {item.receiver}</span>
                  <span>{deliveryLabel(item)}</span>
                </div>
                <p>{item.content_preview || item.content || ''}</p>
                <small>
                  Sent: {item.created_at || '-'} | Delivered: {item.delivered_at || '-'} | Read: {item.read_at || '-'}
                </small>
              </article>
            ))}
            {!sentMessages.length ? <p>No sent messages yet.</p> : null}
          </div>
        </section>
      </main>

      <footer className="footer">Observatory phase: search users, manage contacts, and route transmissions faster.</footer>
    </div>
  )
}
