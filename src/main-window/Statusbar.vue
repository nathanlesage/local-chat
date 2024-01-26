<template>
  <div id="statusbar">
    <div
      v-if="modelStore.modelDownloadStatus.isDownloading" id="model-download-status"
      v-bind:title="`Downloading model ${modelStore.modelDownloadStatus.name} (${formatSize(modelStore.modelDownloadStatus.size_total)})`"
    >
      <progress
        min="0"
        v-bind:max="modelStore.modelDownloadStatus.size_total"
        v-bind:value="modelStore.modelDownloadStatus.size_downloaded"
      ></progress>
      <span class="monospace">
        ({{ formatSize(modelStore.modelDownloadStatus.bytes_per_second) }}/s; {{ formatSeconds(modelStore.modelDownloadStatus.eta_seconds) }})
      </span>
      <LCButton icon="x" type="danger" square="true" v-on:click="cancelDownload" title="Abort download">
      </LCButton>
    </div>
    <!-- Model indication -->
    <div id="llama-status">
      <span>
        {{ llamaStatus.message }}
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
      <LCButton
        v-if="!isGenerating && !isLoading"
        v-on:click.prevent="forceReloadModel"
        icon="refresh-cw"
        square="true"
        title="Force reload model"
      >
    </LCButton>

      <LCButton
        v-if="isGenerating"
        v-on:click.prevent="abortGeneration"
        square="true"
        icon="stop-circle"
        title="Stop generating"
      >
    </LCButton>
    </div>
    <div>
      <LCButton v-on:click="appState.showModelManager = !appState.showModelManager">
        Manage Models
      </LCButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LlamaStatus } from 'src/main/LlamaProvider'
import { alertError } from './util/prompts'
import LCButton from './reusable-components/LCButton.vue'
import { formatSeconds } from './util/dates'
import { formatSize } from './util/sizes'
import { useModelStore } from './pinia/models'
import { useAppStateStore } from './pinia/app-state'

const ipcRenderer = window.ipc

const modelStore = useModelStore()
const appState = useAppStateStore()

// Copied from LlamaStatus since we cannot refer to things from the main process except for with Types
const llamaStatus = ref<LlamaStatus>({ status: 'uninitialized', message: 'Provider not initialized' })

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

@media (prefers-color-scheme: dark) {
  div#statusbar {
    background-color: rgb(33, 33, 33);
  }
}
</style>
