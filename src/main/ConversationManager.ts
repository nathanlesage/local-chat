import { broadcastIPCMessage } from "./util/broadcast-ipc-message"
import { ModelDescriptor, ModelManager } from "./ModelManager"
import { v4 as uuid } from 'uuid'
import { app, ipcMain, dialog } from 'electron'
import { LlamaProvider } from "./LlamaProvider"
import path from 'path'
import { promises as fs } from 'fs'
import { registerShutdownTask, registerStartupTask } from "./util/lifecycle"
import { ConfigProvider } from "./ConfigProvider"

export interface ChatMessage {
  role: 'user'|'assistant'|'system'
  content: string
  timestamp: number
  generationTime: number
}

export interface Conversation {
  id: string
  description: string
  systemPrompt?: string
  startedAt: number
  modelPath: string
  messages: ChatMessage[]
}

export class ConversationManager {
  private static thisInstance: ConversationManager
  private conversations: Conversation[]
  private activeConversation: string|undefined
  private modelManager: ModelManager
  private llamaProvider: LlamaProvider

  private constructor () {
    this.conversations = []
    this.modelManager = ModelManager.getModelManager()
    this.llamaProvider = new LlamaProvider()

    // Immediately begin loading the conversations from disk
    registerStartupTask(async () => {
      this.conversations = await this.loadConversations()
      console.log(`Restored ${this.conversations.length} conversations.`)
    })

    registerShutdownTask(async () => {
      await this.persistConversations()
    })

    ipcMain.handle('get-conversation', async (event, args) => {
      return this.getConversation(args)
    })

    ipcMain.handle('select-conversation', async (event, args) => {
      return this.selectConversation(args)
    })

    ipcMain.handle('rename-conversation', async (event, { conversationId, description }) => {
      return this.renameConversation(conversationId, description)
    })

    ipcMain.handle('export-conversation', async (event, args) => {
      return await this.exportConversation(args)
    })

    ipcMain.handle('get-active-conversation', (event, args) => {
      return this.activeConversation
    })

    ipcMain.handle('get-conversations', async (event, args) => {
      return this.conversations
    })

    ipcMain.handle('new-conversation', async (event, args) => {
      const { defaultModel } = ConfigProvider.getConfigProvider().getConfig()
      const availableModels = await this.modelManager.getAvailableModels()
      let model

      // First: Explicit model selection by caller
      if (typeof args === 'string' && await this.modelManager.modelAvailable(args)) {
        model = await this.modelManager.getModel(args)
      }

      // Second: Use default model
      if (model === undefined && defaultModel && await this.modelManager.modelAvailable(defaultModel)) {
        model = await this.modelManager.getModel(defaultModel)
      }

      // Third: If the default model can't be found, use the current loaded one
      if (model === undefined) {
        model = this.llamaProvider.getLoadedModel()
      }

      // Fourth: If all else fails, use the first available
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

    ipcMain.handle('delete-messages', async (event, { conversationId, messageIdx }) => {
      return this.deleteMessages(conversationId, messageIdx)
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

      conv.modelPath = model.path
      this.updateConversation(conv)
    })

    ipcMain.handle('update-system-prompt', async (event, args) => {
      const conv = this.getConversation(this.activeConversation)
      if (conv === undefined) {
        return
      }

      conv.systemPrompt = String(args).trim() !== '' ? String(args).trim() : undefined
      this.updateConversation(conv)
    })

    ipcMain.handle('prompt', async (event, args: string) => {
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

      // If this is the first message from user and they haven't given the conversation
      // a description yet, update the description automatically.
      if (conversation.messages.length === 1 && conversation.description.trim() === '') {
        // Only take the first line, first sentence.
        let newDescription = args.split('\n')[0].split('. ')[0]
        // Maximum of 80 characters, chop off and indicate with ellipsis.
        if (newDescription.length > 80) {
          newDescription = newDescription.substring(0, 80)
          newDescription = newDescription.substring(0, newDescription.lastIndexOf(' '))
          newDescription += ' …'
        }
        conversation.description = newDescription
      }

      // NOTE: We now have a new message, which would prompt the provider to
      // reload the model, but in this specific instance, we don't want to
      // reload it. Similar below where we update the conversation with the
      // result
      this.updateConversation(conversation, false)

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

      this.updateConversation(conversation, false)
    })
  }

  private get conversationCache () {
    return path.join(app.getPath('userData'), 'conversations.json')
  }

  private async persistConversations () {
    await fs.writeFile(
      this.conversationCache,
      JSON.stringify(this.conversations, undefined, '  '),
      'utf-8'
    )
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
      systemPrompt: undefined,
      startedAt: Date.now(),
      modelPath: model.path,
      messages: []
    }

    this.conversations.push(newConversation)
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
    this.modelManager.getModel(conv.modelPath, true)
      .then(model => this.llamaProvider.loadModel(model, conv))
  }

  public getConversation (conversationId?: string): Conversation|undefined {
    return this.conversations.find(c => c.id === conversationId)
  }

  public updateConversation (update: Conversation, reloadModel = true) {
    const oldIndex = this.conversations.findIndex(c => c.id === update.id)

    if (oldIndex > -1) {
      this.conversations.splice(oldIndex, 1, update)
      broadcastIPCMessage('conversation-updated', update)
      // Also load the appropriate model
      if (reloadModel) {
        this.modelManager.getModel(update.modelPath, true)
          .then(model => this.llamaProvider.loadModel(model, update))
      }
    }
  }

  public renameConversation (conversationId: string, description: string) {
    const convo = this.conversations.find(c => c.id === conversationId)
    if (convo === undefined) {
      throw new Error('Cannot rename conversation: Not found')
    }

    convo.description = description
    this.updateConversation(convo, false) // No need to force reload the model
  }

  /**
   * Deletes all provided messages by index from the given conversation.
   *
   * @param   {string}    conversationId  The conversation in question
   * @param   {number[]}  messageIdx      A list of all message indices to be removed
   */
  public deleteMessages (conversationId: string, messageIdx: number[]) {
    const convo = this.conversations.find(c => c.id === conversationId)
    if (convo === undefined) {
      throw new Error('Cannot delete message from conversation: Not found')
    }

    // Ensure the message indices are sorted in descending order
    // NOTE: We have to provide a sorting function because the default one sorts
    // digit by digit (i.e. 17 < 2 because it starts with a 1), lmao
    messageIdx = messageIdx.sort((a, b) => a - b).reverse()

    for (const idx of messageIdx) {
      if (idx < 0 || idx >= convo.messages.length) {
        console.error(`Cannot remove message ${idx} from conversation: Index out of bounds.`)
        continue
      }
      convo.messages.splice(idx, 1)
    }

    this.updateConversation(convo)
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
    broadcastIPCMessage('conversations-updated', this.conversations)
  }

  public async exportConversation (conversationId: string) {
    const conv = this.conversations.find(c => c.id === conversationId)

    if (conv === undefined) {
      throw new Error(`Could not export conversation ${conversationId}: Not found`)
    }

    // Ask user for path
    const response = await dialog.showSaveDialog({
      title: 'Save conversation',
      defaultPath: app.getPath('documents'),
      filters: [{ extensions: ['.md'], name: 'Markdown' }],
      message: 'Enter a filename'
    })

    // NOTE: `filePath` may also be an empty string after a cancellation
    // -> check for both!
    if (response.filePath === undefined || response.canceled) {
      console.log('User aborted conversation export')
      return
    }

    const content: string[] = []

    const model = await this.modelManager.getModel(conv.modelPath)
    const modelName = model === undefined ? conv.modelPath : model.metadata?.general.name ?? model.name
    content.push(`# Conversation with ${modelName} (${conv.startedAt})`)
    if (conv.description !== '') {
      content.push('', conv.description, '')
    }

    for (const msg of conv.messages) {
      const messageAuthor = msg.role === 'user' ? 'You' : modelName
      content.push(`## ${messageAuthor}`)
      content.push('', msg.content, '')
    }

    await fs.writeFile(response.filePath, content.join('\n'), 'utf-8')
  }
}
