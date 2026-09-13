/**
 * Wiz AI Game Creator - Image & Pixel Art Generator Engine
 * Handles:
 * 1. Pixel Art (Dot Picture) procedural and AI generation for game sprites
 * 2. High-quality AI image generation (Imagen 3 & fallback AI image engine)
 */

class ImageGeneratorEngine {
  constructor() {
    this.pixelArtTemplates = {
      hero: [
        "..000000..",
        ".01111110.",
        "0122112210",
        "0123112310",
        "0111111110",
        ".01444410.",
        "..055550..",
        ".05566550.",
        ".05666650.",
        ".00555500.",
        "..07..70..",
        "..07..70.."
      ],
      monster: [
        "..000000..",
        ".01111110.",
        "0121111210",
        "0131111310",
        "0111111110",
        "0141111410",
        ".01444410.",
        "0111111110",
        "01.1111.10",
        "00.0000.00"
      ],
      sword: [
        "......01",
        ".....010",
        "....010.",
        "...010..",
        "..010...",
        ".020....",
        "030.....",
        "00......"
      ],
      potion: [
        "...000...",
        "...010...",
        "..02220..",
        ".0233320.",
        ".0233320.",
        ".0222220.",
        "..00000.."
      ]
    };

    this.palette = {
      '0': '#000000',
      '1': '#00f2fe',
      '2': '#ff007f',
      '3': '#ffffff',
      '4': '#f59e0b',
      '5': '#4f46e5',
      '6': '#9d4edd',
      '7': '#334155'
    };
  }

  // Generate Pixel Art (Dot Picture) on Canvas and return DataURL
  generatePixelArt(subject = 'hero', pixelSize = 16) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Find closest template or procedurally generate
    let template = this.pixelArtTemplates.hero;
    const lower = subject.toLowerCase();
    if (lower.includes('スライム') || lower.includes('魔物') || lower.includes('敵') || lower.includes('monster')) {
      template = this.pixelArtTemplates.monster;
    } else if (lower.includes('剣') || lower.includes('sword') || lower.includes('武器')) {
      template = this.pixelArtTemplates.sword;
    } else if (lower.includes('ポーション') || lower.includes('回復') || lower.includes('potion')) {
      template = this.pixelArtTemplates.potion;
    }

    const rows = template.length;
    const cols = template[0].length;
    canvas.width = cols * pixelSize;
    canvas.height = rows * pixelSize;

    // Clear transparent
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Pick dynamic colors based on subject
    const colors = { ...this.palette };
    if (lower.includes('炎') || lower.includes('赤') || lower.includes('ドラゴン')) {
      colors['1'] = '#ef4444';
      colors['2'] = '#f97316';
    } else if (lower.includes('森') || lower.includes('草') || lower.includes('毒')) {
      colors['1'] = '#10b981';
      colors['2'] = '#84cc16';
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const char = template[r][c];
        if (char !== '.') {
          ctx.fillStyle = colors[char] || '#00f2fe';
          ctx.fillRect(c * pixelSize, r * pixelSize, pixelSize, pixelSize);
        }
      }
    }

    return canvas.toDataURL('image/png');
  }

  // Generate High-Quality AI Image using Imagen / Pollinations AI
  async generateAiImage(prompt) {
    // 1. Try Google Imagen API first if API key is present
    const apiKey = window.wizAI?.fallbackApiKey;
    if (apiKey) {
      try {
        const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(imagenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt: prompt }],
            parameters: { sampleCount: 1, aspectRatio: '1:1' }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const b64 = data.predictions?.[0]?.bytesBase64Encoded;
          if (b64) {
            return `data:image/png;base64,${b64}`;
          }
        }
      } catch (e) {
        console.info('Google Imagen API fallback to high-speed AI generator:', e.message);
      }
    }

    // 2. High-speed AI Image Engine Fallback (Pollinations AI: instant, high-quality, free)
    return new Promise((resolve, reject) => {
      const enhancedPrompt = `${prompt}, game concept art, highly detailed, vibrant colors, digital painting, 4k`;
      const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=768&height=768&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;

      // Preload image to ensure it loads
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 768;
          canvas.height = img.naturalHeight || 768;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (e) {
          resolve(imgUrl); // Fallback to direct URL if canvas CORS issues
        }
      };
      img.onerror = () => {
        resolve(imgUrl);
      };
      img.src = imgUrl;
    });
  }
}

window.imageGen = new ImageGeneratorEngine();
