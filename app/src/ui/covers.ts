// Cover art, drawn on canvas (no image downloads). Ported from the prototype.
export const COVERS = ['mountain', 'city', 'dinner', 'mahjong', 'ocean', 'snow', 'forest', 'gradient'] as const;
export type Cover = typeof COVERS[number];
export const isCover = (c: unknown): c is Cover => typeof c === 'string' && (COVERS as readonly string[]).includes(c);

function rng(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
type G = CanvasRenderingContext2D; type R = () => number;

function ridge(g: G, w: number, h: number, r: R, base: number, amp: number, col: string) {
  const ph = [r() * 6, r() * 6, r() * 6], f = [1.2 + r(), 2.6 + r() * 2, 6 + r() * 4];
  g.beginPath(); g.moveTo(0, h);
  for (let x = 0; x <= w; x += 4) { const u = x / w; g.lineTo(x, h * base - h * amp * (0.55 * Math.sin(u * f[0] * Math.PI + ph[0]) + 0.3 * Math.sin(u * f[1] * Math.PI + ph[1]) + 0.15 * Math.abs(Math.sin(u * f[2] * Math.PI + ph[2])))); }
  g.lineTo(w, h); g.closePath(); g.fillStyle = col; g.fill();
}
function smoothHill(g: G, w: number, h: number, r: R, base: number, amp: number, col: string) {
  const ph = r() * 6, f = 0.8 + r() * 0.8;
  g.beginPath(); g.moveTo(0, h);
  for (let x = 0; x <= w; x += 4) g.lineTo(x, h * base - h * amp * Math.sin((x / w) * f * Math.PI + ph));
  g.lineTo(w, h); g.closePath(); g.fillStyle = col; g.fill();
}
const lin = (g: G, h: number, stops: [number, string][]) => { const s = g.createLinearGradient(0, 0, 0, h); stops.forEach(([o, c]) => s.addColorStop(o, c)); return s; };
const glow = (g: G, x: number, y: number, rad: number, col: string) => { const b = g.createRadialGradient(x, y, 0, x, y, rad); b.addColorStop(0, col); b.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = b; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); };

const SCENES: Record<Cover, (g: G, w: number, h: number, r: R) => void> = {
  mountain(g, w, h, r) {
    g.fillStyle = lin(g, h, [[0, '#6F97C9'], [0.55, '#C7D3E3'], [1, '#F1C7A3']]); g.fillRect(0, 0, w, h);
    glow(g, w * 0.7, h * 0.5, h * 0.5, 'rgba(255,236,205,.95)');
    ([[0.5, 0.2, '#9AA6C0'], [0.6, 0.17, '#6F7C9C'], [0.72, 0.13, '#475373'], [0.84, 0.1, '#8A4634'], [0.93, 0.06, '#3B2622']] as const).forEach(([b, a, c]) => ridge(g, w, h, r, b, a, c));
  },
  city(g, w, h, r) {
    g.fillStyle = lin(g, h, [[0, '#1F2244'], [0.6, '#6B4A7A'], [1, '#EE9A6E']]); g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) glow(g, r() * w, h * 0.12 + r() * h * 0.45, 6 + r() * 22, `rgba(255,${(190 + r() * 50) | 0},140,${0.18 + r() * 0.25})`);
    let x = 0;
    while (x < w) {
      const bw = 18 + r() * 36, bh = h * (0.22 + r() * 0.38);
      g.fillStyle = '#17182C'; g.fillRect(x, h - bh, bw, bh);
      for (let wy = h - bh + 8; wy < h - 6; wy += 9) for (let wx = x + 4; wx < x + bw - 5; wx += 7) if (r() < 0.32) { g.fillStyle = `rgba(255,${(200 + r() * 40) | 0},130,${0.5 + r() * 0.5})`; g.fillRect(wx, wy, 3, 4); }
      x += bw + 1;
    }
  },
  dinner(g, w, h, r) {
    // a table seen from above: wood, plates, a bowl of rice, a glass and chopsticks
    g.fillStyle = lin(g, h, [[0, '#7A4A2B'], [1, '#4E2C1A']]); g.fillRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) { g.fillStyle = `rgba(255,214,170,${0.03 + r() * 0.05})`; g.fillRect(0, r() * h, w, 1 + r() * 2.5); }
    glow(g, w * 0.3, h * 0.15, h * 1.1, 'rgba(255,196,130,.28)');
    const shadow = (x: number, y: number, rad: number) => { g.beginPath(); g.ellipse(x + rad * 0.08, y + rad * 0.12, rad * 1.02, rad * 1.02, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(0,0,0,.28)'; g.fill(); };
    const disc = (x: number, y: number, rad: number, col: string) => { g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fillStyle = col; g.fill(); };
    // main plate with karaage and greens
    const px = w * 0.4, py = h * 0.56, pr = h * 0.3;
    shadow(px, py, pr); disc(px, py, pr, '#F5F0E8'); disc(px, py, pr * 0.78, '#ECE5DA');
    for (let i = 0; i < 7; i++) { const a = r() * Math.PI * 2, d = r() * pr * 0.42; g.beginPath(); g.ellipse(px + Math.cos(a) * d, py + Math.sin(a) * d, pr * (0.16 + r() * 0.06), pr * (0.13 + r() * 0.05), r() * 3, 0, Math.PI * 2); g.fillStyle = ['#B8661F', '#C97A2C', '#A55516'][i % 3]; g.fill(); }
    for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(px - pr * 0.45 + r() * pr * 0.2, py - pr * 0.25 + r() * pr * 0.5, pr * 0.12, pr * 0.06, r() * 3, 0, Math.PI * 2); g.fillStyle = i % 2 ? '#6FA845' : '#4E8A33'; g.fill(); }
    disc(px + pr * 0.42, py - pr * 0.38, pr * 0.1, '#F2C94C');
    // rice bowl
    const bx = w * 0.72, by = h * 0.36, br = h * 0.17;
    shadow(bx, by, br); disc(bx, by, br, '#2E3A59'); disc(bx, by, br * 0.8, '#FBF8F2');
    for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2, d = r() * br * 0.72; g.fillStyle = 'rgba(200,190,170,.5)'; g.fillRect(bx + Math.cos(a) * d, by + Math.sin(a) * d, 2, 1.2); }
    // soy sauce dish
    const sx = w * 0.84, sy = h * 0.78, sr = h * 0.1;
    shadow(sx, sy, sr); disc(sx, sy, sr, '#F1ECE3'); disc(sx, sy, sr * 0.62, '#3A1F12');
    // glass of beer
    const gx = w * 0.13, gy = h * 0.32, gr = h * 0.1;
    shadow(gx, gy, gr); disc(gx, gy, gr, '#E9A93C'); disc(gx, gy, gr * 0.72, '#FFF4D9'); disc(gx - gr * 0.3, gy - gr * 0.3, gr * 0.18, 'rgba(255,255,255,.7)');
    // chopsticks
    g.save(); g.translate(w * 0.6, h * 0.88); g.rotate(-0.18);
    for (const off of [0, h * 0.035]) { g.fillStyle = '#C9A27A'; g.fillRect(0, off, w * 0.34, h * 0.018); g.fillStyle = '#8E2F2A'; g.fillRect(w * 0.24, off, w * 0.1, h * 0.018); }
    g.restore();
  },
  mahjong(g, w, h, r) {
    // green felt with a hand of tiles across the top (the title sits at the bottom) and two dice
    g.save();
    const felt = g.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.45, w * 0.75);
    felt.addColorStop(0, '#22855E'); felt.addColorStop(1, '#0E4A35');
    g.fillStyle = felt; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.04})`; g.fillRect(r() * w, r() * h, 1, 1); }
    const tw = Math.min(w / 11.5, h * 0.2), th = tw * 1.36, rr = tw * 0.14;
    const round = (x: number, y: number, ww: number, hh: number, rad: number) => { g.beginPath(); g.moveTo(x + rad, y); g.arcTo(x + ww, y, x + ww, y + hh, rad); g.arcTo(x + ww, y + hh, x, y + hh, rad); g.arcTo(x, y + hh, x, y, rad); g.arcTo(x, y, x + ww, y, rad); g.closePath(); };
    const face = (x: number, y: number, kind: number) => {
      g.fillStyle = 'rgba(0,0,0,.3)'; round(x + 3, y + 5, tw, th, rr); g.fill();
      g.fillStyle = '#2C8A66'; round(x, y + th * 0.14, tw, th * 0.92, rr); g.fill();
      const fg = g.createLinearGradient(0, y, 0, y + th); fg.addColorStop(0, '#FFFCF3'); fg.addColorStop(1, '#E9DFC6');
      g.fillStyle = fg; round(x, y, tw, th * 0.94, rr); g.fill();
      const cx = x + tw / 2, cy = y + th * 0.47;
      if (kind === 0) { // circles
        [[-0.2, -0.22], [0.2, -0.22], [-0.2, 0.22], [0.2, 0.22]].forEach(([dx, dy], i) => { g.beginPath(); g.arc(cx + dx * tw, cy + dy * th, tw * 0.15, 0, Math.PI * 2); g.fillStyle = i % 3 ? '#1E5BA8' : '#C7372F'; g.fill(); g.beginPath(); g.arc(cx + dx * tw, cy + dy * th, tw * 0.07, 0, Math.PI * 2); g.fillStyle = '#FFFCF3'; g.fill(); });
      } else if (kind === 1) { // bamboo
        for (const dx of [-0.22, 0, 0.22]) { g.fillStyle = '#2E8B4E'; g.fillRect(cx + dx * tw - tw * 0.05, cy - th * 0.3, tw * 0.1, th * 0.6); g.fillStyle = '#FFFCF3'; g.fillRect(cx + dx * tw - tw * 0.05, cy - th * 0.02, tw * 0.1, th * 0.04); }
      } else { // characters
        const ch = ['一', '三', '五', '中', '發'][kind - 2] ?? '中';
        g.fillStyle = ch === '發' ? '#2E8B4E' : ch === '中' ? '#C7372F' : '#1C1C1E';
        g.font = `700 ${tw * 0.58}px "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(ch, cx, cy - (kind < 5 ? th * 0.1 : 0));
        if (kind < 5) { g.fillStyle = '#C7372F'; g.font = `700 ${tw * 0.42}px "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif`; g.fillText('萬', cx, cy + th * 0.22); }
      }
    };
    // the hand
    const kinds = [2, 2, 3, 4, 0, 0, 1, 1, 5, 6];
    const startX = (w - kinds.length * tw * 1.02) / 2;
    kinds.forEach((k, i) => face(startX + i * tw * 1.02, h * 0.13, k));
    // dice
    const die = (x: number, y: number, n: number, rot: number) => {
      const s = tw * 0.62; g.save(); g.translate(x, y); g.rotate(rot);
      g.fillStyle = 'rgba(0,0,0,.3)'; round(-s / 2 + 2, -s / 2 + 3, s, s, s * 0.2); g.fill();
      g.fillStyle = '#FBF8F0'; round(-s / 2, -s / 2, s, s, s * 0.2); g.fill();
      const pip = (px: number, py: number, c = '#1C1C1E') => { g.beginPath(); g.arc(px * s * 0.26, py * s * 0.26, s * 0.08, 0, Math.PI * 2); g.fillStyle = c; g.fill(); };
      if (n === 1) pip(0, 0, '#C7372F'); else { pip(-1, -1); pip(1, 1); if (n % 2) pip(0, 0); if (n >= 4) { pip(1, -1); pip(-1, 1); } }
      g.restore();
    };
    die(w * 0.8, h * 0.66, 4, 0.3); die(w * 0.89, h * 0.58, 1, -0.4);
    g.restore();
  },
  ocean(g, w, h, r) {
    const hz = h * 0.6;
    g.fillStyle = lin(g, hz, [[0, '#3E5E9E'], [0.55, '#C98AA0'], [1, '#F7B27A']]); g.fillRect(0, 0, w, hz);
    glow(g, w * 0.5, hz, h * 0.45, 'rgba(255,220,170,.8)');
    g.beginPath(); g.arc(w * 0.5, hz, h * 0.11, Math.PI, 0); g.fillStyle = '#FFE2B0'; g.fill();
    g.fillStyle = lin(g, h, [[0, '#2C3E6B'], [0.6, '#2C3E6B'], [1, '#121C38']]); g.fillRect(0, hz, w, h - hz);
    for (let i = 0; i < 22; i++) { const y = hz + 4 + (i * (h - hz)) / 24, ww = (w * 0.06 + r() * w * 0.22) * (1 - i / 30); g.fillStyle = `rgba(255,205,160,${0.55 - i * 0.022})`; g.fillRect(w * 0.5 - ww / 2 + (r() - 0.5) * 20, y, ww, 1.6); }
  },
  snow(g, w, h, r) {
    g.fillStyle = lin(g, h, [[0, '#0B1630'], [1, '#36557F']]); g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`; const s = 0.6 + r() * 1.3; g.fillRect(r() * w, r() * h * 0.6, s, s); }
    glow(g, w * 0.78, h * 0.22, h * 0.22, 'rgba(240,238,225,.35)');
    g.beginPath(); g.arc(w * 0.78, h * 0.22, h * 0.065, 0, Math.PI * 2); g.fillStyle = '#F4F1E6'; g.fill();
    ([[0.62, 0.08, '#8396B8'], [0.74, 0.06, '#B7C5DC'], [0.87, 0.05, '#E9EFF8']] as const).forEach(([b, a, c]) => smoothHill(g, w, h, r, b, a, c));
  },
  forest(g, w, h, r) {
    g.fillStyle = lin(g, h, [[0, '#B9D6E2'], [1, '#F3E2C0']]); g.fillRect(0, 0, w, h);
    glow(g, w * 0.3, h * 0.35, h * 0.5, 'rgba(255,245,215,.8)');
    ([[0.58, '#93AE9F', 0.7], [0.74, '#5E7E6E', 0.85], [0.92, '#2E4A3E', 1]] as const).forEach(([base, col, sc]) => {
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, h * base - h * 0.18 * sc, w, h * 0.06);
      g.fillStyle = col; g.fillRect(0, h * base, w, h);
      for (let x = -10; x < w + 10;) { const tw = 10 + r() * 14, th = h * (0.1 + r() * 0.12) * sc; g.beginPath(); g.moveTo(x, h * base + 1); g.lineTo(x + tw / 2, h * base - th); g.lineTo(x + tw, h * base + 1); g.closePath(); g.fill(); x += tw * (0.55 + r() * 0.4); }
    });
  },
  gradient(g, w, h, r) {
    g.fillStyle = '#5A55E8'; g.fillRect(0, 0, w, h);
    ['#FF8A65', '#FFC371', '#38BDF8', '#A78BFA', '#F472B6'].forEach(c => { const x = r() * w, y = r() * h, rad = w * (0.35 + r() * 0.4); const b = g.createRadialGradient(x, y, 0, x, y, rad); b.addColorStop(0, c); b.addColorStop(1, c + '00'); g.fillStyle = b; g.fillRect(0, 0, w, h); });
  },
};

export function drawCover(c: HTMLCanvasElement, width?: number, height?: number) {
  const w = width ?? c.clientWidth, h = height ?? c.clientHeight;
  if (!w || !h) return;
  const dpr = width ? 1 : window.devicePixelRatio || 1;
  c.width = w * dpr; c.height = h * dpr;
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);
  const id = isCover(c.dataset.design) ? c.dataset.design : 'mountain';
  SCENES[id](g, w, h, rng('cover-' + id));
}

/** Swipe-to-choose carousel (like picking a card design). */
export function bindCarousel(selected: number, onSelect: (i: number) => void) {
  const sc = document.getElementById('covers');
  if (!sc) return;
  centerCover(selected, false);
  let tm: number | undefined;
  sc.addEventListener('scroll', () => {
    clearTimeout(tm);
    tm = window.setTimeout(() => {
      const mid = sc.scrollLeft + sc.clientWidth / 2;
      let best = 0, bd = Infinity;
      [...sc.children].forEach((c, i) => { const el = c as HTMLElement, d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
      onSelect(best);
    }, 60);
  }, { passive: true });
}
export function centerCover(i: number, smooth: boolean) {
  const sc = document.getElementById('covers'), card = sc?.children[i] as HTMLElement | undefined;
  if (!sc || !card) return;
  sc.scrollTo({ left: card.offsetLeft - (sc.clientWidth - card.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'auto' });
}
