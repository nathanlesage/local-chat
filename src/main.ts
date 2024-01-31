import { app } from 'electron'
import { AppProvider } from './main/AppProvider'
import path from 'path'
import fs from 'fs'
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-assembler'
import { Logger } from './main/Logger'
import { awaitStartupTasks } from './main/util/lifecycle'
import { UpdateSourceType, updateElectronApp } from 'update-electron-app'

// Immediately after launch, check if there is already another instance of
// Zettlr running, and, if so, exit immediately. The arguments (including files)
// from this instance will already be passed to the first instance.
if (!app.requestSingleInstanceLock()) {
  app.exit(0)
}

// To show notifications properly on Windows, we must manually set the appUserModelID
// See https://www.electronjs.org/docs/tutorial/notifications#windows.
if (process.platform === 'win32') {
  // Since we are utilizing the Squirrel setup that enables us to auto-update,
  // the application ID has to follow a specific pattern; see more here:
  // https://www.electronjs.org/docs/latest/api/auto-updater
  // NOTE: I could not verify if this is actually the AppUserModelId as set by
  // Squirrel, since my work computer bugged out attempting to install it.
  app.setAppUserModelId('com.squirrel.LocalChat.LocalChat')
}

// Step 1: Run the pre-boot setup.
// NOTE: Must run before we instantiate the AppProvider!
preBootSetup()
// Step 2: Init logger now that the paths are correctly set.
Logger.getLogger() // Init logger now that the paths are correctly set
// Step 3: Initiate the updater now that console.log has been overwritten.
updateElectronApp({
  updateSource: {
    type: UpdateSourceType.ElectronPublicUpdateService,
    host: 'https://update.electronjs.org',
    repo: 'nathanlesage/local-chat'
  },
  updateInterval: '1 hour',
  // Very important so that the user can delay the update until the next start.
  notifyUser: true
})
// Step 3: Initiate the app itself so that it can run some preboot logic.
const localChat = new AppProvider()

app.whenReady().then(async () => {
  await afterReadySetup()
  await awaitStartupTasks()
  await localChat.boot()
})

app.on('will-quit', () => {
  Logger.getLogger().shutdown() // TODO
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

  app.setAboutPanelOptions({
    applicationName: 'LocalChat',
    applicationVersion: app.getVersion(),
    copyright: `Copyright (c) 2023 - ${(new Date()).getFullYear()} by Hendrik Erz. Licensed via GNU GPL 3.0`,
    credits: 'I am indebted to, among others, Georgi Gerganov for developing llama.cpp, and the contributors of withcatai (Cat AI) for building the Node.js bridge that LocalChat uses. Furthermore, I would like to thank the dozens of people involved in creating more and more new models that we can use with LocalChat.',
    authors: ['Hendrik Erz'], // TODO: Somehow generate the contributors list.
    website: 'https://www.hendrik-erz.de/', // TODO
    iconPath: process.execPath
  })
}
