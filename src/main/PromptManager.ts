import { ChatWrapper } from 'node-llama-cpp'
import { app, ipcMain } from 'electron'
import mod from 'node-llama-cpp'
import { registerShutdownTask, registerStartupTask } from './util/lifecycle'
import path from 'path'
import { promises as fs } from 'fs'
import { broadcastIPCMessage } from './util/broadcast-ipc-message'

// These are the chat wrapper templates provided by node-llama-cpp, which can't
// be used as names for custom prompts
const RESERVED_TEMPLATE_NAMES = [
  'llama', 'chatml', 'falcon', 'general', 'empty', 'auto'
]

export interface CustomPromptTemplate {
  // NOTE: Taken from the library directly since the types are not exported.
  template: `${`${string}{{systemPrompt}}` | ""}${string}{{history}}${string}{{completion}}${string}`
  historyTemplate: `${string}{{roleName}}${string}{{message}}${string}`
  modelRoleName: string
  userRoleName: string
  systemRoleName: string
}

/**
 * Retrieves the Llama module. This is to fix a BUG (see https://github.com/withcatai/node-llama-cpp/issues/135)
 */
async function llamaModule (): Promise<typeof import('node-llama-cpp')> {
  return await (mod as any)
}

export class PromptManager {
  // Internals
  private static thisInstance: PromptManager
  private customPrompts: Map<string, CustomPromptTemplate>

  private constructor () {
    this.customPrompts = new Map()

    registerStartupTask(async () => {
      this.customPrompts = await this.loadPrompts()
      console.log(`Restored ${this.customPrompts.values.length} prompts.`)
    })

    registerShutdownTask(async () => {
      await this.persistPrompts()
    })

    ipcMain.handle('get-prompt-names', async (): Promise<string[]> => {
      return [...this.customPrompts.keys()]
    })

    // Sets and updates a custom prompt
    ipcMain.handle('set-custom-prompt', async (event, args): Promise<void> => {
      if (
        typeof args !== 'object' ||
        typeof args.name !== 'string' ||
        typeof args.promptTemplate !== 'object'
      ) {
        throw new Error('Cannot create prompt: Malformed data')
      }

      if (args.name.trim().length === 0 || RESERVED_TEMPLATE_NAMES.includes(args.name.trim().toLowerCase())) {
        throw new Error(`Cannot set template: Name ${args.name} is invalid`)
      }

      this.setCustomPrompt(args.name, args.promptTemplate)
    })

    ipcMain.handle('get-custom-prompt', async (event, args): Promise<CustomPromptTemplate|undefined> => {
      if (typeof args !== 'string') {
        throw new Error('Cannot get prompt: Malformed data')
      }

      return this.customPrompts.get(args)
    })

    ipcMain.handle('delete-custom-prompt', async (event, args): Promise<void> => {
      if (typeof args !== 'string') {
        throw new Error('Cannot remove prompt: Malformed data')
      }

      this.customPrompts.delete(args)
      broadcastIPCMessage('custom-prompts-updated')
    })
  }

  public static getInstance (): PromptManager {
    if (this.thisInstance === undefined) {
      this.thisInstance = new PromptManager()
    }

    return this.thisInstance
  }

  // Private access
  private get customPromptCache () {
    return path.join(app.getPath('userData'), 'prompts.json')
  }

  private async persistPrompts () {
    const serializableMap = Array.from(this.customPrompts.entries())
    await fs.writeFile(
      this.customPromptCache,
      JSON.stringify(serializableMap, undefined, '  '),
      'utf-8'
    )
  }

  private async loadPrompts (): Promise<Map<string, CustomPromptTemplate>> {
    try {
      await fs.access(this.customPromptCache)
      const data = await fs.readFile(this.customPromptCache, 'utf-8')
      const unserializedMapData: [string, CustomPromptTemplate][] = JSON.parse(data)
      return new Map(unserializedMapData)
    } catch (err) {
      return new Map()
    }
  }

  // Possibly at some point public access
  /**
   * Sets a custom prompt using the provided data. Use this method both for
   * creating and updating a prompt.
   *
   * @param   {string}                         name  The prompt name
   * @param   {Partial<CustomPromptTemplate>}  data  The data
   */
  private setCustomPrompt (name: string, data: Partial<CustomPromptTemplate>) {
    if (RESERVED_TEMPLATE_NAMES.includes(name.toLowerCase())) {
      throw new Error(`Cannot create custom prompt: ${name} is a reserved name`)
    }

    this.customPrompts.set(name, {
      template: data.template ?? '{{systemPrompt}}\n{{history}}assistant:{{completion}}\nuser:',
      historyTemplate: data.historyTemplate ?? '{{roleName}}: {{message}}\n',
      modelRoleName: data.modelRoleName ?? 'assistant',
      userRoleName: data.userRoleName ?? 'user',
      systemRoleName: data.systemRoleName ?? 'system'
    })

    broadcastIPCMessage('custom-prompts-updated')
  }

  // Public access
  /**
   * Retrieves the chat wrapper according to its name. The prompt can be either
   * any of node-llama-cpp's built-in wrappers, or one of our custom names. Will
   * fall back to auto if the prompt template was not recognized.
   *
   * @param   {string}                       prompt  The prompt to load
   *
   * @return  {Promise<'auto'|ChatWrapper>}          Resolves with the wrapper.
   */
  public async getChatWrapper (prompt: string): Promise<'auto'|ChatWrapper> {
    const module = await llamaModule()

    const customPrompt = this.customPrompts.get(prompt)
    if (customPrompt !== undefined) {
      return new module.TemplateChatWrapper({ ...customPrompt })
    }

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
      case 'auto':
        return 'auto'
    }

    console.warn(`Prompt wrapper ${prompt} has not been found. Falling back to "auto"`)
    return 'auto'
  }
}
