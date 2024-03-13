// Conversation store
import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * This store handles everything relating to the available conversations.
 */
export const useAppStateStore = defineStore('app-state', () => {
  const showSidebar = ref<boolean>(true)
  const showModelManager = ref<boolean>(false)
  const showPromptManager = ref<boolean>(false)
  const showConfig = ref(false)
  return { showSidebar, showModelManager, showPromptManager, showConfig }
})
