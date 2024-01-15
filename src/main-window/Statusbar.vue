<template>
  <div id="statusbar">
    <!-- Model indication -->
    <div id="llama-status">
      {{ llamaStatus.message }}
    </div>
    <div v-if="isBusy" v-html="LoadingSpinner"></div>
    <button v-on:click="showModelManager = !showModelManager">Manage Models</button>
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

const ipcRenderer = window.ipc

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
./pinia/models
src/main/LlamaProvider
