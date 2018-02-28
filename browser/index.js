const { app } = require('electron')
const TabEvents = require('./tab-events')
const WindowManager = require('./window-manager')
const TabManager = require('./tab-manager')
const TabDebug = require('./tab-debug-commands')
app.setName('ASDASD')
const eventPromise = (win, eventName) => new Promise(resolve => win.once(eventName, resolve))

console.log('Init')
app.once('ready', async () => {
  console.log('ready')
  // init debugger
  TabDebug.init()
  // create tab control window
  WindowManager.getTabControlWindow()
  // listen to events from all tabs, and open tab-debug window
  TabEvents.setupTabEvents()
  // create two browser windows
  const win1 = WindowManager.newTabbedRendererWindow()
  const win2 = WindowManager.newTabbedRendererWindow()
  await Promise.all([
    eventPromise(win1.webContents, 'dom-ready').then(() => console.log("win1 ready")),
    eventPromise(win2.webContents, 'dom-ready').then(() => console.log("win2 ready"))
  ])
  console.log('windows are ready')
  // create tabs
  TabManager.createTab({
    url: 'http://www.brave.com',
    windowId: win1.id,
    active: true,
    discarded: false,
    autoDiscardable: true
  })
  TabManager.createTab({
    url: 'http://www.google.com',
    windowId: win2.id,
    active: false,
    discarded: true,
    autoDiscardable: true
  })

  TabManager.createTab({
    url: 'http://www.bing.com',
    windowId: win2.id,
    active: false,
    discarded: false
  })

  TabManager.createTab({
    url: 'http://www.duckduckgo.com',
    windowId: win2.id,
    active: true
  })
})
