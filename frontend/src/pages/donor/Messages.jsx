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
  { label: 'Dashboard', icon: '📊', route: '/donor/dashboard' },
  { label: 'Donations', icon: '💉', route: '/donor/dashboard' },
  { label: 'Blood Requests', icon: '🩸', route: '/donor/blood-requests' },
  { label: 'Search Hospital', icon: '🏨', route: '/donor/dashboard' },
  { label: 'Messages', icon: '💬', route: '/donor/messages' },
  { label: 'Notifications', icon: '🔔', route: '/notifications' },
  { label: 'Profile', icon: '👤', route: '/donor/dashboard' },
]

function DonorMessages() {
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

  const conversationSearch = useMemo(() => searchParams.get('hospitalId'), [searchParams])
  const donorName = storedUser?.name?.split(' ')[0] || 'Donor'

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
          setError(loadError?.response?.data?.message || 'Unable to load your conversations right now.')
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
    if (!conversationSearch) {
      return
    }

    async function ensureConversation() {
      try {
        const data = await chatService.createConversation({
          hospital_id: Number(conversationSearch),
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
  }, [conversationSearch])

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

    // Listen for newly broadcast messages so the donor sees hospital replies without refreshing the page.
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
    <div className="dashboard-shell donor-shell">
      <aside className="dashboard-sidebar donor-sidebar">
        <div>
          <div className="donor-brand">
            <span>BloodLink</span>
            <small>Clinical Portal</small>
          </div>

          <nav className="donor-nav" aria-label="Donor">
            {sidebarItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`donor-nav__item${item.label === 'Messages' ? ' donor-nav__item--active' : ''}`}
                onClick={() => navigate(item.route)}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <button type="button" className="donor-logout" onClick={handleLogout}>
          <span aria-hidden="true">⇨</span>
          Logout
        </button>
      </aside>

      <div className="dashboard-main donor-main">
        <header className="dashboard-topbar donor-topbar">
          <label className="donor-search">
            <span aria-hidden="true">🔎</span>
            <input type="text" value="Messages" readOnly />
          </label>

          <div className="donor-topbar__actions">
            <span className="donor-topbar__icon" aria-hidden="true">🔔</span>
            <div className="donor-topbar__avatar">{donorName.slice(0, 1)}</div>
          </div>
        </header>

        <main className="dashboard-content donor-content">
          {error ? <p className="donor-error">{error}</p> : null}

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

export default DonorMessages
