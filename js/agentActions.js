/**
 * Wiz AI Game Creator - Agent Actions Executor (Enhanced Edition)
 * Handles:
 * - File creations & modifications
 * - Direct execution & capture screenshot (with download button)
 * - Pixel Art & Imagen AI image generation
 */

class AgentActionsExecutor {
  constructor() {
    this.actionRegex = /<wiz_action\s+([^>]+)>(?:([\s\S]*?)<\/wiz_action>|)/g;
  }

  // Parse attributes from <wiz_action key="val">
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
        subject: attrs.subject || attrs.prompt,
        prompt: attrs.prompt || attrs.subject,
        delay: parseInt(attrs.delay, 10) || 1200,
        caption: attrs.caption || '',
        content: content
      });
    }

    // Parse <wiz_options question="..." options="..." />
    const optionsRegex = /<wiz_options\s+([^>]+)>(?:([\s\S]*?)<\/wiz_options>|)/g;
    let optMatch;
    while ((optMatch = optionsRegex.exec(responseText)) !== null) {
      const attrs = this.parseAttributes(optMatch[1]);
      let optionsList = [];
      if (attrs.options) {
        optionsList = attrs.options.split(',').map(s => s.trim()).filter(Boolean);
      } else if (optMatch[2]) {
        optionsList = optMatch[2].split('\n').map(s => s.replace(/^[-*•\d.]\s*/, '').trim()).filter(Boolean);
      }
      if (optionsList.length > 0) {
        actions.push({
          type: 'show_options',
          question: attrs.question || 'どんな設定にする？',
          options: optionsList
        });
      }
    }

    cleanText = cleanText.replace(/<wiz_action[\s\S]*?<\/wiz_action>/g, '').trim();
    cleanText = cleanText.replace(/<wiz_action[^>]*\/>/g, '').trim();
    cleanText = cleanText.replace(/<wiz_options[\s\S]*?<\/wiz_options>/g, '').trim();
    cleanText = cleanText.replace(/<wiz_options[^>]*\/>/g, '').trim();

    // Execute actions sequentially in background
    if (actions.length > 0) {
      const hasFileMod = actions.some(a => ['write_file', 'create_dir', 'delete_file'].includes(a.type));
      if (hasFileMod && window.vfs) {
        window.vfs.saveSnapshot('Wizによるコード生成・編集');
      }

      window.editor?.showAiEditing(true);

      for (const action of actions) {
        try {
          await this.executeAction(action, messageContainer);
        } catch (err) {
          console.error('Error executing action:', action, err);
        }
      }

      window.editor?.showAiEditing(false);
    }

    return {
      cleanText: cleanText,
      actionsCount: actions.length
    };
  }

  // Execute single action
  async executeAction(action, messageContainer) {
    switch (action.type) {
      case 'write_file': {
        const path = window.vfs.normalizePath(action.path);
        const existed = window.vfs.exists ? window.vfs.exists(path) : false;
        window.vfs.createFile(path, action.content);
        window.editor.openFile(path);
        if (window.activityLogger) {
          window.activityLogger.log(existed ? `Wizが*${path}*を編集しました` : `Wizが*${path}*を作成しました`, 'file', { path });
        }
        if (window.projectManager) {
          window.projectManager.broadcastUpdate({ summary: `${path} を更新` });
        }
        break;
      }

      case 'create_dir': {
        const path = window.vfs.normalizePath(action.path);
        window.vfs.createDir(path);
        if (window.activityLogger) {
          window.activityLogger.log(`Wizがフォルダ*${path}*を作成しました`, 'file', { path });
        }
        break;
      }

      case 'delete_file': {
        const path = window.vfs.normalizePath(action.path);
        window.vfs.delete(path);
        if (window.activityLogger) {
          window.activityLogger.log(`Wizが*${path}*を削除しました`, 'file', { path });
        }
        if (window.projectManager) {
          window.projectManager.broadcastUpdate({ summary: `${path} を削除` });
        }
        break;
      }

      case 'run': {
        const path = window.vfs.normalizePath(action.path || 'index.html');
        window.runner.run(path);
        break;
      }

      case 'capture_preview':
      case 'click_and_capture': {
        const path = window.vfs.normalizePath(action.path || 'index.html');
        try {
          const imgDataUrl = await window.runner.executeAndCapture(path, action.selector, action.delay);
          this.appendImageMessage(messageContainer, imgDataUrl, action.caption || `${path} の実行画面`, 'screenshot.png');
        } catch (e) {
          console.error('Capture failed:', e);
          if (window.showToast) window.showToast(`画面キャプチャに失敗しました: ${e.message}`, 'error');
        }
        break;
      }

      case 'generate_pixel_art': {
        try {
          const subject = action.subject || 'hero';
          const imgDataUrl = window.imageGen.generatePixelArt(subject);
          this.appendImageMessage(messageContainer, imgDataUrl, action.caption || `🎨 ドット絵グラフィック: ${subject}`, `${subject}_pixelart.png`);
          // Also save to VFS if path specified
          if (action.path) {
            window.vfs.createFile(action.path, imgDataUrl);
          }
        } catch (e) {
          console.error('Pixel art generation failed:', e);
        }
        break;
      }

      case 'generate_image': {
        try {
          const prompt = action.prompt || 'game fantasy art';
          const imgDataUrl = await window.imageGen.generateAiImage(prompt);
          this.appendImageMessage(messageContainer, imgDataUrl, action.caption || `✨ AI生成グラフィック: ${prompt}`, 'ai_generated.png');
          if (action.path) {
            window.vfs.createFile(action.path, imgDataUrl);
          }
        } catch (e) {
          console.error('AI image generation failed:', e);
        }
        break;
      }

      case 'show_options': {
        this.appendOptionsCard(messageContainer, action.question, action.options);
        break;
      }

      // Studio Control Actions
      case 'create_room':
      case 'new_project': {
        const name = action.name || action.title || '新しいプロジェクト';
        if (window.projectManager) {
          window.projectManager.createNewRoom(name);
        }
        if (window.activityLogger) {
          window.activityLogger.log(`Wizが*${name}*チャットを作成しました`, 'room', { name });
        }
        break;
      }

      case 'switch_room': {
        const target = action.name || action.id;
        if (window.projectManager) {
          window.projectManager.switchRoomByNameOrId(target);
        }
        if (window.activityLogger) {
          window.activityLogger.log(`Wizが*${target}*チャットに切り替えました`, 'room', { target });
        }
        break;
      }

      case 'rename_room': {
        if (action.name && window.projectManager) {
          window.projectManager.renameCurrentRoom(action.name);
        }
        if (window.activityLogger) {
          window.activityLogger.log(`Wizがチャット名を*${action.name}*に変更しました`, 'room', { name: action.name });
        }
        break;
      }

      case 'delete_room': {
        if (window.projectManager) {
          window.projectManager.deleteCurrentRoom();
        }
        break;
      }

      case 'switch_view': {
        const mode = action.mode || 'preview';
        if (window.app) {
          window.app.switchRightView(mode);
        }
        if (window.activityLogger) {
          window.activityLogger.log(`Wizが画面を*${mode}*に切り替えました`, 'system', { mode });
        }
        break;
      }

      case 'open_file': {
        if (action.path && window.editor) {
          window.editor.openFile(action.path);
        }
        break;
      }

      case 'open_modal': {
        const target = (action.target || action.name || '').toLowerCase();
        if (target.includes('set') || target.includes('設定')) {
          document.getElementById('settings-btn')?.click();
        } else if (target.includes('rule') || target.includes('ルール')) {
          document.getElementById('project-rules-btn')?.click();
        } else if (target.includes('friend') || target.includes('フレンド')) {
          document.getElementById('sidebar-tab-friends')?.click();
        } else if (target.includes('team') || target.includes('チーム') || target.includes('共有')) {
          document.getElementById('project-team-btn')?.click();
        } else if (target.includes('sound') || target.includes('効果音')) {
          document.getElementById('header-soundfx-btn')?.click();
        } else if (target.includes('market') || target.includes('マーケット')) {
          document.getElementById('open-marketplace-btn')?.click();
        } else if (target.includes('hist') || target.includes('履歴')) {
          document.getElementById('open-activity-btn')?.click();
        }
        break;
      }

      case 'download_zip': {
        document.getElementById('download-zip-btn')?.click();
        break;
      }

      case 'undo':
      case 'undo_change': {
        window.editor?.undoAiChanges();
        break;
      }

      default:
        console.warn('Unknown action type:', action.type);
    }
  }

  // Append Interactive Options Card (選択肢ボタン)
  appendOptionsCard(container, question, optionsList) {
    if (!container || !optionsList || optionsList.length === 0) return;

    const card = document.createElement('div');
    card.className = 'wiz-options-card';

    const title = document.createElement('div');
    title.className = 'wiz-options-title';
    title.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> <span>${question || 'どんな設定にする？'}</span>`;
    card.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'wiz-options-grid';

    optionsList.forEach(optText => {
      const btn = document.createElement('button');
      btn.className = 'wiz-option-btn';
      btn.innerHTML = `<i class="fa-solid fa-play"></i> <span>${optText}</span>`;
      btn.onclick = () => {
        // Automatically set into chat input and trigger send!
        const input = document.getElementById('chat-user-input');
        if (input) {
          input.value = optText;
          if (window.app) {
            window.app.handleSendMessage();
          }
        }
      };
      grid.appendChild(btn);
    });

    card.appendChild(grid);
    container.appendChild(card);
    container.scrollTop = container.scrollHeight;
  }

  // Append screenshot or generated image into chat with one-click Download button!
  appendImageMessage(container, dataUrl, caption, defaultDownloadFilename = 'image.png') {
    if (!container) return;
    const wrap = document.createElement('div');
    wrap.className = 'chat-image-preview';

    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = caption;
    wrap.appendChild(img);

    const cap = document.createElement('div');
    cap.className = 'chat-image-caption';
    cap.style.display = 'flex';
    cap.style.alignItems = 'center';
    cap.style.justifyContent = 'space-between';

    const label = document.createElement('div');
    label.innerHTML = `<i class="fa-solid fa-image"></i> ${caption}`;
    cap.appendChild(label);

    // Download Button for the Image
    const dlBtn = document.createElement('button');
    dlBtn.className = 'btn-tool-mini';
    dlBtn.innerHTML = '<i class="fa-solid fa-download"></i> 保存';
    dlBtn.title = '画像をローカルにダウンロード';
    dlBtn.onclick = (e) => {
      e.stopPropagation();
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = defaultDownloadFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (window.showToast) window.showToast('画像を保存しました！', 'success');
    };
    cap.appendChild(dlBtn);

    wrap.appendChild(cap);
    container.appendChild(wrap);
    container.scrollTop = container.scrollHeight;
  }
}

window.agentActions = new AgentActionsExecutor();
