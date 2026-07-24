function formatTime(value) {
  if (!value) {
    return ''
  }

  try {
    return new Date(value).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

// Individual message bubbles render differently depending on whether the current user sent the message.
function MessageBubble({ message, isMine }) {
  return (
    <article className={`chat-bubble${isMine ? ' chat-bubble--mine' : ' chat-bubble--other'}`}>
      <div className="chat-bubble__meta">
        <strong>{isMine ? 'You' : message.sender_name || 'Participant'}</strong>
        <span>{formatTime(message.created_at)}</span>
      </div>
      <p>{message.message}</p>
    </article>
  )
}

export default MessageBubble
