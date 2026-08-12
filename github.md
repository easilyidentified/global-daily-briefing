repo: easilyidentified/global-daily-briefing
branch: main

## Last sync

date: 2026-08-12

### Updated in this project

**메일 UI 개편안 적용 — Modernist (세션 22)**

- `scripts/send_briefing.py`의 팔레트 상수와 `render_html()`만 교체.
  데이터·워크플로·`send_via_gmail()`은 무수정
- 다크(우주 블랙) → **Modernist**: `#e4e1e1` 바탕 / `#f8f4f4` 컨테이너 /
  `#201e1d` 잉크 / `#ec3013` 레드, radius 0, 2px 괘선, 33px 제목
- **개편안 원본은 리포가 아니라 claude.ai Design 프로젝트에 있다** —
  `Global-Daily-Briefing email redesign` / `fde7ba93-63e7-4499-bf08-100cd9039c37`.
  세션 21이 로컬 폴더로 적어둔 위치는 틀렸고, reflog 복구도 필요 없었다
- 데이터 매핑 1:1 — 맥락 4행 라벨은 기존 코드와 문자열까지 동일해 스키마 무변경
- 사용자 결정: **번호는 카테고리마다 1부터**(통번호 아님),
  **`IMPACT` 본문 bold 제거**(`700`→`400`, `ISSUE`와 동일)
- 배너는 `cid:` 인라인 첨부 유지 (개편안의 원격 URL 대신). 이미지 차단 환경 대비
- **검증: KR 과거 10일치 전수 렌더 통과.** 08.10이 실제 경계 상황이었다 —
  출처 2개 6건 + `related` 없음 2건 → 출처 6개 전부, "함께 읽기"만 4줄.
  1건짜리 날은 빈 카테고리 섹션이 통째로 사라진다
- 발송 국가는 `BRIEFING_COUNTRY: KR` 하나뿐임을 확인 (4개국이 쌓여도 메일은 KR만)

**발송 멱등 가드 — `data/sent.json` 신설 (세션 22)**

- 국가별 마지막 발송 날짜를 남기고 `sent[국가].date == latestDate`면 보내지 않는다.
  스케줄 뒤 수동 실행·런 re-run에도 같은 메일이 두 번 나가지 않는다
- 기록은 **발송 성공 뒤에만** 쓰고, 워크플로 `Commit send marker` 스텝이 커밋한다.
  `send-briefing.yml` 권한 `contents: read` → **`write`**
- 기록이 깨져 있으면 발송하지 않고 **rc=2**. 중복 발송보다 미발송이 낫다는 기존 방침
- `FORCE_SEND=1`은 가드도 건너뛴다. `DRY_RUN`은 가드 앞에서 끝난다
- 08-12는 발송된 것으로 소급 기록. 새 디자인 첫 실전은 08-13 08:00

**사용자 결정 (세션 22)**

- **`review: "pending"` 검수는 하지 않는다.** `CLAUDE.md`에서 "검수 후 `ok`" 규칙 삭제
- `IMPACT` 라벨의 빨강은 유지, 본문 bold만 제거

**모바일 화면 대응 (세션 21)**

- `mobile-ui` 브랜치에서 커밋 9개로 작업 후 squash 병합.
  데스크탑 렌더는 건드리지 않았다 — 768px 이하와 관계도 레일만 바뀐다
- **속보창** 폭 171px → 343px, 위치를 국가 칩 바 위로. 지구가 보이는 높이 150 → 248px
- **지구본** 좁은 화면 카메라 5.25 → 11.8, 달·우주선을 세로 배치로 돌려 화면 안으로.
  `build()`가 `_w/_h`를 미리 채워 첫 `ResizeObserver` 콜백이 걸러지던 버그 동반 수정
- **이슈 관계도** 카드를 레일로 이전(데스크탑 좌우 세로 / 모바일 하단 가로).
  `cardBudget()` 상한 제거로 카드가 더 이상 잘리지 않는다.
  매 프레임 카드 배치를 계산하던 `balance→pack→placeCards` 삭제
- 모바일 노드 반지름 3.0 → 7.8px (반지름·허브 세로 배치·최소 배율 세 단계)
- 조작 토글 신설 — 켜야 핀치 줌·패닝. 기본은 꺼짐(페이지 스크롤 우선)
- 설정창 미니멀 재구성 + **색상 직접 편집**, 범례 최소화, 제목 페이드 인
- `issue-graph.js`에 `?v=` 버전 쿼리 추가 — 없어서 캐시에 눌러앉아 있었다

**제품 방향 — `ROADMAP.md` 신설**

- 목표 고객(B2C 2종·B2B 2종), 예정 기능, 온톨로지 계층안(L0~L5)
- **우선순위 1번은 DB.** 데이터가 곧 코드라 실시간 업로드가 불가능하고,
  public 리포에 `collect-prompt.md`와 축적 데이터가 열려 있어 B2B로 팔 물건이 없다
- 선행 사례 조사(GDELT / Event Registry / EventKG / NewsReader+GRaSP / ClaimsKG /
  IPTC / Palantir Foundry)와 설계 결정을 못박았다 — 국가는 루트가 아니라 필터,
  T-Box/A-Box 분리, 이슈라인은 노드가 아니라 경로, 사건=백엔드·이슈라인=화면,
  추출 원문 보존
- **작업 순서: DB → 온톨로지 로직 → UI.** UI는 후순위이고 며칠간 사이트는 현재 그대로 둔다

### 이전 sync (2026-08-12)

**자동화가 처음으로 사람 손 없이 한 바퀴 돌았다**

- 수집 에이전트가 하위 에이전트에 **위임하고 턴을 끝내던** 결함 수정 (`fd143fc`).
  `--allowedTools`는 실제로 제한을 걸지 못한다 — `--disallowedTools`로
  `Agent,Task,TaskCreate,TaskUpdate,TaskOutput,ScheduleWakeup,Monitor`를 차단해야 막힌다
- `timeout-minutes` 45 → **60** (위임 없이 직접 처리하니 31분 47초가 걸렸다)
- **08-12: 수집·발송 모두 무인 성공** — 수집 25분 52초 → `bbef0fd 브리핑 2026.08.12`,
  발송 08:50 KST 26명. 08-11에는 예약 발송이 뜨지 않아 수동으로 보냈으나 이번엔 자동으로 됐다.
  다만 **예약 지연은 여전하다** (23:00 UTC 예약 → 23:50 실행)

**맥락 파일 — 경로를 데스크탑 비의존적으로**

- `CLAUDE.md`에 박혀 있던 `C:\Users\user\Documents\global-daily-briefing`를 제거.
  데스크탑마다 경로·폴더명이 다르므로 "이 리포를 클론한 폴더"로 표현하고,
  새 데스크탑에서 `git config --local` 저자 설정을 먼저 잡는 절차를 규칙 1번에 추가

### 이전 sync (2026-08-10)

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
