import {
  app,
  BrowserWindow,
  BrowserWindowConstructorOptions,
  ipcMain,
  dialog,
  shell,
  screen,
  type MessageBoxOptions
} from 'electron'
import { ConversationManager } from './ConversationManager'
import path from 'path'
import { promises as fs } from 'fs'
import { setApplicationMenu } from './util/set-application-menu'
import { showContextMenu } from './util/show-context-menu'
import { WindowPositionProvider } from './WindowPositionProvider'
import { registerShutdownTask } from './util/lifecycle'

export interface AppNotification {
  title: string
  message: string
  detail?: string
  severity: 'info'|'error'|'warning'
}

export class AppProvider {
  private mainWindow: BrowserWindow|undefined

  constructor () {
    // Allow the conversation manager to register its startup tasks.
    ConversationManager.getConversationManager()

    ipcMain.on('prompt', (event, args: AppNotification) => {
      const opt: MessageBoxOptions = {
        title: args.title,
        message: args.message,
        detail: args.detail,
        type: args.severity,
        buttons: ['Ok'], defaultId: 0, cancelId: 0,
      }
      if (this.mainWindow !== undefined) {
        dialog.showMessageBox(this.mainWindow, opt)
      } else {
        dialog.showMessageBox(opt)
      }
    })
  }

  async boot () {
    // WINDOW POSITION PROVIDER STUFF
    const windowPositionConfig = path.join(app.getPath('userData'), 'window-positions.json')
    const prov = WindowPositionProvider.getWindowPositionProvider()
    try {
      await fs.access(windowPositionConfig)
      const data = await fs.readFile(windowPositionConfig, 'utf-8')
      prov.windowPositions = JSON.parse(data)
    } catch (err) {
      // Ignore
    }

    registerShutdownTask(async () => {
      const data = JSON.stringify(prov.windowPositions, undefined, '  ')
      await fs.writeFile(windowPositionConfig, data, 'utf-8')
    })

    // END WINDOW POSITION PROVIDER STUFF

    setApplicationMenu()
    await this.showMainWindow()
  }

  async showMainWindow () {
    if (this.mainWindow !== undefined) {
      this.mainWindow.show()
      return
    }

    const windowConfig: BrowserWindowConstructorOptions = {
      width: 800,
      height: 640,
      minWidth: 300,
      minHeight: 200,
      backgroundColor: '#fff',
      show: false,
      webPreferences: {
        contextIsolation: true,
        sandbox: true,
        preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY
      }
    }

    // Application icon for Linux. Cannot be embedded in the executable.
    if (process.platform === 'linux') {
      windowConfig.icon = path.join(__dirname, 'icons/png/128x128.png')
    }

    this.mainWindow = new BrowserWindow(windowConfig)

    // Immediately register the main Window positioning
    const prov = WindowPositionProvider.getWindowPositionProvider()
    const workArea = screen.getPrimaryDisplay().workArea
    prov.registerWindow(this.mainWindow, 'main-window', {
      x: Math.round(workArea.width / 2 - 400),
      y: Math.round(workArea.height / 2 - 320),
      width: 800,
      height: 640,
      maximized: false
    })

    const effectiveUrl = new URL(MAIN_WINDOW_WEBPACK_ENTRY)
    this.mainWindow.loadURL(effectiveUrl.toString())
      .catch(err => console.error(err))

    // Prevent navigation
    this.mainWindow.webContents.on('will-navigate', (event, url) => {
      if (!app.isPackaged && url.startsWith('http://localhost:3000')) {
        // We are in development, so we must make sure to allow webpack to
        // actually reload the windows. Webpack will always spin up devServers
        // at localhost.
        return true
      }

      // Prevent any other navigation from within the window and open it
      // externally.
      event.preventDefault()
      shell.openExternal(url).catch(err => console.error(err))
    })

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show()
    })

    this.mainWindow.on('closed', () => {
      this.mainWindow = undefined
    })

    // Basic context menu
    this.mainWindow.webContents.on('context-menu', (event, params) => {
      showContextMenu(event, params, this.mainWindow)
    })
  }
}
