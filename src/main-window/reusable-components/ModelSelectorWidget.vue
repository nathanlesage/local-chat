<template>
  <select class="model-selector" v-on:change="selectModel">
    <option
      v-if="store.llamaStatus.status === 'ready'"
      v-for="model in store.models"
      v-bind:value="model.path"
      v-bind:selected="model.path === store.currentModel?.path"
    >
      {{ getModelName(model) }} ({{ formatSize(model.bytes) }})
    </option>
    <!-- During generation, disallow changing the model -->
    <option v-else-if="store.llamaStatus.status === 'generating'" disabled selected>
      {{ store.currentModel !== undefined ? getModelName(store.currentModel) : 'Model generating...' }}
    </option>
    <!-- Possibly error -->
    <option v-else disabled selected>
      Cannot switch model
    </option>
  </select>
</template>

<script setup lang="ts">
import type { ModelDescriptor } from 'src/main/ModelManager'
import { useModelStore } from '../pinia/models'
import { formatSize } from '../util/sizes'

const store = useModelStore()

const emit = defineEmits<{ (e: 'select-model', modelPath: string): void }>()

function selectModel (event: Event) {
  const target = event.target

  if (target instanceof HTMLSelectElement) {
    const modelToSelect = target.value

    emit('select-model', modelToSelect)
  }
}

function getModelName (model: ModelDescriptor) {
  if (model.metadata?.general.name === undefined) {
    return model.name
  } else {
    return model.metadata.general.name
  }
}

</script>

<style>

</style>
