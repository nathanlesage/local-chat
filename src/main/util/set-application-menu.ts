import { Menu, shell, MenuItemConstructorOptions, app } from 'electron'

/**
 * Sets the application menu.
 */
export function setApplicationMenu() {
  const isMacOS = process.platform === 'darwin'

  // NOTE: We keep most as it is, because the default menus work pretty fine.
  // The only changes are regarding external resources.
  const template: MenuItemConstructorOptions[] = [
    ...(isMacOS ? [{ role: 'appMenu' } as MenuItemConstructorOptions] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        {
          label: 'Website',
          click: async () => {
            await shell.openExternal('https://nathanlesage.github.io/local-chat/')
          }
        },
        {
          label: 'Report issue',
          click: async () => {
            await shell.openExternal('https://github.com/nathanlesage/local-chat/issues')
          }
        },
        {
          label: 'Open logs folder',
          click: async () => {
            await shell.openPath(app.getPath('logs'))
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
