<template>
  <div id="statusbar">
    <div v-if="modelDownloadStatus.isDownloading" id="model-download-status">
      Downloading {{ modelDownloadStatus.name }}
      <progress
        min="0"
        v-bind:max="modelDownloadStatus.size_total"
        v-bind:value="modelDownloadStatus.size_downloaded"
        v-bind:title="formatSize(modelDownloadStatus.size_downloaded) + '/' + formatSize(modelDownloadStatus.size_total)"
      ></progress>
      ({{ formatSeconds(modelDownloadStatus.eta_seconds) }}s remaining)
      <button v-on:click="cancelDownload">Cancel</button>
    </div>
    <!-- Model indication -->
    <div id="llama-status">
      {{ llamaStatus.message }}
      <div v-if="isBusy" v-html="LoadingSpinner"></div>
    </div>
    <div>
      <button v-on:click="showModelManager = !showModelManager">Manage Models</button>
    </div>
  </div>
  <Teleport to="body">
    <ModelManager
      v-if="showModelManager"
      v-on:close-modal="showModelManager = !showModelManager"
    ></ModelManager>
  </Teleport>
</template>

<script setup lang="ts">
import LoadingSpinner from './icons/loading-spinner.svg'
import { ref, computed } from 'vue'
import type { LlamaStatus } from 'src/main/LlamaProvider'
import { alertError } from './util/prompts'
import ModelManager from './ModelManager.vue'
import type { ModelDownloadStatus } from 'src/main/ModelManager'
import { Duration } from 'luxon'
import { formatSize } from './util/sizes'

const ipcRenderer = window.ipc

// Copied from LlamaStatus since we cannot refer to things from the main process except for with Types
const llamaStatus = ref<LlamaStatus>({ status: 'uninitialized', message: 'Provider not initialized' })

const modelDownloadStatus = ref<ModelDownloadStatus>({ isDownloading: false, name: '', size_total: 0, size_downloaded: 0, start_time: 0, eta_seconds: 0, bytes_per_second: 0 })

const showModelManager = ref<boolean>(false)

ipcRenderer.on('llama-status-updated', (event, newStatus: LlamaStatus) => {
  llamaStatus.value = newStatus
})

ipcRenderer.on('model-download-status-updated', (event, newStatus: ModelDownloadStatus) => {
  modelDownloadStatus.value = newStatus
})

const isBusy = computed<boolean>(() => {
  return [ 'generating', 'loading'].includes(llamaStatus.value.status)
})

ipcRenderer.invoke('get-llama-status')
  .then((status: LlamaStatus) => {
    llamaStatus.value = status
  })
  .catch(err => alertError(err))

ipcRenderer.invoke('get-model-download-status')
  .then((status: ModelDownloadStatus) => {
    modelDownloadStatus.value = status
  })
  .catch(err => alertError(err))

function cancelDownload () {
  ipcRenderer.invoke('cancel-download').catch(err => alertError(err))
}

function formatSeconds (sec: number) {
  const duration = Duration.fromObject({ seconds: sec })
  return duration.toFormat('mm:ss')
}
</script>

<style>
div#statusbar {
  grid-area: statusbar;
  display: flex;
  justify-content: end;
  gap: 20px;
  padding: 0 20px;
  align-items: center;
  background-color: rgb(33, 33, 33);
  color: white;
}

div#statusbar svg {
  stroke: #eee;
}

@media (prefers-color-scheme: dark) {
  div#statusbar {
    background-color: rgb(33, 33, 33);
  }
}
</style>
