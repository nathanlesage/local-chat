import { app } from 'electron'
import { AppProvider } from './providers/AppProvider'
import path from 'path'
import fs from 'fs'
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-assembler'

// Immediately after launch, check if there is already another instance of
// Zettlr running, and, if so, exit immediately. The arguments (including files)
// from this instance will already be passed to the first instance.
if (!app.requestSingleInstanceLock()) {
  app.exit(0)
}

const localChat = new AppProvider()

// Run the pre-boot setup
preBootSetup()

app.whenReady().then(() => {
  afterReadySetup()
    .then(() => {
      localChat.boot().catch(err => console.error(err))
    })
    .catch(err => console.error(err))
})

app.on('second-instance', (event, argv, cwd) => {
  // A second instance has launched -> display window
  localChat.showMainWindow()
})

app.on('activate', () => {
  localChat.showMainWindow()
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    app.quit()
  }
})

////////////////////////////////// FUNCTIONS ///////////////////////////////////

/**
 * Sets up things that must be done before the app fires its `ready` event.
 */
function preBootSetup () {
  if (!app.isPackaged) {
    // __dirname === 'root directory/.webpack/main'
    const developAppDataPath = path.join(__dirname, '../../.data')
    if (!fs.existsSync(developAppDataPath)) {
      fs.mkdirSync(developAppDataPath, { recursive: true })
    }

    app.setPath('userData', developAppDataPath)
    app.setAppLogsPath(path.join(developAppDataPath, 'logs'))
  }
}

/**
 * Sets up things that must be done after the app fires its `ready` event.
 */
async function afterReadySetup () {
  if (!app.isPackaged) {
    try {
      await installExtension(VUEJS_DEVTOOLS)
    } catch (err) {
      console.error(err)
    }
  }
}
