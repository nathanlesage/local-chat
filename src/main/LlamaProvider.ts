import { ipcMain } from 'electron'
import type {
  LlamaChatSession,
  ChatHistoryItem,
  ChatWrapper
} from 'node-llama-cpp'
import mod from 'node-llama-cpp'
import { ModelDescriptor } from './ModelManager'
import { broadcastIPCMessage } from './util/broadcast-ipc-message'
import { ChatMessage, Conversation } from './ConversationManager'
import _ from 'lodash'

/**
 * Small utility function that determines how many GPU layers the model may use.
 * By default, it only explicitly uses GPU layers if we're on Apple Silicon.
 * Users can override this by passing `DISABLE_GPU=true`
 *
 * @return  {number|undefined}  A setting that can be passed to `gpuLayers`
 */
function getGPULayersToUse (): number|undefined {
  if (process.env.DISABLE_GPU === 'true') {
    return undefined
  }

  if (process.platform === 'darwin' && process.arch === 'arm64') {
    return 100 // NOTE: Will use fewer GPU layers if the model has fewer layers.
  }

  // Default: unset
  return undefined
}

export type LLAMA_STATUS = 'uninitialized'|'ready'|'loading'|'generating'|'error'

export interface LlamaStatus {
  status: 'uninitialized'|'ready'|'loading'|'generating'|'error'
  message: string
}

/**
 * Retrieves the Llama module. This is to fix a BUG (see)
 */
async function llamaModule (): Promise<typeof import('node-llama-cpp')> {
  return await (mod as any)
}

export interface LlamaCppInfo {
  repo: string
  release: string
  vramState: {
    total: number
    used: number
    free: number
  }
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
  private lastLoadedConversation: Conversation|undefined
  private session: LlamaChatSession|undefined
  private status: LlamaStatus

  constructor () {
    console.log('Instantiating LlamaProvider')
    this.setStatus('uninitialized', 'Provider not initialized')
    this.lastLoadedConversation = undefined

    // Hook up event listeners

    ipcMain.handle('get-loaded-model', (event, args) => {
      return this.loadedModel
    })

    ipcMain.handle('get-llama-status', (event) => {
      return this.status
    })

    ipcMain.handle('get-llama-info', async (event): Promise<LlamaCppInfo> => {
      const module = await llamaModule()
      const llama = await module.getLlama()
      return { ...llama.llamaCppRelease, vramState: llama.getVramState() }
    })

    ipcMain.handle('force-reload-model', (event) => {
      if (this.loadedModel === undefined) {
        throw new Error('Could not reload model: None loaded.')
      }
      return this.loadModel(this.loadedModel, this.lastLoadedConversation, true)
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

  /**
   * Sets the status of the provider and notifies any processes that listen.
   *
   * @param   {LLAMA_STATUS}  status   The new status
   * @param   {string}        payload  An optional message
   */
  private setStatus (status: LLAMA_STATUS, payload?: string) {
    if (payload === undefined) {
      switch (status) {
        case 'error':
          payload = 'Provider encountered an error'
          break
        case 'generating':
          payload = 'Generating'
          break
        case 'loading':
          payload = 'Model loading'
          break
        case 'ready':
          payload = `Model ready (ctx: ${this.loadedModel?.config.contextLengthOverride ?? 'N/A'})`
          break
        case 'uninitialized':
          payload = 'Provider uninitialized'
      }
    }
    this.status = { status, message: payload }
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
      } else if (message.role === 'system') {
        conv.push({ type: 'system', text: message.content })
      }
    }

    return conv
  }

  private async getChatTemplateWrapper (prompt: string): Promise<'auto'|ChatWrapper> {
    const module = await llamaModule()
    switch (prompt) {
      case 'llama':
        return new module.LlamaChatWrapper()
      case 'chatml':
        return new module.ChatMLChatWrapper()
      case 'falcon':
        return new module.FalconChatWrapper()
      case 'general':
        return new module.GeneralChatWrapper()
      case 'empty':
        return new module.EmptyChatWrapper()
      default:
        return 'auto'
    }
  }

  async loadModel (modelDescriptor: ModelDescriptor, conversation?: Conversation, force: boolean = false) {
    if (
      _.isEqual(modelDescriptor, this.loadedModel) &&
      _.isEqual(conversation, this.lastLoadedConversation) &&
      !force // Allow forcefully reloading model, even if nothing else has changed (useful especially for config changes.)
    ) {
      console.warn(`Ignoring attempt to reload model, since nothing has changed and the force-flag was not present.`)
      return // Nothing to do
    }

    const module = await llamaModule()

    try {
      this.lastLoadedConversation = structuredClone(conversation)
      this.setStatus('loading', `Loading model ${modelDescriptor.name}`)

      const llama = await module.getLlama({
        // Only print out warnings or above
        logLevel: module.LlamaLogLevel.warn,
        // Never attempt to actually build the binaries (those should only be shipped)
        build: 'never',
        // Don't output loading progress logs
        progressLogs: false
        // TODO: Enable users to set the CUDA options
        // cuda: true/false
      })
      
      console.log(`Loading new model: ${modelDescriptor.name}`)
      const model = new module.LlamaModel({
        llama,
        modelPath: modelDescriptor.path,
        gpuLayers: getGPULayersToUse()
      })
      console.log(`Model ${modelDescriptor.name} loaded. Context size is ${model.trainContextSize}; will load with a context size of ${modelDescriptor.config.contextLengthOverride}. Instantiating new session.`)

      const context = new module.LlamaContext({
          model,
          contextSize: modelDescriptor.config.contextLengthOverride
      })

      this.session = new module.LlamaChatSession({
          contextSequence: context.getSequence(),
          systemPrompt: conversation?.systemPrompt,
          chatWrapper: await this.getChatTemplateWrapper(modelDescriptor.config.prompt)
      })

      if (conversation !== undefined) {
        const history = this.convertConversationMessages(conversation.messages)
        if (conversation.systemPrompt !== undefined) {
          history.unshift({ type: 'system', text: conversation.systemPrompt })
        }
        this.session.setChatHistory(history)
        console.log(`Session initialized with ${history.length} messages and prompt template "${modelDescriptor.config.prompt}". LlamaProvider ready.`)
      } else {
        console.log(`Session initialized with no messages and prompt template "${modelDescriptor.config.prompt}". LlamaProvider ready.`)
      }

      this.loadedModel = structuredClone(modelDescriptor)
      this.setStatus('ready')
      broadcastIPCMessage('loaded-model-updated', this.loadedModel)
    } catch(err: any) {
      console.error(err)
      this.setStatus('error', String(err.message))
    }
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
      this.setStatus('ready')
      return answer
    } catch (err) {
      ipcMain.off('stop-generating', callback)
      this.setStatus('ready')
      return chunks
    }
  }
}
