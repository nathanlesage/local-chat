declare module '*.svg'

declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string
declare const MAIN_WINDOW_WEBPACK_ENTRY: string

declare interface Window {
  ipc: {
    /**
     * Sends a message to main (fire-and-forget)
     *
     * @param   {string}  channel  The channel to send upon
     * @param   {any[]}   args     Arguments to provide
     *
     */
    send: (channel: string, ...args: any[]) => void
    /**
     * Sends a synchronous message and returns the response immediately.
     *
     * @param   {string}  event  The channel to send upon
     * @param   {any[]}   args   Arguments for that call
     *
     * @return  {any}             Whichever this call returns from main
     */
    sendSync: (event: string, ...args: any[]) => any
    /**
     * Sens a message to main and returns a promise which fulfills with the
     * response from main.
     *
     * @param   {string}        channel  The channel to send upon
     * @param   {any[]}         args     Arguments for that call
     *
     * @return  {Promise<any>}           Whichever this call returns from main
     */
    invoke: (channel: string, ...args: any[]) => Promise<any>
    /**
     * Listens to broadcasted messages from main
     *
     * @param   {string}     channel   The channel on which to listen
     * @param   {undefined}  listener  An event. This will always be omitted and undefined.
     * @param   {any}        args      Any payload that was sent from main
     *
     * @return {Function}  A function to stop listening (remove the listener)
     */
    on: (channel: string, listener: (event: undefined, ...args: any) => void) => () => void
  }
}
