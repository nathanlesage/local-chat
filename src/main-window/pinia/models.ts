// Available models store
import { defineStore } from 'pinia'
import { alertError } from '../util/prompts'
import type { ModelDescriptor, ModelDownloadStatus } from 'src/main/ModelManager'

import { ref } from 'vue'

const ipcRenderer = window.ipc

/**
 * This store handles anything relating to available models.
 */
export const useModelStore = defineStore('model-store', () => {
  const models = ref<ModelDescriptor[]>([])
  const currentModel = ref<ModelDescriptor|undefined>(undefined)
  const modelDownloadStatus = ref<ModelDownloadStatus>({ isDownloading: false, name: '', size_total: 0, size_downloaded: 0, start_time: 0, eta_seconds: 0, bytes_per_second: 0 })

  ipcRenderer.invoke('get-available-models').then((payload: ModelDescriptor[]) => {
    models.value = payload
  })

  ipcRenderer.invoke('get-loaded-model').then((payload: ModelDescriptor|undefined) => {
    currentModel.value = payload
  })

  ipcRenderer.invoke('get-model-download-status')
    .then((status: ModelDownloadStatus) => {
      modelDownloadStatus.value = status
    })
    .catch(err => alertError(err))


  // Listen to subsequent changes
  ipcRenderer.on('available-models-updated', (event, payload: ModelDescriptor[]) => {
    models.value = payload
  })

  ipcRenderer.on('loaded-model-updated', (event, payload: ModelDescriptor|undefined) => {
    currentModel.value = payload
  })

  ipcRenderer.on('model-download-status-updated', (event, newStatus: ModelDownloadStatus) => {
    modelDownloadStatus.value = newStatus
  })

  return { models, currentModel, modelDownloadStatus }
})
