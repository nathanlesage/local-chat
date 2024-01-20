import { ipcMain } from 'electron'
import type {
  LlamaChatSession,
  LlamaModel,
  LlamaContext,
  ChatHistoryItem,
  LlamaChatSessionOptions,
  LlamaContextOptions,
  LlamaModelOptions,
  ChatWrapper
} from 'node-llama-cpp'
import mod from 'node-llama-cpp'
import { ModelDescriptor } from './ModelManager'
import { broadcastIPCMessage } from './util/broadcast-ipc-message'
import { ChatMessage } from './ConversationManager'
import { registerStartupTask } from './util/lifecycle'

export interface LlamaStatus {
  status: 'uninitialized'|'ready'|'loading'|'generating'|'error'
  message: string
}

let resolved: typeof import('node-llama-cpp')

registerStartupTask(async () => {
  resolved = await (mod as any) as typeof import('node-llama-cpp')
})

export type ChatPromptWrapper = 'auto'|'empty'|'general'|'llama'|'chatml'|'falcon'

export function getSupportedModelPrompt (prompt: string): ChatPromptWrapper {
  switch (prompt) {
    case 'llama':
      return 'llama'
    case 'chatml':
      return 'chatml'
    case 'falcon':
      return 'falcon'
    case 'general':
      return 'general'
    case 'empty':
      return 'empty'
    default:
      return 'auto'
  }
}

export const LLAMA_STATUS: Record<string, LlamaStatus> = {
  uninitialized: { status: 'uninitialized', message: 'Provider not initialized' },
  loadingModel: { status: 'loading', message: 'Loading model' },
  generating: { status: 'generating', message: 'Generating response' },
  ready: { status: 'ready', message: 'Model ready' },
  error: { status: 'error', message: 'Model encountered an error' }
}

export class LlamaProvider {
  private loadedModel: ModelDescriptor|undefined
  private lastLoadedConversationHistory: ChatMessage[]
  private session: LlamaChatSession|undefined
  private status: LlamaStatus

  constructor () {
    console.log('Instantiating LlamaProvider')
    this.setStatus(LLAMA_STATUS.uninitialized)
    this.lastLoadedConversationHistory = []

    // Hook up event listeners

    ipcMain.handle('get-loaded-model', (event, args) => {
      return this.loadedModel
    })

    ipcMain.handle('get-llama-status', (event) => {
      return this.status
    })

    ipcMain.handle('force-reload-model', (event) => {
      if (this.loadedModel === undefined) {
        throw new Error('Could not reload model: None loaded.')
      }
      return this.loadModel(this.loadedModel, this.lastLoadedConversationHistory, true)
    })
  }

  public getStatus () {
    return this.status
  }

  public isReady () {
    return this.status.status === 'ready'
  }

  public getLoadedModel () {
    return this.loadedModel
  }

  private setStatus (status: LlamaStatus) {
    this.status = status
    broadcastIPCMessage('llama-status-updated', this.status)
  }

  /**
   * Small helper function that converts given chat messages into the format accepted by llama.cpp
   *
   * @param   {ChatMessage[]}      messages  The messages to convert
   *
   * @return  {ChatHistoryItem[]}            The converted messages
   */
  private convertConversationMessages (messages: ChatMessage[]): ChatHistoryItem[] {
    if (messages.length % 2 !== 0) {
      console.warn('Will omit messages from the conversation before feeding to the model: No paired selection.')
    }

    const conv: ChatHistoryItem[] = []

    for (let i = 0; i < messages.length - 1; i += 2) {
      const user = messages[i]
      const assistant = messages[i + 1]
      conv.push({ type: 'user', text: user.content })
      // For model response, see file LlamaChat.ts in node-llama-cpp
      conv.push({ type: 'model', response: [assistant.content] })
    }

    return conv
  }

  private getChatTemplateWrapper (prompt: string): 'auto'|ChatWrapper {
    switch (prompt) {
      case 'llama':
        return new resolved.LlamaChatWrapper()
      case 'chatml':
        return new resolved.ChatMLChatWrapper()
      case 'falcon':
        return new resolved.FalconChatWrapper()
      case 'general':
        return new resolved.GeneralChatWrapper()
      case 'empty':
        return new resolved.EmptyChatWrapper()
      default:
        return 'auto'
    }
  }

  loadModel (modelDescriptor: ModelDescriptor, previousConversation: ChatMessage[] = [], force: boolean = false) {
    if (
      modelDescriptor.path === this.loadedModel?.path &&
      JSON.stringify(this.lastLoadedConversationHistory) === JSON.stringify(previousConversation) &&
      !force // Allow forcefully reloading model, even if nothing else has changed (useful especially for config changes.)
    ) {
      return // Nothing to do
    }

    
    this.setStatus(LLAMA_STATUS.loadingModel)
    
    console.log(`\x1b[1;31mLoading new model: ${modelDescriptor.name}\x1b[0m`)
    const model: LlamaModel = new resolved.LlamaModel({
      modelPath: modelDescriptor.path
    } as LlamaModelOptions)
    console.log(`\x1b[1;31mModel ${modelDescriptor.name} loaded. Context size is ${model.trainContextSize}; will load with a context size of ${modelDescriptor.config.contextLengthOverride}. Instantiating new session.\x1b[0m`)

    const context: LlamaContext = new resolved.LlamaContext({
        model,
        contextSize: modelDescriptor.config.contextLengthOverride
    } as LlamaContextOptions)

    this.session = new resolved.LlamaChatSession({
        contextSequence: context.getSequence(),
        chatWrapper: this.getChatTemplateWrapper(modelDescriptor.config.prompt)
    } as LlamaChatSessionOptions)

    this.session.setChatHistory(this.convertConversationMessages(previousConversation))

    console.log(`\x1b[1;31mSession initialized with ${previousConversation.length} messages and prompt template "${modelDescriptor.config.prompt}". LlamaProvider ready.\x1b[0m`)

    this.loadedModel = modelDescriptor

    this.setStatus(LLAMA_STATUS.ready)

    broadcastIPCMessage('loaded-model-updated', this.loadedModel)
  }

  public async prompt (message: string, onToken?: (chunk: string) => void): Promise<string> {
    if (this.session === undefined) {
      throw new Error('Cannot prompt model: None loaded')
    }

    this.setStatus(LLAMA_STATUS.generating)
    const abortController = new AbortController()

    // Abort if the user wishes so
    const callback = () => { abortController.abort() }
    ipcMain.on('stop-generating', callback)

    let chunks: string = ''
    try {
      const answer = await this.session.prompt(message, {
        onToken: (chunk) => {
          if (onToken !== undefined && this.session !== undefined) {
            const decoded = this.session.model.detokenize(chunk)
            chunks += decoded
            onToken(decoded)
          }
        },
        signal: abortController.signal
      })
      ipcMain.off('stop-generating', callback)
      this.setStatus(LLAMA_STATUS.ready)
      return answer
    } catch (err) {
      ipcMain.off('stop-generating', callback)
      this.setStatus(LLAMA_STATUS.ready)
      return chunks
    }
  }
}
