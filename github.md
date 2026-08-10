repo: easilyidentified/global-daily-briefing
branch: main

## Last sync

date: 2026-08-10

### Updated in this project

- 로컬 작업 폴더를 `C:\Users\user\Documents\global-daily-briefing`로 지정하고 리포를 클론
- 프로젝트 맥락 문서 `CLAUDE.md` 추가 — 구조·데이터 규칙·파이프라인·세션 운영 규칙
- 세션 진척 로그 `PROGRESS.md` 추가 — 이후 모든 작업은 여기에 append
- 파이프라인 현황 점검: 시크릿 등록됨 / 수동 실행 성공했으나 데이터 미갱신 / cron 아직 비활성

### 이전 sync (2026-08-10 이전)

- 일일 브리핑 자동 수집 워크플로(`.github/workflows/daily-briefing.yml`) 추가
- AI 수집 지시서(`scripts/collect-prompt.md`) 추가 — 스키마·검증·topics 재사용 규칙 포함
- 파이프라인 안내(`PIPELINE.md`)를 Claude Code OAuth 방식으로 재작성

## Screen map

| 화면 | 소스 파일 |
| --- | --- |
| Globe Briefing (지구 + 브리핑) | `Globe Briefing.dc.html`, `globe.js`, `issue-graph.js` |
| 브리핑 데이터 | `data/issues.json` (워크플로가 매일 갱신) |
| 속보 데이터 | `data/flashes.json` (수동 관리) |

## 맥락 이어받기 (다른 데스크탑)

```bash
git clone https://github.com/easilyidentified/global-daily-briefing.git
cd global-daily-briefing
```

읽는 순서: `CLAUDE.md` → `PROGRESS.md` → (데이터 만질 때) `data/README.md`
