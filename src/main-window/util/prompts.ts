import type { AppNotification } from "src/main/AppProvider"

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
  // Most errors will be transmitted over the IPC bridge, which will effectively
  // give two error messages. Filter the IPC-related one out.
  if (error.message.startsWith('Error invoking remote method')) {
    error.message = error.message.substring(error.message.indexOf(': Error:') + 9)
  }

  const notification: AppNotification = {
    title: error.name,
    message: error.message,
    detail: error.stack,
    severity: 'error'
  }

  ipcRenderer.send('prompt', notification)
}
