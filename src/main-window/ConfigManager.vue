<template>
  <h1>Preferences</h1>
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
</template>

<script setup lang="ts">
import type { Config } from 'src/main/ConfigProvider'
import { alertError } from './util/prompts'
import { useConfigStore } from './pinia/config-state'
import LCRadio from './reusable-components/LCRadio.vue'

const configStore = useConfigStore()
const ipcRenderer = window.ipc

function setConfig (config: Partial<Config>) {
  console.log('Setting conf...')
  ipcRenderer.invoke('set-config', config)
    .catch(err => alertError(err))
}
</script>

<style></style>
