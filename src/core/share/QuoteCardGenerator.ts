/**
 * QuoteCardGenerator — generates downloadable quote cards via HTML5 Canvas.
 */

export interface QuoteCardOptions {
  quote: string;
  storyTitle: string;
  author?: string;
  theme?: 'light' | 'night';
}

export class QuoteCardGenerator {
  static async generateBlob(opts: QuoteCardOptions): Promise<Blob | null> {
    const canvas = document.createElement('canvas');
    const width = 800;
    const height = 1000;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const isNight = opts.theme === 'night';
    const bg = isNight ? '#1d1c19' : '#f8f4ea';
    const textInk = isNight ? '#e8e1d5' : '#24211c';
    const mutedInk = isNight ? '#918a7d' : '#777066';
    const accent = isNight ? '#c8a878' : '#8b6b3d';

    // Background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Decorative inner frame
    ctx.strokeStyle = isNight ? '#2e2c27' : '#d6cec0';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, width - 80, height - 80);

    // Header eyebrow
    ctx.fillStyle = accent;
    ctx.font = '500 16px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('THE STORY GARDEN · 金句卡片', width / 2, 90);

    // Ornament line
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 40, 110);
    ctx.lineTo(width / 2 + 40, 110);
    ctx.stroke();

    // Quote content with auto wrap
    ctx.fillStyle = textInk;
    ctx.font = '400 24px "LXGW WenKai Screen", "Noto Serif SC", serif';
    ctx.textAlign = 'left';

    const maxLineWidth = width - 180;
    const words = opts.quote.trim().split('');
    let line = '';
    const lines: string[] = [];

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxLineWidth && i > 0) {
        lines.push(line);
        line = words[i];
      } else {
        line = testLine;
      }
    }
    lines.push(line);

    const lineHeight = 42;
    const startY = Math.max(180, (height - lines.length * lineHeight) / 2 - 40);

    lines.forEach((l, index) => {
      ctx.fillText(l, 90, startY + index * lineHeight);
    });

    // Story Source
    ctx.textAlign = 'right';
    ctx.fillStyle = accent;
    ctx.font = '600 20px "LXGW WenKai Screen", "Noto Serif SC", serif';
    ctx.fillText(`—— 《${opts.storyTitle}》`, width - 90, startY + lines.length * lineHeight + 60);

    if (opts.author) {
      ctx.fillStyle = mutedInk;
      ctx.font = 'italic 16px serif';
      ctx.fillText(opts.author, width - 90, startY + lines.length * lineHeight + 92);
    }

    // Footer
    ctx.textAlign = 'center';
    ctx.fillStyle = mutedInk;
    ctx.font = '14px "Inter", sans-serif';
    ctx.fillText('一座可以阅读的故事森林', width / 2, height - 70);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }

  static async downloadCard(opts: QuoteCardOptions, filename = 'story-quote.png'): Promise<void> {
    const blob = await this.generateBlob(opts);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
