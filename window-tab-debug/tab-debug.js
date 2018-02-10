function updateTabTitleElement (tabElement, tabData) {
  let titleElement = tabElement.querySelector('.tab_title')
  if (titleElement && (titleElement.dataset.tabId !== tabData.tabId || titleElement.dataset.tabUrl !== tabData.url)) {
    titleElement.innerHTML = `Tab Id: ${tabData.tabId}, ${tabData.url}`
  }
}

function findOrCreateWindowElement (windowId) {
  let window = document.querySelector(`.window[data-window-id="${windowId}"]`)
  if (!window) {
    window = document.createElement('div')
    window.classList.add('window')
    window.innerHTML = `
<div class="window_title">
  Window <span class="window_id">${windowId}</span>
</div>
<div class="tabs"></div>
`
    window.dataset.windowId = windowId
    window.style.order = windowId === 'n' ? 999 : windowId
    document.querySelector('.windows').appendChild(window)
  }
  return window
}

function findOrCreateTabElement (tabData) {
  const tabId = tabData.tabId
  let windowId = tabData.windowId
  let tabWindow
  if (windowId == null || windowId === -1) {
    windowId = tabData.cachedWindowId
  }
  if (windowId == null) {
    windowId = 'n'
  }
  // window tab should be in
  if (windowId == null) {
    console.log('no window id for tab', tabData)
  } else {
    tabWindow = findOrCreateWindowElement(windowId)
  }

  let tab = document.querySelector(`.tab[data-tab-id="${tabId}"]`)
  if (!tab) {
    const tabIndex = tabData.index
    if (tabIndex !== -1 && windowId !== -1 && windowId != null) {
      tab = document.querySelector(`.window[data-window-id="${windowId}"] .tab[data-tab-index="${tabIndex}"]`)
    }
  }
  // tab not found
  if (!tab && !tabWindow) {
    console.error('tab did not exist AND no windowId, so could not place tab', {tabId, windowId})
  }
  if (!tab) {
    tab = document.createElement('div')
    tab.classList.add('tab')
    tab.innerHTML = `<div class="tab_title"></div>`
  }
  // ensure tab is in (correct) window
  if (tabWindow && !tabWindow.contains(tab)) {
    tabWindow.querySelector('.tabs').appendChild(tab)
  }
  // update tab item with data
  tab.dataset.tabId = tabData.tabId
  tab.dataset.tabIndex = tabData.index
  tab.style.order = tabData.index
  updateTabTitleElement(tab, tabData)
  return tab
}

let eventId = -1

function receiveTabEvent (tabData, eventName, eventArgs = []) {
  eventId++
  let tab
  try {
    tab = findOrCreateTabElement(tabData)
  } catch (e) {
    console.error(`[${eventName} could not get tab for data`, tabData)
    console.error(e)
    return
  }

  const scrolledToBottom = (tab.scrollTop === (tab.scrollHeight - tab.offsetHeight))

  let eventText = eventName
  for (const arg of eventArgs) {
    if (['string', 'number', 'boolean'].includes(typeof arg)) {
      eventText += ` ${arg}`
    }
  }
  const eventElement = document.createElement('div')
  eventElement.classList.add('event')
  eventElement.innerHTML = `
  <input type="checkbox" id="event${eventId}" class="event_check" />
  <label for="event${eventId}" class="event_title">${eventText}</label>
  <div class="event_state">
    <pre>${JSON.stringify(tabData, null, 2)}</pre>
  </div>
`
  tab.appendChild(eventElement)
  if (scrolledToBottom) {
    window.requestAnimationFrame(() => {
      tab.scrollTop = tab.scrollHeight
    })
  }
}

document.addEventListener('DOMContentLoaded', function () {
  chrome.ipcRenderer.on('update-tab', (e, tabId, tabData, eventName, eventArgs) => {
    receiveTabEvent(tabData, eventName, eventArgs)
  })
})

