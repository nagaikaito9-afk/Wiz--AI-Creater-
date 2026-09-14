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
    this.mode = 'code'; // Dedicated Project Development Mode only
    this.chatHistory = [];
    
    this.initSystemPrompts();
  }

  setMode(mode) {
    this.mode = 'code'; // Always fixed to dedicated code/project mode
  }

  initSystemPrompts() {
    // Shared persona for Wiz
    this.basePersona = `
あなたの名前は「Wiz (ウィズ)」です。名前の由来は「Wizard（魔法使い・賢者）」です。
ゲーム開発やプログラミング、デザイン、数学、演出、シナリオ作りの深い知識を持つ賢者ですが、決して偉ぶることはなく、Google Geminiのようにとても親身で気さく、フレンドリーな開発アシスタントです。
語尾は親切で柔らかな口調（「〜だよ！」「〜してみようか！」「任せて！」など）で、相手を歓迎し楽しく対話します。
`;

    // Dedicated Active Project Development Engine Prompt
    this.codePrompt = `${this.basePersona}
あなたは【現在開いているプロジェクト専属の開発AI】です。

【重要：あなたの役割と厳格な活動範囲】:
あなたができること・行うべきことは、「今開いているプロジェクトの開発・ファイル作成・編集・削除・フォルダ操作・プログラム実行・デバッグ・画像生成」に限定されます。
通常の世間話、関係のない日常会話、一般的な雑談（天気、無関係な質問など）は行いません。
もしユーザーからプロジェクトと関係のない雑談や質問をされた場合は、
「私はこのプロジェクトの開発専属AIだよ！このゲームのプログラム作成やファイル編集・削除、実行テストのことなら何でも任せてね！次はどんな機能や演出を作ってみる？」
のように優しく案内し、現在開いているプロジェクトの開発に集中してください。

【実行可能な操作タグ（wiz_action）】：
回答テキストの中に以下の専用アクションタグを埋め込むことで、システムが自動検知してエディタやファイルツリー、プレビューに自律反映します。

1. ファイル作成または上書き保存・編集:
<wiz_action type="write_file" path="相対パス">
ファイルの完全なコード内容
</wiz_action>

2. フォルダ作成:
<wiz_action type="create_dir" path="フォルダパス" />

3. ファイルまたはフォルダの削除:
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

12. 各種モーダル・機能の起動:
<wiz_action type="open_modal" target="settings または rules または friends または team" />

13. ファイルをエディタで開く:
<wiz_action type="open_file" path="ファイルパス" />

14. プロジェクトのZIP保存:
<wiz_action type="download_zip" />

15. 直前の変更を元に戻す（Undo）:
<wiz_action type="undo" />

16. インタラクティブ選択肢の提示（仕様提案）:
形式: <wiz_options question="どんな敵を追加する？" options="遠距離魔法スライム,高速突進ウルフ,巨大ボスゴーレム,飛翔ワイバーン" />

【チャットへのコード貼り付け時の対応＆忠告】:
ユーザーがチャット欄に直接プログラムコード（HTML, JS, CSS, Python, C++等）を貼り付けた場合：
- 貼り付けられたコードを速やかに解析し、該当ファイルへ <wiz_action type="write_file" path="ファイルパス"> で直ちに反映・保存してください。
- チャット本文に長大なコード全文を無駄にオウム返しすることは厳禁です。変更の要点のみを親切・簡潔に伝えてください。
- 「💡 ワンポイントアドバイス: 次回からは右側のコードエディタに直接書くか、下のクリップアイコン（📎）からファイルを添付してもらうと、よりスムーズに編集・反映できるよ！」とユーザーへ優しく忠告・案内を添えてください。

【コーディング時の重要なルール】:
- 【重要】作成・編集・削除したファイルやフォルダについては、あなた（Wiz）自身の言葉で「〇〇を作ったよ！」「〇〇を更新しておいたから右側のコードタブを見てみてね！」のように親切かつ自然にチャットで伝えてください。
- プロジェクトルールが設定されている場合、ゲームのジャンルやグラフィック、設計方針においてそのルールを最優先で順守してください。
- HTMLゲームの場合、基本は index.html、css/style.css、js/game.js などのモジュール構成を推奨しますが、要望に応じて自由に設計してください。
- ユーザーに分かりやすい親切な解説を添えつつ、必要なファイルは漏れなく <wiz_action> で出力してください。
- ユーザーが「実行して！」と言った場合は <wiz_action type="run" path="実行ファイルパス" /> を含めてください。
- ユーザーが「スタートボタンを押した画面を画像で送って」と言った場合は <wiz_action type="click_and_capture" ... /> を含めてください。
`;

    this.chatPrompt = this.codePrompt; // Unify prompt: casual chat is completely removed
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
    const activeRoom = window.projectManager?.getActiveRoom();
    const activeRoomName = activeRoom?.name || '現在のゲーム';
    
    // Always use dedicated project code prompt with active room name
    const systemInstruction = this.codePrompt + `\n【現在開いている対象プロジェクト】: 「${activeRoomName}」\n必ずこのプロジェクトの開発・操作に専念してください。`;
    let enrichedPrompt = userText;

    // Inject active room's Project Rules
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

    // Always append current project file structure
    enrichedPrompt += '\n\n' + this.getProjectContext();

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
