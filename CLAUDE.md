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
| `data/README.md` | 데이터 스키마·필드 규칙·자주 하는 실수 (수정 전 필독) |
| `scripts/collect-prompt.md` | AI 수집 지시서. **수집 로직은 코드가 아니라 이 마크다운에 있다** |
| `scripts/send_briefing.py` | 브리핑 이메일 렌더링·발송 (Gmail SMTP, 표준 라이브러리만) |
| `.github/workflows/daily-briefing.yml` | **수집** 스케줄 실행 + 자동 커밋 |
| `.github/workflows/send-briefing.yml` | **발송** 스케줄 실행 |
| `flags/` | 12개국 국기 PNG |
| `assets/email_banner.png` | 메일 상단 배너 (`cid:`로 인라인 첨부) |
| `shots/`, `uploads/`, `_ds/` | 스크린샷·업로드 이미지·디자인 에셋 (약 2.7MB) |
| `PIPELINE.md` | 파이프라인 설치·운영 안내 |
| `github.md` | 최신 동기화 스냅샷 (기존 관례 파일) |
| `PROGRESS.md` | **세션별 진척 로그 (append)** |

---

## 데이터 규칙 (자세한 건 `data/README.md`)

- 기사는 `issues.json` **한 파일**에만 넣는다. 별도 아카이브 없음.
- 오늘/과거를 나누는 건 **`date` 하나뿐** — `date === latestDate`면 '오늘 브리핑'.
- `id`는 `<국가소문자>-<pol|eco|oth>-<번호>`, **중복 금지** (중복 시 그래프 클릭이 엉뚱한 곳으로 점프).
- `topics`는 4개 안팎 명사. **누락하면 그래프에서 노드가 고립된다.**
- 새 날짜 추가 시 `latestDate` / `period` / `updatedAt`도 같이 갱신.
- 자동 수집분은 `"review": "pending"`으로 들어오고, 검수 후 `"ok"`로 바꾼다.

---

## 자동화 파이프라인

**크론이 둘이다. 수집이 먼저 돌고, 그 결과를 발송이 읽는다.**

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

### 발송 (send-briefing.yml)

- 시크릿 `GMAIL_USER` / `GMAIL_APP_PASSWORD`(앱 비밀번호 16자리),
  변수 `BRIEFING_TO`(콤마 구분) / `BRIEFING_FROM_NAME`. **모두 등록 완료 상태.**
- **오발송 방지**: 워크플로가 넘긴 `EXPECT_DATE`(KST 오늘)와 `latestDate`가 다르면
  **발송하지 않고 그냥 끝낸다.** 수집이 실패한 날 어제치를 다시 보내는 사고를 막는 장치다.
  오늘자 기사가 0건일 때도 마찬가지로 건너뛴다.
- 로컬 미리보기: `DRY_RUN=1 python scripts/send_briefing.py` → `preview_<국가>.html` 생성.
  **이 파일은 커밋하지 말 것** (배너가 data URI로 박혀 400KB가 넘는다).
- 의존성 없음 — `smtplib`/`email` 등 표준 라이브러리만 쓴다.
- 메일 본문의 `why` / `soWhat`은 `context` 안이 아니라 **이슈 최상위 필드**다.

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
