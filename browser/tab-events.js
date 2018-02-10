const { app, BrowserWindow } = require('electron')
const WindowManager = require('./window-manager')

const webContentsCache = require('./tab-store')
const tabWindowMap = new WeakMap()
const shouldDebugTabEvents = true
let appIsQuitting = false
app.on('before-quit', () => {
  appIsQuitting = true
})

function getTabData (tabId) {
  const tab = webContentsCache.get(tabId)
  if (!tab) return -1
  if (tab.isDestroyed()) {
    console.log(`Attempted to get tab ${tabId} but it was destroyed`)
    return null
  }
  let tabValue = tab.tabValue()
  tabValue.cachedWindowId = tabWindowMap.get(tab)
  tabValue.tabEntries = tab.getEntryCount()
  tabValue.fnCanGoForward = tab.canGoForward()
  tabValue.fnCanGoBack = tab.canGoBack()
  tabValue.tabGuestInstanceId = tab.guestInstanceId
  tabValue.tabSessionPartition = tab.session.partition
  tabValue.fnGetTitle = tab.getTitle()
  tabValue.fnGetURL = tab.getURL()
  tabValue.sessionPartitionNumber = tab.session.partition
  tabValue.tabId = tab.getId()
  return tabValue
}

function updateTabFromEvent (tabId, eventName, eventArgs = []) {

  console.log(`Tab [${tabId}] event '${eventName}'`)
  // don't create window if app is quitting
  const tabData = getTabData(tabId)
  const tab = webContentsCache.get(tabId)
  if (tab && !tab.isDestroyed() && !tab.isGuest()) {
    return
  }
  if (tabData === -1) {
    console.log(`We do not know about tab ${tabId} even though received event '${eventName}' for it!`)
    return
  }
  if (!tabData) {
    console.log(`Not passing debug data for event ${eventName} on tab ${tabId} because tab is destroyed`)
    return
  }
  if (appIsQuitting) {
    return
  }

  const tabDebugWindow = WindowManager.getTabEventDebugWindow()
  tabDebugWindow.webContents.send('update-tab', tabId, tabData, eventName, [...eventArgs])  
}

const api = module.exports = {
  setupTabEvents () {
    WindowManager.getTabEventDebugWindow()

    process.on('add-new-contents', (e, source, newTab, disposition, size, userGesture) => {
      
      if (userGesture === false) {
        console.log('new web contents not from user gesture, preventing creation')
        e.preventDefault()
        return
      }

      const tabId = newTab.getId()


      // let displayURL = newTab.getURL()
      // let location = displayURL || 'about:blank'
      // const openerTabId = !source.isDestroyed() ? source.getId() : -1

      // let rendererInitiated = false
      if (source.isGuest()) {
      //  rendererInitiated = true
        console.log(`Tab [${tabId} was initiated from a guest (another renderer)`)
      }

      const newTabData = getTabData(tabId)

      let windowId = newTabData && newTabData.windowId
      if (parseInt(windowId) > -1) {
        if (shouldDebugTabEvents) {
          console.log(`Tab [${tabId}] added for window ${windowId}`)
        }
      } else {
        const hostWebContents = source.hostWebContents || source
        windowId = hostWebContents.getOwnerBrowserWindow().id
        if (shouldDebugTabEvents) {
          console.log(`Tab [${tabId}] did not explicitly ask for windowId, using event source of ${windowId}`)
        }
      }

      // create new window if requested, and assign window id to tab
      if (disposition === 'new-window' || disposition === 'new-popup') {
        const newWindow = WindowManager.newTabbedRendererWindow(size)
        windowId = newWindow.id
      }

      // cache window id as tab may not know it's window Id at first
      if (windowId !== -1 && windowId != null) {
        tabWindowMap.set(newTab, windowId)
      }

      updateTabFromEvent(tabId, 'process:add-new-contents')
    })

    process.on('chrome-tabs-created', (tabId) => {
      updateTabFromEvent(tabId, 'process:chrome-tabs-created')
      if (shouldDebugTabEvents) {
        console.log(`tab [${tabId} via process] chrome-tabs-created`)
      }
    })

    process.on('chrome-tabs-updated', (tabId, changeInfo) => {
      updateTabFromEvent(tabId, 'process:chrome-tabs-updated', [changeInfo])
      if (shouldDebugTabEvents) {
        console.log(`tab [${tabId} via process] chrome-tabs-updated`)
      }
    })

    process.on('chrome-tabs-removed', (tabId, changeInfo) => {
      updateTabFromEvent(tabId, 'process:chrome-tabs-updated', [changeInfo])
      if (shouldDebugTabEvents) {
        console.log(`tab [${tabId} via process] - chrome-tabs-removed`)
      }
    })

    const tabEventsHandledUniquely = ['ipc-message-host', 'ipc-message']

    app.on('web-contents-created', function (event, tab) {
      if (tab.isBackgroundPage() || !tab.isGuest()) {
        console.log(tab.getId() + ' was not a guest tab')
        return
      }
      console.log('web-contents-created', tab.getURL() + ' ' + tab.getTitle() + ' ' + tab.getEntryCount())
      const tabId = tab.getId()
      webContentsCache.set(tabId, tab)
      updateTabFromEvent(tabId, 'app:web-contents-created')

      if (shouldDebugTabEvents) {
        console.log(`Tab [${tabId}] created in window ${tab.tabValue().windowId}`)
        // log each event the tab receives
        const oldEmit = tab.emit
        tab.emit = function () {
          let eventName = arguments[0]
          if (!tabEventsHandledUniquely.includes(eventName)) {
            updateTabFromEvent(tabId, `tab:${eventName}`, [...arguments].slice(1))
          }
          
          oldEmit.apply(tab, arguments)
        }
      }

      tab.on('content-blocked', e => {

      })

      tab.on('did-start-navigation', (e, navigationHandle) => {
        // if (!tab.isDestroyed() && navigationHandle.isValid() && navigationHandle.isInMainFrame()) {
        //   const controller = tab.controller()
        //   if (!controller.isValid()) {
        //     return
        //   }
        //   let tabValue = getTabValue(tabId)
        //   if (tabValue) {
        //     const windowId = tabValue.get('windowId')
        //     tabActions.didStartNavigation(tabId, createNavigationState(navigationHandle, controller), windowId)
        //   }
        // }
      })

      tab.on('set-active', (e, isActive) => {
        if (isActive) {
          const tabData = getTabData(tabId)
          let windowId = tabData.windowId
          if (windowId == null || windowId === -1) {
            windowId = tabData.cachedWindowId
          }
          if (windowId == null || windowId === -1) {
            console.error(`Cannot set tab ${tabId} active as it has no windowId`, tabData)
          }
          if (tabData.tabGuestInstanceId == null || tabData.tabGuestInstanceId === -1) {
            console.error(`Cannot set tab ${tabId} active as it has invalid guestInstanceId`, tabData)
          }
          // get renderer window to tell to make active
          const win = BrowserWindow.fromId(windowId)
          win.webContents.send('window-set-active-tab', tabId, tabData.tabGuestInstanceId)
        }
        // fires twice for each change in tab active
        // console.log('tab.on(set-active) args:', tab.getId(), e.sender.id, isActive)
        // updateTab(tab.getId(), { active: isActive })
        // if isActive and lastActiveIdForWindow !== tab.id
        // then fire event

      })

      tab.on('tab-selection-changed', (e) => {
        console.log('selection changed', e.sender.id)
      })

      tab.on('guest-ready', e => {
        // guest instance ID may have changed
        // frame did: windowActions.frameGuestInstanceIdChanged(this.frame, this.props.guestInstanceId, e.guestInstanceId)
      })
      tab.on('context-menu', (...args) => {
        // don't get the event data here, so ignore
        console.log('context menu', args)
      })

      tab.on('page-favicon-updated', e => {
        // if (e.favicons &&
        //   e.favicons.length > 0 &&
          // Favicon changes lead to recalculation of top site data so only fire
          // this when needed.  Some sites update favicons very frequently.
          // TODO: fire appAction.setFavicon
          //   e.favicons[0] !== this.frame.get('icon')) {
          // imageUtil.getWorkingImageUrl(e.favicons[0], (error) => {
          //   appActions.setFavicon(tab.id, error ? null : e.favicons[0])
        // })
        // }
      })

      tab.on('show-autofill-settings', e => {
        // let tabValue = getTabValue(tabId)
        // if (tabValue) {
        //   const windowId = tabValue.get('windowId')
        //   appActions.createTabRequested({
        //     windowId,
        //     url: 'about:autofill',
        //     active: true
        //   })
        // }
      })

      tab.on('ipc-message', (e, [messageName, messageValue]) => {
        updateTabFromEvent(tabId, `tab:ipc-message:${messageName}`, [messageValue])
        // console.log('tab ipc message received', messageName, messageValue)
      })

      tab.on('ipc-message-host', (e, [messageName, messageValue]) => {
        updateTabFromEvent(tabId, `tab:ipc-message-host:${messageName}`, [messageValue])
        // console.log('tab ipc host message received', messageName, messageValue)
        // switch (messageName) {
        //   case messages.THEME_COLOR_COMPUTED: {
        //     const tabId = tab.getId()
        //     if (shouldDebugTabEvents) {
        //       console.log(`Tab [${tabId}] theme color updated to ${messageValue}`)
        //     }
        //     // const tabValue = getTabValue(tabId)
        //     // const windowId = tabValue.get('windowId')
        //     // if (windowId == null) {
        //     //   console.error(`got a theme color for tab ${tabId} which did not have a windowId`)
        //     // }
        //     // appActions.setTabThemeColor(windowId, tab.getId(), messageValue)
        //     break
        //   }
        // }
      })

      tab.on('did-finish-navigation', (e, navigationHandle) => {
        // if (!tab.isDestroyed() && navigationHandle.isValid() && navigationHandle.isInMainFrame()) {
        //   const controller = tab.controller()
        //   if (!controller.isValid()) {
        //     return
        //   }
        //   let tabValue = getTabValue(tabId)
        //   if (tabValue) {
        //     const windowId = tabValue.get('windowId')
        //     tabActions.didFinishNavigation(tabId, createNavigationState(navigationHandle, controller), windowId)
        //   }
        // }
      })

      tab.on('enable-pepper-menu', (e, params) => {
  //      appActions.enablePepperMenu(params, tabId)
      })

      tab.on('close', () => {
        tab.forceClose()
      })

      tab.on('unresponsive', () => {
    //    console.log('unresponsive')
      })

      tab.on('responsive', () => {
    //    console.log('responsive')
      })

      tab.on('tab-changed-at', () => {
    //    updateTab(tabId)
      })

      tab.on('tab-moved', () => {
    //    appActions.tabMoved(tabId)
      })

      tab.on('will-attach', (e, windowWebContents) => {
    //    appActions.tabWillAttach(tab.getId())
      })

      tab.on('did-attach', (e, windowWebContents) => {
  //      updateTab(tabId)
      })

      tab.on('set-active', (sender, isActive) => {
        // if (isActive) {
        //   const tabValue = getTabValue(tabId)
        //   if (tabValue) {
        //     const windowId = tabValue.get('windowId')
        //     // set-active could be called multiple times even when the index does not change
        //     // so make sure we only add this to the active-tab trail for the window
        //     // once
        //     if (activeTabHistory.getActiveTabForWindow(windowId, 0) !== tabId) {
        //       activeTabHistory.setActiveTabForWindow(windowId, tabId)
        //     }
        //   }
        // }
      })

      tab.on('tab-strip-empty', () => {
        // It's only safe to close a window when the last web-contents tab has been
        // re-attached.  A detach which already happens by this point is not enough.
        // Otherwise the closing window will destroy the tab web-contents and it'll
        // lead to a dead tab.  The destroy will happen because the old main window
        // webcontents is still the embedder.
        // const tabValue = getTabValue(tabId)
        // const windowId = tabValue.get('windowId')
        // tab.once('did-attach', () => {
        //   appActions.tabStripEmpty(windowId)
        // })
      })

      tab.on('did-detach', (e, oldTabId) => {
        // forget last active trail in window tab
        // is detaching from
        // const oldTab = getTabValue(oldTabId)
        // const detachedFromWindowId = oldTab.get('windowId')
        // if (detachedFromWindowId != null) {
        //   activeTabHistory.clearTabFromWindow(detachedFromWindowId, oldTabId)
        // }
      })

      tab.on('did-attach', (e, tabId) => {
        // appActions.tabAttached(tab.getId())
      })

      tab.on('save-password', (e, username, origin) => {
        // appActions.savePassword(username, origin, tabId)
      })

      tab.on('update-password', (e, username, origin) => {
        // appActions.updatePassword(username, origin, tabId)
      })

      tab.on('did-get-response-details', (evt, status, newURL, originalURL, httpResponseCode, requestMethod, referrer, headers, resourceType) => {
        if (resourceType === 'mainFrame') {

          // windowActions.gotResponseDetails(tabId, {status, newURL, originalURL, httpResponseCode, requestMethod, referrer, resourceType})
        }
      })

      tab.on('media-started-playing', (e) => {
        // let tabValue = getTabValue(tabId)
        // if (tabValue) {
        //   const windowId = tabValue.get('windowId')
        //   appActions.mediaStartedPlaying(tabId, windowId)
        // }
      })

      tab.on('media-paused', (e) => {
        // let tabValue = getTabValue(tabId)
        // if (tabValue) {
        //   const windowId = tabValue.get('windowId')
        //   appActions.mediaPaused(tabId, windowId)
        // }
      })

      tab.once('will-destroy', (e) => {
        // const tabValue = getTabValue(tabId)
        // if (tabValue) {
        //   const windowId = tabValue.get('windowId')
        //   // forget about this tab in the history of active tabs
        //   activeTabHistory.clearTabFromWindow(windowId, tabId)
        //   // handle closed tab being the current active tab for window
        //   if (tabValue.get('active')) {
        //     // set the next active tab, if different from what muon will have set to
        //     // Muon sets it to the next index (immediately above or below)
        //     // But this app can be configured to select the parent tab,
        //     // or the last active tab
        //     let nextTabId = api.getNextActiveTabId(windowId, tabId)
        //     if (nextTabId != null) {
        //       api.setActive(nextTabId)
        //     }
        //   }
        //   // let the state know
        //   appActions.tabClosed(tabId, windowId)
        // }
      })
    })

    process.on('on-tab-created', (tab, options) => {
      updateTabFromEvent(tab.getId(), 'process:on-tab-created', [options])
      if (tab.isDestroyed()) {
        return
      }

      tab.once('did-attach', () => {
        if (options.back) {
          tab.goBack()
        } else if (options.forward) {
          tab.goForward()
        }
      })
    })
  }
}
