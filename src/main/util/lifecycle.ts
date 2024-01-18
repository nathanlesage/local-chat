import { app } from 'electron'

const shutdownTasks: Array<() => Promise<void>> = []
const startupTasks: Array<() => Promise<void>> = []

let readyToShutdown = false
let isRunningShutdownTasks = false
let isRunningStartupTasks = false

export function registerShutdownTask (callback: () => Promise<void>) {
  if (isRunningShutdownTasks) {
    throw new Error('Cannot register shutdown task: Application is already shutting down.')
  }
  shutdownTasks.push(callback)
}

export function registerStartupTask (callback: () => Promise<void>) {
  if (isRunningStartupTasks) {
    throw new Error('Cannot register startup task: Application is already booting.')
  }
  startupTasks.push(callback)
}

async function runShutdownTasks () {
  if (isRunningShutdownTasks) {
    return
  }
  console.log(`SHUTDOWN: Executing ${shutdownTasks.length} tasks.`)
  isRunningShutdownTasks = true

  const allPromises: Array<Promise<void>> = []

  let callback: undefined|(() => Promise<void>)

  while ((callback = shutdownTasks.shift()) !== undefined) {
    allPromises.push(callback())
  }

  await Promise.allSettled(allPromises)
  readyToShutdown = true
  console.log('SHUTDOWN: Done.')
}

export async function runStartupTasks () {
  if (isRunningStartupTasks) {
    return
  }
  console.log(`STARTUP: Executing ${startupTasks.length} tasks.`)
  isRunningStartupTasks = true

  const allPromises: Array<Promise<void>> = []

  let callback: undefined|(() => Promise<void>)

  while ((callback = startupTasks.shift()) !== undefined) {
    allPromises.push(callback())
  }

  await Promise.allSettled(allPromises)
  console.log('STARTUP: Done.')
}

app.whenReady().then(() => {
  app.on('window-all-closed', (event: any) => {
    if (readyToShutdown) {
      return
    }

    event.preventDefault()
    runShutdownTasks().finally(app.quit)
  })

  app.on('will-quit', (event) => {
    if (readyToShutdown) {
      return
    }

    event.preventDefault()
    runShutdownTasks().finally(app.quit)
  })
})
