repo: easilyidentified/global-daily-briefing
branch: main

## Last sync

date: 2026-08-10

### Updated in this project

**파이프라인 — 이제 크론이 둘이다**

- ⚠️ **수집이 UTC 날짜를 쓰던 결함을 잡았다.** 크론은 21:40 UTC에 도는데 그 시각은
  KST로 다음 날이고, 에이전트에는 `Bash`가 없어 날짜를 확인할 수단이 없었다.
  그대로 두면 전 국가가 건너뛰어져 수집이 비고 메일도 안 나간다.
  워크플로가 KST 날짜를 계산해 **프롬프트에 주입**하도록 고쳤다 (`c21d726`)

- 수집 `daily-briefing.yml` **06:40 KST**. 푸시 인증 오류 수정 후 첫 완주 성공
  (`a42b974 브리핑 2026.08.10`, 4개국 × 6건 = 24건). cron 활성화 완료, 첫 자동 실행 2026-08-11
- 발송 `send-briefing.yml` **08:00 KST** 신설 — `scripts/send_briefing.py`가
  Gmail SMTP로 KR 브리핑 메일을 보낸다. 시크릿·변수 등록 완료, 수동 실행 2회 success
- 발송에는 **오발송 방지 장치**가 있다. `latestDate`가 KST 오늘과 다르면 그냥 건너뛴다
- 실행 규모는 수집 1회 13~24분. 로그의 `total_cost_usd`는 API 정가 환산 명목값이며
  구독(Max 플랜) 토큰으로 도는 만큼 **별도 청구는 없다**

**이슈 관계도 — 요약 카드 도입 (`issue-graph.js` +297줄)**

- 노드 옆에 이슈 요약 카드를 세우고 점선 리더로 잇는다. 툴바·설정 패널로 끌 수 있다
- 카드를 클릭하면 노드를 클릭한 것과 **같은** 핀·강조 효과가 난다
- 좁은 화면(그래프 폭 720px 이하)은 상시 카드를 띄우지 않고,
  탭했을 때만 **하단에 1장 도킹**한다. 측면 거터를 쓰면 노드 자리가 80px밖에 안 남는다
- 카드의 '더 자세히 보기'는 **'오늘의 주요 이슈' 표의 해당 행**으로 이동한다
  (과거 이슈는 표에 행이 없어 '분야별 …' 스트림으로 폴백)

**모바일 대응** — 프로젝트에 `@media` 규칙이 하나도 없던 것을 세 구간에 걸쳐 처리
(분야별 소식 블록 / 표 카드 스택 / 지구본 칩 바 4열 3행). 360~430px 가로 넘침 0 실측

### 이전 sync (2026-08-10 이전)

- 일일 브리핑 자동 수집 워크플로(`.github/workflows/daily-briefing.yml`) 추가
- AI 수집 지시서(`scripts/collect-prompt.md`) 추가 — 스키마·검증·topics 재사용 규칙 포함
- 파이프라인 안내(`PIPELINE.md`)를 Claude Code OAuth 방식으로 재작성

## Screen map

| 화면 | 소스 파일 |
| --- | --- |
| Globe Briefing (지구 + 브리핑) | `Globe Briefing.dc.html`, `globe.js`, `issue-graph.js` |
| 브리핑 이메일 | `scripts/send_briefing.py`, `assets/email_banner.png` |
| 브리핑 데이터 | `data/issues.json` (워크플로가 매일 갱신) |
| 속보 데이터 | `data/flashes.json` (수동 관리) |

## 맥락 이어받기 (다른 데스크탑)

```bash
git clone https://github.com/easilyidentified/global-daily-briefing.git
cd global-daily-briefing
```

읽는 순서: `CLAUDE.md` → `PROGRESS.md` → (데이터 만질 때) `data/README.md`
