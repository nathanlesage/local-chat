// Conversation store
import { defineStore } from 'pinia'
import type { Conversation } from 'src/main/ConversationManager'
import { ref, computed } from 'vue'
import { DateTime } from 'luxon'

const ipcRenderer = window.ipc

export interface ConversationsYearMonth {
  year: number
  month: number
  date: number
  conversations: Conversation[]
}

/**
 * This store handles everything relating to the available conversations.
 */
export const useConversationStore = defineStore('conversation-store', () => {
  const conversations = ref<Conversation[]>([])
  const activeConversation = ref<string|undefined>(undefined)

  const currentConversation = computed<Conversation|undefined>(() => {
    return conversations.value.find(c => c.id === activeConversation.value)
  })

  const conversationsByYearMonth = computed<ConversationsYearMonth[]>(() => {
    const ret: ConversationsYearMonth[] = []

    for (const conversation of conversations.value) {
      const { year, month } = DateTime.fromMillis(conversation.startedAt)
      let date = DateTime.now().set({ year, month, day: 1 })
      let conversationGroup = ret.find(g => g.year === year && g.month === month)
      if (conversationGroup === undefined) {
        conversationGroup = { year, month, date: date.toMillis(), conversations: [] }
        ret.push(conversationGroup)
      }

      conversationGroup.conversations.push(conversation)
    }

    // Sort the conversation groups (newest first)
    ret.sort((a, b) => b.date - a.date)

    // Second, sort the conversations within each group (newest first)
    for (const group of ret) {
      group.conversations.sort((a, b) => b.startedAt - a.startedAt)
    }

    return ret
  })

  // Initial updates
  ipcRenderer.invoke('get-conversations').then((payload: Conversation[]) => {
    conversations.value = payload
  })

  ipcRenderer.invoke('get-active-conversation').then((payload: string|undefined) => {
    activeConversation.value = payload
  })

  // Listen to subsequent changes
  ipcRenderer.on('conversations-updated', (event, payload: Conversation[]) => {
    conversations.value = payload
  })

  ipcRenderer.on('conversation-updated', (event, payload: Conversation) => {
    const convIdx = conversations.value.findIndex(c => c.id === payload.id)
    if (convIdx < 0) {
      return
    }

    conversations.value.splice(convIdx, 1, payload)
  })

  ipcRenderer.on('active-conversation-changed', (event, payload: string|undefined) => {
    activeConversation.value = payload
  })

  return { conversations, activeConversation, currentConversation, conversationsByYearMonth }
})
