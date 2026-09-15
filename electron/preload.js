/**
 * Wiz AI Game Creator - Electron Preload Script
 * 
 * Multi-layer security:
 * - contextIsolation: true
 * - nodeIntegration: false
 * - sandbox: true
 * Strictly whitelisted IPC bridge exposed to renderer as window.electronAPI
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,

  // App Metadata
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),

  // Safe external link opening in default OS browser
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),

  // Secure proxy to Vercel Serverless API (Zero API keys inside Electron client binary)
  sendWizChat: (payload) => ipcRenderer.invoke('wiz:chat', payload),
  sendVerificationEmail: (payload) => ipcRenderer.invoke('wiz:send-code', payload),

  // Native Windows File Dialogs (For Desktop File Adapter)
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:save', options),
  showOpenDialog: (options) => ipcRenderer.invoke('dialog:open', options)
});
