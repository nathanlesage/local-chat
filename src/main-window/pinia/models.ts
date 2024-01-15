// Available models store
import { defineStore } from 'pinia'
import type { ModelDescriptor } from 'src/main/ModelManager'
import { ref } from 'vue'

const ipcRenderer = window.ipc

/**
 * This store handles anything relating to available models.
 */
export const useModelStore = defineStore('model-store', () => {
  const models = ref<ModelDescriptor[]>([])
  const currentModel = ref<ModelDescriptor|undefined>(undefined)

  ipcRenderer.invoke('get-available-models').then((payload: ModelDescriptor[]) => {
    console.log({ availableModels: payload })
    models.value = payload
  })

  ipcRenderer.invoke('get-loaded-model').then((payload: ModelDescriptor|undefined) => {
    console.log({ loadedModel: payload })
    currentModel.value = payload
  })

  // Listen to subsequent changes
  ipcRenderer.on('available-models-updated', (event, payload: ModelDescriptor[]) => {
    console.log({ availableModels: payload })
    models.value = payload
  })

  ipcRenderer.on('loaded-model-updated', (event, payload: ModelDescriptor|undefined) => {
    console.log({ loadedModel: payload })
    currentModel.value = payload
  })

  return { models, currentModel }
})
