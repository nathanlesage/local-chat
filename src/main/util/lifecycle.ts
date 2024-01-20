import { app } from 'electron'

type LifecycleCallback = () => Promise<void>|void

interface TaskEntry {
  priority: number,
  callback: LifecycleCallback
}

/**
 * Array used to store startup tasks to be run after whenReady().
 */
const startupTasks: TaskEntry[] = []

/**
 * Array used to store shutdown tasks to be run before quit.
 */
const shutdownTasks: TaskEntry[] = []

/**
 * False until runStartupTasks() has finished. When true, no more startup tasks
 * can be added.
 *
 * @var {boolean}
 */
let startedUp = false

/**
 * `startupPromise` holds a promise during startup. It is undefined otherwise.
 *
 * @var {Promise<void>}
 */
let startupPromise: Promise<void>|undefined

/**
 * False until the will-quit or window-all-closed events have been emitted and
 * the module has begun executing the shutdown tasks.
*
* @var {boolean}
*/
let isRunningShutdownTasks = false

/**
 * False until all shutdown tasks have been successfully executed.
 *
 * @var {boolean}
 */
let readyToShutdown = false

/**
 * Sorting function for the task arrays.
 *
 * @param   {TaskEntry}  a  The first task entry
 * @param   {TaskEntry}  b  The second task entry
 *
 * @return  {number}        A sorting order indicator number.
 */
function sortTasks (a: TaskEntry, b: TaskEntry): number {
  return b.priority - a.priority
}

/**
 * Resolves as soon as the startup tasks are done. NOTE: You MUST call this
 * function AFTER the whenReady() event has been fired.
 */
export async function awaitStartupTasks () {
  if (startedUp) {
    // Return an auto-resolving promise
    return await Promise.resolve()
  } else if (startupPromise !== undefined) {
    return await startupPromise
  } else {
    throw new Error(`Cannot await startup tasks: app.whenReady() has not yet been run.`)
  }
}

/**
 * Registers a new shutdown task. This is guaranteed to be run after the
 * `will-quit` or `window-all-closed` events.
 *
 * @param  {LifecycleCallback}  callback  The callback to be run during shutdown.
 * @param  {number}             priority  The priority to run with. Default 0.
 *                                        Higher numbers indicate higher
 *                                        priority. Can be negative.
 */
export function registerShutdownTask (callback: LifecycleCallback, priority = 0) {
  if (isRunningShutdownTasks) {
    throw new Error('Cannot register shutdown task: Application is already shutting down.')
  }
  shutdownTasks.push({ callback, priority })
  shutdownTasks.sort(sortTasks)
}

/**
 * Registers a new startup task. This is guaranteed to be run after the
 * `whenReady()` event has fired.
 *
 * @param  {LifecycleCallback}  callback  The callback to be run during startup.
 * @param  {number}             priority  The priority to run with. Default 0.
 *                                        Higher numbers indicate higher
 *                                        priority. Can be negative.
 */
export function registerStartupTask (callback: LifecycleCallback, priority = 0) {
  if (startedUp) {
    throw new Error('Cannot register startup task: Application has already booted.')
  }
  console.log('registering 1 startup task')
  startupTasks.push({ callback, priority })
  startupTasks.sort(sortTasks)
}

/**
 * Runs the shutdown tasks.
 */
async function runShutdownTasks () {
  if (isRunningShutdownTasks) {
    return
  }
  console.log(`SHUTDOWN: Executing ${shutdownTasks.length} tasks.`)
  isRunningShutdownTasks = true

  const allPromises: Array<Promise<void>> = []

  let entry: undefined|TaskEntry

  while ((entry = shutdownTasks.shift()) !== undefined) {
    const maybePromise = entry.callback()
    if (maybePromise instanceof Promise) {
      allPromises.push(maybePromise)
    }
  }

  await Promise.allSettled(allPromises)
  readyToShutdown = true
  console.log('SHUTDOWN: Done.')
}

/**
 * Runs the startup tasks.
 */
export async function runStartupTasks () {
  if (startupPromise !== undefined) {
    return
  }
  console.log(`STARTUP: Executing ${startupTasks.length} tasks.`)

  const allPromises: Array<Promise<void>> = []

  let entry: undefined|TaskEntry

  while ((entry = startupTasks.shift()) !== undefined) {
    const maybePromise = entry.callback()
    if (maybePromise instanceof Promise) {
      allPromises.push(maybePromise)
    }
  }

  await Promise.allSettled(allPromises)
  console.log('STARTUP: Done.')
  startedUp = true
}

app.whenReady().then(() => {
  // First, begin to run the startup tasks.
  startupPromise = runStartupTasks().catch(err => console.error(err))

  // Then, hook into the appropriate events to run our shutdown tasks.
  if (process.platform === 'win32') {
    // NOTE: This will break should we remove the window-all-closed callback in
    // main.ts
    app.on('window-all-closed', (event: any) => {
      if (readyToShutdown) {
        return
      }
  
      event.preventDefault()
      runShutdownTasks().finally(app.quit)
    })
  }

  app.on('will-quit', (event) => {
    if (readyToShutdown) {
      return
    }

    event.preventDefault()
    runShutdownTasks().finally(app.quit)
  })
})
