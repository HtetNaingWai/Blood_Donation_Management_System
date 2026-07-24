import { useEffect, useState } from 'react'
import { subscribeToUserNotifications } from '../services/socket'
import notificationService from '../services/notificationService'

// Shared notifications hook keeps dashboard bells synced with API data and websocket pushes.
function useNotifications(userId) {
  const [notifications, setNotifications] = useState([])
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationActionLoading, setNotificationActionLoading] = useState('')
  const [notificationError, setNotificationError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadNotifications(silent = false) {
      if (!silent && isMounted) {
        setNotificationsLoading(true)
      }

      try {
        const data = await notificationService.list()

        if (!isMounted) {
          return
        }

        setNotifications(data.notifications || [])
        setUnreadNotificationCount(data.unread_count || 0)
        setNotificationError('')
      } catch (loadError) {
        if (isMounted && !silent) {
          setNotificationError(loadError?.response?.data?.message || 'Unable to load notifications right now.')
        }
      } finally {
        if (isMounted && !silent) {
          setNotificationsLoading(false)
        }
      }
    }

    loadNotifications()

    const intervalId = window.setInterval(() => {
      loadNotifications(true)
    }, 15000)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    // If the websocket is unavailable, polling above keeps notifications working without crashing the UI.
    return subscribeToUserNotifications(userId, (event) => {
      const pushed = event?.notification

      if (!pushed) {
        return
      }

      const optimisticNotification = {
        id: `realtime-${Date.now()}`,
        type: pushed.type || 'blood_request',
        title: pushed.title || 'New Notification',
        body: pushed.message || 'You have a new update.',
        request_id: pushed.request_id ?? null,
        hospital_id: pushed.hospital_id ?? null,
        hospital_name: pushed.hospital_name ?? null,
        blood_group: pushed.blood_group ?? null,
        sender_name: pushed.sender_name ?? null,
        sender_id: pushed.sender_id ?? null,
        sender_role: pushed.sender_role ?? null,
        conversation_id: pushed.conversation_id ?? null,
        message_preview: pushed.message_preview ?? null,
        is_read: false,
        read_at: null,
        age: 'Just now',
        tone: pushed.tone || 'soft',
      }

      setNotifications((current) => [optimisticNotification, ...current].slice(0, 10))
      setUnreadNotificationCount((current) => current + 1)
    })
  }, [userId])

  async function markNotificationRead(notificationId) {
    if (!notificationId) {
      return
    }

    if (String(notificationId).startsWith('realtime-')) {
      setNotifications((current) => current.map((item) => (
        item.id === notificationId
          ? { ...item, is_read: true, read_at: new Date().toISOString() }
          : item
      )))
      setUnreadNotificationCount((current) => Math.max(0, current - 1))
      return
    }

    setNotificationActionLoading(notificationId)
    setNotificationError('')

    try {
      const data = await notificationService.markAsRead(notificationId)

      setNotifications((current) => current.map((item) => (
        item.id === notificationId
          ? { ...item, is_read: true, read_at: data?.notification?.read_at || item.read_at }
          : item
      )))
      setUnreadNotificationCount(data?.unread_count || 0)
    } catch (loadError) {
      setNotificationError(loadError?.response?.data?.message || 'Unable to mark this notification as read.')
    } finally {
      setNotificationActionLoading('')
    }
  }

  async function markAllNotificationsRead() {
    setNotificationActionLoading('all')
    setNotificationError('')

    try {
      await notificationService.markAllAsRead()
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })))
      setUnreadNotificationCount(0)
    } catch (loadError) {
      setNotificationError(loadError?.response?.data?.message || 'Unable to mark notifications as read right now.')
    } finally {
      setNotificationActionLoading('')
    }
  }

  return {
    notifications,
    unreadNotificationCount,
    notificationsLoading,
    notificationActionLoading,
    notificationError,
    setNotifications,
    setUnreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
  }
}

export default useNotifications
