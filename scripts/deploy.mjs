// `npm run deploy`: publish the built site with Wrangler. If .env sets DEPLOY_DOMAIN (your own domain,
// already on Cloudflare), the site is attached to it as a custom domain. The domain lives in your
// git-ignored .env, not in wrangler.jsonc, so this public repo stays deployable by anyone.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

function readEnv(path) {
  try {
    return Object.fromEntries(readFileSync(path, 'utf8').split('\n')
      .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map(m => [m[1], m[2]]));
  } catch { return {}; }
}

const domains = (process.env.DEPLOY_DOMAIN ?? readEnv('.env').DEPLOY_DOMAIN ?? '').split(',').map(d => d.trim()).filter(Boolean);
for (const d of domains) {
  if (!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(d)) {
    console.error(`DEPLOY_DOMAIN has an invalid domain: ${d}`);
    process.exit(1);
  }
}
const args = ['wrangler', 'deploy', ...domains.flatMap(d => ['--domain', d])];
if (domains.length) console.log(`Deploying to ${domains.map(d => `https://${d}`).join(', ')}`);
const r = spawnSync('npx', args, { stdio: 'inherit' });
process.exit(r.status ?? 1);
