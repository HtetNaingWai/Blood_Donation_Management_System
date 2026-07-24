function previewText(conversation) {
  const content = conversation?.last_message?.message?.trim()

  if (!content) {
    return 'No messages yet.'
  }

  return content.length > 72 ? `${content.slice(0, 72)}...` : content
}

// The conversation list keeps previous donor-hospital threads easy to reopen from one place.
function ConversationList({ conversations, activeConversationId, loading, onSelectConversation }) {
  return (
    <section className="chat-panel chat-panel--list">
      <div className="chat-panel__header">
        <h2>Conversations</h2>
        <p>Open a previous donor-hospital conversation.</p>
      </div>

      <div className="chat-conversation-list">
        {loading ? (
          <div className="chat-empty-state">Loading conversations...</div>
        ) : conversations.length ? (
          conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              className={`chat-conversation-card${activeConversationId === conversation.id ? ' chat-conversation-card--active' : ''}`}
              onClick={() => onSelectConversation(conversation)}
            >
              <div className="chat-conversation-card__top">
                <strong>{conversation.participant?.name || 'Participant'}</strong>
                <span>{conversation.participant?.role || 'chat'}</span>
              </div>
              <p>{previewText(conversation)}</p>
            </button>
          ))
        ) : (
          <div className="chat-empty-state">No conversations found yet.</div>
        )}
      </div>
    </section>
  )
}

export default ConversationList
