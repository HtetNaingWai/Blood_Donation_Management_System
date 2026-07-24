import http from './http'

// Shared fallback shape keeps the chat pages stable while loading or on empty responses.
export const emptyConversationResponse = {
  conversations: [],
}

export const emptyMessagesResponse = {
  conversation: null,
  messages: [],
}

const chatService = {
  getConversations: async () => {
    const { data } = await http.get('/conversations')

    return {
      ...emptyConversationResponse,
      ...data,
      conversations: data?.conversations || [],
    }
  },
  listConversations: async () => {
    return chatService.getConversations()
  },
  createConversation: async (payload) => {
    const { data } = await http.post('/conversations', payload)

    return data
  },
  getMessages: async (conversationId) => {
    const { data } = await http.get(`/conversations/${conversationId}/messages`)

    return {
      ...emptyMessagesResponse,
      ...data,
      messages: data?.messages || [],
    }
  },
  sendMessage: async (conversationId, message) => {
    const { data } = await http.post(`/conversations/${conversationId}/messages`, {
      message,
    })

    return data
  },
  markAsRead: async (conversationId) => {
    const { data } = await http.put(`/conversations/${conversationId}/read`)

    return data
  },
}

export default chatService
