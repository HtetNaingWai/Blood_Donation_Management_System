import http from './http'

// Shared notification API helper for donor and hospital dashboards.
export async function getNotifications() {
  const { data } = await http.get('/v1/notifications')

  return {
    notifications: data?.notifications || [],
    unread_count: data?.unread_count || 0,
  }
}

export async function markNotificationAsRead(notificationId) {
  const { data } = await http.put(`/v1/notifications/${notificationId}/read`)
  return data
}

export async function markAllNotificationsAsRead() {
  const { data } = await http.put('/v1/notifications/read-all')
  return data
}

const notificationService = {
  list: getNotifications,
  getNotifications,
  markAsRead: markNotificationAsRead,
  markNotificationAsRead,
  markAllAsRead: markAllNotificationsAsRead,
  markAllNotificationsAsRead,
}

export default notificationService
