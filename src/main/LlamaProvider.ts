import { ipcMain } from 'electron'
import type {
  LlamaChatSession,
  LlamaModel,
  LlamaContext,
  ConversationInteraction,
  LlamaChatSessionOptions,
  LlamaContextOptions,
  LlamaModelOptions,
  ChatMLChatPromptWrapper,
  FalconChatPromptWrapper,
  GeneralChatPromptWrapper,
  LlamaChatPromptWrapper,
  EmptyChatPromptWrapper
} from 'node-llama-cpp'
import mod from 'node-llama-cpp'
import { ModelDescriptor } from './ModelManager'
import { broadcastIPCMessage } from './util/broadcast-ipc-message'
import { ChatMessage } from './ConversationManager'

export interface LlamaStatus {
  status: 'uninitialized'|'ready'|'loading'|'generating'|'error'
  message: string
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

    ipcMain.handle('force-reload-model', async (event) => {
      if (this.loadedModel === undefined) {
        throw new Error('Could not reload model: None loaded.')
      }
      return await this.loadModel(this.loadedModel, this.lastLoadedConversationHistory, true)
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
   * @param   {ChatMessage[]}              messages  The messages to convert
   *
   * @return  {ConversationInteraction[]}            The converted messages
   */
  private convertConversationMessages (messages: ChatMessage[]): ConversationInteraction[] {
    if (messages.length % 2 !== 0) {
      console.warn('Will omit messages from the conversation before feeding to the model: No paired selection.')
    }

    const conv: ConversationInteraction[] = []

    for (let i = 0; i < messages.length - 1; i += 2) {
      const prompt = messages[i].content
      const response = messages[i + 1].content
      conv.push({ prompt, response })
    }

    return conv
  }

  private async getChatTemplateWrapper (prompt: string): Promise<'auto'|ChatPromptWrapper> {
    console.log(`\x1b[1;31mReturning prompt wrapper for query ${prompt}.\x1b[0m`)
    const resolved = await (mod as any)
    switch (prompt) {
      case 'llama':
        return new resolved.LlamaChatPromptWrapper()
      case 'chatml':
        return new resolved.ChatMLChatPromptWrapper()
      case 'falcon':
        return new resolved.FalconChatPromptWrapper()
      case 'general':
        return new resolved.GeneralChatPromptWrapper()
      case 'empty':
        return new resolved.EmptyChatPromptWrapper()
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

    
    this.setStatus(LLAMA_STATUS.loadingModel)
    
    const resolved = await (mod as any)
    
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
        conversationHistory: this.convertConversationMessages(previousConversation),
        promptWrapper: await this.getChatTemplateWrapper(modelDescriptor.config.prompt)
    } as LlamaChatSessionOptions)

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
