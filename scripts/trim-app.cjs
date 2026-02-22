/**
 * App.tsx에서 826~1683줄(로컌 SellerPhoneContent, BuyerPhoneContent 정의) 제거
 * 실행: 프로젝트 루트(c:\NEWXMEM)에서 node scripts/trim-app.cjs
 */
const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', 'src', 'App.tsx');
const s = fs.readFileSync(filePath, 'utf8');
const lines = s.split(/\r?\n/);
const out = lines.slice(0, 825).concat(lines.slice(1684)).join('\n');
fs.writeFileSync(filePath, out);
console.log('App.tsx 정리 완료. 줄 수:', lines.length, '->', out.split(/\r?\n/).length);
