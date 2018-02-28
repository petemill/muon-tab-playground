const { ipcMain } = require('electron')
const TabManager = require('./window-manager')
const TabStore = require('./tab-store')

const api = module.exports = {
  init () {
    ipcMain.on('tab-command', (event, action) => {
      const commandName = action.name
      if (!commandName) {
        console.error(`Received command with no name. Cannot proceed.`)
        return
      }
      const commandOptions = action.options
      if (commands[commandName]) {
        commands[commandName](commandOptions)
        console.log(`Tab command "${commandName}" received from tab-debug.`)
      } else {
        console.error(`Received tab command which did not exist: ${commandName}`)
      }
    })
    ipcMain.on('tab-command-eval', (event, commandArgs) => {
      const { tabId, command } = commandArgs
      if (!tabId) {
        console.error(`Received command with no tabId. Cannot proceed.`)
        return
      }
      const tab = TabStore.get(Number(tabId))
      if (!tab) {
        console.error(`Cannot run command. No tab for Id: ${tabId}`)
        return
      }
      const fullCommand = `tab.${command}`
      const result = eval(fullCommand)
      console.log(`Command [${tabId}]: ${fullCommand}`)
      console.log('Result: ', result)
    })
  }
}

const commands = {
  createTab (createProperties) {
    TabManager.createTab(createProperties)
  },
  activateTab (tabId) {
    const tab = TabStore.get(Number(tabId))
    if (!tab) {
      console.error(`No tab found with tab id ${tabId}`)
      return
    }
    tab.setActive(true)
  }
}