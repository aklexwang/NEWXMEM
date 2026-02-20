# GitHub 로그인 후 배포하는 방법 (자세한 단계)

GitHub에 이미 로그인했다면, 아래 순서대로만 하면 됩니다.  
저장소 만들기 → 코드 올리기 → Pages 켜기 → 주소 확인까지 전부입니다.

---

## 1단계: GitHub에서 새 저장소 만들기

1. 브라우저에서 **https://github.com** 접속 후 로그인된 상태인지 확인합니다.
2. 오른쪽 위 **+** 버튼을 누릅니다.
3. **New repository**를 선택합니다.
4. 다음처럼 입력합니다.
   - **Repository name:** `NEWXMEM` (원하면 다른 이름도 가능, 나중에 설정 한 군데만 바꾸면 됨)
   - **Description:** 비워 두거나 `실시간 매칭 시뮬레이터` 등 아무거나 적어도 됩니다.
   - **Public** 선택.
   - **“Add a README file”** 은 체크하지 **마세요** (로컬에 이미 코드가 있으므로).
   - **Create repository** 버튼을 누릅니다.
5. 생성되면 **“Quick setup”** 화면이 나옵니다.  
   여기서 **“…or push an existing repository from the command line”** 아래에 나오는 주소를 잠깐 둘러보기만 하면 됩니다. (다음 단계에서 사용)

---

## 2단계: 로컬에서 Git 초기화하고 GitHub에 올리기

**Git이 설치되어 있어야 합니다.**  
설치 여부는 명령 프롬프트(또는 PowerShell)에서 `git --version` 입력 시 버전이 나오면 됩니다.  
설치가 안 되어 있으면 [git-scm.com](https://git-scm.com) 에서 다운로드 후 설치하세요.

1. **명령 프롬프트** 또는 **PowerShell**을 엽니다.
2. 아래 명령을 **한 줄씩** 순서대로 입력합니다.

```bash
cd c:\NEWXMEM
```

```bash
git init
```

```bash
git add .
```

```bash
git commit -m "첫 배포용 커밋"
```

3. GitHub 저장소와 연결합니다.  
   **`YOUR_USERNAME`** 자리에는 본인 GitHub 사용자 이름을 넣고,  
   저장소 이름을 **NEWXMEM**이 아닌 다른 이름으로 만들었다면 **NEWXMEM** 부분도 그 이름으로 바꿉니다.

```bash
git remote add origin https://github.com/YOUR_USERNAME/NEWXMEM.git
```

4. 기본 브랜치 이름을 `main`으로 하고, 첫 푸시를 합니다.

```bash
git branch -M main
git push -u origin main
```

5. **로그인 창**이 뜨면 GitHub 계정으로 로그인합니다.  
   (브라우저나 Git Credential Manager로 로그인하면 됩니다.)

6. 푸시가 끝나면 GitHub 저장소 페이지를 새로고침해서 **파일들이 올라왔는지** 확인합니다.

---

## 3단계: GitHub Pages 켜기 (배포 주소 나오게 하기)

1. GitHub에서 방금 만든 저장소(**NEWXMEM**) 페이지로 갑니다.
2. 위쪽 메뉴에서 **Settings**를 클릭합니다.
3. 왼쪽 메뉴에서 **Pages**를 클릭합니다.
4. **Build and deployment** 아래에서:
   - **Source** 를 **GitHub Actions** 로 선택합니다.
5. 아무것도 더 안 해도 됩니다. (이미 프로젝트 안에 배포용 workflow가 들어 있습니다.)

---

## 4단계: 자동 배포 기다리기

1. 저장소 위쪽 메뉴에서 **Actions**를 클릭합니다.
2. **“Deploy to GitHub Pages”** 워크플로우가 보일 수 있습니다.  
   방금 푸시했으므로 **가장 위에 있는 실행**이 보일 겁니다.
3. **노란 동그라미**(진행 중) → **초록 체크**가 되면 배포가 끝난 것입니다.  
   (실패하면 빨간 X가 뜨고, 그때는 로그를 열어서 에러 메시지를 확인하면 됩니다.)
4. 보통 **1~3분** 정도 걸립니다.

---

## 5단계: 배포된 주소 확인하기

1. 다시 **Settings → Pages**로 갑니다.
2. **“Your site is live at…”** 아래에 나오는 주소가 배포된 주소입니다.
   - 형식: **`https://YOUR_USERNAME.github.io/NEWXMEM/`**
   - **끝에 `/` 와 `NEWXMEM/` 이 꼭 있어야** 합니다.
3. 이 주소를 브라우저에 넣어서 **실시간 매칭 시뮬레이터**가 뜨는지 확인합니다.
4. 이 주소를 다른 사람에게 보내면, 로그인 없이 같은 화면을 볼 수 있습니다.

---

## 저장소 이름을 NEWXMEM이 아닌 다른 이름으로 만든 경우

저장소 이름을 **예: my-matching-app** 처럼 다르게 만들었다면, 한 군데만 수정하면 됩니다.

1. **c:\NEWXMEM\vite.config.ts** 파일을 엽니다.
2. `base: '/NEWXMEM/',` 를 `base: '/my-matching-app/',` 처럼 **저장소 이름에 맞게** 바꿉니다.
3. 아래처럼 다시 커밋하고 푸시합니다.

```bash
cd c:\NEWXMEM
git add vite.config.ts
git commit -m "GitHub Pages base 경로 수정"
git push
```

4. Actions에서 배포가 다시 끝난 뒤,  
   **https://YOUR_USERNAME.github.io/my-matching-app/** 로 접속해 보면 됩니다.

---

## 자주 하는 실수

- **Pages 주소에 마지막 `/` 를 빼고 들어가면** 404가 날 수 있습니다.  
  반드시 **`https://사용자명.github.io/NEWXMEM/`** 처럼 끝에 슬래시까지 포함해서 접속하세요.
- **Source를 “Deploy from a branch”가 아니라 “GitHub Actions”** 로 설정해야 합니다.  
  그래야 우리가 넣어 둔 workflow가 실행됩니다.
- **Git 로그인**이 안 되어 있으면 `git push` 가 실패할 수 있습니다.  
  브라우저나 Git Credential Manager로 GitHub 로그인 후 다시 시도하세요.

---

## 요약

| 단계 | 할 일 |
|------|--------|
| 1 | GitHub에서 **NEWXMEM** (또는 원하는 이름) **Public** 저장소 생성, README 추가 안 함 |
| 2 | `c:\NEWXMEM` 에서 `git init` → `add` → `commit` → `remote add origin` → `push` |
| 3 | 저장소 **Settings → Pages** 에서 Source를 **GitHub Actions** 로 설정 |
| 4 | **Actions** 탭에서 배포 완료(초록 체크) 될 때까지 대기 |
| 5 | **Settings → Pages** 에 나온 주소(`https://사용자명.github.io/NEWXMEM/`)로 접속해 확인 |

여기까지 하면 “깃허브에 로그인한 뒤 어떻게 하면 되나?”에 대한 절차는 모두 끝입니다.  
한 단계에서 막히면, **어느 단계에서, 어떤 화면/메시지**가 나오는지 알려주시면 그 부분만 더 구체적으로 적어 드리겠습니다.
