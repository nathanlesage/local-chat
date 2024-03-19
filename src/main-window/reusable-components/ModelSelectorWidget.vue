<template>
  <LCSelect
    v-bind:name="'model-selector'"
    v-bind:model-value="store.currentModel?.path ?? ''"
    v-bind:options="selectOptions"
    v-on:update:model-value="selectModel($event)"
  ></LCSelect>
</template>

<script setup lang="ts">
import { getModelName } from '../util/get-model-name'
import LCSelect, { LCSelectOption } from './LCSelect.vue'
import { useModelStore } from '../pinia/models'
import { formatSize } from '../util/sizes'
import { computed } from 'vue'

const store = useModelStore()

const emit = defineEmits<{ (e: 'select-model', modelPath: string): void }>()

const selectOptions = computed<LCSelectOption[]>(() => {
  if (store.llamaStatus.status === 'ready') {
    return store.models.map(model => {
      return {
        label: `${getModelName(model)} (${formatSize(model.bytes)})`,
        value: model.path
      }
    })
  } else if (store.llamaStatus.status === 'generating') {
    // During generation, disallow changing the model
    return [{
      label: store.currentModel !== undefined ? getModelName(store.currentModel) : 'Model generating...',
      value: store.currentModel?.path ?? '',
      disabled: true
    }]
  } else {
    // Possibly an error
    return [{
      label: 'Cannot switch model',
      value: store.currentModel?.path ?? '',
      disabled: true
    }]
  }
})

function selectModel (modelPath: string) {
  emit('select-model', modelPath)
}

</script>

<style>

</style>
