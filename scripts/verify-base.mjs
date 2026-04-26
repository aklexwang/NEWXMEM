/**
 * dist/index.html에 Vite `base: '/NEWXMEM/'`가 반영됐는지 확인합니다.
 * (로컬 `npm run dev` → http://localhost:5173/NEWXMEM/ 과 GitHub Pages 동일 루트)
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const html = readFileSync(join(root, 'dist', 'index.html'), 'utf8')
if (!html.includes('/NEWXMEM/')) {
  console.error('verify-base: dist/index.html must include /NEWXMEM/ (check vite.config.ts base)')
  process.exit(1)
}
console.log('verify-base: OK (dist uses base /NEWXMEM/)')
