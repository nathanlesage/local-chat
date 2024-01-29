// Conversation store
import { defineStore } from 'pinia'
import type { Conversation } from 'src/main/ConversationManager'
import { ref, computed } from 'vue'

const ipcRenderer = window.ipc

/**
 * This store handles everything relating to the available conversations.
 */
export const useConversationStore = defineStore('conversation-store', () => {
  const conversations = ref<Conversation[]>([])
  const activeConversation = ref<string|undefined>(undefined)
  const currentConversation = computed<Conversation|undefined>(() => {
    return conversations.value.find(c => c.id === activeConversation.value)
  })

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

  return { conversations, activeConversation, currentConversation }
})
