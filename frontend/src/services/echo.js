import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { getStoredToken } from './authStorage'

window.Pusher = Pusher

let echoInstance = null

function createEcho() {
  const scheme = import.meta.env.VITE_REVERB_SCHEME || 'http'
  const port = Number(import.meta.env.VITE_REVERB_PORT || 8080)

  return new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY || 'lifeblood-local-key',
    wsHost: import.meta.env.VITE_REVERB_HOST || '127.0.0.1',
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: import.meta.env.VITE_BROADCAST_AUTH_ENDPOINT || '/broadcasting/auth',
    auth: {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${getStoredToken() || ''}`,
      },
    },
  })
}

// Reuse a single Echo instance so every page subscribes through the same websocket connection.
export function getEcho() {
  if (!echoInstance) {
    echoInstance = createEcho()
  }

  return echoInstance
}

// Subscribe to one private donor-hospital conversation channel and clean it up when the page changes.
export function subscribeToConversation(conversationId, callback) {
  const echo = getEcho()
  const channelName = `conversation.${conversationId}`

  echo.private(channelName).listen('.message.sent', callback)

  return () => {
    echo.leave(channelName)
  }
}

// Subscribe to a private per-user notification channel so dashboard badges update in real time.
export function subscribeToUserNotifications(userId, callback) {
  if (!userId) {
    return () => {}
  }

  const echo = getEcho()
  const channelName = `user.${userId}`
  const channel = echo.private(channelName)

  channel.listen('.blood-request.created', callback)
  channel.listen('.notification.created', callback)

  return () => {
    echo.leave(channelName)
  }
}
