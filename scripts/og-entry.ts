// Renders one cover as a 1200×630 link-preview image. Used by scripts/make-og.sh.
import { drawCover } from '../app/src/ui/covers';
const c = document.querySelector('canvas')!;
c.dataset.design = location.hash.slice(1) || 'mountain';
drawCover(c, 1200, 630);
const g = c.getContext('2d')!;
const s = g.createLinearGradient(0, 300, 0, 630); s.addColorStop(0, 'rgba(0,0,0,0)'); s.addColorStop(1, 'rgba(0,0,0,.45)');
g.fillStyle = s; g.fillRect(0, 0, 1200, 630);
g.fillStyle = '#fff'; g.font = '700 64px -apple-system, Helvetica, Arial, sans-serif'; g.fillText("Let's Meet", 64, 560);
