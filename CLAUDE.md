# global-daily-briefing — 프로젝트 맥락

> 이 파일은 Claude Code가 세션 시작 시 자동으로 읽는다.
> **다른 데스크탑에서 작업을 이어받을 때는 이 파일 → `PROGRESS.md` 순으로 읽으면 된다.**

---

## 한 줄 요약

4개국(KR/US/CN/JP) 뉴스를 매일 아침 AI가 수집·요약해 `data/issues.json`에 쌓고,
3D 지구본 위에서 타임라인과 이슈 관계도로 보여주는 정적 웹앱.

- 리포: `easilyidentified/global-daily-briefing` (public, 기본 브랜치 `main`)
- 배포: GitHub Pages — https://easilyidentified.github.io/global-daily-briefing/
- 로컬 작업 폴더: `C:\Users\user\Documents\global-daily-briefing`

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
| `.github/workflows/daily-briefing.yml` | 스케줄 실행 + 자동 커밋 |
| `flags/` | 12개국 국기 PNG |
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

```
매일 06:40 KST (cron "40 21 * * *" UTC)
  GitHub Actions
    → anthropics/claude-code-action@v1 이 scripts/collect-prompt.md 를 읽고 실행
    → data/issues.json 갱신
    → 변경 있으면 briefing-bot 이름으로 자동 커밋 & 푸시
  이후 사람이 검수
```

- 인증: 리포 시크릿 `CLAUDE_CODE_OAUTH_TOKEN` (`claude setup-token`으로 발급). **등록 완료 상태.**
- 별도 API 과금 없음 — 본인 구독 쿼터를 소모한다.
- Actions는 UTC로 돈다. 날짜는 반드시 `TZ=Asia/Seoul`로 계산할 것.
- 검증 실패 시 저장하지 않는다 — 어제 데이터가 남는 편이 잘못된 기사보다 낫다.
- 기사 전문은 저장하지 않는다. 요약과 링크만.

---

## 세션 운영 규칙 (사용자 지시)

1. 모든 작업은 `C:\Users\user\Documents\global-daily-briefing`에서 한다.
2. 진척 상황은 **`PROGRESS.md`에 세션 단위로 append**한다.
3. **세션 종료 시 맥락 파일(`CLAUDE.md`, `PROGRESS.md`, `github.md`)을 커밋·푸시**한다.
   다른 데스크탑에서 `git pull`만으로 맥락을 이어받을 수 있어야 한다.
4. 다른 데스크탑에서 시작할 때는 **먼저 `git pull`** 한 뒤 이 파일과 `PROGRESS.md`를 읽는다.

---

## 주의할 점

- `anthropics/claude-code-action`의 입력 이름(`prompt`, `claude_args`)은 버전에 따라 바뀔 수 있다.
  실행 전 https://docs.claude.com/en/docs/claude-code/overview 확인.
- 국가를 늘리려면 `scripts/collect-prompt.md`의 '대상'과 `issues.json`의 `COUNTRIES`를 함께 손본다.
  지원 국가 코드는 `SUPPORTED_COUNTRIES`의 12개. 국가가 늘면 구독 쿼터도 그만큼 더 쓴다.
- `.dc.html` 파일명에 공백이 있다. 셸에서 다룰 때 반드시 따옴표로 감쌀 것.
