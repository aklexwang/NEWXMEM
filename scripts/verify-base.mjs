/**
 * dist/index.html이 커스텀 도메인 루트(base '/') 기준으로 빌드됐는지 확인합니다.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const html = readFileSync(join(root, 'dist', 'index.html'), 'utf8')
if (html.includes('/NEWXMEM/')) {
  console.error('verify-base: dist/index.html must not include /NEWXMEM/ (check vite.config.ts base)')
  process.exit(1)
}
console.log('verify-base: OK (dist uses root base /)')
