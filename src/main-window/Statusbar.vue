<template>
  <div id="statusbar">
    <div v-if="modelStore.modelDownloadStatus.isDownloading" id="model-download-status">
      <progress
        min="0"
        v-bind:max="modelStore.modelDownloadStatus.size_total"
        v-bind:value="modelStore.modelDownloadStatus.size_downloaded"
      ></progress>
      <span class="monospace">
        ({{ formatSize(modelStore.modelDownloadStatus.bytes_per_second) }}/s; {{ formatSeconds(modelStore.modelDownloadStatus.eta_seconds) }})
      </span>
      <button class="icon" v-on:click="cancelDownload" v-html="CancelIcon" title="Abort download"></button>
    </div>
    <!-- Model indication -->
    <div id="llama-status">
      <span>{{ llamaStatus.message }}</span>
      <div v-if="isBusy" v-html="LoadingSpinner"></div>
    </div>
    <div>
      <button v-on:click="showModelManager = !showModelManager">Manage Models</button>
    </div>
    <Teleport to="body">
      <ModelManager
        v-if="showModelManager"
        v-on:close-modal="showModelManager = !showModelManager"
      ></ModelManager>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import LoadingSpinner from './icons/loading-spinner.svg'
import CancelIcon from './icons/x.svg'
import { ref, computed } from 'vue'
import type { LlamaStatus } from 'src/main/LlamaProvider'
import { alertError } from './util/prompts'
import ModelManager from './ModelManager.vue'
import { formatSeconds } from './util/dates'
import { formatSize } from './util/sizes'
import { useModelStore } from './pinia/models'

const ipcRenderer = window.ipc

const modelStore = useModelStore()

// Copied from LlamaStatus since we cannot refer to things from the main process except for with Types
const llamaStatus = ref<LlamaStatus>({ status: 'uninitialized', message: 'Provider not initialized' })

const showModelManager = ref<boolean>(false)

ipcRenderer.on('llama-status-updated', (event, newStatus: LlamaStatus) => {
  llamaStatus.value = newStatus
})

const isBusy = computed<boolean>(() => {
  return [ 'generating', 'loading'].includes(llamaStatus.value.status)
})

ipcRenderer.invoke('get-llama-status')
  .then((status: LlamaStatus) => {
    llamaStatus.value = status
  })
  .catch(err => alertError(err))

function cancelDownload () {
  ipcRenderer.invoke('cancel-download').catch(err => alertError(err))
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

div#statusbar div {
  white-space: nowrap;
}

div#statusbar .monospace {
  font-family: Menlo, "Liberation Mono", monospace;
}

div#statusbar svg {
  stroke: #eee;
}

div#statusbar button svg {
  color: #333;
  stroke: #333;
}

@media (prefers-color-scheme: dark) {
  div#statusbar {
    background-color: rgb(33, 33, 33);
  }
}
</style>
