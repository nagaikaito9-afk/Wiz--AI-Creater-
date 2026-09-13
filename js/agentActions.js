/**
 * Wiz AI Game Creator - Agent Actions Executor
 * Parses and executes actions emitted by Wiz (<wiz_action> tags)
 * Handles file creations, modifications, runs, and screenshot captures.
 * No annoying "Created/Updated" action cards; Wiz reports changes naturally in text!
 */

class AgentActionsExecutor {
  constructor() {
    this.actionRegex = /<wiz_action\s+([^>]+)>(?:([\s\S]*?)<\/wiz_action>|)/g;
  }

  // Parse attributes from <wiz_action key="val" key2="val2">
  parseAttributes(attrString) {
    const attrs = {};
    const regex = /([a-zA-Z0-9_-]+)=["']([^"']*)["']/g;
    let match;
    while ((match = regex.exec(attrString)) !== null) {
      attrs[match[1]] = match[2];
    }
    return attrs;
  }

  // Extract and execute actions from AI response
  async processResponse(responseText, messageContainer) {
    let cleanText = responseText;
    const actions = [];
    let match;

    const regex = /<wiz_action\s+([^>]+)>(?:([\s\S]*?)<\/wiz_action>|)/g;
    while ((match = regex.exec(responseText)) !== null) {
      const attrs = this.parseAttributes(match[1]);
      const content = match[2] ? match[2].trim() : '';
      actions.push({
        fullMatch: match[0],
        type: attrs.type,
        path: attrs.path,
        selector: attrs.selector,
        delay: parseInt(attrs.delay, 10) || 1200,
        caption: attrs.caption || '',
        content: content
      });
    }

    // Strip actions from chat bubble text for clean reading
    cleanText = cleanText.replace(/<wiz_action[\s\S]*?<\/wiz_action>/g, '').trim();
    cleanText = cleanText.replace(/<wiz_action[^>]*\/>/g, '').trim();

    // Execute actions sequentially in background
    if (actions.length > 0) {
      window.editor.showAiEditing(true);

      for (const action of actions) {
        try {
          await this.executeAction(action, messageContainer);
        } catch (err) {
          console.error('Error executing action:', action, err);
        }
      }

      window.editor.showAiEditing(false);
    }

    return {
      cleanText: cleanText,
      actionsCount: actions.length
    };
  }

  // Execute single action silently (Wiz speaks naturally about modified files!)
  async executeAction(action, messageContainer) {
    switch (action.type) {
      case 'write_file': {
        const path = window.vfs.normalizePath(action.path);
        window.vfs.createFile(path, action.content);
        window.editor.openFile(path);
        // Do NOT append card; Wiz describes changes in conversation
        break;
      }

      case 'create_dir': {
        const path = window.vfs.normalizePath(action.path);
        window.vfs.createDir(path);
        // Do NOT append card
        break;
      }

      case 'delete_file': {
        const path = window.vfs.normalizePath(action.path);
        window.vfs.delete(path);
        // Do NOT append card
        break;
      }

      case 'run': {
        const path = window.vfs.normalizePath(action.path || 'index.html');
        // Trigger run modal
        window.runner.run(path);
        break;
      }

      case 'click_and_capture': {
        const path = window.vfs.normalizePath(action.path || 'index.html');
        try {
          const imgDataUrl = await window.runner.executeAndCapture(path, action.selector, action.delay);
          this.appendImageMessage(messageContainer, imgDataUrl, action.caption || `${path} の実行画面 (操作: ${action.selector || '初期画面'})`);
        } catch (e) {
          console.error('Capture failed:', e);
          if (window.showToast) {
            window.showToast(`画面キャプチャに失敗しました: ${e.message}`, 'error');
          }
        }
        break;
      }

      default:
        console.warn('Unknown action type:', action.type);
    }
  }

  // Append screenshot image into chat
  appendImageMessage(container, dataUrl, caption) {
    if (!container) return;
    const wrap = document.createElement('div');
    wrap.className = 'chat-image-preview';

    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = caption;
    wrap.appendChild(img);

    const cap = document.createElement('div');
    cap.className = 'chat-image-caption';
    cap.innerHTML = `<i class="fa-solid fa-image"></i> ${caption}`;
    wrap.appendChild(cap);

    container.appendChild(wrap);
    container.scrollTop = container.scrollHeight;
  }
}

window.agentActions = new AgentActionsExecutor();
