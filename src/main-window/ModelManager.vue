<template>
  <div id="model-manager-modal">
    <div
      id="model-manager-modal-close"
      title="Close Model Manager"
      v-on:click="emit('close-modal')"
    >&times;</div>
    <h1>Model Manager</h1>
    <div id="model-manager-modal-body">
      <details>
      <summary>Usage</summary>

      <p>
        LocalChat works with a variety of models that can perform differently
        depending on your use-case. There are coding models, general assistant
        models, and others.
      </p>
      <p>
        The ModelManager allows you to manage which models you have on your
        computer and to download new ones. You can also see a variety of
        information on each model.
      </p>
      <p>
        Downloading new models is easy. Simply follow these steps:
      </p>
      <ol>
      <li>
        First, think about what type of models your computer can run.
        If you have 16 GB of (video or system) memory, a model should not exceed about 10 GB.
        Also, if you do not have a dedicated GPU, you should choose a smaller model, since running Large Language Models (LLM) on
        the CPU will take longer.
        Further, there are &quot;quantized&quot; models available.
        Quantized models are smaller than the non-quantized ones, run faster on worse hardware, but with some losses in quality.
      </li>
      <li>
        Go to <a href="https://huggingface.co/models?sort=trending&search=gguf">huggingface.co/models</a> and search for &quot;gguf&quot;.
        GGUF is the supported file extension for models that LocalChat can load.
        Each model consists only of one GGUF-file, you don't need any additional files.
      </li>
      <li>
        Once you have found a model you would like to use, download it to your computer.
      </li>
      <li>
        Click the button below to open the models directory, and put the model in there. You may
        need to refresh the window for the app to pick up the changes.
      </li>
    </ol>
    </details>
    <div v-if="store.models.length > 0" class="model-card" v-for="model in store.models" v-key="model.path">
      <h4>{{ getModelName(model) }}</h4>
      <span class="size">{{ formatSize(model.bytes) }}</span>
      <span class="architecture">Architecture: {{ model.metadata.general.architecture ?? 'unknown' }} ({{ isQuantized(model) ? 'quantized' : 'full' }})</span>
      <span class="context-length">Context length: {{ getContextLength(model) }}</span>

      <p class="description">{{ model.metadata.general.description ?? 'No description' }}</p>
      <span class="author">{{ model.metadata.general.author ?? 'Unknown author' }}</span>
      <span class="license">License: {{ model.metadata.general.license ?? 'Unknown' }}</span>
    </div>
    <p v-else>
      No models found, or the app is currently discovering them.
    </p>
    </div>
    <div id="model-manager-modal-footer">
      <button v-on:click="openModelDirectory">Open model directory</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ModelDescriptor } from 'src/main/ModelManager'
import { useModelStore } from './pinia/models'
import { alertError } from './util/prompts'
import { formatSize } from './util/sizes'

const store = useModelStore()

const ipcRenderer = window.ipc

const emit = defineEmits<{
  (e: 'close-modal'): void
}>()

function openModelDirectory () {
  ipcRenderer.invoke('open-model-directory').catch(err => alertError(err))
}

// UTIL
function getModelName (model: ModelDescriptor) {
  if (model.metadata.general.name === undefined) {
    return model.name
  } else {
    return model.metadata.general.name
  }
}

function isQuantized (model: ModelDescriptor) {
  return model.metadata.general.quantization_version !== undefined
}

function getContextLength (model: ModelDescriptor) {
  const arch = model.metadata.general.architecture
  if (arch in model.metadata) {
    // @ts-expect-error
    return model.metadata[arch].context_length
  } else {
    return 'Unknown'
  }
}
</script>

<style>
div#model-manager-modal {
  position: absolute;
  z-index: 2;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
  background-color: rgba(230, 230, 230);
  color: rgb(66, 66, 66);
  padding: 20px;
  overflow-x: hidden;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

div#model-manager-modal-body {
  flex-grow: 1;
  overflow-y: auto;
}

div#model-manager-modal ol li {
  margin: 15px 0;
}

div#model-manager-modal-close {
  position: absolute;
  top: 20px;
  right: 20px;
  cursor: pointer;
  font-size: 200%;
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
  "architecture architecture architecture"
  "context-length context-length context-length"
  "description description description"
  "author license license";
  align-items: center;
}

div.model-card h4 { grid-area: name; font-size: 100%; }
div.model-card span.size { grid-area: size; text-align: right; }
div.model-card span.architecture { grid-area: architecture }
div.model-card span.context-length { grid-area: context-length; }
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

@media (prefers-color-scheme: dark) {
  div#model-manager-modal {
    background-color: rgb(66, 66, 66);
    color: white;
  }
}
</style>
