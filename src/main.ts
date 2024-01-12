import { app } from 'electron'
import { AppProvider } from './providers/AppProvider'
import path from 'path'

// Immediately after launch, check if there is already another instance of
// Zettlr running, and, if so, exit immediately. The arguments (including files)
// from this instance will already be passed to the first instance.
if (!app.requestSingleInstanceLock()) {
  app.exit(0)
}

const localChat = new AppProvider()

app.whenReady().then(() => {
  if (!app.isPackaged) {
    // __dirname === 'root directory/.webpack/main'
    app.setPath('appData', path.join(__dirname, '../../'))
    console.log('Development appData path is now:', app.getPath('appData'))
  }
  localChat.boot().catch(err => console.error(err))
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
