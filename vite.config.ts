import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// GitHub Pages는 https://사용자명.github.io/저장소명/ 로 열리므로 base 필요
export default defineConfig({
  plugins: [react()],
  base: '/NEWXMEM/',  // 저장소 이름이 다르면 여기를 바꾸세요 (예: '/my-app/')
  server: {
    port: 5173,
    host: true,  // localhost 외 네트워크에서도 접속 가능 (0.0.0.0)
  },
})
