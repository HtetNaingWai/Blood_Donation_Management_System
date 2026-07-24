import { useEffect, useRef, useState } from 'react'

// Compact notification bell dropdown reused across donor and hospital portal pages.
function NotificationDropdown({
  notifications,
  unreadCount,
  loading,
  actionLoading,
  onMarkAsRead,
  onNotificationClick,
  onViewAll,
  variant = 'donor',
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    function handleDocumentClick(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleDocumentClick)

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick)
    }
  }, [])

  const panelClass = variant === 'hospital'
    ? 'notification-dropdown notification-dropdown--hospital'
    : 'notification-dropdown notification-dropdown--donor'

  return (
    <div className={panelClass} ref={rootRef}>
      <button
        type="button"
        className={`${variant}-topbar__icon ${variant}-topbar__icon--button notification-dropdown__trigger`}
        onClick={() => setOpen((current) => !current)}
        aria-label={unreadCount ? `${unreadCount} unread notifications` : 'Notifications'}
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount ? (
          <span className="dashboard-notification-badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="notification-dropdown__panel">
          <div className="notification-dropdown__header">
            <div>
              <strong>Notifications</strong>
              <small>{unreadCount} unread</small>
            </div>
            <button type="button" onClick={onViewAll}>View all</button>
          </div>

          <div className="notification-dropdown__list">
            {loading && !notifications.length ? (
              <div className="notification-dropdown__empty">Loading notifications...</div>
            ) : notifications.length ? (
              notifications.slice(0, 5).map((notification) => (
                <article
                  className={`notification-dropdown__item${notification.is_read ? '' : ' notification-dropdown__item--unread'}`}
                  key={notification.id || notification.title}
                >
                  <button
                    type="button"
                    className="notification-dropdown__item-button"
                    onClick={async () => {
                      if (!notification.is_read) {
                        await onMarkAsRead?.(notification.id)
                      }

                      setOpen(false)
                      onNotificationClick?.(notification)
                    }}
                  >
                    <strong>{notification.title}</strong>
                    <p>{notification.body}</p>
                    <small>{notification.age}</small>
                  </button>

                  {!notification.is_read ? (
                    <button
                      type="button"
                      className="notification-dropdown__mark"
                      onClick={() => onMarkAsRead?.(notification.id)}
                      disabled={actionLoading === notification.id}
                    >
                      {actionLoading === notification.id ? '...' : 'Read'}
                    </button>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="notification-dropdown__empty">No notifications yet.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default NotificationDropdown
