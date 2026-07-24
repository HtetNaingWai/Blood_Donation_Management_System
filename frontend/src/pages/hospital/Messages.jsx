import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ChatWindow from '../../components/chat/ChatWindow'
import ConversationList from '../../components/chat/ConversationList'
import { logout } from '../../services/authService'
import { getStoredUser } from '../../services/authStorage'
import { subscribeToConversation } from '../../services/echo'
import chatService from '../../services/chatService'
import '../../styles/chat.css'

const sidebarItems = [
  { label: 'Dashboard', icon: '📊', route: '/hospital/dashboard' },
  { label: 'Search Donors', icon: '💉', route: '/hospital/search-donors' },
  { label: 'Blood Requests', icon: '🩸', route: '/hospital/blood-requests' },
  { label: 'Messages', icon: '💬', route: '/hospital/messages' },
  { label: 'Notifications', icon: '🔔', route: '/notifications' },
  { label: 'Profile', icon: '👤', route: '/hospital/dashboard?section=Profile' },
]

function HospitalMessages() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const storedUser = getStoredUser()
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [draftMessage, setDraftMessage] = useState('')
  const [listLoading, setListLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const donorSearch = useMemo(() => searchParams.get('donorId'), [searchParams])
  const hospitalName = storedUser?.hospital?.hospital_name || storedUser?.name || 'Hospital User'
  const avatarLabel = hospitalName.slice(0, 1)

  useEffect(() => {
    let isMounted = true

    async function loadConversations() {
      setListLoading(true)
      setError('')

      try {
        const data = await chatService.listConversations()

        if (!isMounted) {
          return
        }

        setConversations(data.conversations || [])
        setActiveConversation((current) => current || data.conversations?.[0] || null)
      } catch (loadError) {
        if (isMounted) {
          setError(loadError?.response?.data?.message || 'Unable to load hospital conversations right now.')
        }
      } finally {
        if (isMounted) {
          setListLoading(false)
        }
      }
    }

    loadConversations()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!donorSearch) {
      return
    }

    async function ensureConversation() {
      try {
        const data = await chatService.createConversation({
          donor_id: Number(donorSearch),
        })

        const conversation = data?.conversation

        if (!conversation) {
          return
        }

        setConversations((current) => {
          const exists = current.some((item) => item.id === conversation.id)

          return exists ? current : [conversation, ...current]
        })
        setActiveConversation(conversation)
      } catch (loadError) {
        setError(loadError?.response?.data?.message || 'Unable to start the conversation right now.')
      }
    }

    ensureConversation()
  }, [donorSearch])

  useEffect(() => {
    if (!activeConversation?.id) {
      setMessages([])
      return
    }

    let isMounted = true

    async function loadMessages() {
      setMessagesLoading(true)

      try {
        const data = await chatService.getMessages(activeConversation.id)

        if (!isMounted) {
          return
        }

        setMessages(data.messages || [])
        await chatService.markAsRead(activeConversation.id)
      } catch (loadError) {
        if (isMounted) {
          setError(loadError?.response?.data?.message || 'Unable to load conversation messages.')
        }
      } finally {
        if (isMounted) {
          setMessagesLoading(false)
        }
      }
    }

    loadMessages()

    return () => {
      isMounted = false
    }
  }, [activeConversation?.id])

  useEffect(() => {
    if (!activeConversation?.id) {
      return undefined
    }

    // Listen for newly broadcast messages so the hospital receives donor replies in real time.
    return subscribeToConversation(activeConversation.id, (event) => {
      const nextMessage = event?.chat_message

      if (!nextMessage) {
        return
      }

      setMessages((current) => (
        current.some((message) => message.id === nextMessage.id)
          ? current
          : [...current, nextMessage]
      ))

      setConversations((current) => {
        const updated = current.map((conversation) =>
          conversation.id === activeConversation.id
            ? { ...conversation, last_message: nextMessage }
            : conversation,
        )

        return updated.sort((left, right) => {
          const leftTime = new Date(left.last_message?.created_at || left.updated_at || 0).getTime()
          const rightTime = new Date(right.last_message?.created_at || right.updated_at || 0).getTime()

          return rightTime - leftTime
        })
      })

      if (nextMessage.sender_id !== storedUser?.id) {
        chatService.markAsRead(activeConversation.id).catch(() => {})
      }
    })
  }, [activeConversation?.id, storedUser?.id])

  async function handleSendMessage(event) {
    event.preventDefault()

    if (!activeConversation?.id || !draftMessage.trim()) {
      return
    }

    setSending(true)
    setError('')

    try {
      const response = await chatService.sendMessage(activeConversation.id, draftMessage.trim())
      const nextMessage = response?.chat_message

      if (nextMessage) {
        setMessages((current) => [...current, nextMessage])
        setConversations((current) => {
          const updated = current.map((conversation) =>
            conversation.id === activeConversation.id
              ? { ...conversation, last_message: nextMessage }
              : conversation,
          )

          return updated.sort((left, right) => {
            const leftTime = new Date(left.last_message?.created_at || left.updated_at || 0).getTime()
            const rightTime = new Date(right.last_message?.created_at || right.updated_at || 0).getTime()

            return rightTime - leftTime
          })
        })
      }

      setDraftMessage('')
    } catch (sendError) {
      setError(sendError?.response?.data?.message || 'Unable to send your message right now.')
    } finally {
      setSending(false)
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="dashboard-shell hospital-shell">
      <aside className="dashboard-sidebar hospital-sidebar">
        <div>
          <div className="hospital-brand">
            <span>BloodLink</span>
            <small>Clinical Portal</small>
          </div>

          <nav className="hospital-nav" aria-label="Hospital">
            {sidebarItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`hospital-nav__item${item.label === 'Messages' ? ' hospital-nav__item--active' : ''}`}
                onClick={() => navigate(item.route)}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <button type="button" className="hospital-logout" onClick={handleLogout}>
          <span aria-hidden="true">⇢</span>
          Logout
        </button>
      </aside>

      <div className="dashboard-main hospital-main">
        <header className="dashboard-topbar hospital-topbar">
          <label className="hospital-search">
            <span aria-hidden="true">⌕</span>
            <input type="text" value="Messages" readOnly />
          </label>

          <div className="hospital-topbar__actions">
            <span className="hospital-topbar__icon" aria-hidden="true">🔔</span>
            <span className="hospital-topbar__icon" aria-hidden="true">?</span>
            <div className="hospital-topbar__identity">
              <strong>{storedUser?.name || 'Hospital User'}</strong>
              <small>{hospitalName}</small>
            </div>
            <div className="hospital-topbar__avatar">{avatarLabel}</div>
          </div>
        </header>

        <main className="dashboard-content hospital-content">
          {error ? <p className="hospital-error">{error}</p> : null}

          <section className="chat-layout">
            <ConversationList
              conversations={conversations}
              activeConversationId={activeConversation?.id}
              loading={listLoading}
              onSelectConversation={setActiveConversation}
            />

            <ChatWindow
              conversation={activeConversation}
              messages={messages}
              currentUserId={storedUser?.id}
              loading={messagesLoading}
              sending={sending}
              draftMessage={draftMessage}
              onDraftChange={setDraftMessage}
              onSend={handleSendMessage}
            />
          </section>
        </main>
      </div>
    </div>
  )
}

export default HospitalMessages
