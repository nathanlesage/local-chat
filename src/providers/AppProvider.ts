import { app, BrowserWindow, BrowserWindowConstructorOptions } from 'electron'
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-assembler'
import { LlamaProvider } from './LlamaProvider'

export class AppProvider {
  private mainWindow: BrowserWindow|undefined
  private llamaProvider: LlamaProvider
  constructor () {
    this.llamaProvider = new LlamaProvider()
  }

  async boot () {
    if (!app.isPackaged) {
      try {
        // Load Vue developer extension
        await installExtension(VUEJS_DEVTOOLS)
      } catch (err: any) {
        // pass
      }
    }

    // Boot the other providers, then show the window.
    await this.llamaProvider.boot()
    await this.showMainWindow()
  }

  async showMainWindow () {
    if (this.mainWindow !== undefined) {
      this.mainWindow.show()
      return
    }

    const windowConfig: BrowserWindowConstructorOptions = {
      width: 640,
      height: 480,
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
