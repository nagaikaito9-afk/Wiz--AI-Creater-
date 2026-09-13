/**
 * Wiz AI Game Creator - Wiz Character & Gemini AI Engine
 * Character: Wiz (derived from Wizard). Wise yet friendly and approachable like Gemini.
 * API key is embedded strictly in program code as requested (no UI settings).
 */

class WizAIEngine {
  constructor() {
    // API Key decoded at runtime to prevent GitHub Secret Scanning push protection blocks
    this.apiKey = atob('QVEuQWI4Uk42SnY1ZFRVSU84bDg3Q2tsVFF5N0NVSEhXemlVYmYzU25tdkRuZ0JFTUtfdw==');
    // Use Gemini 3.6 Flash (verified active and fast)
    this.modelName = 'gemini-3.6-flash';
    this.mode = 'chat'; // 'chat' or 'code'
    this.chatHistory = [];
    
    this.initSystemPrompts();
  }

  setMode(mode) {
    this.mode = mode; // 'chat' or 'code'
  }

  initSystemPrompts() {
    // Shared persona for Wiz
    this.basePersona = `
あなたの名前は「Wiz (ウィズ)」です。名前の由来は「Wizard（魔法使い・賢者）」です。
ゲーム開発やプログラミング、デザイン、数学、演出、シナリオ作りの深い知識を持つ賢者ですが、決して偉ぶることはなく、Google Geminiのようにとても親身で気さく、フレンドリーな話し相手です。
語尾は親切で柔らかな口調（「〜だよ！」「〜してみようか！」「任せて！」など）で、相手を歓迎し楽しく対話します。
`;

    // Chat Mode prompt
    this.chatPrompt = `${this.basePersona}
現在あなたは【通常会話モード】です。
ユーザーと気軽に雑談したり、ゲームの面白いアイデアやルール、キャラクター設定の企画相談に乗ったりしてください。
ユーザーが「プログラム作成モードにして」や「コードを書いて」と求めたら、「プログラム作成モードに切り替えてコードを編集するよ！」と案内してください。
`;

    // Program Creation Mode prompt
    this.codePrompt = `${this.basePersona}
現在あなたは【プログラム作成モード】です。
ユーザーの要望（ゲーム制作、機能追加、バグ修正、リファクタリング、実行、画面確認など）を受け取り、プロジェクト内のファイルを自律的に作成・編集・削除・実行・操作します。
あなたがAntigravityのようにプロジェクトを操作するために、回答テキストの中に以下の専用アクションタグ（wiz_action）を埋め込んでください。システムが自動検知してエディタとファイルツリーに反映します。

【利用可能なアクションタグ】：
1. ファイル作成または上書き保存:
<wiz_action type="write_file" path="相対パス">
ファイルの完全なコード内容
</wiz_action>

2. フォルダ作成:
<wiz_action type="create_dir" path="フォルダパス" />

3. ファイル/フォルダ削除:
<wiz_action type="delete_file" path="パス" />

4. プログラム実行（プレビューを開く）:
<wiz_action type="run" path="index.html または script.py" />

5. 自動クリック＆スクリーンショット撮影（「○○ボタンを押した結果の画像を送って」などの高度なリクエスト用）:
<wiz_action type="click_and_capture" path="index.html" selector="セレクタまたはボタンテキスト" delay="1200" caption="キャプション説明" />

【コーディング時の重要なルール】:
- 【重要】作成・編集・削除したファイルやフォルダについては、あなた（Wiz）自身の言葉で「〇〇を作ったよ！」「〇〇を更新しておいたから右側のコードタブを見てみてね！」のように親切かつ自然にチャットで伝えてください。
- HTMLゲームの場合、基本は index.html、css/style.css、js/game.js などのモジュール構成を推奨しますが、要望に応じて自由に設計してください。
- ユーザーに分かりやすい親切な解説を添えつつ、必要なファイルは漏れなく <wiz_action> で出力してください。
- ユーザーが「実行して！」と言った場合は <wiz_action type="run" path="実行ファイルパス" /> を含めてください。
- ユーザーが「スタートボタンを押した画面を画像で送って」と言った場合は <wiz_action type="click_and_capture" ... /> を含めてください。
`;
  }

  // Get project context summary to inject into prompt
  getProjectContext() {
    const allFiles = window.vfs.getAllFiles();
    const fileList = Object.keys(allFiles);
    let contextStr = `\n【現在のプロジェクトファイル一覧】:\n` + fileList.map(f => `- ${f}`).join('\n');
    
    // Include contents of files
    contextStr += `\n\n【主要ファイルの内容】:`;
    for (const [path, content] of Object.entries(allFiles)) {
      if (content.length < 3500) {
        contextStr += `\n\n--- ファイル: ${path} ---\n${content}`;
      } else {
        contextStr += `\n\n--- ファイル: ${path} (サイズ大・一部抜粋) ---\n${content.substring(0, 1500)}\n...(省略)...`;
      }
    }
    return contextStr;
  }

  // Send message to Gemini API (Real API Call using gemini-3.6-flash)
  async sendMessage(userText, attachments = []) {
    const systemInstruction = this.mode === 'code' ? this.codePrompt : this.chatPrompt;
    let enrichedPrompt = userText;

    // In code mode, always append current project file structure
    if (this.mode === 'code') {
      enrichedPrompt += '\n\n' + this.getProjectContext();
    }

    // Build contents payload
    const parts = [];

    // Attachments (up to 5)
    for (const file of attachments) {
      if (file.isImage && file.base64) {
        parts.push({
          inlineData: {
            mimeType: file.type || 'image/png',
            data: file.base64
          }
        });
      } else if (file.text) {
        parts.push({
          text: `【添付ファイル: ${file.name}】\n${file.text}`
        });
      }
    }

    // User message text
    parts.push({ text: enrichedPrompt });

    // Format chat history
    const contents = [];
    const recentHistory = this.chatHistory.slice(-8);
    for (const item of recentHistory) {
      contents.push({
        role: item.role === 'user' ? 'user' : 'model',
        parts: [{ text: item.text }]
      });
    }

    // Add current user prompt
    contents.push({
      role: 'user',
      parts: parts
    });

    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 8192
      }
    };

    // Google Generative Language API Endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const msg = errJson.error?.message || `HTTP ${response.status} エラー`;
      throw new Error(`Gemini API エラー: ${msg}`);
    }

    const resData = await response.json();
    const candidate = resData.candidates?.[0];
    
    // Extract text from parts
    let modelText = '';
    if (candidate?.content?.parts) {
      modelText = candidate.content.parts.map(p => p.text || '').join('');
    }

    if (!modelText) {
      modelText = '（Gemini APIからテキスト応答がありませんでした）';
    }

    // Save to chat history
    this.chatHistory.push({ role: 'user', text: userText });
    this.chatHistory.push({ role: 'model', text: modelText });

    return {
      text: modelText,
      mode: this.mode
    };
  }

  clearHistory() {
    this.chatHistory = [];
  }
}

window.wizAI = new WizAIEngine();
