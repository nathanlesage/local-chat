<template>
  <h1>Preferences</h1>
  <h2>Appearance</h2>
  <div>
    <input
      type="radio"
      name="appearance"
      value="light"
      id="appearance-light"
      v-on:change="setConfig({ appearance: 'light' })"
      v-bind:checked="configStore.config.appearance === 'light'"
    >
    <label for="appearance-light">Light</label><br>
    <input
      type="radio"
      name="appearance"
      value="dark"
      id="appearance-dark"
      v-on:change="setConfig({ appearance: 'dark' })"
      v-bind:checked="configStore.config.appearance === 'dark'"
    >
    <label for="appearance-dark">Dark</label><br>
    <input
      type="radio"
      name="appearance"
      value="system"
      id="appearance-system"
      v-on:change="setConfig({ appearance: 'system' })"
      v-bind:checked="configStore.config.appearance === 'system'"
    >
    <label for="appearance-system">Follow operating system</label>
  </div>
</template>

<script setup lang="ts">
import type { Config } from 'src/main/ConfigProvider'
import { alertError } from './util/prompts'
import { useConfigStore } from './pinia/config-state'

const configStore = useConfigStore()
const ipcRenderer = window.ipc

function setConfig (config: Partial<Config>) {
  console.log('Setting conf...')
  ipcRenderer.invoke('set-config', config)
    .catch(err => alertError(err))
}
</script>

<style></style>
