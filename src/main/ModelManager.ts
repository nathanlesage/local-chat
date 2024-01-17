import { app, ipcMain, shell } from 'electron'
import path from 'path'
import gguf from 'gguf'
import { promises as fs } from 'fs'
import type { GGUFMetadata } from 'gguf/dist/metadataTypes'

export interface ModelDescriptor {
  /**
   * The full path to the model; can be used as an ID
   */
  path: string
  /**
   * The name (basename w/o extension) of the model
   */
  name: string
  /**
   * The size of the model on disk, in bytes
   */
  bytes: number
  /**
   * GGUF file metadata, inclues, e.g., quantization level and such. Should
   * normally be available, but there could be errors.
   */
  metadata: GGUFMetadata
}


// Supported file name extensions for models
const SUPPORTED_MODEL_TYPES = [
  '.gguf'
]

export class ModelManager {
  private static thisInstance: ModelManager

  private constructor () {
    // RETURNS: modelName[]
    ipcMain.handle('get-available-models', async (event, args) => {
      return await this.getAvailableModels()
    })

    ipcMain.handle('open-model-directory', async (event, args) => {
      return await shell.openPath(this.modelDirectory)
    })
  }

  private async ensureModelDirectory () {
    try {
      await fs.access(this.modelDirectory)
    } catch (err: any) {
      await fs.mkdir(this.modelDirectory, { recursive: true })
    }
  }

  public static getModelManager () {
    if (this.thisInstance === undefined) {
      this.thisInstance = new ModelManager()
    }

    return this.thisInstance
  }

  private get modelDirectory (): string {
    return path.join(app.getPath('userData'), 'models')
  }

  public async modelAvailable (modelId: string): Promise<boolean> {
    const models = await this.getAvailableModels()
    return models.find(m => m.path === modelId) !== undefined
  }

  public async getModel (modelId: string): Promise<ModelDescriptor|undefined> {
    const models = await this.getAvailableModels()
    return models.find(m => m.path === modelId)
  }

  private async getModelMetadata (modelPath: string) {
    const result = await gguf(modelPath)
    
    if (result.error !== undefined) {
      return undefined
    } else {
      return result.metadata
    }
  }

  // async downloadModel (modelLocation: string) {}

  async getAvailableModels (): Promise<ModelDescriptor[]> {
    await this.ensureModelDirectory()

    const availableModels: ModelDescriptor[] = []
    for (const file of await fs.readdir(this.modelDirectory)) {
      const ext = path.extname(file)
      const basename = path.basename(file, ext)
      const fullPath = path.join(this.modelDirectory, file)
      const stat = await fs.stat(fullPath)

      if (SUPPORTED_MODEL_TYPES.includes(ext)) {
        const metadata = await this.getModelMetadata(fullPath)
        if (metadata === undefined) {
          // There seems to have been an error parsing the model metadata
          console.warn(`Could not extract metadata from model ${basename}. This can indicate a corrupted file.`)
          continue
        }

        availableModels.push({
          path: fullPath,
          name: basename,
          bytes: stat.size,
          metadata
        })
      }
    }

    return availableModels
  }

  async removeModel (modelPath: string) {
    const availableModels = await this.getAvailableModels()
    const model = availableModels.find(model => model.path = modelPath)
    if (model !== undefined) {
      await fs.rm(model.path)
    }
  }
}
