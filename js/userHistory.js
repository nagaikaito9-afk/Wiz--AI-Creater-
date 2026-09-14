/**
 * Wiz AI Game Creator - User File & Folder Operation History (Undo / Redo Manager)
 * Handles:
 * - Ctrl+Z (Undo) and Ctrl+Shift+Z / Ctrl+Y (Redo)
 * - File creation, deletion, rename, and text edits
 * - Folder creation, deletion, rename
 * - Seamless synchronization with VFS and UI Editor
 */

class UserHistoryManager {
  constructor() {
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 100;
    this.isApplyingHistory = false;

    this.initKeyBindings();
  }

  initKeyBindings() {
    window.addEventListener('keydown', (e) => {
      // Ignore if user is typing in chat input, prompt box, or dialog modal
      const activeEl = document.activeElement;
      const isChatInput = activeEl && (
        activeEl.id === 'chat-user-input' ||
        activeEl.classList.contains('swal2-input') ||
        activeEl.classList.contains('dialog-input')
      );
      if (isChatInput) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (!modifier) return;

      // Ctrl + Shift + Z OR Ctrl + Y => REDO
      if ((e.shiftKey && (e.key === 'z' || e.key === 'Z')) || (!e.shiftKey && (e.key === 'y' || e.key === 'Y'))) {
        if (this.canRedo()) {
          e.preventDefault();
          this.redo();
        }
      }
      // Ctrl + Z => UNDO
      else if (!e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        if (this.canUndo()) {
          e.preventDefault();
          this.undo();
        }
      }
    });
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  recordAction(action) {
    if (this.isApplyingHistory) return;
    this.undoStack.push(action);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    // Clear redo stack on new action
    this.redoStack = [];
  }

  async undo() {
    if (!this.canUndo()) {
      if (window.showToast) window.showToast('取り消す操作はありません', 'info');
      return;
    }

    const action = this.undoStack.pop();
    this.isApplyingHistory = true;

    try {
      let desc = '';
      switch (action.type) {
        case 'file_edit': {
          if (window.vfs) {
            window.vfs.writeFile(action.path, action.oldContent);
            if (window.editor) {
              if (window.editor.activeFile === action.path) {
                window.editor.setValue(action.oldContent, true);
              }
              window.editor.renderTree();
            }
          }
          desc = `ファイル「${action.path}」の編集`;
          break;
        }

        case 'file_create': {
          if (window.vfs) {
            window.vfs.deleteFile(action.path);
            if (window.editor) {
              if (window.editor.activeFile === action.path) {
                window.editor.closeTab(action.path);
              }
              window.editor.renderTree();
            }
          }
          desc = `ファイル「${action.path}」の作成`;
          break;
        }

        case 'file_delete': {
          if (window.vfs) {
            window.vfs.writeFile(action.path, action.content);
            if (window.editor) {
              window.editor.renderTree();
              window.editor.openFile(action.path);
            }
          }
          desc = `ファイル「${action.path}」の削除`;
          break;
        }

        case 'file_rename': {
          if (window.vfs) {
            window.vfs.renameFile(action.newPath, action.oldPath);
            if (window.editor) {
              if (window.editor.activeFile === action.newPath) {
                window.editor.activeFile = action.oldPath;
              }
              window.editor.renderTree();
            }
          }
          desc = `ファイル名変更「${action.newPath} → ${action.oldPath}」`;
          break;
        }

        case 'folder_create': {
          if (window.vfs) {
            window.vfs.deleteFolder(action.path);
            if (window.editor) window.editor.renderTree();
          }
          desc = `フォルダ「${action.path}」の作成`;
          break;
        }

        case 'folder_delete': {
          if (window.vfs) {
            window.vfs.restoreFolderSnapshot(action.path, action.snapshot);
            if (window.editor) window.editor.renderTree();
          }
          desc = `フォルダ「${action.path}」の削除`;
          break;
        }

        default:
          console.warn('Unknown history action type:', action.type);
      }

      this.redoStack.push(action);

      if (window.showToast) {
        window.showToast(`↩ ${desc} を取り消しました (Ctrl+Z)`, 'info');
      }
    } catch (err) {
      console.error('Undo failed:', err);
    } finally {
      this.isApplyingHistory = false;
    }
  }

  async redo() {
    if (!this.canRedo()) {
      if (window.showToast) window.showToast('やり直す操作はありません', 'info');
      return;
    }

    const action = this.redoStack.pop();
    this.isApplyingHistory = true;

    try {
      let desc = '';
      switch (action.type) {
        case 'file_edit': {
          if (window.vfs) {
            window.vfs.writeFile(action.path, action.newContent);
            if (window.editor) {
              if (window.editor.activeFile === action.path) {
                window.editor.setValue(action.newContent, true);
              }
              window.editor.renderTree();
            }
          }
          desc = `ファイル「${action.path}」の編集`;
          break;
        }

        case 'file_create': {
          if (window.vfs) {
            window.vfs.writeFile(action.path, action.content || '');
            if (window.editor) {
              window.editor.renderTree();
              window.editor.openFile(action.path);
            }
          }
          desc = `ファイル「${action.path}」の作成`;
          break;
        }

        case 'file_delete': {
          if (window.vfs) {
            window.vfs.deleteFile(action.path);
            if (window.editor) {
              if (window.editor.activeFile === action.path) {
                window.editor.closeTab(action.path);
              }
              window.editor.renderTree();
            }
          }
          desc = `ファイル「${action.path}」の削除`;
          break;
        }

        case 'file_rename': {
          if (window.vfs) {
            window.vfs.renameFile(action.oldPath, action.newPath);
            if (window.editor) {
              if (window.editor.activeFile === action.oldPath) {
                window.editor.activeFile = action.newPath;
              }
              window.editor.renderTree();
            }
          }
          desc = `ファイル名変更「${action.oldPath} → ${action.newPath}」`;
          break;
        }

        case 'folder_create': {
          if (window.vfs) {
            window.vfs.createFolder(action.path);
            if (window.editor) window.editor.renderTree();
          }
          desc = `フォルダ「${action.path}」の作成`;
          break;
        }

        case 'folder_delete': {
          if (window.vfs) {
            window.vfs.deleteFolder(action.path);
            if (window.editor) window.editor.renderTree();
          }
          desc = `フォルダ「${action.path}」の削除`;
          break;
        }

        default:
          console.warn('Unknown history action type:', action.type);
      }

      this.undoStack.push(action);

      if (window.showToast) {
        window.showToast(`↪ ${desc} をやり直しました (Ctrl+Shift+Z)`, 'info');
      }
    } catch (err) {
      console.error('Redo failed:', err);
    } finally {
      this.isApplyingHistory = false;
    }
  }
}

// Global initialization
window.userHistory = new UserHistoryManager();
