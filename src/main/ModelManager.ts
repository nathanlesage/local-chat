import { app, ipcMain, shell, dialog } from 'electron'
import path from 'path'
import gguf from 'gguf'
import { promises as fs, createWriteStream } from 'fs'
import type { GGUFMetadata } from 'gguf/dist/metadataTypes'
import { broadcastIPCMessage } from './util/broadcast-ipc-message'
import got from 'got'
import { registerShutdownTask, registerStartupTask } from './util/lifecycle'

export interface ModelConfig {
  /**
   * The prompt template to use for this specific model
   */
  prompt: string
  /**
   * An override for the context length. This is crucial for quantized models
   * where the context length in the metadata still refers to the non-quantized
   * context length, despite having been cut. This can prevent crashes when
   * wrong context lengths are provided.
   */
  contextLengthOverride: number
}

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
   * The last time the file was modified on disk (only relevant for caching)
   */
  modtime: number
  /**
   * Configuration for the provided model
   */
  config: ModelConfig
  /**
   * The size of the model on disk, in bytes
   */
  bytes: number
  /**
   * GGUF file metadata, inclues, e.g., quantization level and such. Should
   * normally be available, but there could be errors.
   */
  metadata?: GGUFMetadata
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

type ModelDataType = { config: [string, ModelConfig][], metadata: [string, GGUFMetadata][] }

// Supported file name extensions for models
const SUPPORTED_MODEL_TYPES = [
  '.gguf'
]

export class ModelManager {
  private static thisInstance: ModelManager
  private downloadStatus: ModelDownloadStatus
  private downloadCancelFlag: boolean
  private modelMetadataCache: Map<string, GGUFMetadata>
  private modelConfigCache: Map<string, ModelConfig>

  private constructor () {
    this.downloadCancelFlag = false
    this.modelMetadataCache = new Map()
    this.modelConfigCache = new Map()
    this.downloadStatus = {
      isDownloading: false,
      name: '',
      size_total: 0,
      size_downloaded: 0,
      start_time: 0,
      eta_seconds: 0,
      bytes_per_second: 0
    }

    // Immediately begin loading the cached data
    registerStartupTask(async () => {
      const { config, metadata } = await this.loadModelConfig()
      this.modelConfigCache = new Map(config)
      this.modelMetadataCache = new Map(metadata)
      // Ensure the provider now picks up all provided configs/metadata
      this.getAvailableModels()
        .then(models => { broadcastIPCMessage('available-models-updated', models) })
    })

    registerShutdownTask(async () => {
      await this.persistModelConfig()
    })

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

    ipcMain.handle('update-model-config', async (event, { modelPath, config }) => {
      return await this.updateModelConfig(modelPath, config)
    })
    
    ipcMain.handle('force-reload-available-models', async (event, args) => {
      return await this.forceReloadAvailableModels(args === 'clear-config')
    })
  }

  private async ensureModelDirectory () {
    try {
      await fs.access(this.modelDirectory)
    } catch (err: any) {
      await fs.mkdir(this.modelDirectory, { recursive: true })
    }
  }

  private async persistModelConfig () {
    const data: ModelDataType = {
      config: [...this.modelConfigCache.entries()],
      metadata: [...this.modelMetadataCache.entries()]
    }
    await fs.writeFile(
      this.modelCache,
      JSON.stringify(data, undefined, '  '),
      'utf-8'
    )
  }

  private async loadModelConfig (): Promise<ModelDataType> {
    try {
      await fs.access(this.modelCache)
      const data = await fs.readFile(this.modelCache, 'utf-8')
      return JSON.parse(data)
    } catch (err) {
      return { config: [], metadata: [] }
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

  private get modelCache (): string {
    return path.join(app.getPath('userData'), 'model-config.json')
  }

  public async modelAvailable (modelId: string): Promise<boolean> {
    const models = await this.getAvailableModels()
    return models.find(m => m.path === modelId) !== undefined
  }

  /**
   * Retrieves the model specified with the given modelId. If `provideFallback`
   * is set to `true`, it may return a different loaded model. If it is false,
   * or if there are no models available, `getModel` will return undefined.
   *
   * @param   {string}                              modelId  The model ID
   *
   * @return  {Promise<ModelDescriptor|undefined>}           The descriptor, or
   *                                                         undefined.
   */
  public async getModel (modelId: string): Promise<ModelDescriptor|undefined>
  public async getModel (modelId: string, provideFallback: true): Promise<ModelDescriptor>
  public async getModel (modelId: string, provideFallback?: true): Promise<ModelDescriptor|undefined> {
    const models = await this.getAvailableModels()
    const exactMatch = models.find(m => m.path === modelId)

    if (exactMatch !== undefined) {
      return exactMatch
    }

    if (provideFallback) {
      return models[0]
    }
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

  /**
   * Downloads a model. Will check that it has the appropriate filename
   * extension (*.gguf) and that the server actually responds with a binary data
   * stream.
   *
   * @param   {string}  modelLocation  The model to download (absolute URL)
   */
  async downloadModel (modelLocation: string) {
    if (!modelLocation.endsWith('.gguf')) {
      await dialog.showMessageBox({
        title: 'Could not download model',
        message: 'Could not download model: Expected the URL to end with ".gguf".'
      })
      return
    }

    this.downloadCancelFlag = false
    console.log(`Downloading model from ${modelLocation} ...`)
    const destination = path.join(this.modelDirectory, path.basename(modelLocation))
    const writeStream = createWriteStream(destination)
    const readStream = got.stream(modelLocation) // as unknown as ReadStream

    readStream.on('response', (response) => {
      const contentType = response.headers['content-type']
      if (contentType !== 'binary/octet-stream') {
        readStream.destroy() // Wrong file format, close the readStream and clean up.
        dialog.showMessageBox({
          title: 'Could not download model',
          message: `Could not download model: Unexpected content type: "${contentType}" (expected: "binary/octet-stream")`
        }).catch(err => console.error(err))
      }
    })

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

  public async getAvailableModels (): Promise<ModelDescriptor[]> {
    await this.ensureModelDirectory()
    const availableModels: ModelDescriptor[] = []

    for (const file of await fs.readdir(this.modelDirectory)) {
      const ext = path.extname(file)
      const basename = path.basename(file, ext)
      const fullPath = path.join(this.modelDirectory, file)
      const stat = await fs.stat(fullPath)

      if (!SUPPORTED_MODEL_TYPES.includes(ext)) {
        continue
      }

      const metadata = this.modelMetadataCache.get(fullPath)
      const cachedConfig = this.modelConfigCache.get(fullPath)
      const defaultConfig: ModelConfig = {
        prompt: 'auto',
        contextLengthOverride: 512 // N.B.: llama.cpp defaults to 512 as well.
      }

      const model: ModelDescriptor = {
        path: fullPath,
        name: basename,
        modtime: stat.mtimeMs,
        config: cachedConfig ?? defaultConfig,
        bytes: stat.size,
        metadata
      }

      // Whichever is the current config, set it.
      this.modelConfigCache.set(fullPath, model.config)

      // If the metadata is not found, fetch it asynchronously to not block the
      // call too much
      if (metadata === undefined) {
        this.getModelMetadata(fullPath)
          .then(metadata => {
            if (metadata === undefined) {
              console.error(`Could not retrieve metadata for model ${basename}`)
              return
            }

            model.metadata = metadata
            this.modelMetadataCache.set(fullPath, metadata)
            this.getAvailableModels()
              .then(models => { broadcastIPCMessage('available-models-updated', models) })
          })
          .catch(err => console.error(err))
      }

      availableModels.push(model)
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

  async updateModelConfig (modelPath: string, options: Partial<ModelConfig>) {
    const availableModels = await this.getAvailableModels()
    const model = availableModels.find(model => model.path === modelPath)
    if (model === undefined) {
      throw new Error(`Cannot update model config for ${modelPath}: Model not found.`)
    }

    model.config = { ...model.config, ...options }
    this.modelConfigCache.set(modelPath, model.config)
    const models = await this.getAvailableModels()
    broadcastIPCMessage('available-models-updated', models)
  }


  public async forceReloadAvailableModels (clearConfig: boolean = false) {
    // Force reload means: Remove all data, and then re-fetch it. May take a while.
    if (clearConfig) {
      this.modelConfigCache.clear()
    }
    this.modelMetadataCache.clear()
    const models = await this.getAvailableModels()
    broadcastIPCMessage('available-models-updated', models)
  }
}
