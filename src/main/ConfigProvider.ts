import { app, ipcMain, nativeTheme } from 'electron'
import { registerShutdownTask, registerStartupTask } from './util/lifecycle'
import path from 'path'
import { promises as fs } from 'fs'
import { getDefaultConfig } from './util/get-default-config'
import { broadcastIPCMessage } from './util/broadcast-ipc-message'
import safeAssign from './util/safe-assign'

export interface Config {
  appearance: 'light'|'dark'|'system'
}

export class ConfigProvider {
  static thisInstance: ConfigProvider
  private config: Config

  private constructor () {
    this.config = getDefaultConfig()

    registerStartupTask(async () => {
      await this.loadConfig()
    })

    registerShutdownTask(async () => {
      await this.persistConfig()
    })

    ipcMain.handle('set-config', (event, args: Partial<Config>) => {
      this.setConfig(args)
    })

    ipcMain.handle('get-config', (event, args) => {
      return this.config
    })
  }

  public static getConfigProvider (): ConfigProvider {
    if (this.thisInstance === undefined) {
      this.thisInstance = new ConfigProvider()
    }

    return this.thisInstance
  }

  private get configPath (): string {
    return path.join(app.getPath('userData'), 'config.json')
  }

  private async loadConfig (): Promise<void> {
    try {
      await fs.access(this.configPath)
      const data = await fs.readFile(this.configPath, 'utf-8')
      this.config = safeAssign(JSON.parse(data), getDefaultConfig())
    } catch(err) {
      // File possibly doesn't exist
      this.config = getDefaultConfig()
    }

    // Immediately preset the corresponding theme source
    this.applyConfigChanges()
  }

  private async persistConfig (): Promise<void> {
    const data = JSON.stringify(this.config, undefined, '  ')
    await fs.writeFile(this.configPath, data, 'utf-8')
  }

  /**
   * Applies any config changes to the corresponding receivers
   */ 
  private applyConfigChanges (): void {
    nativeTheme.themeSource = this.config.appearance
  }

  /**
   * Updates the config with new settings
   *
   * @param   {Partial<Config>}  config  The partial config
   */
  public setConfig (config: Partial<Config>): void {
    this.config = { ...this.config, ...config }
    this.applyConfigChanges()
    broadcastIPCMessage('config-updated', this.config)
  }
}
