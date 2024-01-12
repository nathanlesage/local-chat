// Available models store
import { defineStore } from 'pinia'
import type { ModelDescriptor } from 'src/providers/ModelManager'
import { ref } from 'vue'

const ipcRenderer = window.ipc

export const useModelStore = defineStore('config', () => {
  const models = ref<ModelDescriptor[]>([])
  const currentModelId = ref<string>('')

  ipcRenderer.invoke('get-available-models').then((payload: ModelDescriptor[]) => {
    models.value = payload
  })

  ipcRenderer.invoke('get-model-id').then((payload: string) => {
    currentModelId.value = payload
  })

  // Listen to subsequent changes
  ipcRenderer.on('available-models-updated', (event, payload: ModelDescriptor[]) => {
    models.value = payload
  })

  ipcRenderer.on('loaded-model-updated', (event, payload: string) => {
    currentModelId.value = payload
  })

  return { models, currentModelId }
})
