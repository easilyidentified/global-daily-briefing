# global-daily-briefing — 프로젝트 맥락

> 이 파일은 Claude Code가 세션 시작 시 자동으로 읽는다.
> **다른 데스크탑에서 작업을 이어받을 때는 이 파일 → `PROGRESS.md` 순으로 읽으면 된다.**

---

## 한 줄 요약

4개국(KR/US/CN/JP) 뉴스를 매일 아침 AI가 수집·요약해 `data/issues.json`에 쌓고,
3D 지구본 위에서 타임라인과 이슈 관계도로 보여주는 정적 웹앱.

- 리포: `easilyidentified/global-daily-briefing` (public, 기본 브랜치 `main`)
- 배포: GitHub Pages — https://easilyidentified.github.io/global-daily-briefing/
- 로컬 작업 폴더: **데스크탑마다 경로가 다르다.** 이 리포를 클론한 폴더가 곧 작업 폴더다.
  (폴더 이름도 `global-daily-briefing`이 아닐 수 있다. 경로를 문서에 박아두지 말 것)

---

## 개발 환경

- 빌드 도구·패키지 매니저 **없음**. 순수 정적 파일이라 브라우저로 바로 열면 된다.
- 로컬 확인: `python -m http.server 8000` 후 `http://localhost:8000/` 접속
  (`file://`로 열면 `fetch`가 막혀 데이터가 안 뜬다)
- `gh` CLI는 `easilyidentified` 계정으로 인증되어 있다 (scopes: repo, workflow, gist, read:org)

---

## 파일 구조

| 경로 | 역할 |
| --- | --- |
| `index.html` | `Globe Briefing.dc.html`로 즉시 리다이렉트하는 진입점 |
| `Globe Briefing.dc.html` | **메인 화면** — 지구본 + 브리핑 (524줄) |
| `Current App.dc.html` | 이전/보조 화면 (314줄) |
| `globe.js` | 3D 지구본 렌더링, 국가 마커, 속보 마커 |
| `issue-graph.js` | 이슈 관계도. `similarity(a, b)`가 `topics` 가중 자카드로 링크 생성 |
| `support.js` | `.dc.html` 런타임 지원 스크립트 |
| `data/issues.json` | **핵심 데이터.** 워크플로가 매일 갱신 |
| `data/flashes.json` | 속보·이벤트. **자동화 대상 아님 — 사람이 직접 관리** |
| `data/sent.json` | **발송 멱등 기록.** 국가별 마지막 발송 날짜. 발송 워크플로가 갱신·커밋 |
| `data/README.md` | 데이터 스키마·필드 규칙·자주 하는 실수 (수정 전 필독) |
| `scripts/collect-prompt.md` | AI 수집 지시서. **수집 로직은 코드가 아니라 이 마크다운에 있다** |
| `scripts/send_briefing.py` | 브리핑 이메일 렌더링·발송 (Gmail SMTP, 표준 라이브러리만) |
| `.github/workflows/daily-briefing.yml` | **수집** 스케줄 실행 + 자동 커밋 |
| `.github/workflows/send-briefing.yml` | **발송** 스케줄 실행 |
| `flags/` | 12개국 국기 PNG |
| `assets/email_banner.png` | 메일 상단 배너 (`cid:`로 인라인 첨부) |
| `shots/`, `uploads/`, `_ds/` | 스크린샷·업로드 이미지·디자인 에셋 (약 2.7MB) |
| `PIPELINE.md` | 파이프라인 설치·운영 안내 |
| `ROADMAP.md` | **제품 방향** — 목표 고객, 예정 기능, 온톨로지 설계안. 아직 안 만든 것 |
| `DB-DESIGN.md` | **DB 구축 전에 정할 것** — 4개 층 11항목과 권고안. 규모·비용 실측 포함 |
| `CUSTOMER.md` | **누가 돈을 쓰나** — 고객 7세그먼트, 질의·pain 조사, **엔티티 설계 권고**. 세그먼트 판단의 기준선 |
| `github.md` | 최신 동기화 스냅샷 (기존 관례 파일) |
| `PROGRESS.md` | **세션별 진척 로그 (append)** |

---

## 데이터 규칙 (자세한 건 `data/README.md`)

- 기사는 `issues.json` **한 파일**에만 넣는다. 별도 아카이브 없음.
- 오늘/과거를 나누는 건 **`date` 하나뿐** — `date === latestDate`면 '오늘 브리핑'.
- `id`는 `<국가소문자>-<pol|eco|oth>-<번호>`, **중복 금지** (중복 시 그래프 클릭이 엉뚱한 곳으로 점프).
- `topics`는 4개 안팎 명사. **누락하면 그래프에서 노드가 고립된다.**
- 새 날짜 추가 시 `latestDate` / `period` / `updatedAt`도 같이 갱신.
- 자동 수집분은 `"review": "pending"`으로 들어온다. **사람 검수는 하지 않기로 했다**(세션 22 결정) —
  `pending`이 그대로 남아 있는 것이 정상이고, 발송도 이 값을 보지 않는다.
  `pending` 건수를 숙제로 올리지 말 것.

---

## 자동화 파이프라인

**워크플로가 둘, 크론은 넷이다. 수집이 먼저 돌고, 그 결과를 발송이 읽는다.
각각 오전 늦게 재시도가 한 번씩 더 붙어 있다 (세션 25).**

```
06:40 KST  daily-briefing.yml   (cron "40 21 * * *" UTC)
  GitHub Actions
    → anthropics/claude-code-action@v1 이 scripts/collect-prompt.md 를 읽고 실행
    → data/issues.json 갱신
    → 변경 있으면 briefing-bot 이름으로 자동 커밋 & 푸시
  이후 사람이 검수

08:00 KST  send-briefing.yml    (cron "0 23 * * *" UTC)
    → scripts/send_briefing.py 가 data/issues.json 의 '오늘'치를 HTML로 렌더
    → Gmail SMTP로 BRIEFING_TO 수신자에게 발송

09:40 KST  daily-briefing.yml   (cron "40 0 * * *" UTC)  ← 재시도
    → 4개국 latestDate가 모두 오늘이면 수집 스텝을 건너뛴다 (쿼터를 쓰지 않는다)

10:30 KST  send-briefing.yml    (cron "30 1 * * *" UTC)  ← 재시도
    → 이미 보낸 날은 data/sent.json 멱등 가드가 막는다
```

### 수집 (daily-briefing.yml)

- 인증: 리포 시크릿 `CLAUDE_CODE_OAUTH_TOKEN` (`claude setup-token`으로 발급). **등록 완료 상태.**
- **별도 API 과금 없음** — 구독(Max 플랜) 쿼터로 돈다.
  실행 로그에 찍히는 `total_cost_usd`는 **API 정가로 환산한 명목값이지 청구액이 아니다.**
  이 값을 비용으로 읽고 실행 규모를 줄이려 들지 말 것. 실측 규모는 1회 13~24분 / 51~88턴.
- **Actions는 UTC로 돈다. 21:40 UTC는 KST로 이미 다음 날이다.**
  수집 에이전트에는 `Bash`가 없어 스스로 날짜를 확인할 수 없으므로,
  워크플로의 `Compute today's KST date` 스텝이 계산한 값을 **프롬프트에 박아서** 넘긴다.
  이 주입을 빼면 에이전트가 UTC 날짜를 쓰고, `latestDate`와 같아져
  **0단계에서 전 국가가 건너뛰어진다 — 수집이 통째로 비고 메일도 안 나간다.**
- 검증 실패 시 저장하지 않는다 — 어제 데이터가 남는 편이 잘못된 기사보다 낫다.
- 기사 전문은 저장하지 않는다. 요약과 링크만.
- **구독 5시간 한도(429)에 걸리면 1턴 만에 죽는다.** 2026-08-20 06:40 실행이 그렇게 날아갔다
  (`"You've hit your session limit · resets 8:40am"`, 22초 실패). 사람이 새벽에 쿼터를 다 쓰면
  수집이 통째로 없고, 그러면 08:00 발송도 신선도 가드에 걸려 그날 메일이 안 나간다.
  **09:40 재시도 크론이 이 경우를 위한 것이다.** 실패 원인은 실행 아티팩트
  `claude-execution-output.json`의 `rate_limit_event` / `api_error_status`로 확인한다
- **수집 중에는 main에 아무것도 올리지 마라.** 수집은 20~40분 걸리고, 그 사이 main이 움직이면
  러너의 push가 non-fast-forward로 거부되어 **그날 수집분이 러너와 함께 사라진다**
  (2026-08-20에 실제로 한 번 잃었다). 지금은 push 앞에 `git pull --rebase --autostash`가 있어
  대부분 얹혀 올라가지만, 애초에 겹치지 않는 것이 안전하다

### 발송 (send-briefing.yml)

- 시크릿 `GMAIL_USER` / `GMAIL_APP_PASSWORD`(앱 비밀번호 16자리),
  변수 `BRIEFING_TO`(콤마 구분) / `BRIEFING_FROM_NAME`. **모두 등록 완료 상태.**
- **오발송 방지**: 워크플로가 넘긴 `EXPECT_DATE`(KST 오늘)와 `latestDate`가 다르면
  **발송하지 않고 그냥 끝낸다.** 수집이 실패한 날 어제치를 다시 보내는 사고를 막는 장치다.
  오늘자 기사가 0건일 때도 마찬가지로 건너뛴다.
- **중복 발송 방지(멱등 가드)**: `data/sent.json`에 국가별 마지막 발송 날짜를 남긴다.
  `sent[국가].date == latestDate`면 **보내지 않는다.** 스케줄 실행 뒤 수동 실행을 걸거나
  실패한 런을 re-run 해도 같은 메일이 두 번 나가지 않는다.
  - 기록은 **발송 성공 뒤에만** 쓴다. 워크플로의 `Commit send marker` 스텝이 리포에 커밋한다
    (그래서 이 워크플로는 `contents: write`가 필요하다). 커밋하지 않으면 기록이 사라져 가드가 죽는다
  - `data/sent.json`이 **깨져 있으면 발송하지 않고 종료 코드 2로 죽는다.**
    중복 발송보다 미발송이 낫다는 이 리포의 기존 방침과 같다
  - `FORCE_SEND=1`은 이 가드도 건너뛴다. `DRY_RUN`은 가드 앞에서 끝나 미리보기는 언제나 뽑힌다
  - 이 가드가 있어서 **10:30 재시도 크론을 안심하고 붙일 수 있다.** 08:00에 이미 나갔으면
    10:30 실행은 조용히 건너뛰고, 수집이 늦어져 08:00이 건너뛰어졌으면 10:30이 그날치를 내보낸다
- 로컬 미리보기: `DRY_RUN=1 python scripts/send_briefing.py` → `preview_<국가>.html` 생성.
  **이 파일은 커밋하지 말 것** (배너가 data URI로 박혀 400KB가 넘는다).
- 의존성 없음 — `smtplib`/`email` 등 표준 라이브러리만 쓴다.
- 메일 본문의 `why` / `soWhat`은 `context` 안이 아니라 **이슈 최상위 필드**다.
- **발송 국가는 `BRIEFING_COUNTRY: KR` 하나뿐이다** (워크플로에 박혀 있다).
  `issues.json`에는 4개국이 쌓이지만 메일로 나가는 건 대한민국 브리핑뿐.
- **메일 디자인 원본은 리포가 아니라 claude.ai Design 프로젝트에 있다** —
  `Global-Daily-Briefing email redesign` / `fde7ba93-63e7-4499-bf08-100cd9039c37`.
  `DesignSync` 도구의 `list_files` / `get_file`로 받는다.
  Modernist 팔레트(`#e4e1e1` 바탕 / `#f8f4f4` 컨테이너 / `#201e1d` 잉크 / `#ec3013` 레드)는
  `send_briefing.py` 상단 상수에 옮겨져 있다. 디자인을 고칠 때 두 곳이 어긋나지 않게 할 것.

---

## 세션 운영 규칙 (사용자 지시)

1. 모든 작업은 이 리포를 클론한 로컬 폴더 안에서 한다 (경로·폴더명은 데스크탑마다 다르다).
   새 데스크탑에서는 `git config user.name easilyidentified` /
   `git config user.email 115207132+easilyidentified@users.noreply.github.com`를
   **리포 안에서(--local)** 먼저 잡는다. 커밋 저자가 히스토리와 어긋나지 않게.
2. 진척 상황은 **`PROGRESS.md`에 세션 단위로 append**한다.
3. **세션 종료 시 리포지토리 전반을 점검한다.** 맥락 파일만 보지 말 것.
   최소한 다음을 확인하고, 어긋난 것이 있으면 고친 뒤 커밋·푸시한다.

   - **커밋 상태** — `git status`가 깨끗한가, 로컬과 `origin/main`이 일치하는가(`0 0`)
   - **맥락 3종** — `CLAUDE.md`(파일 구조 표·파이프라인 절이 실제 리포와 맞는가),
     `PROGRESS.md`(세션 최신순 정렬이 유지되는가), `github.md`(스냅샷이 이번 작업을 담는가)
   - **코드** — 이번 세션에 건드린 파일이 실제로 동작하는가(구문 검사·렌더 확인)
   - **자동화** — 워크플로 두 개가 여전히 `active`인가, 시크릿·변수가 그대로인가,
     마지막 실행이 success인가
   - **새로 생긴 파일** — 추적해야 할 것이 untracked로 남지 않았는가,
     반대로 산출물이 `.gitignore` 없이 섞여 들어가지 않았는가

   다른 데스크탑에서 `git pull`만으로 맥락을 이어받을 수 있어야 한다.
4. 다른 데스크탑에서 시작할 때는 **먼저 `git pull`** 한 뒤 이 파일과 `PROGRESS.md`를 읽는다.

---

## 주의할 점

- `anthropics/claude-code-action`의 입력 이름(`prompt`, `claude_args`)은 버전에 따라 바뀔 수 있다.
  실행 전 https://docs.claude.com/en/docs/claude-code/overview 확인.
- 국가를 늘리려면 `scripts/collect-prompt.md`의 '대상'과 `issues.json`의 `COUNTRIES`를 함께 손본다.
  지원 국가 코드는 `SUPPORTED_COUNTRIES`의 12개. 국가가 늘면 구독 쿼터도 그만큼 더 쓴다.
- `.dc.html` 파일명에 공백이 있다. 셸에서 다룰 때 반드시 따옴표로 감쌀 것.
- **`사용자제공/`은 `.gitignore` 대상이다.** claude.ai Design 프로젝트에서 내려받은 사본이라
  커밋하면 디자인 원본이 둘이 되어 어긋난다. 로컬에 있어도 정상이고, 커밋 대상이 아니다.
- **워크플로 success가 곧 발송됨은 아니다.** 신선도 가드·멱등 가드에 걸려 건너뛴 실행도 success로
  끝난다. 발송 여부는 로그의 `[send] 발송 완료 → 배달 N명` 문장으로 확인할 것.
- **발송 크론은 08:00 KST인데 메일은 08:50쯤 도착한다.** GitHub Actions 큐 지연이고 실패가 아니다
  (08-13·08-14 이틀 다 23:50 UTC에 실행 시작). 지연을 장애로 오진하지 말 것.
