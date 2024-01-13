import {
  app,
  BrowserWindow,
  BrowserWindowConstructorOptions,
  ipcMain,
  dialog,
  type MessageBoxOptions
} from 'electron'
import { ConversationManager } from './ConversationManager'

export interface AppNotification {
  title: string
  message: string
  detail?: string
  severity: 'info'|'error'|'warning'
}

export class AppProvider {
  private mainWindow: BrowserWindow|undefined
  constructor () {
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
    // Access the Conversation manager to instantiate it
    ConversationManager.getConversationManager()
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
      // TODO windowConfig.icon = path.join(__dirname, 'icons/png/128x128.png')
    }

    this.mainWindow = new BrowserWindow(windowConfig)

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

      // Prevent any other navigation from within the window.
      event.preventDefault()
    })

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show()
    })

    this.mainWindow.on('closed', () => {
      this.mainWindow = undefined
    })
  }
}
