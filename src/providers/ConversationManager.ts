import { broadcastIPCMessage } from "./util/broadcast-ipc-message"
import { ModelDescriptor, ModelManager } from "./ModelManager"
import { v4 as uuid } from 'uuid'
import { app, ipcMain } from 'electron'
import { LlamaProvider } from "./LlamaProvider"
import path from 'path'
import { promises as fs } from 'fs'

export interface ChatMessage {
  role: 'user'|'assistant'
  content: string
  timestamp: number
  generationTime: number
}

export interface Conversation {
  id: string
  description: string
  startedAt: number
  model: ModelDescriptor
  messages: ChatMessage[]
}

export class ConversationManager {
  private static thisInstance: ConversationManager
  private conversations: Conversation[]
  private activeConversation: string|undefined
  private modelManager: ModelManager
  private llamaProvider: LlamaProvider
  private readyToShutdown: boolean

  private constructor () {
    this.conversations = []
    this.modelManager = ModelManager.getModelManager()
    this.llamaProvider = new LlamaProvider()
    this.readyToShutdown = true

    // Immediately begin loading the conversations from disk
    this.loadConversations().then(conv => {
      this.conversations = conv
      console.log(`Restored ${this.conversations.length} conversations.`)
      broadcastIPCMessage('conversations-updated', this.conversations)
      if (this.conversations.length > 0) {
        this.selectConversation(this.conversations[0].id)
      }
    })

    ipcMain.handle('get-conversation', async (event, args) => {
      return this.getConversation(args)
    })

    ipcMain.handle('select-conversation', async (event, args) => {
      return this.selectConversation(args)
    })

    ipcMain.handle('get-active-conversation', (event, args) => {
      return this.activeConversation
    })

    ipcMain.handle('get-conversations', async (event, args) => {
      return this.conversations
    })

    ipcMain.handle('new-conversation', async (event, args) => {
      let model = this.llamaProvider.getLoadedModel()
      const availableModels = await this.modelManager.getAvailableModels()

      if (typeof args === 'string' && await this.modelManager.modelAvailable(args)) {
        model = await this.modelManager.getModel(args)
      }

      if (model === undefined && availableModels.length > 0) {
        model = availableModels[0]
      }

      if (model === undefined) {
        throw new Error(`Could not create new conversation: No model found.`)
      }

      return this.createConversation(model)
    })

    ipcMain.handle('delete-conversation', async (event, args) => {
      this.deleteConversation(args)
    })

    ipcMain.handle('select-model', async (event, args) => {
      const conv = this.getConversation(this.activeConversation)
      if (conv === undefined) {
        return // No conversation to select
      }

      const model = await this.modelManager.getModel(args)

      if (model === undefined) {
        return // Cannot select model
      }

      conv.model = model
      this.updateConversation(conv)
    })

    ipcMain.handle('prompt', async (event, args) => {
      const conversation = this.getConversation(this.activeConversation)

      if (conversation === undefined || !this.llamaProvider.isReady()) {
        throw new Error('Cannot prompt model: None loaded')
      }

      conversation.messages.push({
        role: 'user',
        content: args,
        timestamp: Date.now(),
        generationTime: 0
      })

      this.updateConversation(conversation)

      const start = Date.now()

      const answer = await this.llamaProvider.prompt(args, (chunk) => {
        // Send back only to the sender
        event.sender.send('answer-token-stream', chunk)
      })

      conversation.messages.push({
        role: 'assistant',
        content: answer,
        timestamp: Date.now(),
        generationTime: Date.now() - start
      })

      this.updateConversation(conversation)
    })

    // APP LISTENERS

    app.on('window-all-closed', (event: any) => {
      if (this.readyToShutdown) {
        return
      }

      event.preventDefault()
      this.persistConversations().finally(app.quit)
    })

    app.on('will-quit', (event) => {
      if (this.readyToShutdown) {
        return
      }

      event.preventDefault()
      this.persistConversations().finally(app.quit)
    })
  }

  private get conversationCache () {
    return path.join(app.getPath('userData'), 'conversations.json')
  }

  private async persistConversations () {
    console.log(`Persisting ${this.conversations.length} conversations ...`)
    await fs.writeFile(
      this.conversationCache,
      JSON.stringify(this.conversations, undefined, '  '),
      'utf-8'
    )

    this.readyToShutdown = true
  }

  private async loadConversations (): Promise<Conversation[]> {
    try {
      await fs.access(this.conversationCache)
      const data = await fs.readFile(this.conversationCache, 'utf-8')
      return JSON.parse(data)
    } catch (err) {
      return []
    }
  }

  public static getConversationManager (): ConversationManager {
    if (this.thisInstance === undefined) {
      this.thisInstance = new ConversationManager()
    }

    return this.thisInstance
  }

  public createConversation (model: ModelDescriptor, setAsActive = true): Conversation {
    const newConversation = {
      id: uuid(),
      description: '',
      startedAt: Date.now(),
      model,
      messages: []
    }
    this.conversations.push(newConversation)
    this.readyToShutdown = false
    broadcastIPCMessage('conversations-updated', this.conversations)

    if (setAsActive) {
      this.selectConversation(newConversation.id)
    }

    return newConversation
  }

  public selectConversation (conversationId: string|undefined) {
    if (conversationId === undefined) {
      this.activeConversation = undefined
      broadcastIPCMessage('active-conversation-changed', undefined)
      return
    }

    const conv = this.conversations.find(c => c.id === conversationId)

    if (conv === undefined) {
      throw new Error(`Could not select conversation ${conversationId}: Not found`)
    }

    this.activeConversation = conv.id
    broadcastIPCMessage('active-conversation-changed', conv.id)
    // Also load the appropriate model
    this.llamaProvider.loadModel(conv.model, conv.messages)
  }

  public getConversation (conversationId?: string): Conversation|undefined {
    return this.conversations.find(c => c.id === conversationId)
  }

  public updateConversation (update: Conversation) {
    const oldIndex = this.conversations.findIndex(c => c.id === update.id)

    if (oldIndex > -1) {
      this.conversations.splice(oldIndex, 1, update)
      broadcastIPCMessage('conversation-updated', update)
      this.readyToShutdown = false
      // Also load the appropriate model
      this.llamaProvider.loadModel(update.model, update.messages)
    }
  }

  public deleteConversation (conversationId: string) {
    const idx = this.conversations.findIndex(c => c.id === conversationId)

    if (idx === -1) {
      throw new Error(`Could not remove conversation ${conversationId}: Not found`)
    }

    if (this.conversations[idx].id === this.activeConversation && this.conversations.length > 1) {
      // Select another conversation to be active
      if (idx === this.conversations.length - 1) {
        this.selectConversation(this.conversations[idx - 1].id)
      } else {
        this.selectConversation(this.conversations[idx + 1].id)
      }
    } else if (this.conversations[idx].id === this.activeConversation) {
      this.selectConversation(undefined)
    }

    this.conversations.splice(idx, 1)
    this.readyToShutdown = false
    broadcastIPCMessage('conversations-updated', this.conversations)
  }
}