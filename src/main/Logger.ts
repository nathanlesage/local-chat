import fs from 'fs'
import path from 'path'
import { app } from 'electron'

export class Logger {
  private static thisInstance: Logger
  private stdout: fs.WriteStream
  private stderr: fs.WriteStream
  private console: Console

  private constructor () {
    const logPath = path.join(app.getPath('logs'), 'process.log')
    console.log('Logging to path %s', logPath)
    const errorLogPath = path.join(app.getPath('logs'), 'error.log')
    this.stdout = fs.createWriteStream(logPath, { flags: 'a+' })
    this.stderr = fs.createWriteStream(errorLogPath, { flags: 'a+' })
    this.console = new console.Console({
      stdout: app.isPackaged ? this.stdout : process.stdout,
      stderr: app.isPackaged ? this.stderr : process.stderr,
      ignoreErrors: true, // Only errors when writing to the stream
      colorMode: false
    })

    // Overwrite the global console
    console = this.console
  }

  public shutdown () {
    // Close the file handles again
    this.stdout.close()
    this.stderr.close()
  }

  public static getLogger () {
    if (this.thisInstance === undefined) {
      this.thisInstance = new Logger()
    }

    return this.thisInstance
  }
}
