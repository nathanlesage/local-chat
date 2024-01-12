import { app, ipcMain } from 'electron'
import path from 'path'
import { promises as fs } from 'fs'
import type { LlamaModel, LlamaContext, LlamaChatSession, ConversationInteraction } from 'node-llama-cpp'
import mod from 'node-llama-cpp'
import { ModelManager } from './ModelManager'
import { broadcastIPCMessage } from '../util/broadcast-ipc-message'

export interface ChatMessage {
  role: 'user'|'assistant'
  content: string
  timestamp: number // TODO
  generationTime: number // TODO
}

export interface Conversation {
  description: string
  startedAt: number
  modelId: string
  messages: ChatMessage[]
}

export class LlamaProvider {
  private modelPath: string
  private loadedModelID: string
  private session: LlamaChatSession|undefined
  private conversation: Conversation
  private readonly manager: ModelManager

  constructor () {
    this.loadedModelID = ''
    this.modelPath = ''
    this.manager = ModelManager.getModelManager()

    // Hook up event listeners

    ipcMain.handle('get-model-id', (event, args) => {
      return this.loadedModelID
    })

    ipcMain.handle('select-model', async (event, args) => {
      return await this.loadModel(args)
    })

    ipcMain.handle('get-conversation', async (event, args) => {
      return this.conversation
    })

    ipcMain.handle('prompt', async (event, args) => {
      if (this.session === undefined) {
        throw new Error('Cannot prompt model: None loaded')
      }

      this.conversation.messages.push({
        role: 'user',
        content: args,
        timestamp: Date.now(),
        generationTime: 0
      })

      broadcastIPCMessage('conversation-updated', this.conversation)

      const start = Date.now()

      const answer = await this.session.prompt(args)

      this.conversation.messages.push({
        role: 'assistant',
        content: answer,
        timestamp: Date.now(),
        generationTime: Date.now() - start
      })

      broadcastIPCMessage('conversation-updated', this.conversation)
    })

    ipcMain.handle('reset', async (event, args) => {
      return await this.resetSession()
    })
  }

  async boot() {
  }

  async loadModel (modelPath: string) {
    const availableModels = await this.manager.getAvailableModels()
    const modelDescriptor = availableModels.find(model => model.path === modelPath)

    if (modelDescriptor === undefined) {
      throw new Error(`Model ${modelPath} not found`)
    }

    const resolved = await (mod as any)

    this.session = new resolved.LlamaChatSession({
      context: new resolved.LlamaContext({
        model: new resolved.LlamaModel({ modelPath: modelDescriptor.path })
      })
    })

    this.modelPath = modelDescriptor.path
    this.loadedModelID = modelDescriptor.name
    this.conversation = {
      description: '',
      startedAt: Date.now(),
      modelId: this.loadedModelID,
      messages: []
    }

    broadcastIPCMessage('loaded-model-updated', this.loadedModelID)
  }

  async resetSession () {
    await this.loadModel(this.modelPath)
  }
}
