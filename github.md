repo: easilyidentified/global-daily-briefing
branch: main

## Last sync

date: 2026-08-10

### Updated in this project

- 일일 브리핑 자동 수집 워크플로(`.github/workflows/daily-briefing.yml`) 추가
- AI 수집 지시서(`scripts/collect-prompt.md`) 추가 — 스키마·검증·topics 재사용 규칙 포함
- 파이프라인 안내(`PIPELINE.md`)를 Claude Code OAuth 방식으로 재작성
- 저장소가 비어 있어(커밋 없음) 가져온 파일은 없습니다

## Screen map

| 화면 | 소스 파일 |
| --- | --- |
| Globe Briefing (지구 + 브리핑) | `Globe Briefing.dc.html`, `globe.js`, `issue-graph.js` |
| 브리핑 데이터 | `data/issues.json` (워크플로가 매일 갱신) |
| 속보 데이터 | `data/flashes.json` (수동 관리) |
