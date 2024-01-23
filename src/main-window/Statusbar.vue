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
      <button class="icon" v-on:click="cancelDownload" title="Abort download">
        <vue-feather type="x" v-bind:size="ICON_SIZE"></vue-feather>
      </button>
    </div>
    <!-- Model indication -->
    <div id="llama-status">
      <span>
        {{ getLlamaStatusMessage(llamaStatus) }}
        (<code>
          <a
            v-if="modelStore.llamaInfo !== undefined"
            title="Click for more info about this llama.cpp release"
            v-bind:href="`https://github.com/ggerganov/llama.cpp/releases/tag/${modelStore.llamaInfo.llamaCpp.release}`"
          >
            {{ modelStore.llamaInfo.llamaCpp.release }}
          </a>
          <span v-else title="Llama.cpp release is unknown">unknown</span>
        </code>)
      </span>
      <button
        v-if="!isGenerating && !isLoading"
        v-on:click.prevent="forceReloadModel"
        class="icon"
        title="Force reload model"
      >
        <vue-feather type="repeat" v-bind:size="ICON_SIZE"></vue-feather>
      </button>

      <button
        v-if="isGenerating"
        v-on:click.prevent="abortGeneration"
        class="icon"
        title="Stop generating"
      >
        <vue-feather type="stop-circle" v-bind:size="ICON_SIZE"></vue-feather>
      </button>
    </div>
    <div>
      <button v-on:click="showModelManager = !showModelManager">Manage Models</button>
    </div>

    <ModelManager
      v-if="showModelManager"
      v-on:close-modal="showModelManager = !showModelManager"
    ></ModelManager>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LlamaStatus } from 'src/main/LlamaProvider'
import { alertError } from './util/prompts'
import ModelManager from './ModelManager.vue'
import { formatSeconds } from './util/dates'
import { formatSize } from './util/sizes'
import { useModelStore } from './pinia/models'

const ipcRenderer = window.ipc

// Icon size for the entire statusbar
const ICON_SIZE = 12

const modelStore = useModelStore()

// Copied from LlamaStatus since we cannot refer to things from the main process except for with Types
const llamaStatus = ref<LlamaStatus>({ status: 'uninitialized', message: 'Provider not initialized' })

const showModelManager = ref<boolean>(false)

ipcRenderer.on('llama-status-updated', (event, newStatus: LlamaStatus) => {
  llamaStatus.value = newStatus
})

const isGenerating = computed<boolean>(() => {
  return llamaStatus.value.status === 'generating'
})

const isLoading = computed<boolean>(() => {
  return llamaStatus.value.status === 'loading'
})

ipcRenderer.invoke('get-llama-status')
  .then((status: LlamaStatus) => {
    llamaStatus.value = status
  })
  .catch(err => alertError(err))

function getLlamaStatusMessage (status: LlamaStatus) {
  if (status.status === 'error') {
    return status.error.message
  } else {
    return status.message
  }
}

function cancelDownload () {
  ipcRenderer.invoke('cancel-download').catch(err => alertError(err))
}

function abortGeneration () {
  ipcRenderer.send('stop-generating')
}

function forceReloadModel () {
  ipcRenderer.invoke('force-reload-model').catch(err => alertError(err))
}
</script>

<style>
div#statusbar {
  grid-area: statusbar;
  display: flex;
  font-size: 80%;
  justify-content: end;
  gap: 20px;
  padding: 0 20px;
  align-items: center;
  background-color: rgb(33, 33, 33);
  color: white;
}

div#statusbar a {
  color: rgb(182, 208, 253);
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
