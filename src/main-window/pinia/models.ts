// Available models store
import { defineStore } from 'pinia'
import { alertError } from '../util/prompts'
import type { ModelDescriptor, ModelDownloadStatus } from 'src/main/ModelManager'

import { ref } from 'vue'
import { LlamaStatus } from 'src/main/LlamaProvider'

const ipcRenderer = window.ipc

interface LlamaCppInfo {
  moduleVersion: string
  llamaCpp: {
    binarySource: string
    release: string
  }
}

/**
 * This store handles anything relating to available models.
 */
export const useModelStore = defineStore('model-store', () => {
  const models = ref<ModelDescriptor[]>([])
  const currentModel = ref<ModelDescriptor|undefined>(undefined)
  const modelDownloadStatus = ref<ModelDownloadStatus>({ isDownloading: false, name: '', size_total: 0, size_downloaded: 0, start_time: 0, eta_seconds: 0, bytes_per_second: 0 })
  const llamaInfo = ref<LlamaCppInfo|undefined>(undefined)
  // Copied from LlamaStatus since we cannot refer to things from the main process except for with Types
  const llamaStatus = ref<LlamaStatus>({ status: 'uninitialized', message: 'Provider not initialized' })

  // Initial retrieval
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

  ipcRenderer.invoke('get-llama-info').then((payload: LlamaCppInfo) => {
    llamaInfo.value = payload // Only retrieved once
  })

  ipcRenderer.invoke('get-llama-status')
    .then((status: LlamaStatus) => {
      llamaStatus.value = status
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

  ipcRenderer.on('llama-status-updated', (event, newStatus: LlamaStatus) => {
    llamaStatus.value = newStatus
  })

  // Helper functions
  function getModelDescriptor (modelId: string): ModelDescriptor|undefined {
    return models.value.find(model => model.path === modelId)
  }

  function getModelName (modelId: string): string|undefined {
    const descriptor = models.value.find(model => model.path === modelId)
    if (descriptor === undefined) {
      return undefined
    } else if (descriptor.metadata?.general.name !== undefined) {
      return descriptor.metadata.general.name
    } else {
      return descriptor.name
    }
  }

  return {
    // Model manager
    models, currentModel, modelDownloadStatus,
    // Llama Provider
    llamaInfo, llamaStatus,
    // Utility functions
    getModelDescriptor, getModelName
  }
})
