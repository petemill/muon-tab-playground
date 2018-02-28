let webview1
let webview2

let webview
let activeGuestInstanceId
let lastWebviewIdAttached = null

const classNameAttached = 'webview--attached'

document.addEventListener('DOMContentLoaded', function () {
  setup()
  chrome.ipcRenderer.on('window-set-active-tab', (e, tabId, guestInstanceId) => {
    console.log(`Received active tab id ${tabId}, guest instance ${guestInstanceId}`)
    if (activeGuestInstanceId !== guestInstanceId) {
      activeGuestInstanceId = guestInstanceId
      attachActiveTab()
    }
  })
})

function setup () {
  webview1 = setupNewWebview(1)
  webview2 = setupNewWebview(2)
  const contentContainer = document.querySelector('.content')
  contentContainer.appendChild(webview1)
  contentContainer.appendChild(webview2)
  const attachButton = document.querySelector('.control__command-attach')
  const detachButton = document.querySelector('.control__command-detach')
  attachButton.addEventListener('click', () => attachActiveTab())
  detachButton.addEventListener('click', () => detach())
}

function attachActiveTab () {
  if (activeGuestInstanceId == null) {
    throw new Error('no active tab id')
  }
  let attachedWebview
  let toAttachWebview
  let nextWebviewId
  switch (lastWebviewIdAttached) {
    case null:
      toAttachWebview = webview1
      nextWebviewId = 1
      break
    case 1:
      attachedWebview = webview1
      toAttachWebview = webview2
      nextWebviewId = 2
      break
    case 2:
      attachedWebview = webview2
      toAttachWebview = webview1
      nextWebviewId = 1
      break
  }
  // let's keep this around until the new one
  const onToAttachDidAttach = function () {
    toAttachWebview.removeEventListener('did-attach', onToAttachDidAttach)
    // TODO(petemill) remove ugly workaround as <webview> will not paint guest unless size has changed or forced to
    window.requestAnimationFrame(() => {
      toAttachWebview.style.visibility = 'hidden'
      window.requestAnimationFrame(() => {
        toAttachWebview.style.visibility = ''
        window.requestAnimationFrame(() => {
          toAttachWebview.classList.add(classNameAttached)
          if (attachedWebview) {
            attachedWebview.classList.remove(classNameAttached)
            attachedWebview.detachGuest()
            replaceOldWebview(attachedWebview)
          }    
        })        
      })
    })
  }
  toAttachWebview.addEventListener('did-attach', onToAttachDidAttach)
  console.log('attaching active guest instance ', activeGuestInstanceId, 'to webview', toAttachWebview)
  toAttachWebview.attachGuest(activeGuestInstanceId)
  lastWebviewIdAttached = nextWebviewId
}

function detach () {
  console.log('detaching')
  webview1.detachGuest()
  webview2.detachGuest()
}

i = 0
function replaceOldWebview (oldWebview) {
  const newWebview = setupNewWebview()
  newWebview.dataset.webviewReplaceCount = i++
  if (oldWebview === webview1) {
    webview1 = newWebview
  } else {
    webview2 = newWebview
  }
  oldWebview.remove()
  document.querySelector('.content').appendChild(newWebview)
}


function setupNewWebview (id) {
  const webview = document.createElement('webview')
  const onContentsDestroyed = () => {
    // webview is not usable if a WebContents is destroyed whilst attached.
    // We try to avoid this happening, but it's inveitable, so replace the webview
    // when that happens.
    if (lastWebviewIdAttached === id) {
      lastWebviewIdAttached = null
    }
    webview.detachGuest()
    webview.removeEventListener('will-destroy', onContentsDestroyed)
    replaceOldWebview(webview)
  }
  webview.addEventListener('will-destroy', onContentsDestroyed)
  return webview
}