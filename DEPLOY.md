# 외부 공개용 배포 가이드

이 프로젝트를 **외부에서 100% 동일하게** 보여주려면 **프로덕션 빌드**를 한 뒤 **정적 웹 호스팅**에 올리면 됩니다.  
백엔드 없이 브라우저만으로 동작하므로, 배포된 URL만 공유하면 누구나 같은 화면·동작을 볼 수 있습니다.

---

## 1. 로컬에서 프로덕션 확인

배포 전에, 로컬에서 빌드·미리보기로 확인하는 방법입니다.

```bash
cd c:\NEWXMEM
npm run build
npm run preview
```

브라우저에서 `http://localhost:4173` 등으로 접속해, 실제 배포될 화면과 동작이 같은지 확인하세요.

---

## 2. 무료로 외부 공개 (추천)

### A. Vercel (가장 간단)

1. [vercel.com](https://vercel.com) 가입 후 로그인
2. **Add New → Project** 에서 이 폴더(`NEWXMEM`) 연결  
   - GitHub에 올려두었다면 저장소 선택 후 Import
   - 로컬만 있다면 **Vercel CLI** 사용:
     ```bash
     npm i -g vercel
     cd c:\NEWXMEM
     vercel
     ```
3. **Build Command**: `npm run build`  
   **Output Directory**: `dist`  
   (보통 자동 인식됨)
4. 배포 후 나오는 URL(예: `https://newxmem-xxx.vercel.app`)을 공유하면 됩니다.

### B. Netlify

1. [netlify.com](https://netlify.com) 가입 후 로그인
2. **Sites → Add new site → Deploy manually**  
   - 또는 GitHub 연동 후 저장소 선택
3. **Build command**: `npm run build`  
   **Publish directory**: `dist`
4. 배포 후 생성된 URL(예: `https://xxx.netlify.app`)을 공유하면 됩니다.

### C. GitHub Pages

1. 이 프로젝트를 GitHub 저장소에 푸시
2. 저장소 **Settings → Pages**  
   - Source: **GitHub Actions**
3. 프로젝트 루트에 `.github/workflows/deploy.yml` 추가 (아래 참고)
4. 푸시 후 자동 배포되고,  
   `https://<사용자명>.github.io/<저장소명>/` 에서 확인 가능

---

## 3. 100% 동일하게 보이게 하려면

- **항상** `npm run build` 로 만든 **프로덕션 빌드**를 배포하세요.  
  (`npm run dev` 로 보는 화면은 개발용이라, 배포 환경과 다를 수 있습니다.)
- 배포 후에는 **배포된 URL**만 공유하면,  
  같은 브라우저에서 열었을 때 로컬과 동일한 화면·동작을 보게 됩니다.
- 별도 서버/DB 없이 **정적 파일만** 제공하므로,  
  호스팅 사이트만 정상이면 어디서 접속해도 동작이 같습니다.

---

## 4. GitHub Pages용 자동 배포 (선택)

GitHub Pages를 쓰는 경우, 아래 파일을 추가하면 푸시할 때마다 자동으로 빌드·배포됩니다.

**`.github/workflows/deploy.yml`** (프로젝트 루트 기준):

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@4
```

그리고 **`vite.config.ts`** 에서 GitHub Pages 서브 경로를 쓰는 경우에만 `base`를 설정하세요:

```ts
// 저장소 이름이 NEWXMEM 이고, https://username.github.io/NEWXMEM/ 로 열리는 경우
export default defineConfig({
  plugins: [react()],
  base: '/NEWXMEM/',
})
```

도메인 루트(예: `https://myproject.vercel.app`)에 배포하는 경우에는 `base`를 넣지 않아도 됩니다.

---

정리하면, **Vercel 또는 Netlify에 `dist` 폴더를 배포**하는 방식이 가장 빠르고,  
동일한 빌드 결과물을 올리면 외부에서도 100% 같은 화면·동작으로 보입니다.
