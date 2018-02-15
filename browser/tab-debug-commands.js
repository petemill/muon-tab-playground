const { ipcMain, webContents } = require('electron')
const TabManager = require('./window-manager')
const TabStore = require('./tab-store')

let devToolsWebContents

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
    ipcMain.on('register-window-devtools-dock', (event, {tabId}) => {
      console.log('setting devtools webconts to', tabId)
      devToolsWebContents = TabStore.get(tabId)
    })
    ipcMain.on('attach-devtools', (event, action) => {
      const { tabId } = action
      const tab = TabStore.get(Number(tabId))
      tab.setDevToolsWebContents(devToolsWebContents)
      tab.openDevTools()
    })
  }
}

const commands = {
  createTab (createProperties) {
    TabManager.createTab(createProperties)
  }
}