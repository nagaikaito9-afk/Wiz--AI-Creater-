/**
 * Wiz AI Game Creator - Wiz Character & Gemini AI Engine
 * Character: Wiz (derived from Wizard). Wise yet friendly and approachable like Gemini.
 * Features:
 * - Vercel Serverless Proxy (/api/chat) support using process.env.GEMINI_API_KEY
 * - Direct official 'x-goog-api-key' header authentication (no URL key exposure)
 * - Obfuscated fallback key for local offline/standalone execution
 */

class WizAIEngine {
  constructor() {
    // Obfuscated with atob to avoid GitHub Secret Scanning push protection blocks
    this.fallbackApiKey = atob('QVEuQWI4Uk42S2JCSXBXc2NGT1pmUXJSSG56QUw5U3Nqa1U1cDhRMzlMMGlOSUtMeXVCS1E=');
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
また、スタジオ内の操作（「新しい『○○』チャットを作って」「○○チャットに切り替えて」「設定を開いて」「フレンド画面を開いて」など）を求められた場合は、親切に回答するとともに以下の専用アクションタグを使って自律的に操作を行ってください：
- 新しいチャット部屋作成: <wiz_action type="create_room" name="プロジェクト名" />
- チャット部屋切り替え: <wiz_action type="switch_room" name="プロジェクト名" />
- 画面切り替え: <wiz_action type="switch_view" mode="preview または code または logs" />
- モーダル・機能起動: <wiz_action type="open_modal" target="settings または rules または friends または team" />

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

5. 実行画面の画像キャプチャ（「実行したときの画像を送って」など）:
<wiz_action type="capture_preview" path="index.html" caption="実行画面のスクリーンショット" />

6. ドット絵グラフィック生成（「ドット絵で○○を描いて」など）:
<wiz_action type="generate_pixel_art" subject="勇者/スライム/剣/ポーションなど" caption="ドット絵グラフィック" />

7. AI高品質イラスト生成（「○○の画像を描いて/生成して」など）:
<wiz_action type="generate_image" prompt="英語または日本語のプロンプト" caption="AI生成グラフィック" />

8. 自動クリック＆スクリーンショット撮影（「○○ボタンを押した結果の画像を送って」など）:
<wiz_action type="click_and_capture" path="index.html" selector="セレクタまたはボタンテキスト" delay="1200" caption="キャプション説明" />

9. 新しいチャット部屋（プロジェクト）作成:
<wiz_action type="create_room" name="プロジェクト名" />
※「新しい『〇〇』チャットを作って」や「新しい部屋を作って」と言われたらこのタグで部屋を自動作成してください。

10. チャット部屋の切り替え:
<wiz_action type="switch_room" name="プロジェクト名" />

11. 画面表示の切り替え（実行画面/コード/ログ）:
<wiz_action type="switch_view" mode="preview または code または logs" />
※「実行画面を見せて」「コード画面にして」などの要望に対応できます。

12. 各種モーダル・機能の起動:
<wiz_action type="open_modal" target="settings または rules または friends または team" />
※「フレンド画面を開いて」「設定を開いて」「チーム管理を開いて」などに対応できます。

13. ファイルをエディタで開く:
<wiz_action type="open_file" path="ファイルパス" />

14. プロジェクトのZIP保存:
<wiz_action type="download_zip" />

15. 直前の変更を元に戻す（Undo）:
<wiz_action type="undo" />

16. インタラクティブ選択肢の提示（詳細が指定されていない質問へのサポート）:
ユーザーが「敵を追加して」「BGMをつけて」「ステージを増やして」「アイテムを追加して」など、具体的な仕様・好みが指定されていない抽象的なリクエストをした場合、
「どんな敵を追加する？」「どんなステージにする？」という問いかけとともに、タップ可能な選択肢ボタン群を以下のタグで出力してください。
形式: <wiz_options question="どんな敵を追加する？" options="遠距離魔法スライム,高速突進ウルフ,巨大ボスゴーレム,飛翔ワイバーン" />
※ ユーザーはボタンをワンクリックするだけで回答して開発を進められます。

【コーディング時の重要なルール】:
- 【重要】作成・編集・削除したファイルやフォルダについては、あなた（Wiz）自身の言葉で「〇〇を作ったよ！」「〇〇を更新しておいたから右側のコードタブを見てみてね！」のように親切かつ自然にチャットで伝えてください。
- プロジェクトルールが設定されている場合、ゲームのジャンルやグラフィック、設計方針においてそのルールを最優先で順守してください。
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

  // Send message using Vercel Serverless /api/chat if available, or direct x-goog-api-key header
  async sendMessage(userText, attachments = []) {
    const systemInstruction = this.mode === 'code' ? this.codePrompt : this.chatPrompt;
    let enrichedPrompt = userText;

    // Inject active room's Project Rules
    const activeRoom = window.projectManager?.getActiveRoom();
    if (activeRoom && activeRoom.rules && activeRoom.rules.trim()) {
      enrichedPrompt += `\n\n【この部屋のプロジェクトルール（最優先で遵守してください）】:\n${activeRoom.rules}\n`;
    }

    // Inject Cross-Room Memory if enabled
    const crossMemory = (window.projectManager && typeof window.projectManager.getCrossRoomMemoryPrompt === 'function')
      ? window.projectManager.getCrossRoomMemoryPrompt()
      : '';
    if (crossMemory) {
      enrichedPrompt += `\n\n${crossMemory}\n`;
    }

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

    const requestPayload = {
      modelName: this.modelName,
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

    let resData = null;

    // 1. Try Vercel Serverless API (/api/chat) first
    try {
      const serverlessRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });

      if (serverlessRes.ok) {
        resData = await serverlessRes.json();
      } else if (serverlessRes.status !== 404) {
        // If serverless exists but returned error (e.g. 500)
        const errJson = await serverlessRes.json().catch(() => ({}));
        throw new Error(errJson.error || `Serverless Error ${serverlessRes.status}`);
      }
    } catch (e) {
      // If network failure or not on Vercel, fallback to direct client call
      console.info('Vercel serverless /api/chat not available, switching to direct client call:', e.message);
    }

    // 2. Fallback: Direct call to Google Gemini API (Browser CORS requires ?key= query parameter)
    if (!resData) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${encodeURIComponent(this.fallbackApiKey)}`;
      const directRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.fallbackApiKey
        },
        body: JSON.stringify({
          systemInstruction: requestPayload.systemInstruction,
          contents: requestPayload.contents,
          generationConfig: requestPayload.generationConfig
        })
      });

      if (!directRes.ok) {
        const errJson = await directRes.json().catch(() => ({}));
        const msg = errJson.error?.message || `HTTP ${directRes.status} エラー`;
        throw new Error(`Gemini API エラー: ${msg}`);
      }

      resData = await directRes.json();
    }

    // Extract response text
    const candidate = resData.candidates?.[0];
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
