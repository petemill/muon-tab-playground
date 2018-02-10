let webview
let activeGuestInstanceId

document.addEventListener('DOMContentLoaded', function () {
  setup()
  chrome.ipcRenderer.on('window-set-active-tab', (e, tabId, guestInstanceId) => {
    console.log(`Received active tab id ${tabId}, guest instance ${guestInstanceId}`)
    activeGuestInstanceId = guestInstanceId
  })
})

function setup () {
  webview = document.querySelector('webview')
  const attachButton = document.querySelector('.control__command-attach')
  const detachButton = document.querySelector('.control__command-detach')
  attachButton.addEventListener('click', () => attachActiveTab())
  detachButton.addEventListener('click', () => detach())
}

function attachActiveTab () {
  if (activeGuestInstanceId == null) {
    throw new Error('no active tab id')
  }
  console.log('showing active guest instance ', activeGuestInstanceId)
  webview.attachGuest(activeGuestInstanceId)
}

function detach () {
  console.log('detaching')
  webview.detachGuest()
}