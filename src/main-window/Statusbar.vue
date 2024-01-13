<template>
  <div id="statusbar">
    <ModelSelectorWidget v-on:select-model="selectModel($event)"></ModelSelectorWidget>
    <!-- Model indication -->
    <div id="llama-status">
      {{ llamaStatus.message }}
    </div>
    <div v-if="isBusy" v-html="LoadingSpinner"></div>
  </div>
</template>

<script setup lang="ts">
import LoadingSpinner from './icons/loading-spinner.svg'
import { ref, computed } from 'vue'
import type { LlamaStatus } from 'src/providers/LlamaProvider'
import { alertError } from './util/prompts'
import ModelSelectorWidget from './ModelSelectorWidget.vue'

const ipcRenderer = window.ipc

// Copied from LlamaStatus since we cannot refer to things from the main process except for with Types
const llamaStatus = ref<LlamaStatus>({ status: 'uninitialized', message: 'Provider not initialized' })

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

function selectModel (modelPath: string) {
  ipcRenderer.invoke('select-model', modelPath)
    .catch(err => alertError(err))
}
</script>

<style>
div#statusbar {
  grid-area: statusbar;
  display: flex;
  justify-content: space-evenly;
  align-items: center;
  background-color: rgb(200, 200, 200);
}

@media (prefers-color-scheme: dark) {
  div#statusbar {
    background-color: rgb(33, 33, 33);
  }
}
</style>
./pinia/models
