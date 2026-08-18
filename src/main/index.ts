import { app, BrowserWindow, shell, nativeTheme } from 'electron'
import { join } from 'node:path'
import { registerIpcHandlers } from './ipc'
import { initDatabase, closeDatabase } from './db/database'
import { setupTray } from './tray'
import { registerMiniIpcHandlers } from './mini-window'
import { getSyncWorker } from './ipc/auth-sync-ipc'

// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  let mainWindow: BrowserWindow | null = null

  function createWindow(): void {
    const isDark = nativeTheme.shouldUseDarkColors
    const initialBg = isDark ? '#090d16' : '#f8fafc'

    mainWindow = new BrowserWindow({
      width: 1240,
      height: 820,
      minWidth: 860,
      minHeight: 580,
      show: false,
      autoHideMenuBar: true,
      backgroundColor: initialBg,
      title: 'Gone Calendar',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true
      }
    })

    mainWindow.on('ready-to-show', () => {
      mainWindow?.show()
    })

    // Adaptive sync polling on focus/blur
    mainWindow.on('focus', () => {
      getSyncWorker()?.setFocusState(true)
    })

    mainWindow.on('blur', () => {
      getSyncWorker()?.setFocusState(false)
    })

    // Open target links in default external browser, not in Electron shell
    mainWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    // Load URL in dev or index.html in production
    if (process.env['ELECTRON_RENDERER_URL']) {
      mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
  }

  // Focus the existing window when a second instance tries to run
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    try {
      initDatabase(app.getPath('userData'))
    } catch (dbErr) {
      console.error('Failed to initialize database:', dbErr)
    }

    registerIpcHandlers()
    createWindow()

    if (mainWindow) {
      registerMiniIpcHandlers(mainWindow)
      try {
        setupTray(mainWindow)
      } catch (err) {
        console.warn('System tray initialization skipped or unsupported:', err)
      }
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })

  app.on('window-all-closed', () => {
    closeDatabase()
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}


