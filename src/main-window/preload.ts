import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('ipc', {
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
  sendSync: (event: string, ...args: any[]) => ipcRenderer.sendSync(event, ...args),
  invoke: async (channel: string, ...args: any[]) => await ipcRenderer.invoke(channel, ...args),
  on: (channel: string, listener: (...args: any[]) => void) => {
    // NOTE: We're returning a stopListening() callback here since the function
    // will be cloned across the context bridge, so not the same object, hence
    // it cannot be removed otherwise.
    const callback = (event: any, ...args: any[]): void => {
      // Omit the event when calling the listener
      listener(undefined, ...args)
    }
    ipcRenderer.on(channel, callback)

    return () => ipcRenderer.off(channel, callback)
  }
})
