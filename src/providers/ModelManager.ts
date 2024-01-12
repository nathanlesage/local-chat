import { app, ipcMain } from 'electron'
import path from 'path'
import { promises as fs } from 'fs'

export interface ModelDescriptor {
  path: string
  name: string
}


// Supported file name extensions for models
const SUPPORTED_MODEL_TYPES = [
  '.gguf'
]

export class ModelManager {
  private static thisInstance: ModelManager
  private models: ModelDescriptor[]

  private constructor () {
    this.models = []

    // RETURNS: modelName[]
    ipcMain.handle('get-available-models', async (event, args) => {
      return await this.getAvailableModels()
    })
  }

  public static getModelManager () {
    if (this.thisInstance === undefined) {
      this.thisInstance = new ModelManager()
    }

    return this.thisInstance
  }

  get modelDirectory (): string {
    return path.join(app.getPath('appData'), 'models')
  }

  // async downloadModel (modelLocation: string) {}

  async getAvailableModels (): Promise<ModelDescriptor[]> {
    const availableModels: ModelDescriptor[] = []
    for (const file of await fs.readdir(this.modelDirectory)) {
      const ext = path.extname(file)
      const basename = path.basename(file, ext)
      const fullPath = path.join(this.modelDirectory, file)

      if (SUPPORTED_MODEL_TYPES.includes(ext)) {
        availableModels.push({
          path: fullPath, name: basename
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
