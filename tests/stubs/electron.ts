/**
 * Test stub for the `electron` module.
 *
 * Unit tests exercise main-process modules (secure-store, repos, mappers) in a
 * plain Node environment where the real Electron binary is neither present nor
 * needed. `vitest.config.ts` aliases `electron` to this file so importing a
 * module that does `import { safeStorage } from 'electron'` does not blow up at
 * load time. Tests that care about a specific API should spy/mock it explicitly.
 */

const notImplemented = (name: string) => () => {
  throw new Error(`electron.${name} is not implemented in the test stub`)
}

export const safeStorage = {
  isEncryptionAvailable: () => false,
  encryptString: notImplemented('safeStorage.encryptString'),
  decryptString: notImplemented('safeStorage.decryptString')
}

export const app = {
  getPath: () => '/tmp',
  getName: () => 'gone-calendar',
  getVersion: () => '0.0.0-test',
  getLocale: () => 'en',
  on: () => app,
  whenReady: () => Promise.resolve(),
  requestSingleInstanceLock: () => true,
  quit: () => undefined
}

export const ipcMain = {
  handle: () => undefined,
  on: () => undefined,
  removeHandler: () => undefined
}

export const ipcRenderer = {
  invoke: () => Promise.resolve(),
  on: () => undefined,
  send: () => undefined
}

export const BrowserWindow = class {
  static getAllWindows = () => []
  webContents = { send: () => undefined, on: () => undefined }
  on = () => undefined
  loadURL = () => Promise.resolve()
  loadFile = () => Promise.resolve()
  show = () => undefined
  destroy = () => undefined
}

export const Notification = class {
  static isSupported = () => false
  show = () => undefined
  on = () => undefined
}

export const Tray = class {
  setToolTip = () => undefined
  setContextMenu = () => undefined
  on = () => undefined
  destroy = () => undefined
}

export const Menu = {
  buildFromTemplate: () => ({}),
  setApplicationMenu: () => undefined
}

export const nativeImage = {
  createFromPath: () => ({ isEmpty: () => true, resize: () => nativeImage.createFromPath() }),
  createEmpty: () => ({ isEmpty: () => true })
}

export const nativeTheme = {
  shouldUseDarkColors: false,
  on: () => undefined
}

export const shell = {
  openExternal: () => Promise.resolve(),
  openPath: () => Promise.resolve(''),
  showItemInFolder: () => undefined
}

export const dialog = {
  showOpenDialog: () => Promise.resolve({ canceled: true, filePaths: [] }),
  showSaveDialog: () => Promise.resolve({ canceled: true, filePath: undefined }),
  showMessageBox: () => Promise.resolve({ response: 0 })
}

export const contextBridge = {
  exposeInMainWorld: () => undefined
}

export default {
  safeStorage,
  app,
  ipcMain,
  ipcRenderer,
  BrowserWindow,
  Notification,
  Tray,
  Menu,
  nativeImage,
  nativeTheme,
  shell,
  dialog,
  contextBridge
}
