/**
 * Cursor에서 생성한 흐름도 이미지를 docs 폴더로 복사합니다.
 * 사용법: node scripts/copy-flow-images.cjs <소스폴더>
 * 예: node scripts/copy-flow-images.cjs "C:\\Users\\사용자명\\.cursor\\projects\\...\\assets"
 */
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const docsDir = path.join(projectRoot, 'docs');
const sourceDir = process.argv[2];

if (!sourceDir) {
  console.log('사용법: node scripts/copy-flow-images.cjs <이미지가 있는 assets 폴더 경로>');
  process.exit(1);
}

const files = ['flow-main.png', 'flow-detail.png'];

if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

let copied = 0;
for (const name of files) {
  const src = path.join(sourceDir, name);
  const dest = path.join(docsDir, name);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log('복사됨:', name);
    copied++;
  } else {
    console.warn('소스 없음:', src);
  }
}

if (copied === 0) {
  console.log('이미지를 찾지 못했습니다. 소스 폴더 경로를 확인하세요.');
  process.exit(1);
}
console.log(copied, '개 파일이 docs 폴더로 복사되었습니다.');
