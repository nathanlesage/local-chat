import type { AppNotification } from "src/providers/AppProvider"

const ipcRenderer = window.ipc

/**
 * Prompts the user natively in the app
 *
 * @param  {Partial<AppNotification>}  setup  The setup. `message` is required.
 */
export function prompt (setup: Partial<AppNotification> & { message: string }) {
  const notification: AppNotification = {
    title: setup.title ?? 'Notification',
    message: setup.message,
    detail: setup.detail,
    severity: setup.severity ?? 'info'
  }

  ipcRenderer.send('prompt', notification)
}

export function alertError (error: Error) {
  const notification: AppNotification = {
    title: error.name,
    message: error.message,
    detail: error.stack,
    severity: 'error'
  }

  ipcRenderer.send('prompt', notification)
}
