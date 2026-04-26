import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const pkg = JSON.parse(readFileSync(new URL('package.json', import.meta.url), 'utf-8')) as { version: string }

// https://vite.dev/config/
// GitHub Pages는 https://사용자명.github.io/저장소명/ 로 열리므로 base 필요
// localhost:5173/NEWXMEM/ (dev)와 동일 base — 배포는 `npm run build` 산출물 = Actions에서 동일 명령
export default defineConfig({
  plugins: [react()],
  base: '/NEWXMEM/',  // GitHub Pages: https://aklexwang.github.io/NEWXMEM/
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    port: 5173,
    host: true,  // localhost 외 네트워크에서도 접속 가능 (0.0.0.0)
  },
  /** `npm run build` 산출물 — GitHub Pages에 올리는 것과 동일. 로컬 확인: `npm run check:gh-pages` → http://localhost:4173/NEWXMEM/ */
  preview: {
    port: 4173,
    host: true,
  },
})
