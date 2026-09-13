/**
 * Wiz AI Game Creator - 8-Bit Retro Sound Effects Generator (Web Audio API)
 * Generates classic chiptune sound effects without external audio assets.
 */

class SoundFxGenerator {
  constructor() {
    this.audioCtx = null;
    this.isMuted = false;
    this.init();
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  init() {
    // Bind modal controls
    document.getElementById('open-soundfx-btn')?.addEventListener('click', () => this.openModal());
    document.getElementById('close-soundfx-modal-btn')?.addEventListener('click', () => this.closeModal());
    document.getElementById('insert-soundfx-code-btn')?.addEventListener('click', () => this.insertCodeToActiveFile());
    document.getElementById('copy-soundfx-code-btn')?.addEventListener('click', () => this.copyCodeToClipboard());

    // Bind preview sound buttons
    document.querySelectorAll('.btn-play-sfx').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const soundType = e.currentTarget.getAttribute('data-sound');
        this.play(soundType);
      });
    });

    // Close on backdrop click
    const modal = document.getElementById('sound-fx-modal');
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) this.closeModal();
    });
  }

  openModal() {
    const modal = document.getElementById('sound-fx-modal');
    if (modal) modal.style.display = 'flex';
  }

  closeModal() {
    const modal = document.getElementById('sound-fx-modal');
    if (modal) modal.style.display = 'none';
  }

  play(type) {
    const ctx = this.getAudioContext();
    if (!ctx || this.isMuted) return;

    const t = ctx.currentTime;

    switch (type) {
      case 'jump': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.14);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.15);
        break;
      }
      case 'coin': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, t); // B5
        osc.frequency.setValueAtTime(1318.51, t + 0.08); // E6
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.setValueAtTime(0.25, t + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.36);
        break;
      }
      case 'laser': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.exponentialRampToValueAtTime(110, t + 0.18);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.19);
        break;
      }
      case 'explosion': {
        const bufferSize = ctx.sampleRate * 0.4;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, t);
        filter.frequency.linearRampToValueAtTime(100, t + 0.38);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.38);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(t);
        noise.stop(t + 0.4);
        break;
      }
      case 'hit': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.13);
        break;
      }
      case 'powerup': {
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C E G C E G
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + idx * 0.05);
          gain.gain.setValueAtTime(0.18, t + idx * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.05 + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t + idx * 0.05);
          osc.stop(t + idx * 0.05 + 0.09);
        });
        break;
      }
      case 'gameover': {
        const notes = [440, 415.3, 392, 349.2];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, t + idx * 0.12);
          gain.gain.setValueAtTime(0.2, t + idx * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.12 + 0.14);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t + idx * 0.12);
          osc.stop(t + idx * 0.12 + 0.15);
        });
        break;
      }
      case 'win': {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t + idx * 0.09);
          gain.gain.setValueAtTime(0.25, t + idx * 0.09);
          gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.09 + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t + idx * 0.09);
          osc.stop(t + idx * 0.09 + 0.22);
        });
        break;
      }
    }
  }

  getSoundCodeSnippet() {
    return `// ==========================================
// 8-Bit Web Audio Sound Effects (Wiz SoundFX)
// 外部ファイル不要で使えるレトロ効果音関数
// ==========================================
const SoundFX = (() => {
  let ctx = null;
  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  return {
    play(type) {
      const c = getCtx();
      if (!c) return;
      const t = c.currentTime;
      if (type === 'jump') {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(150, t);
        o.frequency.exponentialRampToValueAtTime(600, t + 0.14);
        g.gain.setValueAtTime(0.2, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.14);
        o.connect(g); g.connect(c.destination);
        o.start(t); o.stop(t + 0.15);
      } else if (type === 'coin') {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(988, t);
        o.frequency.setValueAtTime(1319, t + 0.08);
        g.gain.setValueAtTime(0.25, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        o.connect(g); g.connect(c.destination);
        o.start(t); o.stop(t + 0.36);
      } else if (type === 'laser') {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(880, t);
        o.frequency.exponentialRampToValueAtTime(110, t + 0.18);
        g.gain.setValueAtTime(0.25, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
        o.connect(g); g.connect(c.destination);
        o.start(t); o.stop(t + 0.19);
      } else if (type === 'hit') {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(180, t);
        o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
        g.gain.setValueAtTime(0.35, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        o.connect(g); g.connect(c.destination);
        o.start(t); o.stop(t + 0.13);
      } else if (type === 'powerup') {
        [262, 330, 392, 523, 659, 784].forEach((f, i) => {
          const o = c.createOscillator(), g = c.createGain();
          o.type = 'sine'; o.frequency.setValueAtTime(f, t + i * 0.05);
          g.gain.setValueAtTime(0.18, t + i * 0.05);
          g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.05 + 0.08);
          o.connect(g); g.connect(c.destination);
          o.start(t + i * 0.05); o.stop(t + i * 0.05 + 0.09);
        });
      }
    }
  };
})();
// 使用例: SoundFX.play('jump'); SoundFX.play('coin'); SoundFX.play('laser'); SoundFX.play('hit');
`;
  }

  insertCodeToActiveFile() {
    if (!window.vfs) return;
    const targetFile = (window.editor?.activeFile?.endsWith('.js')) ? window.editor.activeFile : 'js/game.js';
    let content = window.vfs.readFile(targetFile);
    if (content === null) {
      targetFile = 'index.html';
      content = window.vfs.readFile(targetFile) || '';
    }

    const snippet = this.getSoundCodeSnippet();
    if (content.includes('const SoundFX =')) {
      if (window.showToast) window.showToast('すでに SoundFX コードが含まれています', 'info');
      return;
    }

    if (targetFile.endsWith('.html')) {
      content = content.replace('</body>', `<script>\n${snippet}\n</script>\n</body>`);
    } else {
      content = `${snippet}\n\n${content}`;
    }

    window.vfs.createFile(targetFile, content);
    if (window.showToast) {
      window.showToast(`効果音コードを ${targetFile} に追加しました！`, 'success');
    }
    this.closeModal();
  }

  copyCodeToClipboard() {
    const code = this.getSoundCodeSnippet();
    navigator.clipboard.writeText(code).then(() => {
      if (window.showToast) window.showToast('効果音コードをクリップボードにコピーしました！', 'success');
    }).catch(() => {
      if (window.showToast) window.showToast('コピーに失敗しました', 'error');
    });
  }
}

window.soundFx = new SoundFxGenerator();
