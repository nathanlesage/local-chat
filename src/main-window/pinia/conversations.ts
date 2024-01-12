// Conversation store
import { defineStore } from 'pinia'
import type { Conversation } from 'src/providers/LlamaProvider'
import { ref } from 'vue'

const ipcRenderer = window.ipc

export const useConversationStore = defineStore('conversation-store', () => {
  const conversations = ref<Conversation>({
    description: '',
    startedAt: Date.now(),
    modelId: '',
    messages: []
  })

  ipcRenderer.invoke('get-conversation').then((payload: Conversation) => {
    conversations.value = payload
  })

  // Listen to subsequent changes
  ipcRenderer.on('conversation-updated', (event, payload: Conversation) => {
    console.log('Conversation updated')
    conversations.value = payload
  })

  return { conversations }
})
