<template>
  <div id="model-manager-modal">
    <div
      id="model-manager-modal-close"
      title="Close Model Manager"
      v-on:click="emit('close-modal')"
    >&times;</div>
    <h1>Model Manager</h1>
    <p>
      LocalChat works with a variety of models. Currently, it is not possible to
      download models automatically, but you can download them yourself easily.
      Just follow the instructions below.
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
    <p>
      <strong>Note</strong>: A too large model may either just take ages to generate responses, or it may crash the app or your entire computer.
        So if you're in doubt about a model, ensure you do not have any unsaved changes before attempting to load it.
    </p>
    <div id="model-manager-modal-footer">
      <button v-on:click="openModelDirectory">Open model directory</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { alertError } from './util/prompts'

const ipcRenderer = window.ipc

const emit = defineEmits<{
  (e: 'close-modal'): void
}>()

function openModelDirectory () {
  ipcRenderer.invoke('open-model-directory').catch(err => alertError(err))
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

@media (prefers-color-scheme: dark) {
  div#model-manager-modal {
    background-color: rgb(66, 66, 66);
    color: white;
  }
}
</style>
