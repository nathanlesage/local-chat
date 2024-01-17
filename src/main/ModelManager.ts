import { app, ipcMain, shell } from 'electron'
import path from 'path'
import gguf from 'gguf'
import { promises as fs, createWriteStream } from 'fs'
import type { GGUFMetadata } from 'gguf/dist/metadataTypes'
import { broadcastIPCMessage } from './util/broadcast-ipc-message'
import got from 'got'

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

export interface ModelDownloadStatus {
  /**
   * True if there is a model download happening.
   */
  isDownloading: boolean
  /**
   * If lastErrorMessage is not undefined, an error occurred. The error
   * corresponds to the got error classes
   */
  lastErrorMessage?: string
  /**
   * Contains the last error code
   */
  lastErrorCode?: string
  /**
   * The model name
   */
  name: string
  /**
   * The total size in bytes
   */
  size_total: number
  /**
   * The size of the already downloaded chunk
   */
  size_downloaded: number
  /**
   * When the download has started
   */
  start_time: number
  /**
   * How long the update will approximately still need
   */
  eta_seconds: number
  /**
   * Average bytes per second
   */
  bytes_per_second: number
}

// Supported file name extensions for models
const SUPPORTED_MODEL_TYPES = [
  '.gguf'
]

export class ModelManager {
  private static thisInstance: ModelManager
  private downloadStatus: ModelDownloadStatus
  private downloadCancelFlag: boolean

  private constructor () {
    this.downloadCancelFlag = false
    this.downloadStatus = {
      isDownloading: false,
      name: '',
      size_total: 0,
      size_downloaded: 0,
      start_time: 0,
      eta_seconds: 0,
      bytes_per_second: 0
    }

    // RETURNS: modelName[]
    ipcMain.handle('get-available-models', async (event, args) => {
      return await this.getAvailableModels()
    })

    ipcMain.handle('open-model-directory', async (event, args) => {
      return await shell.openPath(this.modelDirectory)
    })

    ipcMain.handle('get-model-download-status', (event) => {
      return this.downloadStatus
    })

    ipcMain.handle('download-model', async (event, payload) => {
      return await this.downloadModel(payload)
    })

    ipcMain.handle('cancel-download', (event) => {
      this.downloadCancelFlag = true
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

  private setStatus (newStatus: ModelDownloadStatus) {
    this.downloadStatus = newStatus
    broadcastIPCMessage('model-download-status-updated', this.downloadStatus)
  }

  async downloadModel (modelLocation: string) {
    this.downloadCancelFlag = false
    console.log(`Downloading model from ${modelLocation} ...`)
    const destination = path.join(this.modelDirectory, path.basename(modelLocation))
    const writeStream = createWriteStream(destination)
    const readStream = got.stream(modelLocation) // as unknown as ReadStream

    // Preset the appropriate values on the internal state
    this.downloadStatus.isDownloading = true
    this.downloadStatus.name = path.basename(modelLocation, path.extname(modelLocation))
    this.downloadStatus.size_downloaded = readStream.downloadProgress.transferred
    this.downloadStatus.size_total = readStream.downloadProgress.total ?? 0
    this.downloadStatus.start_time = Date.now()
    this.setStatus(this.downloadStatus)

    readStream.on('data', (chunk: Buffer) => {
      if (this.downloadCancelFlag) {
        console.log('Download abort request received -- aborting.')
        this.downloadStatus.isDownloading = false
        readStream.destroy()
        return
      }

      if (writeStream.closed) {
        this.downloadStatus.isDownloading = false
        this.downloadStatus.lastErrorMessage = 'EWRITESTREAM', 'Could not accept data for application update: Write stream is gone.'
        this.setStatus(this.downloadStatus)
        return
      }

      const now = Date.now()
      this.downloadStatus.size_downloaded = readStream.downloadProgress.transferred
      this.downloadStatus.size_total = readStream.downloadProgress.total ?? 0
      const secondsPassed = (now - this.downloadStatus.start_time) / 1000
      this.downloadStatus.bytes_per_second = this.downloadStatus.size_downloaded / secondsPassed
      const bytesRemaining = Math.max(0, this.downloadStatus.size_total - this.downloadStatus.size_downloaded)
      this.downloadStatus.eta_seconds = Math.round(bytesRemaining / this.downloadStatus.bytes_per_second)
      this.setStatus(this.downloadStatus)
      writeStream.write(chunk)
    })

    readStream.on('end', () => {
      this.downloadStatus.isDownloading = false
      this.setStatus(this.downloadStatus)
      writeStream.end()
    }) // Proper finish
    readStream.on('close', () => {
      writeStream.end()
      this.downloadStatus.isDownloading = false
      this.setStatus(this.downloadStatus)
      fs.unlink(destination).catch(err => { console.error(err) })
    }) // Canceled

    readStream.on('error', (err) => {
      this.downloadStatus.isDownloading = false
      if (!writeStream.closed) {
        writeStream.end()
      }
      this.downloadStatus.lastErrorMessage = 'EREADSTREAM', `Download Read Stream Error: ${err.message}`
      this.setStatus(this.downloadStatus)
      fs.unlink(destination).catch(err => { console.error(err) })
    })

    writeStream.on('error', (err) => {
      this.downloadStatus.isDownloading = false
      if (!readStream.closed) {
        readStream.end()
      }
      this.downloadStatus.lastErrorMessage = 'EWRITESTREAM', `Download Write Stream Error: ${err.message}`
      this.setStatus(this.downloadStatus)
      fs.unlink(destination).catch(err => { console.error(err) })
    })
  }

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
