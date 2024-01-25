import {
  app,
  BrowserWindow,
  BrowserWindowConstructorOptions,
  ipcMain,
  dialog,
  shell,
  Menu,
  MenuItem,
  type MessageBoxOptions
} from 'electron'
import { ConversationManager } from './ConversationManager'
import path from 'path'
import { promises as fs } from 'fs'
import { setApplicationMenu } from './util/set-application-menu'

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
      const menu = new Menu()
    
      // In case the user right-clicked on a misspelled word, this allows
      // handling this.
      for (const suggestion of params.dictionarySuggestions) {
        menu.append(new MenuItem({
          label: suggestion,
          click: () => this.mainWindow?.webContents.replaceMisspelling(suggestion)
        }))
      }
    
      // Allow users to add the misspelled word to the dictionary
      if (params.misspelledWord) {
        menu.append(
          new MenuItem({
            label: 'Add to dictionary',
            click: () => this.mainWindow?.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
          })
        )
      }

      const { canUndo, canRedo, canCut, canCopy, canPaste, canDelete, canSelectAll } = params.editFlags
      const editable = params.isEditable
      menu.append(new MenuItem({ type: 'separator' }))
      menu.append(new MenuItem({ role: 'undo', enabled: canUndo && editable }))
      menu.append(new MenuItem({ role: 'redo', enabled: canRedo && editable }))
      menu.append(new MenuItem({ type: 'separator' }))
      menu.append(new MenuItem({ role: 'cut', enabled: canCut && editable }))
      menu.append(new MenuItem({ role: 'copy', enabled: canCopy }))
      menu.append(new MenuItem({ role: 'paste', enabled: canPaste && editable }))
      menu.append(new MenuItem({ role: 'delete', enabled: canDelete && editable }))
      menu.append(new MenuItem({ type: 'separator' }))
      menu.append(new MenuItem({ role: 'selectAll', enabled: canSelectAll }))

      menu.popup()
    })
  }
}
