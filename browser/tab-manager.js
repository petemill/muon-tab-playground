const { extensions } = require('electron')


const api = module.exports = {
  createTab (createProperties) {
    return new Promise((resolve) => {
      extensions.createTab(createProperties, (tab) => {
        resolve(tab)
      })
    })
  }
}