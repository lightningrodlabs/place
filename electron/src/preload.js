const { contextBridge, ipcRenderer } = require('electron')

const DEV_MODE = process.env.DEV_MODE? process.env.DEV_MODE : 'prod';

console.log("preload DEV_MODE = " + JSON.stringify(process.env.DEV_MODE));

const electronBridge = {
  send: (channel) => {ipcRenderer.send(channel)},
  on: (channel, listener) => {ipcRenderer.on(channel, listener)},
  sendSync: (channel, ...args) => {ipcRenderer.sendSync(channel, args)},
  DEV_MODE,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  }
};


contextBridge.exposeInMainWorld('electronBridge', electronBridge)
