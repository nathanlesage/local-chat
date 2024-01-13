import { ipcMain } from 'electron'
import type { LlamaChatSession, ConversationInteraction, LlamaChatSessionOptions, LlamaModelOptions, LlamaContextOptions } from 'node-llama-cpp'
import mod from 'node-llama-cpp'
import { ModelDescriptor } from './ModelManager'
import { broadcastIPCMessage } from './util/broadcast-ipc-message'
import { ChatMessage } from './ConversationManager'

export interface LlamaStatus {
  status: 'uninitialized'|'ready'|'loading'|'generating'|'error'
  message: string
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
  private session: LlamaChatSession|undefined
  private status: LlamaStatus

  constructor () {
    this.setStatus(LLAMA_STATUS.uninitialized)

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
  private convertConversationMessags (messages: ChatMessage[]): ConversationInteraction[] {
    if (messages.length % 2 !== 0) {
      console.warn('Will omit messages from the conversation before feeding to the model: No paired selection.')
    }

    const conv: ConversationInteraction[] = []

    for (let i = 0; i < messages.length; i += 2) {
      const prompt = messages[i].content
      const response = messages[i + 1].content
      conv.push({ prompt, response })
    }

    return conv
  }

  async loadModel (modelDescriptor: ModelDescriptor, previousConversation: ChatMessage[] = []) {
    if (modelDescriptor.path === this.loadedModel?.path) {
      return // Nothing to do
    }

    this.setStatus(LLAMA_STATUS.loadingModel)

    const resolved = await (mod as any)

    this.session = new resolved.LlamaChatSession({
      context: new resolved.LlamaContext({
        model: new resolved.LlamaModel({ modelPath: modelDescriptor.path } as LlamaModelOptions)
      } as LlamaContextOptions),
      printLLamaSystemInfo: false,
      conversationHistory: this.convertConversationMessags(previousConversation)
    } as LlamaChatSessionOptions)

    this.loadedModel = modelDescriptor

    this.setStatus(LLAMA_STATUS.ready)

    broadcastIPCMessage('loaded-model-updated', this.loadedModel)
  }

  public async prompt (message: string, onToken?: (chunk: string) => void): Promise<string> {
    if (this.session === undefined) {
      throw new Error('Cannot prompt model: None loaded')
    }
    this.setStatus(LLAMA_STATUS.generating)
    const context = this.session.context
    const answer = await this.session.prompt(message, {
      onToken: (chunk) => {
        if (onToken !== undefined) {
          const decoded = context.decode(chunk)
          onToken(decoded)
        }
      }
    })
    this.setStatus(LLAMA_STATUS.ready)
    return answer
  }
}
