import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'

// The chat window shows messages, keeps the latest message in view, and handles sending text messages.
function ChatWindow({
  conversation,
  messages,
  currentUserId,
  loading,
  sending,
  draftMessage,
  onDraftChange,
  onSend,
}) {
  const messageEndRef = useRef(null)

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  return (
    <section className="chat-panel chat-panel--window">
      <div className="chat-panel__header chat-panel__header--split">
        <div>
          <h2>{conversation?.participant?.name || 'Messages'}</h2>
          <p>
            {conversation?.participant?.role
              ? `Chat with ${conversation.participant.role}`
              : 'Select a conversation to start chatting.'}
          </p>
        </div>
      </div>

      <div className="chat-window__messages">
        {loading ? (
          <div className="chat-empty-state">Loading messages...</div>
        ) : conversation ? (
          messages.length ? (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isMine={message.sender_id === currentUserId}
              />
            ))
          ) : (
            <div className="chat-empty-state">No messages yet. Send the first message below.</div>
          )
        ) : (
          <div className="chat-empty-state">Choose a conversation from the list to view messages.</div>
        )}
        <div ref={messageEndRef} />
      </div>

      <form className="chat-window__composer" onSubmit={onSend}>
        <textarea
          rows="3"
          value={draftMessage}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder={conversation ? 'Type your message...' : 'Select a conversation first'}
          disabled={!conversation || sending}
        />
        <button type="submit" disabled={!conversation || !draftMessage.trim() || sending}>
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </section>
  )
}

export default ChatWindow
