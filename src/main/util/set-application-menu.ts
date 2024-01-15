import { Menu, shell, MenuItemConstructorOptions } from 'electron'

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
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://www.hendrik-erz.de') // TODO
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template as any)
  Menu.setApplicationMenu(menu)
}
