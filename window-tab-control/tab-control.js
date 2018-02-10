function setupTabCommandForm () {
  const tabCommandForm = document.querySelector('.tabcommand')
  if (!tabCommandForm) {
    throw new Error('tabCommandForm not found')
  }
  tabCommandForm.addEventListener('submit', function (e) {
    e.preventDefault()
    const commandArgs = {}
    for (const formElement of e.srcElement.elements) {
      if (formElement.dataset.property) {
        commandArgs[formElement.dataset.property] = formElement.value
      }
    }
    runTabCommand(commandArgs)
  })
}

function runTabCommand (commandArgs) {
  console.log('Running tab command with args', commandArgs)
  if (commandArgs.tabId == null) {
    console.error('Cannot forward command without tabId')
    return
  }
  chrome.ipcRenderer.send('tab-command-eval', commandArgs)
}


document.addEventListener('DOMContentLoaded', function () {
  setupTabCommandForm()
})