<template>
  <h1>Preferences</h1>
  <p>
    Adjust various settings to configure LocalChat.
  </p>
  <h2>Appearance</h2>
  <LCRadio
    v-bind:name="'appearance'"
    v-bind:model-value="configStore.config.appearance"
    v-bind:options="{
      'Light': 'light',
      'Dark': 'dark',
      'Follow operating system': 'system'
    }"
    v-on:update:model-value="setConfig({ appearance: $event })"
  ></LCRadio>
  <h2>Default model</h2>
  <p>
    There are some instances, where it is not clear from the context which model
    you intend to use, for example when starting a new conversation. Here, you
    can select a specific model to use in these instances. By default
    ("Not set"), LocalChat will use the first model it finds.
  </p>
  <LCSelect
    v-bind:name="'default-model'"
    v-bind:model-value="stringifiedDefaultModel"
    v-bind:options="defaultModelOptions"
    v-on:update:model-value="setConfig({ defaultModel: $event === 'null' ? null : $event })"
  ></LCSelect>
</template>

<script setup lang="ts">
import type { Config } from 'src/main/ConfigProvider'
import { alertError } from './util/prompts'
import { useConfigStore } from './pinia/config-state'
import LCRadio from './reusable-components/LCRadio.vue'
import LCSelect, { LCSelectOption } from './reusable-components/LCSelect.vue'
import { useModelStore } from './pinia/models'
import { getModelName } from './util/get-model-name'
import { ref, toRef, watch, computed } from 'vue'

const ipcRenderer = window.ipc

const configStore = useConfigStore()
const modelStore = useModelStore()

// Prepare some values we need to set the default model
const defaultModelValue = ref<string|null>(configStore.config.defaultModel)
const stringifiedDefaultModel = computed(() => {
  if (configStore.config.defaultModel === null) {
    return 'null'
  } else {
    return configStore.config.defaultModel
  }
})
const defaultModelOptions = computed<LCSelectOption[]>(() => {
  const options: LCSelectOption[] = [{ label: 'Not set', value: 'null' }]

  for (const model of modelStore.models) {
    options.push({
      label: getModelName(model),
      value: model.path
    })
  }

  return options
})

watch(toRef(configStore.config, 'defaultModel'), (value) => {
  defaultModelValue.value = value
})

function setConfig (config: Partial<Config>) {
  ipcRenderer.invoke('set-config', config)
    .catch(err => alertError(err))
}
</script>

<style>
</style>
