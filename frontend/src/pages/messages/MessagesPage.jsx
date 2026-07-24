import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ChatWindow from '../../components/chat/ChatWindow'
import ConversationList from '../../components/chat/ConversationList'
import { logout } from '../../services/authService'
import { getStoredUser } from '../../services/authStorage'
import chatService from '../../services/chatService'
import { subscribeToConversation } from '../../services/echo'
import '../../styles/chat.css'

const donorSidebarItems = [
  { label: 'Dashboard', icon: '📊', route: '/donor/dashboard' },
  { label: 'Donations', icon: '💉', route: '/donor/dashboard' },
  { label: 'Blood Requests', icon: '🩸', route: '/donor/blood-requests' },
  { label: 'Search Hospital', icon: '🏨', route: '/donor/dashboard' },
  { label: 'Messages', icon: '💬', route: '/messages' },
  { label: 'Notifications', icon: '🔔', route: '/notifications' },
  { label: 'Profile', icon: '👤', route: '/donor/dashboard' },
]

const hospitalSidebarItems = [
  { label: 'Dashboard', icon: '📊', route: '/hospital/dashboard' },
  { label: 'Search Donors', icon: '💉', route: '/hospital/search-donors' },
  { label: 'Blood Requests', icon: '🩸', route: '/hospital/blood-requests' },
  { label: 'Messages', icon: '💬', route: '/messages' },
  { label: 'Notifications', icon: '🔔', route: '/notifications' },
  { label: 'Profile', icon: '👤', route: '/hospital/dashboard?section=Profile' },
]

// Shared REST chat page used by both donors and approved hospitals.
function MessagesPage() {
  const navigate = useNavigate()
  const { id: routeConversationId } = useParams()
  const storedUser = getStoredUser()
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [draftMessage, setDraftMessage] = useState('')
  const [listLoading, setListLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const isHospital = storedUser?.role === 'hospital'
  const shellClass = isHospital ? 'hospital' : 'donor'
  const sidebarItems = isHospital ? hospitalSidebarItems : donorSidebarItems
  const userLabel = isHospital
    ? storedUser?.hospital?.hospital_name || storedUser?.name || 'Hospital User'
    : storedUser?.name?.split(' ')[0] || 'Donor'

  useEffect(() => {
    let isMounted = true

    async function loadConversations() {
      setListLoading(true)
      setError('')

      try {
        const data = await chatService.getConversations()

        if (!isMounted) {
          return
        }

        const nextConversations = data.conversations || []
        setConversations(nextConversations)

        const routeTargetId = routeConversationId ? Number(routeConversationId) : null
        const routeConversation = routeTargetId
          ? nextConversations.find((conversation) => conversation.id === routeTargetId)
          : null

        setActiveConversation(routeConversation || nextConversations[0] || null)
      } catch (loadError) {
        if (isMounted) {
          setError(loadError?.response?.data?.message || 'Unable to load conversations right now.')
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
  }, [routeConversationId])

  useEffect(() => {
    if (!activeConversation?.id) {
      setMessages([])
      return
    }

    let isMounted = true

    async function loadMessages() {
      setMessagesLoading(true)
      setError('')

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

    // Append broadcast messages live, but keep the page usable even if the websocket is disconnected.
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
        const updated = current.map((conversation) => (
          conversation.id === activeConversation.id
            ? { ...conversation, last_message: nextMessage, updated_at: nextMessage.created_at }
            : conversation
        ))

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

  const topbarLabel = useMemo(
    () => activeConversation?.participant?.name || 'Messages',
    [activeConversation?.participant?.name],
  )

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
          const updated = current.map((conversation) => (
            conversation.id === activeConversation.id
              ? { ...conversation, last_message: nextMessage, updated_at: nextMessage.created_at }
              : conversation
          ))

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

  function handleSelectConversation(conversation) {
    setActiveConversation(conversation)
    navigate(`/messages/${conversation.id}`)
  }

  return (
    <div className={`dashboard-shell ${shellClass}-shell`}>
      <aside className={`dashboard-sidebar ${shellClass}-sidebar`}>
        <div>
          <div className={`${shellClass}-brand`}>
            <span>BloodLink</span>
            <small>Clinical Portal</small>
          </div>

          <nav className={`${shellClass}-nav`} aria-label={isHospital ? 'Hospital' : 'Donor'}>
            {sidebarItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`${shellClass}-nav__item${item.label === 'Messages' ? ` ${shellClass}-nav__item--active` : ''}`}
                onClick={() => navigate(item.route)}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <button type="button" className={`${shellClass}-logout`} onClick={handleLogout}>
          <span aria-hidden="true">{isHospital ? '⇢' : '⇨'}</span>
          Logout
        </button>
      </aside>

      <div className={`dashboard-main ${shellClass}-main`}>
        <header className={`dashboard-topbar ${shellClass}-topbar`}>
          <label className={isHospital ? 'hospital-search' : 'donor-search'}>
            <span aria-hidden="true">{isHospital ? '⌕' : '🔎'}</span>
            <input type="text" value={topbarLabel} readOnly />
          </label>

          <div className={`${shellClass}-topbar__actions`}>
            <span className={`${shellClass}-topbar__icon`} aria-hidden="true">💬</span>
            <div className={`${shellClass}-topbar__avatar`}>{userLabel.slice(0, 1)}</div>
          </div>
        </header>

        <main className={`dashboard-content ${shellClass}-content`}>
          {error ? <p className={`${shellClass}-error`}>{error}</p> : null}

          <section className="chat-layout">
            <ConversationList
              conversations={conversations}
              activeConversationId={activeConversation?.id}
              loading={listLoading}
              onSelectConversation={handleSelectConversation}
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

export default MessagesPage
