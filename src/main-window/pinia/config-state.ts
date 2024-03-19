// Configuration store
import { defineStore } from 'pinia'
import type { Config } from 'src/main/ConfigProvider'
import { getDefaultConfig } from '../../main/util/get-default-config'
import { ref } from 'vue'
import { alertError } from '../util/prompts'

const ipcRenderer = window.ipc

/**
 * This store handles the configuration
 */
export const useConfigStore = defineStore('config', () => {
  const config = ref<Config>(getDefaultConfig())

  ipcRenderer.invoke('get-config', {})
    .then((conf: Config) => {
      config.value = conf
    })
    .catch(err => alertError(err))

  ipcRenderer.on('config-updated', (event, conf: Config) => {
    config.value = conf
  })

  return { config }
})
