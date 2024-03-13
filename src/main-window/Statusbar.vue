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
        {{ modelStore.llamaStatus.message }}
        <template v-if="modelStore.llamaInfo !== undefined">
          (<code>
            <a
              title="Click for more info about this llama.cpp release"
              v-bind:href="`https://github.com/${modelStore.llamaInfo.repo}/releases/tag/${modelStore.llamaInfo.release}`"
            >
              {{ modelStore.llamaInfo.release }}
            </a>
          </code> | {{ Math.round(modelStore.llamaInfo.vramState.used / modelStore.llamaInfo.vramState.total * 100) }}% VRAM usage)
        </template>
        <template v-else>
          (<code><span title="Llama.cpp release is unknown">unknown</span></code>)
        </template>
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
      <LCButton
        v-on:click="switchTo('model-manager')"
        square="true"
        icon="hard-drive"
        title="Model Manager"
        v-bind:type="appState.showModelManager ? 'primary': undefined"
      >
      </LCButton>
      <LCButton
        v-on:click="switchTo('prompt-manager')"
        square="true"
        icon="file-text"
        title="Prompt Manager"
        v-bind:type="appState.showPromptManager ? 'primary': undefined"
      >
      </LCButton>
      <LCButton
        v-on:click="switchTo('config-manager')"
        square="true"
        icon="settings"
        title="Config Manager"
        v-bind:type="appState.showConfig ? 'primary': undefined"
      >
      </LCButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { alertError } from './util/prompts'
import LCButton from './reusable-components/LCButton.vue'
import { formatSeconds } from './util/dates'
import { formatSize } from './util/sizes'
import { useModelStore } from './pinia/models'
import { useAppStateStore } from './pinia/app-state'

const ipcRenderer = window.ipc

const modelStore = useModelStore()
const appState = useAppStateStore()

const isGenerating = computed<boolean>(() => {
  return modelStore.llamaStatus.status === 'generating'
})

const isLoading = computed<boolean>(() => {
  return modelStore.llamaStatus.status === 'loading'
})

function cancelDownload () {
  ipcRenderer.invoke('cancel-download').catch(err => alertError(err))
}

function abortGeneration () {
  ipcRenderer.send('stop-generating')
}

function forceReloadModel () {
  ipcRenderer.invoke('force-reload-model').catch(err => alertError(err))
}

function switchTo (where: 'model-manager'|'prompt-manager'|'config-manager') {
  if (where === 'model-manager') {
    appState.showModelManager = !appState.showModelManager
    appState.showPromptManager = false
    appState.showConfig = false
  } else if (where === 'prompt-manager') {
    appState.showPromptManager = !appState.showPromptManager
    appState.showModelManager = false
    appState.showConfig = false
  } else if (where === 'config-manager') {
    appState.showConfig = !appState.showConfig
    appState.showPromptManager = false
    appState.showModelManager = false
  }
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
