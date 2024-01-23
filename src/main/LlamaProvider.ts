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

export type LLAMA_STATUS = 'uninitialized'|'ready'|'loading'|'generating'|'error'

export interface LlamaStatusNormal {
  status: 'uninitialized'|'ready'|'loading'|'generating'
  message: string
}

export interface LlamaStatusError {
  status: 'error'
  error: Error
}

export type LlamaStatus  = LlamaStatusNormal|LlamaStatusError

/**
 * Retrieves the Llama module. This is to fix a BUG (see)
 */
async function llamaModule (): Promise<typeof import('node-llama-cpp')> {
  return await (mod as any)
}

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

export class LlamaProvider {
  private loadedModel: ModelDescriptor|undefined
  private lastLoadedConversationHistory: ChatMessage[]
  private session: LlamaChatSession|undefined
  private status: LlamaStatus

  constructor () {
    console.log('Instantiating LlamaProvider')
    this.setStatus('uninitialized', 'Provider not initialized')
    this.lastLoadedConversationHistory = []

    // Hook up event listeners

    ipcMain.handle('get-loaded-model', (event, args) => {
      return this.loadedModel
    })

    ipcMain.handle('get-llama-status', (event) => {
      return this.status
    })

    ipcMain.handle('get-llama-info', async (event) => {
      return await (await llamaModule()).getReleaseInfo()
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

  private setStatus (status: LLAMA_STATUS, payload: string|Error) {
    if (status === 'error' && typeof payload !== 'string') {
      this.status = { status, error: payload }
    } else if (status !== 'error' && typeof payload === 'string') {
      this.status = { status, message: payload }
    }
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
    const conv: ChatHistoryItem[] = []

    for (const message of messages) {
      if (message.role === 'user') {
        conv.push({ type: 'user', text: message.content })
      } else if (message.role === 'assistant') {
        conv.push({ type: 'model', response: [message.content] })
      }
    }

    return conv
  }

  private async getChatTemplateWrapper (prompt: string): Promise<'auto'|ChatWrapper> {
    const resolved = await llamaModule()
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

  async loadModel (modelDescriptor: ModelDescriptor, previousConversation: ChatMessage[] = [], force: boolean = false) {
    if (
      modelDescriptor.path === this.loadedModel?.path &&
      JSON.stringify(this.lastLoadedConversationHistory) === JSON.stringify(previousConversation) &&
      !force // Allow forcefully reloading model, even if nothing else has changed (useful especially for config changes.)
    ) {
      return // Nothing to do
    }

    const resolved = await llamaModule()
    
    this.setStatus('loading', `Loading model ${modelDescriptor.name}`)
    
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
        chatWrapper: await this.getChatTemplateWrapper(modelDescriptor.config.prompt)
    } as LlamaChatSessionOptions)

    this.session.setChatHistory(this.convertConversationMessages(previousConversation))

    console.log(`\x1b[1;31mSession initialized with ${previousConversation.length} messages and prompt template "${modelDescriptor.config.prompt}". LlamaProvider ready.\x1b[0m`)

    this.loadedModel = modelDescriptor

    this.setStatus('ready', 'Model ready')

    broadcastIPCMessage('loaded-model-updated', this.loadedModel)
  }

  public async prompt (message: string, onToken?: (chunk: string) => void): Promise<string> {
    if (this.session === undefined) {
      throw new Error('Cannot prompt model: None loaded')
    }

    this.setStatus('generating', 'Generating')
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
      this.setStatus('ready', 'Model ready')
      return answer
    } catch (err) {
      ipcMain.off('stop-generating', callback)
      this.setStatus('ready', 'Model ready')
      return chunks
    }
  }
}
