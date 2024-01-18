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

  async loadModel (modelDescriptor: ModelDescriptor, previousConversation: ChatMessage[] = []) {
    if (
      modelDescriptor.path === this.loadedModel?.path &&
      JSON.stringify(this.lastLoadedConversationHistory) === JSON.stringify(previousConversation)
    ) {
      return // Nothing to do
    }

    
    this.setStatus(LLAMA_STATUS.loadingModel)
    
    const resolved = await (mod as any)

    let chatTemplate: GeneralChatPromptWrapper|LlamaChatPromptWrapper|ChatMLChatPromptWrapper|FalconChatPromptWrapper|'auto' = 'auto'
    switch (modelDescriptor.config.prompt) {
      case 'llama':
        chatTemplate = new resolved.LlamaChatPromptWrapper()
        break
      case 'chatml':
        chatTemplate = new resolved.ChatMLChatPromptWrapper()
        break
      case 'falcon':
        chatTemplate = new resolved.FalconChatPromptWrapper()
        break
      case 'general':
        chatTemplate = new resolved.GeneralChatPromptWrapper()
        break
      case 'empty':
        chatTemplate = new resolved.EmptyChatPromptWrapper()
        break
      case 'auto':
        chatTemplate = 'auto'
        break
    }
    
    console.log(`Loading new model: ${modelDescriptor.name}`)
    const model: LlamaModel = new resolved.LlamaModel({
      modelPath: modelDescriptor.path
    } as LlamaModelOptions)
    console.log(`Model ${modelDescriptor.name} loaded. Context size is ${model.trainContextSize}. Instantiating new session.`)

    const context: LlamaContext = new resolved.LlamaContext({
        model,
        // TODO: contextSize: Math.min(modelDescriptor.config.contextLengthOverride ?? Infinity, Math.max(2048, model.trainContextSize))
        contextSize: Math.min(2048, model.trainContextSize)
    } as LlamaContextOptions)

    this.session = new resolved.LlamaChatSession({
        contextSequence: context.getSequence(),
        conversationHistory: this.convertConversationMessages(previousConversation),
        promptWrapper: chatTemplate
    } as LlamaChatSessionOptions)

    console.log(`Session initialized with ${previousConversation.length} messages and prompt template "${modelDescriptor.config.prompt}". LlamaProvider ready.`)

    this.loadedModel = modelDescriptor

    this.setStatus(LLAMA_STATUS.ready)

    broadcastIPCMessage('loaded-model-updated', this.loadedModel)
  }

  public async prompt (message: string, onToken?: (chunk: string) => void): Promise<string> {
    if (this.session === undefined) {
      throw new Error('Cannot prompt model: None loaded')
    }

    this.setStatus(LLAMA_STATUS.generating)
    const answer = await this.session.prompt(message, {
      onToken: (chunk) => {
        if (onToken !== undefined && this.session !== undefined) {
          // const decoded = this.session.context.decode(chunk)
          const decoded = this.session.model.detokenize(chunk)
          onToken(decoded)
        }
      }
    })
    this.setStatus(LLAMA_STATUS.ready)
    return answer
  }
}
