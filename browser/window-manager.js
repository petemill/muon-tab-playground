const electron = require('electron')
const { BrowserWindow, app } = electron

let displaySize
let screen
let defaultSize
let tabDebugWindow
let tabControlWindow
let browserWindowNextX
let browserWindowNextY = 0
const allDevTools = process.env.DEVTOOLS

app.once('ready', () => {
  screen = electron.screen
  displaySize = screen.getPrimaryDisplay().workAreaSize
  defaultSize = {
    width: Math.floor(displaySize.width / 1.5),
    height: Math.floor((displaySize.height / 2) - 50)
  }
  browserWindowNextX = displaySize.width - Math.floor(displaySize.width / 3) - 50
})

const api = module.exports = {

  newTabbedRendererWindow (size = defaultSize) {
    const win = new BrowserWindow({
      title: 'Muon Tabbed Browser Window',
      ...size,
      x: browserWindowNextX,
      y: browserWindowNextY,
      webPreferences: {
        sharedWorker: true,
        partition: 'default'
      }
    })
    browserWindowNextY += size.height + 50
    if (allDevTools || true) {
      win.openDevTools()
    }
    win.loadURL('chrome://brave/' + __dirname + '/../window-renderer/index.html')
    return win
  },

  getTabEventDebugWindow () {
    if (tabDebugWindow && !tabDebugWindow.isDestroyed()) {
      return tabDebugWindow
    }
    tabDebugWindow = new BrowserWindow({
      title: 'Muon Tab Event Log',
      x: 0,
      y: 0,
      width: ((displaySize.width / 3) * 2) - 100,
      height: displaySize.height - 400,
      webPreferences: {
        sharedWorker: true,
        partition: 'default'
      }
    })
    if (allDevTools) {
      tabDebugWindow.openDevTools()
    }
    tabDebugWindow.loadURL('chrome://brave/' + __dirname + '/../window-tab-debug/index.html')
    return tabDebugWindow
  },

  getTabControlWindow () {
    if (tabControlWindow && !tabControlWindow.isDestroyed()) {
      return tabControlWindow
    }
    tabControlWindow = new BrowserWindow({
      title: 'Muon Tab Control',
      x: 100,
      y: displaySize.height - 250,
      width: 700,
      height: 200,
      webPreferences: {
        sharedWorker: true,
        partition: 'default'
      }
    })
    if (allDevTools) {
      tabControlWindow.openDevTools()
    }
    tabControlWindow.loadURL('chrome://brave/' + __dirname + '/../window-tab-control/index.html')
    return tabControlWindow
  }
}
