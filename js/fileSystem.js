/**
 * Wiz AI Game Creator - Virtual File System
 * Manages project files and folders in memory & persists to localStorage
 */

class VirtualFileSystem {
  constructor(storageKey = 'wiz_vfs_project') {
    this.storageKey = storageKey;
    this.root = {
      name: '',
      type: 'dir',
      children: {}
    };
    this.listeners = [];
    this.undoHistory = []; // Snapshots for Wiz Undo feature
    this.maxHistory = 20;
    this.load();
  }

  // Save snapshot before modifications
  saveSnapshot(actionLabel = 'Wizの変更') {
    try {
      const snapshot = JSON.stringify(this.root);
      this.undoHistory.push({
        label: actionLabel,
        time: Date.now(),
        data: snapshot
      });
      if (this.undoHistory.length > this.maxHistory) {
        this.undoHistory.shift();
      }
    } catch (e) {
      console.warn('Failed to save snapshot:', e);
    }
  }

  // Undo last modification
  undo() {
    if (this.undoHistory.length === 0) {
      if (window.showToast) window.showToast('元に戻せる変更履歴がありません', 'info');
      return false;
    }
    const last = this.undoHistory.pop();
    try {
      this.root = JSON.parse(last.data);
      this.notify();
      if (window.showToast) window.showToast(`直前の変更（${last.label}）を取り消しました`, 'success');
      return true;
    } catch (e) {
      console.error('Failed to undo:', e);
      return false;
    }
  }

  // Subscribe to changes
  onChange(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.save();
    this.listeners.forEach(fn => fn(this));
  }

  // Load from LocalStorage or seed defaults
  load() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        this.root = JSON.parse(saved);
        // Ensure new sample files exist if user has older cached VFS
        if (!this.exists('cpp/game_logic.hpp')) {
          this.createFile('cpp/game_logic.hpp', `// C++ Header File Example\n#ifndef GAME_LOGIC_HPP\n#define GAME_LOGIC_HPP\n\n#include <string>\n\nstruct GameConfig {\n    int maxScore = 99999;\n    float gravity = 9.8f;\n    std::string title = "Wiz AI Game";\n};\n\n#endif\n`);
        }
        if (!this.exists('assets/hero.png')) {
          const heroDotPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAJElEQVQoU2NkYGD4z4AGGOE8mGg0FcDVkRWhqMDqB7i6QawLADmFBB2mP4h+AAAAAElFTkSuQmCC';
          this.createFile('assets/hero.png', heroDotPng);
          this.createFile('assets/gem.webp', heroDotPng);
        }
        return;
      } catch (e) {
        console.error('Failed to parse saved VFS:', e);
      }
    }
    this.seedDefaultProject();
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.root));
    } catch (e) {
      console.warn('Could not save VFS to LocalStorage:', e);
    }
  }

  // Reset to default sample game
  resetToDefault() {
    this.root = { name: '', type: 'dir', children: {} };
    this.seedDefaultProject();
    this.notify();
  }

  // Seed standard files
  seedDefaultProject() {
    this.createFile('index.html', `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>ネオン・ブロック崩し - Neon Breaker</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div class="game-container">
    <div class="hud">
      <div class="stat">SCORE: <span id="score-val">0</span></div>
      <div class="stat">LIVES: <span id="lives-val">3</span></div>
    </div>
    <canvas id="game-canvas" width="600" height="400"></canvas>
    <div class="overlay" id="overlay">
      <h1 id="title-text">NEON BREAKER</h1>
      <p id="sub-text">AI賢者Wizと作ったレトロフューチャー・ブロック崩し</p>
      <button id="start-btn" class="btn-glow">スタート</button>
    </div>
  </div>
  <script src="js/game.js"></script>
</body>
</html>`);

    this.createFile('css/style.css', `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
body {
  background: #080c16;
  color: #fff;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}
.game-container {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 0 30px rgba(0, 242, 254, 0.4);
  border: 2px solid #00f2fe;
}
.hud {
  display: flex;
  justify-content: space-between;
  padding: 10px 20px;
  background: rgba(16, 22, 38, 0.95);
  font-weight: bold;
  letter-spacing: 2px;
  color: #00f2fe;
}
#game-canvas {
  background: radial-gradient(circle at center, #111a2e 0%, #080c16 100%);
  display: block;
}
.overlay {
  position: absolute;
  inset: 40px 0 0 0;
  background: rgba(8, 12, 22, 0.88);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  transition: opacity 0.3s ease;
}
.overlay.hidden {
  display: none;
}
h1 {
  font-size: 2.2rem;
  background: linear-gradient(135deg, #00f2fe, #9d4edd);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 8px;
}
p {
  color: #94a3b8;
  font-size: 0.9rem;
  margin-bottom: 24px;
}
.btn-glow {
  background: linear-gradient(135deg, #00f2fe, #4facfe);
  color: #080c16;
  font-weight: bold;
  font-size: 1.1rem;
  padding: 10px 32px;
  border: none;
  border-radius: 30px;
  cursor: pointer;
  box-shadow: 0 0 20px rgba(0, 242, 254, 0.6);
  transition: transform 0.2s, box-shadow 0.2s;
}
.btn-glow:hover {
  transform: scale(1.06);
  box-shadow: 0 0 30px rgba(0, 242, 254, 0.9);
}`);

    this.createFile('js/game.js', `// Neon Breaker Game Logic
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score-val');
const livesEl = document.getElementById('lives-val');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('start-btn');
const titleText = document.getElementById('title-text');
const subText = document.getElementById('sub-text');

let score = 0;
let lives = 3;
let isPlaying = false;
let animationId;

// Paddle
const paddle = {
  width: 100,
  height: 12,
  x: canvas.width / 2 - 50,
  y: canvas.height - 24,
  speed: 8,
  dx: 0
};

// Ball
const ball = {
  x: canvas.width / 2,
  y: canvas.height - 40,
  radius: 7,
  speed: 5,
  dx: 4,
  dy: -4
};

// Bricks
const brickRows = 4;
const brickCols = 7;
const brickWidth = 70;
const brickHeight = 20;
const brickPadding = 12;
const brickOffsetTop = 30;
const brickOffsetLeft = 18;

let bricks = [];
const brickColors = ['#ff007f', '#9d4edd', '#00f2fe', '#38ef7d'];

function initBricks() {
  bricks = [];
  for (let c = 0; c < brickCols; c++) {
    bricks[c] = [];
    for (let r = 0; r < brickRows; r++) {
      bricks[c][r] = { x: 0, y: 0, status: 1, color: brickColors[r % brickColors.length] };
    }
  }
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#00f2fe';
  ctx.shadowColor = '#00f2fe';
  ctx.shadowBlur = 15;
  ctx.fill();
  ctx.closePath();
  ctx.shadowBlur = 0;
}

function drawPaddle() {
  ctx.beginPath();
  ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 6);
  ctx.fillStyle = '#fff';
  ctx.shadowColor = '#00f2fe';
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.closePath();
  ctx.shadowBlur = 0;
}

function drawBricks() {
  for (let c = 0; c < brickCols; c++) {
    for (let r = 0; r < brickRows; r++) {
      if (bricks[c][r].status === 1) {
        const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
        const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
        bricks[c][r].x = brickX;
        bricks[c][r].y = brickY;
        ctx.beginPath();
        ctx.roundRect(brickX, brickY, brickWidth, brickHeight, 4);
        ctx.fillStyle = bricks[c][r].color;
        ctx.shadowColor = bricks[c][r].color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.closePath();
        ctx.shadowBlur = 0;
      }
    }
  }
}

function collisionDetection() {
  let activeBricks = 0;
  for (let c = 0; c < brickCols; c++) {
    for (let r = 0; r < brickRows; r++) {
      const b = bricks[c][r];
      if (b.status === 1) {
        activeBricks++;
        if (
          ball.x > b.x &&
          ball.x < b.x + brickWidth &&
          ball.y > b.y &&
          ball.y < b.y + brickHeight
        ) {
          ball.dy = -ball.dy;
          b.status = 0;
          score += 10;
          scoreEl.textContent = score;
        }
      }
    }
  }
  if (activeBricks === 0) {
    gameOver(true);
  }
}

function update() {
  if (!isPlaying) return;

  paddle.x += paddle.dx;
  if (paddle.x < 0) paddle.x = 0;
  if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;

  ball.x += ball.dx;
  ball.y += ball.dy;

  if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) ball.dx = -ball.dx;
  if (ball.y - ball.radius < 0) ball.dy = -ball.dy;

  if (
    ball.y + ball.radius >= paddle.y &&
    ball.y - ball.radius <= paddle.y + paddle.height &&
    ball.x >= paddle.x &&
    ball.x <= paddle.x + paddle.width
  ) {
    ball.dy = -Math.abs(ball.speed);
    const hitPoint = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
    ball.dx = hitPoint * (ball.speed + 1);
  }

  if (ball.y + ball.radius > canvas.height) {
    lives--;
    livesEl.textContent = lives;
    if (lives <= 0) {
      gameOver(false);
    } else {
      resetBall();
    }
  }

  collisionDetection();
}

function resetBall() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height - 40;
  ball.dx = (Math.random() > 0.5 ? 1 : -1) * 4;
  ball.dy = -4;
  paddle.x = canvas.width / 2 - paddle.width / 2;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBricks();
  drawBall();
  drawPaddle();
}

function loop() {
  update();
  draw();
  if (isPlaying) {
    animationId = requestAnimationFrame(loop);
  }
}

function startGame() {
  score = 0;
  lives = 3;
  scoreEl.textContent = score;
  livesEl.textContent = lives;
  initBricks();
  resetBall();
  isPlaying = true;
  overlay.classList.add('hidden');
  cancelAnimationFrame(animationId);
  loop();
}

function gameOver(won) {
  isPlaying = false;
  cancelAnimationFrame(animationId);
  overlay.classList.remove('hidden');
  titleText.textContent = won ? 'STAGE CLEAR!' : 'GAME OVER';
  titleText.style.color = won ? '#00f2fe' : '#ff0055';
  subText.textContent = '最終スコア: ' + score;
  startBtn.textContent = 'もう一度プレイ';
}

// Mouse Controls
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  paddle.x = mouseX - paddle.width / 2;
  if (paddle.x < 0) paddle.x = 0;
  if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;
});

// Keyboard Controls
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'd') paddle.dx = paddle.speed;
  if (e.key === 'ArrowLeft' || e.key === 'a') paddle.dx = -paddle.speed;
});
window.addEventListener('keyup', (e) => {
  if (['ArrowRight', 'd', 'ArrowLeft', 'a'].includes(e.key)) paddle.dx = 0;
});

startBtn.addEventListener('click', startGame);
initBricks();
draw();
`);

    this.createFile('main.py', `# Pyodideで実行可能なPythonゲーム・スクリプト例
import random
import time

def main():
    print("========================================")
    print("🧙‍♂️ Wiz Python ミニバトルシミュレーター")
    print("========================================")
    
    player_hp = 100
    monster_hp = 100
    
    print(f"勇者現る！ HP: {player_hp} vs 魔物 HP: {monster_hp}\\n")
    
    turn = 1
    while player_hp > 0 and monster_hp > 0:
        print(f"--- ターン {turn} ---")
        # プレイヤーの攻撃
        dmg = random.randint(15, 30)
        monster_hp = max(0, monster_hp - dmg)
        print(f"⚔️ プレイヤーの魔法攻撃！ 魔物に {dmg} ダメージ！ (魔物HP: {monster_hp})")
        
        if monster_hp <= 0:
            print("\\n🎉 魔物を討伐した！ 勝利！")
            break
            
        # 敵の反撃
        enemy_dmg = random.randint(10, 25)
        player_hp = max(0, player_hp - enemy_dmg)
        print(f"💥 魔物の反撃！ プレイヤーは {enemy_dmg} ダメージを受けた！ (勇者HP: {player_hp})")
        
        if player_hp <= 0:
            print("\\n💀 勇者は力尽きた... GAME OVER")
            break
            
        turn += 1
        
    print("\\nシミュレーション完了！")

if __name__ == "__main__":
    main()
`);

    this.createFile('cpp/game_logic.cpp', `// C++ Game Engine Core Logic (WebAssembly / Native logic)
#include <iostream>
#include <vector>
#include <cmath>

struct Vector2 {
    float x, y;
    Vector2(float _x = 0, float _y = 0) : x(_x), y(_y) {}
};

class Ball {
public:
    Vector2 position;
    Vector2 velocity;
    float radius;

    Ball(float x, float y, float r) : position(x, y), velocity(4.0f, -4.0f), radius(r) {}

    void update() {
        position.x += velocity.x;
        position.y += velocity.y;
    }

    void bounceX() { velocity.x = -velocity.x; }
    void bounceY() { velocity.y = -velocity.y; }
};

int main() {
    std::cout << "[Wiz Game Engine] Initializing C++ Game Simulation..." << std::endl;
    Ball ball(300.0f, 200.0f, 8.0f);
    
    for (int frame = 1; frame <= 5; ++frame) {
        ball.update();
        std::cout << "Frame " << frame << " -> Ball Pos: (" 
                  << ball.position.x << ", " << ball.position.y << ")" << std::endl;
    }
    
    std::cout << "[Wiz Game Engine] C++ logic executed successfully!" << std::endl;
    return 0;
}
`);

    this.createFile('cpp/game_logic.hpp', `// C++ Header File Example
#ifndef GAME_LOGIC_HPP
#define GAME_LOGIC_HPP

#include <string>

struct GameConfig {
    int maxScore = 99999;
    float gravity = 9.8f;
    std::string title = "Wiz AI Game";
};

#endif // GAME_LOGIC_HPP
`);

    // Sample Pixel Art Sprite (PNG Data URL)
    const heroDotPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAJElEQVQoU2NkYGD4z4AGGOE8mGg0FcDVkRWhqMDqB7i6QawLADmFBB2mP4h+AAAAAElFTkSuQmCC';
    this.createFile('assets/hero.png', heroDotPng);
    this.createFile('assets/gem.webp', heroDotPng);
  }

  // Path normalization: "a/b/../c" => "a/c"
  normalizePath(path) {
    if (!path) return '';
    const parts = path.replace(/\\/g, '/').split('/').filter(p => p && p !== '.');
    const result = [];
    for (const part of parts) {
      if (part === '..') {
        if (result.length > 0) result.pop();
      } else {
        result.push(part);
      }
    }
    return result.join('/');
  }

  // Get node by path
  getNode(path) {
    const clean = this.normalizePath(path);
    if (!clean) return this.root;
    const parts = clean.split('/');
    let curr = this.root;
    for (const p of parts) {
      if (!curr.children || !curr.children[p]) return null;
      curr = curr.children[p];
    }
    return curr;
  }

  // Check if file or dir exists
  exists(path) {
    return this.getNode(path) !== null;
  }

  // Create folder
  createDir(dirPath) {
    const clean = this.normalizePath(dirPath);
    if (!clean) return true;
    const parts = clean.split('/');
    let curr = this.root;
    for (const p of parts) {
      if (!curr.children) curr.children = {};
      if (!curr.children[p]) {
        curr.children[p] = { name: p, type: 'dir', children: {} };
      }
      curr = curr.children[p];
    }
    this.notify();
    return true;
  }

  // Create or update file
  createFile(filePath, content = '') {
    const clean = this.normalizePath(filePath);
    if (!clean) return false;
    const parts = clean.split('/');
    const fileName = parts.pop();
    const dirPath = parts.join('/');

    if (dirPath) {
      this.createDir(dirPath);
    }
    const dirNode = this.getNode(dirPath);
    if (!dirNode || dirNode.type !== 'dir') return false;

    dirNode.children[fileName] = {
      name: fileName,
      type: 'file',
      content: content,
      updatedAt: Date.now()
    };

    this.notify();
    return true;
  }

  // Read file content
  readFile(filePath) {
    const node = this.getNode(filePath);
    if (node && node.type === 'file') {
      return node.content;
    }
    return null;
  }

  // Delete file or folder
  delete(path) {
    const clean = this.normalizePath(path);
    if (!clean) return false;
    const parts = clean.split('/');
    const targetName = parts.pop();
    const parentPath = parts.join('/');
    const parentNode = this.getNode(parentPath);
    if (parentNode && parentNode.children && parentNode.children[targetName]) {
      delete parentNode.children[targetName];
      this.notify();
      return true;
    }
    return false;
  }

  // Rename
  rename(oldPath, newName) {
    const clean = this.normalizePath(oldPath);
    if (!clean || !newName) return false;
    const parts = clean.split('/');
    const oldName = parts.pop();
    const parentPath = parts.join('/');
    const parentNode = this.getNode(parentPath);
    if (parentNode && parentNode.children && parentNode.children[oldName]) {
      const target = parentNode.children[oldName];
      target.name = newName;
      delete parentNode.children[oldName];
      parentNode.children[newName] = target;
      this.notify();
      return true;
    }
    return false;
  }

  // List all files flat: { "path/to/file": "content" }
  getAllFiles(dirNode = this.root, currentPath = '') {
    const files = {};
    if (!dirNode || !dirNode.children) return files;
    for (const [name, node] of Object.entries(dirNode.children)) {
      const fullPath = currentPath ? `${currentPath}/${name}` : name;
      if (node.type === 'file') {
        files[fullPath] = node.content;
      } else if (node.type === 'dir') {
        Object.assign(files, this.getAllFiles(node, fullPath));
      }
    }
    return files;
  }

  // Build bundled HTML for iframe execution
  buildHtmlBundle(entryPath = 'index.html') {
    const cleanEntry = this.normalizePath(entryPath);
    let htmlContent = this.readFile(cleanEntry);
    if (!htmlContent) {
      return `<!DOCTYPE html><html><body style="background:#0a0e17;color:#ef4444;font-family:sans-serif;padding:2rem;">
        <h2>エラー: ${cleanEntry} が見つかりません</h2>
        <p>ファイルエクスプローラーにファイルを作成してください。</p>
      </body></html>`;
    }

    const dirParts = cleanEntry.split('/');
    dirParts.pop();
    const baseDir = dirParts.join('/');

    // Inline CSS <link rel="stylesheet" href="...">
    htmlContent = htmlContent.replace(/<link\s+[^>]*href=["']([^"']+)["'][^>]*>/gi, (match, href) => {
      if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
        return match;
      }
      const targetPath = this.normalizePath(baseDir ? `${baseDir}/${href}` : href);
      const cssContent = this.readFile(targetPath);
      if (cssContent !== null) {
        return `<style>/* Inlined: ${targetPath} */\n${cssContent}\n</style>`;
      }
      return match;
    });

    // Inline JS <script src="...">
    htmlContent = htmlContent.replace(/<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi, (match, src) => {
      if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) {
        return match;
      }
      const targetPath = this.normalizePath(baseDir ? `${baseDir}/${src}` : src);
      const jsContent = this.readFile(targetPath);
      if (jsContent !== null) {
        return `<script>/* Inlined: ${targetPath} */\n${jsContent}\n</script>`;
      }
      return match;
    });

    // Inject console interceptor script to catch iframe logs
    const consoleInterceptor = `
<script>
  (function() {
    const _log = console.log, _error = console.error, _warn = console.warn, _info = console.info;
    function send(type, args) {
      try {
        window.parent.postMessage({
          type: 'WIZ_IFRAME_LOG',
          level: type,
          message: Array.from(args).map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')
        }, '*');
      } catch(e) {}
    }
    console.log = function() { send('log', arguments); _log.apply(console, arguments); };
    console.error = function() { send('error', arguments); _error.apply(console, arguments); };
    console.warn = function() { send('warn', arguments); _warn.apply(console, arguments); };
    console.info = function() { send('info', arguments); _info.apply(console, arguments); };
    window.onerror = function(msg, url, line) {
      send('error', ['[Uncaught]', msg, 'at line', line]);
    };
  })();
</script>
`;
    if (htmlContent.includes('<head>')) {
      htmlContent = htmlContent.replace('<head>', '<head>' + consoleInterceptor);
    } else {
      htmlContent = consoleInterceptor + htmlContent;
    }

    return htmlContent;
  }

  // Export whole project as ZIP
  async exportZip(projectName = 'Wiz-Game-Project') {
    if (typeof JSZip === 'undefined') {
      window.showToast('JSZipライブラリが読み込まれていません。', 'error');
      return;
    }
    const zip = new JSZip();
    const allFiles = this.getAllFiles();
    for (const [path, content] of Object.entries(allFiles)) {
      zip.file(path, content);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.showToast('プロジェクトをZIP形式で保存しました！', 'success');
  }

  // Download a single file directly
  downloadSingleFile(filePath) {
    const clean = this.normalizePath(filePath);
    const content = this.readFile(clean);
    if (content === null) {
      window.showToast(`エラー: ${clean} が見つかりません`, 'error');
      return;
    }

    const fileName = clean.split('/').pop() || 'file.txt';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.showToast(`${fileName} をダウンロードしました！`, 'success');
  }
}

// Global instance
window.vfs = new VirtualFileSystem();
