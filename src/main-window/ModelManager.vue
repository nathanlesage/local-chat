<template>
  <Modal id="model-manager-modal" v-on:close-modal="$emit('close-modal')">
    <template v-slot:modal-header>
      <h1>Model Manager</h1>
    </template>
    <template v-slot:modal-body>
      <h2>Download new models</h2>
      <details>
        <summary>How to find models</summary>
        <p>
          LocalChat works with a variety of models that can perform differently
          depending on your use-case. There are coding models, general assistant
          models, and others.
        </p>
        <p>
          To download a new model, you can either manually download it and move it
          to the model directory, or paste the link into the text field below to
          have LocalChat automatically download it for you. The model must be in
          the GGUF file format.
        </p>
        <p>To find new models, follow these steps:</p>
        <ol>
          <li>
            Go to <a href="https://huggingface.co/models?sort=trending&search=gguf">huggingface.co/models</a> and search for &quot;gguf&quot;.
            Each model consists only of one GGUF-file, you don't need any additional files.
          </li>
          <li>
            Once you have found a model, download it to your computer or paste the link into the download field. Wait until
            the download finishes. Then you can use the model in your conversations.
          </li>
        </ol>
      </details>

      <p v-if="!store.modelDownloadStatus.isDownloading">
        Download a new model by pasting its HTTP-URL into this textfield:
        <input id="model-download-field" type="text" placeholder="https://huggingface.co/TheBloke/phi-2-GGUF/resolve/main/phi-2.Q2_K.gguf" v-model="modelPath">
        <button v-on:click="downloadModel">Download</button>
      </p>
      <p v-else>
        <!-- Display download status -->
        <span>Downloading model &quot;{{ store.modelDownloadStatus.name }}&quot; ({{ formatSize(store.modelDownloadStatus.size_downloaded) }} of {{ formatSize(store.modelDownloadStatus.size_total) }})</span>
        <div id="model-download-progress-wrapper">
          <progress
            min="0"
            v-bind:max="store.modelDownloadStatus.size_total"
            v-bind:value="store.modelDownloadStatus.size_downloaded"
          >Hello!</progress>
          <span>
            ({{ formatSize(store.modelDownloadStatus.bytes_per_second) }}/s; {{ formatSeconds(store.modelDownloadStatus.eta_seconds) }})
          </span>
          <button class="icon" v-on:click="cancelDownload" title="Abort download">
            <vue-feather type="x" size="12"></vue-feather>
          </button>
        </div>
      </p>

      <h2>Available models</h2>
      <button v-on:click="forceReloadModels()">Force reload model metadata</button>
      <button v-on:click="forceReloadModels(true)">Clear config</button>
      <div v-if="store.models.length > 0" class="model-card" v-for="model in store.models" v-key="model.path">
        <h4>{{ getModelName(model) }}</h4>
        <span class="size">{{ formatSize(model.bytes) }}</span>
        <span class="architecture">Architecture: {{ model.metadata?.general.architecture ?? 'unknown' }} ({{ isQuantized(model) ? 'quantized' : 'full' }})</span>
        <span class="context-length">
          Context length:
          <select v-on:change="selectModelContextLength($event, model.path)">
            <option
              v-for="opt in getContextLength(model)"
              v-key="opt.display"
              v-bind:disabled="opt.disabled"
              v-bind:selected="opt.selected"
              v-bind:value="opt.value"
            >
              {{ opt.display }}
            </option>
          </select>
        </span>
        <div class="prompt-selector">
          Prompt template:
          <select v-on:change="selectModelPromptWrapper($event, model.path)">
            <option value="auto" v-bind:selected="model.config.prompt === 'auto'">Detect automatically</option>
            <option value="general" v-bind:selected="model.config.prompt === 'general'">Generic</option>
            <option value="empty" v-bind:selected="model.config.prompt === 'empty'">Empty</option>
            <option value="llama" v-bind:selected="model.config.prompt === 'llama'">Llama</option>
            <option value="chatml" v-bind:selected="model.config.prompt === 'chatml'">ChatML</option>
            <option value="falcon" v-bind:selected="model.config.prompt === 'falcon'">Falcon</option>
          </select>
        </div>

        <p class="description">{{ model.metadata?.general.description ?? 'No description' }}</p>
        <span class="author">{{ model.metadata?.general.author ?? 'Unknown author' }}</span>
        <span class="license">License: {{ model.metadata?.general.license ?? 'Unknown' }}</span>
      </div>
      <p v-else>
        No models found
      </p>
    </template>
    <template v-slot:modal-footer>
      <button v-on:click="openModelDirectory">Open model directory</button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import type { ModelDescriptor } from 'src/main/ModelManager'
import { useModelStore } from './pinia/models'
import { alertError } from './util/prompts'
import { formatSize } from './util/sizes'
import { formatSeconds } from './util/dates'
import { ref } from 'vue'
import { formatNumber } from './util/numbers'
import Modal from './util/Modal.vue'

const store = useModelStore()

const ipcRenderer = window.ipc

const emit = defineEmits<{
  (e: 'close-modal'): void
}>()

const modelPath = ref<string>('')

function openModelDirectory () {
  ipcRenderer.invoke('open-model-directory').catch(err => alertError(err))
}

function downloadModel () {
  ipcRenderer.invoke('download-model', modelPath.value).catch(err => alertError(err))
}

// UTIL
function getModelName (model: ModelDescriptor) {
  if (model.metadata?.general.name === undefined) {
    return model.name
  } else {
    return model.metadata.general.name
  }
}

function isQuantized (model: ModelDescriptor) {
  return model.metadata?.general.quantization_version !== undefined
}

function getContextLength (model: ModelDescriptor) {
  const SUPPORTED_LENGTHS = [1024, 2048, 4096, 8192, 16384, 32768, 65536]

  let nativeContextLength = Infinity
  const arch = model.metadata?.general.architecture
  if (model.metadata !== undefined && arch !== undefined && arch in model.metadata) {
    // @ts-expect-error
    nativeContextLength = parseInt(model.metadata[arch].context_length, 10)
  }

  return SUPPORTED_LENGTHS.map(length => {
    const isTooLarge = length > nativeContextLength
    return {
      display: formatNumber(length),
      value: length,
      selected: length === model.config.contextLengthOverride,
      disabled: isTooLarge
    }
  })
}

function selectModelPromptWrapper (event: Event, modelPath: string) {
  const select = event.target

  if (!(select instanceof HTMLSelectElement)) {
    return
  }

  ipcRenderer.invoke('select-model-prompt-wrapper', { modelPath, value: select.value })
}

function selectModelContextLength (event: Event, modelPath: string) {
  const select = event.target

  if (!(select instanceof HTMLSelectElement)) {
    return
  }

  ipcRenderer.invoke('select-model-context-length', { modelPath, value: parseInt(select.value, 10) })
}

function cancelDownload () {
  ipcRenderer.invoke('cancel-download').catch(err => alertError(err))
}

function forceReloadModels (clearConfig = false) {
  ipcRenderer.invoke('force-reload-available-models', clearConfig ? 'clear-config' : undefined).catch(err => alertError(err))
}
</script>

<style>
div#model-download-progress-wrapper {
  display: flex;
  justify-content: space-around;
  align-items: center;
  gap: 20px;
}

div#model-download-progress-wrapper progress {
  flex-grow: 1;
}

div#model-manager-modal ol li {
  margin: 15px 0;
}

div.model-card {
  margin: 10px 20px;
  padding: 20px;
  border: 2px solid black;
  border-radius: 10px;
  display: grid;
  grid-template-rows: 20px 20px 20px auto 20px;
  grid-template-columns: auto auto 100px;
  grid-template-areas: "name name size"
  "architecture prompt-selector prompt-selector"
  "context-length context-length context-length"
  "description description description"
  "author license license";
  align-items: center;
}

div.model-card h4 { grid-area: name; font-size: 100%; }
div.model-card span.size { grid-area: size; text-align: right; }
div.model-card span.architecture { grid-area: architecture }
div.model-card span.context-length { grid-area: context-length; }
div.model-card div.prompt-selector { grid-area: prompt-selector; }
div.model-card span.author { grid-area: author; }
div.model-card p.description { grid-area: description; }
div.model-card span.license { grid-area: license; text-align: right; }

div.model-card span.size,
div.model-card span.architecture,
div.model-card span.context-length,
div.model-card span.license,
div.model-card span.author {
  font-family: monospace;
}

input#model-download-field {
  display: block;
  width: 100%;
  margin: 10px 0px;
}
</style>
