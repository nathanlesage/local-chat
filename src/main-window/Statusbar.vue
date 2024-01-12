<template>
  <div id="statusbar">
    <!-- Current model selection -->
    Selected model:
    <select v-on:change="selectModel">
      <option disabled v-bind:selected="!hasModel">No model selected</option>
      <option
        v-for="model in store.models"
        v-bind:value="model.path"
        v-bind:selected="model.name === store.currentModelId"
      >
        {{ model.name }}
      </option>
    </select>

    <!-- Model indication -->
  </div>
</template>

<script setup lang="ts">
import type { ModelDescriptor } from 'src/providers/ModelManager'
import { useModelStore } from './pinia/models'
import { computed } from 'vue'

const store = useModelStore()

const ipcRenderer = window.ipc

const hasModel = computed<boolean>(() => {
  const model = store.models.find(model => model.name === store.currentModelId)
  return model !== undefined
})

function selectModel (event: Event) {
  const target = event.target

  if (target instanceof HTMLSelectElement) {
    const modelToSelect = target.value

    ipcRenderer.invoke('select-model', modelToSelect)
      .catch(err => console.error(err))
  }
}

</script>

<style>
div#statusbar {
  grid-area: statusbar;
  background-color: rgb(33, 33, 33);
}
</style>
./pinia/models
