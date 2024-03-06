import { defineStore } from 'pinia'
import { alertError } from '../util/prompts'
import { type CustomPromptTemplate } from 'src/main/PromptManager'
import { type Ref, ref, watch } from 'vue'

const ipcRenderer = window.ipc

async function fetchCustomPrompts (prompts: string[], promptRef: Ref<Map<string, CustomPromptTemplate>>): Promise<void> {
  const newMap = new Map<string, CustomPromptTemplate>()

  for (const prompt of prompts) {
    const template = await ipcRenderer.invoke('get-custom-prompt', prompt)
    newMap.set(prompt, template)
  }

  promptRef.value = newMap
}

/**
 * This store handles everything relating to available prompts.
 */
export const usePromptTemplateStore = defineStore('prompt-templates', () => {
  const prompts = ref<Map<string, CustomPromptTemplate>>(new Map())
  const promptNames = ref<string[]>([])

  // Initial retrieval
  ipcRenderer.invoke('get-prompt-names')
    .then((names: string[]) => {
      promptNames.value = names
    })
    .catch(err => alertError(err))
  
  // Listen to updates
  ipcRenderer.on('custom-prompts-updated', () => {
    ipcRenderer.invoke('get-prompt-names')
    .then((names: string[]) => {
      promptNames.value = names
    })
    .catch(err => alertError(err))
  })

  watch(promptNames, (value): void => {
    fetchCustomPrompts(value, prompts).catch(err => alertError(err))
  })
  
  return { prompts, promptNames }
})
