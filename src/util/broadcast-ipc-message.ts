import { BrowserWindow } from 'electron'

/**
 * Broadcasts an IPC message to all open windows
 *
 * @param   {string}  channel  The channel to broadcast on
 * @param   {any[]}   args     Any amount of arguments to be passed to the call
 */
export function broadcastIPCMessage (channel: string, ...args: any[]): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(channel, ...args)
  }
}
