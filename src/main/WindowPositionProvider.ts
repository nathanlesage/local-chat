import { BrowserWindow, Rectangle, screen } from 'electron'

// TODO: React to screen events!

export interface WindowConfiguration {
  /**
   * The window's ID
   */
  windowId: string
  /**
   * The display configuration's ID
   */
  displayConfiguration: string
  /**
   * The last recorded x coordinate
   */
  x: number
  /**
   * The last recorded y coordinate
   */
  y: number
  /**
   * The last recorded window width
   */
  width: number
  /**
   * The last recorded window height
   */
  height: number
  /**
   * Whether the window is currently maximized
   */
  maximized: boolean
}

/**
 * DefaultBounds means a window's default x, y, w, h, and maximization status.
 */
export type DefaultBounds = Rectangle & { maximized: boolean }

/**
 * This provider manages the window positions of all windows registered with it.
 * To register a window, simply pass it to `registerWindow` immediately after
 * instantiation (but before showing it), and remember to save down the window
 * positions before the application exits.
 *
 * NOTE: It is only safe to access this provider **after** the app's ready event
 * has been fired!
 */
export class WindowPositionProvider {
  private static instance: WindowPositionProvider
  private configuration: WindowConfiguration[]
  private readonly windowReferences: Map<string, BrowserWindow>

  private constructor () {
    this.configuration = []
    this.windowReferences = new Map()

    // Hook into the screen module events.
    screen.addListener('display-added', () => {
      this.onScreenConfigChange()
    })
    screen.addListener('display-metrics-changed', () => {
      this.onScreenConfigChange()
    })
    screen.addListener('display-removed', () => {
      this.onScreenConfigChange()
    })
  }

  /**
   * Normalizes the provided window bounds (x, y, width, height) in-place to be
   * contained within the closest matching display.
   *
   * @param   {Rectangle}  bounds  The bounds to normalize
   *
   * @return  {Rectangle}          The modified bounds
   */
  private normalizeBounds (bounds: Rectangle): Rectangle {
    const display = screen.getDisplayMatching(bounds)
    const workArea = display.workArea

    // This is necessary because otherwise the app will crash.
    bounds.x = Math.round(bounds.x)
    bounds.y = Math.round(bounds.y)
    bounds.width = Math.round(bounds.width)
    bounds.height = Math.round(bounds.height)

    if (bounds.x < workArea.x) {
      bounds.x = workArea.x
    }

    if (bounds.y < workArea.y) {
      bounds.y = workArea.y
    }

    if (bounds.width > workArea.width) {
      bounds.width = workArea.width
    }

    if (bounds.height > workArea.height) {
      bounds.height = workArea.height
    }

    const positionRight = bounds.x + bounds.width
    const positionBottom = bounds.y + bounds.height
    const workAreaRight = workArea.x + workArea.width
    const workAreaBottom = workArea.y + workArea.height

    if (positionRight > workAreaRight) {
      bounds.x -= positionRight - workAreaRight
    }

    if (positionBottom > workAreaBottom) {
      bounds.y -= positionBottom - workAreaBottom
    }

    return bounds
  }

  /**
   * Retrieves the singleton instance of the window position provider
   *
   * @return  {WindowPositionProvider}  The singleton
   */
  public static getWindowPositionProvider () {
    if (this.instance === undefined) {
      this.instance = new WindowPositionProvider()
    }

    return this.instance
  }

  /**
   * Retrieves the current display configuration as detected by the system.
   *
   * @return  {string}  The current display configuration
   */
  public get currentDisplayConfigurationID (): string {
    const configId: string[] = []

    const primaryDisplay = screen.getPrimaryDisplay()
    const displaysToConsider = screen.getAllDisplays()
      // Only properly detected screens
      .filter(d => d.detected)
      // Only actual displays (negative indicates an issue or virtual display)
      .filter(d => d.id >= 0)

    for (const display of displaysToConsider) {
      // Generate the "sub-ID" for the individual display. Each display can be
      // (reasonably) identified with the following mostly static properties.
      // NOTE that these properties are assumed static with regard to the
      // question if the user (!) assumes this to be still the same
      // configuration, not how often they change for the program.
      const displayId = [
        display.id,
        display.internal,
        display === primaryDisplay,
        display.workArea.x,
        display.workArea.y,
        display.workArea.width,
        display.workArea.height,
        display.rotation
      ].join(':') // display properties are divided by colons
      configId.push(displayId)
    }

    return configId.join('|') // Displays are divided by vertical slashes.
  }

  /**
   * Sets the available window configurations. Use this to provide an initial
   * configuration to the provider (e.g., on app start from some persisted
   * storage.)
   *
   * @param   {WindowConfiguration[]}  configurations  The list of window
   *                                                   configs.
   */
  public set windowPositions (configurations: WindowConfiguration[]) {
    this.configuration = configurations
  }

  /**
   * Gets the available window configurations. Use this to retrieve the
   * configuration to persist it to disk.
   *
   * @return  {WindowConfiguration[]}  The current window configurations
   */
  public get windowPositions (): WindowConfiguration[] {
    return this.configuration
  }

  /**
   * Registers a new window for persisting window positions. The provider will
   * manage this part entirely. The only things you need is the window
   * reference, an ID, and a default bounds object with x, y, width, height, and
   * maximized. NOTE: Do this as soon as possible after window creation (before
   * the window will be shown) to ensure a smooth user experience. This function
   * will immediately set proper window bounds.
   *
   * @param   {BrowserWindow}  win            The window to register.
   * @param   {string}         windowId       The window's unique ID.
   * @param   {DefaulBounds}   defaultBounds  Default position for new
   *                                          configurations.
   */
  public registerWindow (win: BrowserWindow, windowId: string, defaultBounds: DefaultBounds) {
    if (this.windowReferences.has(windowId)) {
      throw new Error(`Window with ID ${windowId} already registered.`)
    }

    // Save a reference for later
    this.windowReferences.set(windowId, win)

    // Set the new bounds as per the existing configuration, if possible.
    const existingConf = this.windowPositions.find(c => c.windowId === windowId && c.displayConfiguration === this.currentDisplayConfigurationID)
    // Animate in case the user registered the window too late
    win.setBounds(this.normalizeBounds(existingConf ?? defaultBounds), true)

    // Hook into the various events.
    const callback = (): void => {
      this.updateWindowPosition(win, windowId, defaultBounds)
    }

    win.on('resize', callback)
    win.on('move', callback)
    win.on('maximize', callback)
    win.on('unmaximize', callback)
    win.on('closed', () => {
      this.windowReferences.delete(windowId)
    })
  }

  /**
   * Updates the window position for the provided BrowserWindow. Should be
   * called from within various events to keep the window positions updated.
   *
   * @param   {BrowserWindow}  win            The window in queestion
   * @param   {string}         windowId       The associated window ID
   * @param   {DefaultBounds}  defaultBounds  Default bounds
   */
  private updateWindowPosition (win: BrowserWindow, windowId: string, defaultBounds: DefaultBounds) {
    // A default configuration to be applied when there is no existing config.
    const conf = this.currentDisplayConfigurationID
    const defaultConfig: WindowConfiguration = {
      windowId,
      displayConfiguration: conf,
      ...defaultBounds
    }

    // Then, get the existing configuration, if available
    const existingConfig = this.windowPositions.find(c => c.windowId === windowId && c.displayConfiguration === conf)
    const configToUse = existingConfig ?? defaultConfig

    // Finally, update the config.
    const { x, y, width, height } = win.getNormalBounds()
    configToUse.x = x
    configToUse.y = y
    configToUse.width = width
    configToUse.height = height
    configToUse.maximized = win.isMaximized()

    // If it's a new config, splice it in
    if (this.windowPositions.indexOf(configToUse) < 0) {
      this.windowPositions.push(configToUse)
    }
  }

  /**
   * Private method to be called whenever the display configuration has changed
   * (e.g., if a new display has been added or an existing display removed). For
   * every currently opened window, this will ensure that the windows are
   * repositioned according to the last remembered display position, if there is
   * one.
   */
  private onScreenConfigChange () {
    // Basically for every registered window, look if there is a configuration
    // that we can restore.
    const currentDisplayConfig = this.currentDisplayConfigurationID
    for (const [ windowId, window ] of this.windowReferences) {
      const config = this.windowPositions.find(c => c.windowId === windowId && c.displayConfiguration === currentDisplayConfig)
      if (config !== undefined) {
        window.setBounds(this.normalizeBounds(config))
      } // else: Novel display config or window
    }
  }
}
