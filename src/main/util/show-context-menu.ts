import { BrowserWindow, ContextMenuParams, Menu, MenuItem } from 'electron'

/**
 * Displays a context menu in the main window at the current cursor position
 *
 * @param   {any}                event   The event
 * @param   {ContextMenuParams}  params  Context information
 * @param   {BrowserWindow}      window  The main window
 */
export function showContextMenu (event: any, params: ContextMenuParams, window: BrowserWindow|undefined) {
  const menu = new Menu()
    
  // In case the user right-clicked on a misspelled word, this allows
  // handling this.
  for (const suggestion of params.dictionarySuggestions) {
    menu.append(new MenuItem({
      label: suggestion,
      click: () => window?.webContents.replaceMisspelling(suggestion)
    }))
  }

  // Allow users to add the misspelled word to the dictionary
  if (params.misspelledWord) {
    menu.append(
      new MenuItem({
        label: 'Add to dictionary',
        click: () => window?.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
      })
    )
  }

  const { canUndo, canRedo, canCut, canCopy, canPaste, canDelete, canSelectAll } = params.editFlags
  const editable = params.isEditable
  menu.append(new MenuItem({ type: 'separator' }))
  menu.append(new MenuItem({ role: 'undo', enabled: canUndo && editable }))
  menu.append(new MenuItem({ role: 'redo', enabled: canRedo && editable }))
  menu.append(new MenuItem({ type: 'separator' }))
  menu.append(new MenuItem({ role: 'cut', enabled: canCut && editable }))
  menu.append(new MenuItem({ role: 'copy', enabled: canCopy }))
  menu.append(new MenuItem({ role: 'paste', enabled: canPaste && editable }))
  menu.append(new MenuItem({ role: 'delete', enabled: canDelete && editable }))
  menu.append(new MenuItem({ type: 'separator' }))
  menu.append(new MenuItem({ role: 'selectAll', enabled: canSelectAll }))

  menu.popup()
}
