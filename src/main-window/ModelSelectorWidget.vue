<template>
  <select class="model-selector" v-on:change="selectModel">
    <option disabled v-bind:selected="store.currentModel !== undefined">No model selected</option>
    <option
      v-for="model in store.models"
      v-bind:value="model.path"
      v-bind:selected="model.path === store.currentModel?.path"
    >
      {{ model.name }} ({{ formatSize(model.bytes) }})
    </option>
  </select>
</template>

<script setup lang="ts">
import { useModelStore } from './pinia/models'
import { formatSize } from './util/sizes'

const store = useModelStore()

const emit = defineEmits<{ (e: 'select-model', modelPath: string): void }>()

function selectModel (event: Event) {
  const target = event.target

  if (target instanceof HTMLSelectElement) {
    const modelToSelect = target.value

    emit('select-model', modelToSelect)
  }
}

</script>

<style>

</style>
