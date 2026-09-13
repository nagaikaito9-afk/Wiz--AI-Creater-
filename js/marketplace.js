/**
 * Wiz AI Game Creator - Wiz Marketplace
 * Community game sharing platform: Play, Favorite, View Author, Fork/Clone Source, and Publish Games.
 */

class WizMarketplace {
  constructor() {
    this.favoritesKey = 'wiz_market_favorites_v1';
    this.userPublishedKey = 'wiz_market_user_published_v1';

    this.favorites = this.loadFavorites();
    this.userPublished = this.loadUserPublished();

    this.activeFilter = 'all';
    this.searchQuery = '';

    this.modalEl = null;
    this.gamesGridEl = null;

    this.seedGames = [
      {
        id: 'market_cyber_break',
        title: 'サイバー・ネオンブロック崩し',
        author: {
          userId: 'pixel_hero',
          username: 'ピクセル勇者',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=pixel_hero',
          bio: 'レトロ＆ネオンゲーム制作が大好き！一緒にゲーム作ろう！',
          genres: ['アクション', 'アーケード']
        },
        category: 'action',
        description: '美麗ネオンエフェクトと滑らかなパドル操作が気持ちいい近未来風ブロック崩し！',
        stars: 128,
        plays: 1420,
        createdAt: '2026-09-10',
        files: {
          'index.html': `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>Cyber Break</title>
  <style>
    body { margin: 0; background: #050510; color: #fff; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; }
    canvas { background: radial-gradient(circle, #101030 0%, #050510 100%); border: 2px solid #00f0ff; box-shadow: 0 0 25px rgba(0,240,255,0.4); border-radius: 8px; }
    .hud { margin-bottom: 8px; font-size: 1.1rem; letter-spacing: 2px; color: #00f0ff; }
  </style>
</head>
<body>
  <div class="hud">SCORE: <span id="score">0</span> | LIVES: <span id="lives">3</span></div>
  <canvas id="gameCanvas" width="560" height="380"></canvas>
  <script src="game.js"></script>
</body>
</html>`,
          'game.js': `const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let score = 0, lives = 3;
let paddle = { x: 230, y: 350, w: 100, h: 12, speed: 7 };
let ball = { x: 280, y: 300, dx: 4, dy: -4, r: 6 };
let bricks = [];
const rows = 4, cols = 8;
for(let r=0; r<rows; r++) {
  bricks[r] = [];
  for(let c=0; c<cols; c++) bricks[r][c] = { x: c*68 + 10, y: r*24 + 30, alive: 1, color: ['#ff007f', '#00f0ff', '#ffb703', '#7000ff'][r] };
}

let rightPressed = false, leftPressed = false;
document.addEventListener('keydown', e => { if(e.key === 'ArrowRight') rightPressed = true; if(e.key === 'ArrowLeft') leftPressed = true; });
document.addEventListener('keyup', e => { if(e.key === 'ArrowRight') rightPressed = false; if(e.key === 'ArrowLeft') leftPressed = false; });
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  paddle.x = e.clientX - rect.left - paddle.w/2;
});

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Bricks
  bricks.forEach(row => row.forEach(b => {
    if(b.alive) {
      ctx.fillStyle = b.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = b.color;
      ctx.fillRect(b.x, b.y, 60, 18);
    }
  }));
  // Paddle
  ctx.fillStyle = '#00f0ff';
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#00f0ff';
  ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
  // Ball
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Move ball
  ball.x += ball.dx;
  ball.y += ball.dy;
  if(ball.x < ball.r || ball.x > canvas.width - ball.r) ball.dx *= -1;
  if(ball.y < ball.r) ball.dy *= -1;
  else if(ball.y > paddle.y - ball.r && ball.x > paddle.x && ball.x < paddle.x + paddle.w) {
    ball.dy = -Math.abs(ball.dy);
    ball.dx = ((ball.x - (paddle.x + paddle.w/2)) / (paddle.w/2)) * 5;
  } else if(ball.y > canvas.height) {
    lives--;
    document.getElementById('lives').textContent = lives;
    if(lives <= 0) { alert('Game Over!'); document.location.reload(); }
    else { ball.x = 280; ball.y = 300; ball.dy = -4; }
  }

  // Brick collision
  bricks.forEach(row => row.forEach(b => {
    if(b.alive && ball.x > b.x && ball.x < b.x + 60 && ball.y > b.y && ball.y < b.y + 18) {
      ball.dy *= -1;
      b.alive = 0;
      score += 100;
      document.getElementById('score').textContent = score;
    }
  }));

  if(rightPressed && paddle.x < canvas.width - paddle.w) paddle.x += paddle.speed;
  if(leftPressed && paddle.x > 0) paddle.x -= paddle.speed;
  requestAnimationFrame(draw);
}
draw();`
        }
      },
      {
        id: 'market_retro_dungeon',
        title: 'レトロ・ダンジョン探索RPG',
        author: {
          userId: 'retro_gamer',
          username: 'レトロゲーマー',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=retro_gamer',
          bio: '80年代・90年代ゲームを愛するドット絵クリエイターです。',
          genres: ['RPG', 'レトロ']
        },
        category: 'rpg',
        description: '地下迷宮を探索し、スライムやスケルトンを倒して秘宝を目指すターン制コマンドRPG！',
        stars: 94,
        plays: 980,
        createdAt: '2026-09-08',
        files: {
          'index.html': `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>Dungeon RPG</title>
  <style>
    body { background: #111; color: #00ff66; font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    #box { border: 2px solid #00ff66; padding: 20px; width: 480px; background: #000; border-radius: 6px; box-shadow: 0 0 15px rgba(0,255,102,0.3); }
    button { background: #003311; color: #00ff66; border: 1px solid #00ff66; padding: 6px 14px; margin: 4px; cursor: pointer; font-family: monospace; }
    button:hover { background: #00ff66; color: #000; }
    #log { height: 120px; overflow-y: auto; background: #080808; border: 1px solid #222; padding: 8px; margin: 10px 0; }
  </style>
</head>
<body>
  <div id="box">
    <h2>🏰 DUNGEON QUEST - B1F</h2>
    <div>PLAYER HP: <span id="hp">100</span>/100 | GOLD: <span id="gold">0</span></div>
    <div id="log">> 洞窟の入口に立った...</div>
    <div>
      <button onclick="explore()">⚔️ 進む (探索)</button>
      <button onclick="rest()">💤 休憩 (HP全快)</button>
    </div>
  </div>
  <script>
    let hp = 100, gold = 0;
    function log(msg) { const l = document.getElementById('log'); l.innerHTML += '<div>' + msg + '</div>'; l.scrollTop = l.scrollHeight; }
    function explore() {
      const r = Math.random();
      if(r < 0.4) {
        const dmg = Math.floor(Math.random() * 15) + 5;
        hp = Math.max(0, hp - dmg);
        log('👾 スライムが現れた！' + dmg + 'のダメージを受けた！');
      } else {
        const found = Math.floor(Math.random() * 30) + 10;
        gold += found;
        log('✨ 宝箱を発見！' + found + ' Gを手に入れた！');
      }
      document.getElementById('hp').textContent = hp;
      document.getElementById('gold').textContent = gold;
      if(hp <= 0) { log('💀 力尽きてしまった...'); }
    }
    function rest() { hp = 100; document.getElementById('hp').textContent = hp; log('⛺ キャンプでHPを回復した！'); }
  </script>
</body>
</html>`
        }
      },
      {
        id: 'market_space_invaders',
        title: '8-bit スペースウォーカー',
        author: {
          userId: 'sound_mage',
          username: 'サウンド魔導士',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=sound_mage',
          bio: 'チップチューンBGMと効果音を追求するサウンドエンジニア。',
          genres: ['シューティング', '音楽']
        },
        category: 'shooting',
        description: '迫り来るエイリアン艦隊をレーザーで撃退！連続コンボでハイスコアを叩き出せ！',
        stars: 86,
        plays: 810,
        createdAt: '2026-09-05',
        files: {
          'index.html': `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Space Shooter</title>
  <style>
    body { margin:0; background:#000; overflow:hidden; display:flex; justify-content:center; align-items:center; height:100vh; }
    canvas { border: 2px solid #7000ff; box-shadow: 0 0 20px #7000ff; }
  </style>
</head>
<body>
  <canvas id="c" width="480" height="400"></canvas>
  <script>
    const c = document.getElementById('c'), ctx = c.getContext('2d');
    let ship = { x: 220, y: 350 }, bullets = [], enemies = [], score = 0;
    for(let i=0; i<15; i++) enemies.push({ x: (i%5)*80 + 40, y: Math.floor(i/5)*40 + 40, alive: 1 });
    window.addEventListener('keydown', e => {
      if(e.key === 'ArrowLeft' && ship.x > 10) ship.x -= 15;
      if(e.key === 'ArrowRight' && ship.x < 430) ship.x += 15;
      if(e.key === ' ' || e.key === 'ArrowUp') bullets.push({ x: ship.x + 18, y: ship.y });
    });
    function loop() {
      ctx.fillStyle = '#050515'; ctx.fillRect(0,0,480,400);
      ctx.fillStyle = '#00ffcc'; ctx.fillRect(ship.x, ship.y, 36, 12);
      ctx.fillStyle = '#ff007f';
      bullets.forEach((b, i) => {
        b.y -= 7; ctx.fillRect(b.x, b.y, 4, 10);
        enemies.forEach(en => {
          if(en.alive && b.x > en.x && b.x < en.x+30 && b.y > en.y && b.y < en.y+20) {
            en.alive = 0; bullets.splice(i, 1); score += 50;
          }
        });
      });
      ctx.fillStyle = '#ffb703';
      enemies.forEach(en => { if(en.alive) ctx.fillRect(en.x, en.y, 30, 20); });
      ctx.fillStyle = '#fff'; ctx.font = '14px monospace'; ctx.fillText('SCORE: ' + score, 10, 20);
      requestAnimationFrame(loop);
    }
    loop();
  </script>
</body>
</html>`
        }
      },
      {
        id: 'market_speed_snake',
        title: 'スピード・ネオンスネーク2026',
        author: {
          userId: 'wiz_creator',
          username: 'Wiz Creator',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=wiz_creator',
          bio: 'Wiz Studio公式サンプルゲームクリエイター。',
          genres: ['パズル', 'カジュアル']
        },
        category: 'puzzle',
        description: '光るエナジーボールを食べて超加速！自分や壁にぶつからないよう生き残れ！',
        stars: 62,
        plays: 640,
        createdAt: '2026-09-02',
        files: {
          'index.html': `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Neon Snake</title>
  <style>
    body { background:#0a0a0f; color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0; font-family:sans-serif; }
    canvas { background:#000; border:2px solid #00f0ff; box-shadow:0 0 15px rgba(0,240,255,0.4); }
  </style>
</head>
<body>
  <h2>🐍 NEON SNAKE | SCORE: <span id="s">0</span></h2>
  <canvas id="c" width="400" height="400"></canvas>
  <script>
    const c = document.getElementById('c'), ctx = c.getContext('2d');
    let snake = [{x:10, y:10}], food = {x:15, y:15}, dx = 1, dy = 0, score = 0;
    window.addEventListener('keydown', e => {
      if(e.key==='ArrowUp' && dy===0){dx=0; dy=-1;}
      if(e.key==='ArrowDown' && dy===0){dx=0; dy=1;}
      if(e.key==='ArrowLeft' && dx===0){dx=-1; dy=0;}
      if(e.key==='ArrowRight' && dx===0){dx=1; dy=0;}
    });
    function step() {
      const head = {x: snake[0].x + dx, y: snake[0].y + dy};
      if(head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20) { alert('Game Over!'); return; }
      snake.unshift(head);
      if(head.x === food.x && head.y === food.y) {
        score += 10; document.getElementById('s').textContent = score;
        food = {x: Math.floor(Math.random()*20), y: Math.floor(Math.random()*20)};
      } else snake.pop();
      ctx.clearRect(0,0,400,400);
      ctx.fillStyle = '#ff007f'; ctx.fillRect(food.x*20, food.y*20, 18, 18);
      ctx.fillStyle = '#00f0ff'; snake.forEach(p => ctx.fillRect(p.x*20, p.y*20, 18, 18));
      setTimeout(step, 90);
    }
    step();
  </script>
</body>
</html>`
        }
      }
    ];

    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.bindDom());
    } else {
      this.bindDom();
    }
  }

  loadFavorites() {
    try {
      const d = localStorage.getItem(this.favoritesKey);
      return d ? JSON.parse(d) : [];
    } catch (e) {
      return [];
    }
  }

  saveFavorites() {
    try {
      localStorage.setItem(this.favoritesKey, JSON.stringify(this.favorites));
    } catch (e) {}
  }

  loadUserPublished() {
    try {
      const d = localStorage.getItem(this.userPublishedKey);
      return d ? JSON.parse(d) : [];
    } catch (e) {
      return [];
    }
  }

  saveUserPublished() {
    try {
      localStorage.setItem(this.userPublishedKey, JSON.stringify(this.userPublished));
    } catch (e) {}
  }

  getAllGames() {
    return [...this.userPublished, ...this.seedGames];
  }

  bindDom() {
    this.modalEl = document.getElementById('marketplace-modal');
    this.gamesGridEl = document.getElementById('marketplace-games-grid');

    const openBtn = document.getElementById('open-marketplace-btn');
    if (openBtn) {
      openBtn.addEventListener('click', () => this.openModal());
    }

    const closeBtn = document.getElementById('close-marketplace-modal-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
    }

    const publishBtn = document.getElementById('open-publish-game-btn');
    if (publishBtn) {
      publishBtn.addEventListener('click', () => this.openPublishModal());
    }

    const searchInput = document.getElementById('market-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.render();
      });
    }

    // Category filter tabs
    const filterBtns = document.querySelectorAll('.market-category-tab');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeFilter = btn.getAttribute('data-cat') || 'all';
        this.render();
      });
    });

    // Publish form submission
    const submitPublishBtn = document.getElementById('submit-publish-game-btn');
    if (submitPublishBtn) {
      submitPublishBtn.addEventListener('click', () => this.submitPublishGame());
    }
    const cancelPublishBtn = document.getElementById('cancel-publish-game-btn');
    if (cancelPublishBtn) {
      cancelPublishBtn.addEventListener('click', () => this.closePublishModal());
    }
  }

  openModal() {
    if (!this.modalEl) this.modalEl = document.getElementById('marketplace-modal');
    if (this.modalEl) {
      this.modalEl.style.display = 'flex';
      this.render();
    }
  }

  closeModal() {
    if (!this.modalEl) this.modalEl = document.getElementById('marketplace-modal');
    if (this.modalEl) {
      this.modalEl.style.display = 'none';
    }
  }

  openPublishModal() {
    const modal = document.getElementById('publish-game-modal');
    if (modal) {
      const activeRoom = window.projectManager?.getActiveRoom();
      const titleInput = document.getElementById('publish-title-input');
      const descInput = document.getElementById('publish-desc-input');
      if (titleInput && activeRoom) titleInput.value = activeRoom.name;
      if (descInput) descInput.value = 'Wiz Studioで作ったオリジナルゲームです！ぜひ遊んでみてください。';
      modal.style.display = 'flex';
    }
  }

  closePublishModal() {
    const modal = document.getElementById('publish-game-modal');
    if (modal) modal.style.display = 'none';
  }

  submitPublishGame() {
    const title = document.getElementById('publish-title-input')?.value.trim();
    const desc = document.getElementById('publish-desc-input')?.value.trim();
    const cat = document.getElementById('publish-category-select')?.value || 'action';

    if (!title) {
      if (window.showToast) window.showToast('タイトルを入力してください', 'error');
      return;
    }

    const activeRoom = window.projectManager?.getActiveRoom();
    const currentUser = window.supabaseAuth?.currentUser || {
      userId: 'my_creator',
      username: 'クリエイター'
    };

    const newGame = {
      id: 'usr_game_' + Date.now(),
      title: title,
      author: {
        userId: currentUser.userId,
        username: currentUser.username || currentUser.user_metadata?.full_name,
        avatar: currentUser.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + currentUser.userId,
        bio: currentUser.bio || 'ゲーム開発に熱中しています！',
        genres: [cat]
      },
      category: cat,
      description: desc || 'Wizで作成した新作ゲーム！',
      stars: 1,
      plays: 1,
      createdAt: new Date().toISOString().split('T')[0],
      files: activeRoom ? JSON.parse(JSON.stringify(activeRoom.files)) : {
        'index.html': '<h1>My Game</h1>'
      }
    };

    this.userPublished.unshift(newGame);
    this.saveUserPublished();
    this.closePublishModal();
    this.render();

    if (window.showToast) {
      window.showToast(`🎉 「${title}」をWiz Marketplaceに公開しました！`, 'success');
    }
    if (window.activityLogger) {
      window.activityLogger.log(`Wiz Marketplaceにゲーム*${title}*を公開しました`, 'system');
    }
  }

  toggleFavorite(gameId) {
    const idx = this.favorites.indexOf(gameId);
    let isFaved = false;
    if (idx > -1) {
      this.favorites.splice(idx, 1);
      isFaved = false;
    } else {
      this.favorites.push(gameId);
      isFaved = true;
    }
    this.saveFavorites();
    this.render();

    if (window.showToast) {
      window.showToast(isFaved ? '⭐ お気に入りに追加しました！' : 'お気に入りから削除しました', 'info');
    }
  }

  playGame(gameId) {
    const game = this.getAllGames().find(g => g.id === gameId);
    if (!game) return;

    this.closeModal();

    // Load files into preview runner
    if (window.runner) {
      window.runner.runCode(game.files);
      if (window.app) window.app.switchRightView('preview');
      if (window.showToast) {
        window.showToast(`🎮 「${game.title}」のプレイを開始しました！`, 'success');
      }
    }
  }

  forkGame(gameId) {
    const game = this.getAllGames().find(g => g.id === gameId);
    if (!game) return;

    if (window.projectManager) {
      const newRoomName = `${game.title} (コピー)`;
      const newRoom = window.projectManager.createNewRoom(newRoomName);
      if (newRoom && game.files) {
        newRoom.files = JSON.parse(JSON.stringify(game.files));
        window.projectManager.saveRooms();
        window.projectManager.switchRoom(newRoom.id);
      }
      this.closeModal();
      if (window.showToast) {
        window.showToast(`📦 「${game.title}」のソースを自分のプロジェクトに複製しました！`, 'success');
      }
      if (window.activityLogger) {
        window.activityLogger.log(`Marketplaceから*${game.title}*のソースコードを複製しました`, 'room');
      }
    }
  }

  viewAuthor(authorUserId) {
    const game = this.getAllGames().find(g => g.author.userId === authorUserId);
    const author = game ? game.author : {
      userId: authorUserId,
      username: authorUserId,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=' + authorUserId,
      bio: 'ゲームクリエイター',
      genres: ['アクション']
    };

    if (window.openPublicProfile) {
      window.openPublicProfile(author);
    }
  }

  render() {
    if (!this.gamesGridEl) {
      this.gamesGridEl = document.getElementById('marketplace-games-grid');
      if (!this.gamesGridEl) return;
    }

    let games = this.getAllGames();

    // Category filter
    if (this.activeFilter !== 'all') {
      games = games.filter(g => g.category === this.activeFilter);
    }

    // Search query filter
    if (this.searchQuery) {
      games = games.filter(g => 
        g.title.toLowerCase().includes(this.searchQuery) ||
        g.description.toLowerCase().includes(this.searchQuery) ||
        g.author.username.toLowerCase().includes(this.searchQuery) ||
        g.author.userId.toLowerCase().includes(this.searchQuery)
      );
    }

    if (games.length === 0) {
      this.gamesGridEl.innerHTML = `
        <div class="market-empty-state">
          <i class="fa-solid fa-gamepad"></i>
          <p>該当するゲームが見つかりませんでした。<br>検索条件を変えるか、あなたが最初のゲームを公開してみましょう！</p>
        </div>
      `;
      return;
    }

    this.gamesGridEl.innerHTML = games.map(g => {
      const isFav = this.favorites.includes(g.id);
      const starCount = g.stars + (isFav ? 1 : 0);
      return `
        <div class="market-game-card">
          <div class="market-card-top">
            <span class="market-category-badge cat-${g.category}">${this.getCategoryLabel(g.category)}</span>
            <button class="market-star-btn ${isFav ? 'active' : ''}" onclick="window.wizMarketplace.toggleFavorite('${g.id}')" title="お気に入り">
              <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-star"></i>
              <span>${starCount}</span>
            </button>
          </div>
          <h4 class="market-game-title">${this.escapeHtml(g.title)}</h4>
          <p class="market-game-desc">${this.escapeHtml(g.description)}</p>
          
          <div class="market-author-bar" onclick="window.wizMarketplace.viewAuthor('${g.author.userId}')" title="作者のプロフィールを見る">
            <img src="${g.author.avatar}" class="market-author-avatar" alt="${this.escapeHtml(g.author.username)}">
            <div class="market-author-meta">
              <span class="author-name">${this.escapeHtml(g.author.username)}</span>
              <span class="author-id">@${this.escapeHtml(g.author.userId)}</span>
            </div>
            <i class="fa-solid fa-chevron-right author-arrow"></i>
          </div>

          <div class="market-card-actions">
            <button class="btn-market-play" onclick="window.wizMarketplace.playGame('${g.id}')">
              <i class="fa-solid fa-play"></i> プレイ
            </button>
            <button class="btn-market-fork" onclick="window.wizMarketplace.forkGame('${g.id}')" title="ソースコードを自分のプロジェクトにコピー">
              <i class="fa-solid fa-code-fork"></i> ソースを見る/コピー
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  getCategoryLabel(cat) {
    const map = {
      action: 'アクション',
      rpg: 'RPG',
      shooting: 'シューティング',
      puzzle: 'パズル',
      retro: 'レトロ'
    };
    return map[cat] || cat;
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// Global instance
window.wizMarketplace = new WizMarketplace();
