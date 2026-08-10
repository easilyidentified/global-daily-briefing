# 진척 기록

세션 단위로 **위에서부터 최신순**으로 쌓는다. 각 항목은 `한 일 / 확인한 사실 / 다음 할 일` 구조.
프로젝트 구조와 규칙은 `CLAUDE.md`에 있다. 여기는 **시간순 기록**만 남긴다.

---

## 2026-08-10 (6) — 표 모바일 스택, 대륙 필터·날짜 박스 제거

### 1. '오늘의 주요 이슈' 표 — 모바일에서 카드로 접기

3열 테이블(분야 / Why / So What)이 모바일에서 열이 눌려 읽기 어려웠다.
`thead`를 숨기고 각 행을 카드 한 장으로 세우되, **각 칸이 `data-label`을 제 라벨로 띄우게** 했다.
라벨 없이 그냥 쌓기만 하면 어느 쪽이 Why고 어느 쪽이 So What인지 알 수 없다.

```
[정치 1]                  ← 분야 태그
WHY · 배경 원인
첨단산업 인력난과 …
│ SO WHAT · 향후 영향     ← 강조색 좌측 보더로 구분
│ 부처 간 이견이 …
```

- `.issue-table thead{display:none}` / `tr,td{display:block}`
- `td[data-label]::before{content:attr(data-label)}` — 라벨 자동 생성
- `.c-sowhat`에 `border-left:2px solid #ec3013` — Why와 So What을 눈으로 구분

데스크탑은 그대로다 (1280px 실측: `thead` 표시, 3열 120/506/550px 나란히).

### 2. 지구본 대륙 필터 제거

좌측 세로 버튼 7개(전체/아시아/북미/유럽/중동/남미/오세아니아)를 걷어냈다.

- 마크업 블록 삭제
- `<globe-stage>`의 `region` 속성 제거 — `globe.js:64`가 속성 부재 시 `'All'`로 기본 처리하므로 안전
- `state.region`, `regionDefs`, `regions` 제거
- 칩 흐리기 로직(`dim`) 제거 → `opacity:'1'` 고정

### 3. 우측 상단 날짜 박스 제거

- 마크업 블록과 `date` / `dates` / `onDate` / `state.date` 제거
- **부수 효과로 하드코딩 버그를 하나 걷어냈다** — `dates`가
  `['2026.08.09','2026.08.08','2026.08.07']`로 박혀 있어 이미 오늘 날짜를 못 담고 있었다
- 남은 `{{ date }}` 라벨(`KR · Daily Briefing · …`)은 데이터에서 파생하도록 교체:
  `latestDate(d)` 헬퍼 신설 → `COUNTRIES`의 `latestDate` 중 최댓값
- 빈 브리핑 안내문에서도 고정 날짜를 빼 스스로 갱신되게 했다

### 검증 — 헤드리스 Chrome

| 항목 | 결과 |
| --- | --- |
| 미해결 템플릿 변수 (`.sc-unresolved`/`.sc-missing`) | 0 |
| 로직 오류 (`.sc-logic-error`) | 0 |
| 콘솔 오류·예외 | 없음 |
| 대륙 필터 버튼 | 0개 |
| 날짜 `<select>` | 0개 |
| 390px 가로 넘침 | 없음 (`scrollWidth 390 = vw`) |
| 1280px 표 레이아웃 | 3열 유지, 회귀 없음 |

### 손대지 않은 곳

- **지구본 하단 국가 칩 바** — `repeat(12,1fr)`이라 390px에서 칸당 32px,
  국가명이 한 글자로 잘린다 (`대`, `미`, `중` …)
- 뉴스레터 블록 (`font-size:38px`, `padding:56px 40px`)

---

## 2026-08-10 (5) — '분야별 주요 소식 및 맥락 분석' 모바일 레이아웃 수정

### 원인 — 프로젝트 전체에 미디어 쿼리가 하나도 없었다

`Globe Briefing.dc.html`, `_ds/*/styles.css` 어디에도 `@media` 규칙이 없었다.
데스크탑 고정 폭 레이아웃이 모바일에서 그대로 렌더링되고 있었다.

390px 화면 기준 실측 (컨테이너 좌우 패딩 32px씩 제외 → 가용 폭 326px):

| 요소 | 문제 |
| --- | --- |
| 탭 바 (정치/경제/기타) | `padding:16px 26px` 3개 ≈ 351px → **가로 스크롤 발생** |
| 기사 카드 | `grid-template-columns:150px 1fr` + `padding-left:30px` → 본문 열이 **약 118px** |
| 맥락 패널 | `grid-template-columns:170px 1fr` → 118px 칸 안에서 또 넘침 |
| 섹션 제목 | 한 줄에 안 들어가는데 `flex-wrap` 없음 |
| 우하단 고정 버튼 | 58×58px가 '출처' 링크와 관련기사 박스를 덮음 |

### 적용한 수정 — `Globe Briefing.dc.html`

이 화면은 전부 인라인 `style`로 짜여 있어 선택자 특이도로는 못 이긴다.
**훅 클래스 + `@media (max-width:768px)` + `!important`** 조합으로 처리했다.
(`support.js:436`에서 `class` → `className` 변환이 되므로 클래스가 유지된다)

- `.briefing-wrap` 좌우 패딩 32px → 18px
- `.sec-head` 줄바꿈 허용, 제목 15px → 13px
- `.stream-tabs` / `.stream-tab` 전체 폭 3등분, 패딩 축소
- `.stream-orders` 아래 줄로 분리
- `.stream-item` 1열로 전환, 날짜·분류·번호는 가로 한 줄로 접음
- `.stream-title` 25px → 20px
- `.stream-panel` 1열로 전환 (라벨 위 / 본문 아래)
- `.stream-relgrid` 1열로 전환
- `.fab` 58px → 44px, 구석으로 이동 (본문 가림 해소)
- 본문 열에 `min-width:0` 추가 — grid 자식의 기본 `min-width:auto`가 축소를 막고 있었다

### 검증 — 헤드리스 Chrome으로 실측

`puppeteer` 설치 없이 Chrome을 CDP로 직접 구동해 `document.scrollWidth`를 쟀다.

| 폭 | 수정 전 | 수정 후 |
| --- | --- | --- |
| 360px | — | 360 ✅ |
| 390px | **477** ❌ (87px 넘침) | 390 ✅ |
| 430px | **477** ❌ (47px 넘침) | 430 ✅ |
| 768px | — | 768 ✅ |

넘침 요소도 10개 → 3개로 줄었고, 남은 3개는 모두 무해하다:
지구본 속보 마커 2개(`overflow:hidden` 섹션 내부)와 `aria-hidden` 장식용 div 1개.

### 손대지 않은 곳

같은 문제를 안고 있으나 이번 요청 범위 밖이라 그대로 둔 구간:

- **'오늘의 주요 이슈' 표** — `width:120px` 고정 열의 3열 테이블. 페이지 가로 스크롤은
  더 이상 없지만 모바일에서 열이 눌린다
- **뉴스레터 블록** — `font-size:38px`, `padding:56px 40px`
- **지구본 화면 상단 바** — `padding:22px 32px`의 좌우 배치

### 다음 할 일

1. 실제 기기에서 확인 (헤드리스 측정은 폰트 로딩·터치 영역까지 재현하지 못한다)
2. 위 세 구간도 같은 방식으로 처리할지 결정

---

## 2026-08-10 (4) — `related` 누락 원인 규명, 지시서 3단계 재구성

### 원인 — 탐색 실패가 아니라 배분 누락

`related`가 빈 5건이 왜 생겼는지 데이터에서 역상관이 나왔다.

```
related 있는 19건 →  sources 1개짜리 12건,  2개짜리 7건
related 없는  5건 →  전부 sources 2개
```

**5건 모두 두 번째 매체 기사를 찾아놓고 `related`로 올리는 대신 `sources` 배열에 넣어버렸다.**
예: `jp-pol-20260810-1`은 The Japan Times와 Nippon.com 두 건을 확보했으나 둘 다 출처로 처리.

근본 원인은 지시서의 **`sources` 개수 규칙 부재**였다. 필드 규칙 표에 `sources` 행 자체가 없어서
"두 번째로 찾은 기사를 어디로 보낼지"가 정의되지 않았다.

### 방증 — `related` type 분포가 뒤집혀 있었다

| | 반박 | 유사 | 다름 |
| --- | --- | --- | --- |
| 기존 (수기 48건) | **23** | 6 | 19 |
| 신규 (AI 19건) | **1** | **15** | 3 |

수기는 '반박'이 절반인데 AI는 1건. **반박 기사는 별도로 찾아야 나온다** —
AI가 한 번의 검색 결과에서 손에 잡히는 걸 골랐을 뿐 `related` 전용 탐색을 하지 않았다는 뜻이다.

### 적용한 수정

**`scripts/collect-prompt.md` — 3단계 구조로 재구성** (사용자 제안)

```
0단계 기존 파일 읽기 → 1단계 이슈 탐색 → 2단계 related 확보 → 3단계 정제 및 저장
```

- **1단계**: 검색 결과에서 대표 기사 1건만 `sources`에 넣고, **나머지는 버리지 말고 2단계로 넘긴다**
- **2단계**: ① 1단계 잔여 후보를 먼저 배정 → ② 없을 때만 `"<핵심어> 비판/반론"`으로 추가 검색
  → ③ 그래도 없으면 생략. **1단계 결과 재사용을 우선해 검색 비용 증가를 억제**하는 절충 설계
- **2단계**: `반박`·`다름` 우선, `유사`가 전체 절반을 넘지 않도록 명시
- **필드 규칙에 `sources` 행 신설** — 기사당 1건 원칙, 두 번째 기사는 `related`로
- **검증 체크리스트 4개 항목 추가** — `sources` 개수 / `related` 전건 존재 / `유사` 비율 / `updatedAt` KST
- `updatedAt` 4개국 KST 통일 명시 (지난 실행에서 EST·CST·JST 혼용된 문제)

**`.github/workflows/daily-briefing.yml` — 실행 로그 아티팩트 업로드 추가**

이번 원인 분석에서 턴 단위 기록이 없어 데이터 역산에 의존해야 했다.
`claude-execution-output.json`은 러너의 `_temp`에만 남고 폐기된다(`artifacts: 0`).
`actions/upload-artifact@v4`로 14일 보관하도록 추가 — 다음부터는 추측 없이 확인 가능하다.

### 다음 할 일

1. 수정된 지시서로 재실행해 `related` 24/24 및 `유사` 비율 개선 확인
   — 단, 오늘자(`2026.08.10`) 데이터가 이미 있어 0단계 규칙상 **전 국가가 건너뛰어진다.**
   내일 실행하거나, 검증하려면 임시로 `latestDate`를 되돌려야 한다
2. 기존 24건의 `related` 누락 5건은 수기 보완 또는 그대로 두기
3. 비용 정책 결정 후 cron 활성화

---

## 2026-08-10 (3) — 수정 검증 완료: **파이프라인 정상 동작 확인**

### 결론

**푸시까지 통과했다. 자동 수집 파이프라인이 처음으로 끝까지 성공했다.**

### 실행 결과 — run `31363178855`

| 항목 | 값 |
| --- | --- |
| 결론 | ✅ **success** |
| 소요 시간 | 13분 9초 (06:45:22Z → 06:58:31Z) — 이전 24분에서 단축 |
| Claude 실행 | `is_error: false`, `num_turns: 51`, `total_cost_usd: **$5.98**` |
| 커밋 | ✅ `a42b974 브리핑 2026.08.10` (866 insertions, 12 deletions) |
| 푸시 | ✅ `9158d8f..a42b974  HEAD -> main` |

### 데이터 검증 (로컬 pull 후 스크립트 검사)

| 검사 항목 | 결과 |
| --- | --- |
| 4개국 `latestDate` | ✅ 전부 `2026.08.10` |
| 국가별 신규 기사 | ✅ 6건씩 (정치 2 / 경제 2 / 기타 2), 총 24건 |
| 누적 기사 수 | 국가당 12건 → **18건** |
| `id` 중복 | ✅ 없음 |
| 필수 필드 누락 (`context` 4개 포함) | ✅ 없음 |
| `coreQuestion`이 `~까요?`로 끝나는가 | ✅ 24/24 통과 |
| `review: "pending"` | ✅ 24/24 |
| `period` / `updatedAt` 갱신 | ✅ 됨 |

### 그래프 연결성 — 가장 중요했던 리스크, 통과

`issue-graph.js`의 `similarity()`(topics 가중 자카드 + 동일 카테고리 시 0.08, 임계값 0.05)를
그대로 재현해 검사했다.

> **과거 기사와 연결이 하나도 없는 신규 노드: 0 / 24**

`PIPELINE.md`가 경고했던 "새 점이 고립되는" 문제는 발생하지 않았다.
지시서의 topics 재사용 규칙이 실제로 작동한다.

### 남은 흠 두 가지 (동작에는 지장 없음)

1. **`related` 누락 5건** — `kr-eco-20260810-2`, `kr-oth-20260810-2`, `jp-pol-20260810-1`,
   `jp-pol-20260810-2`, `jp-oth-20260810-1`.
   화면에서 '함께 읽으면 좋은 기사' 블록이 비어 보인다.
   지시서의 저장 전 검증 체크리스트에 `related` 항목이 없어서 걸러지지 않았다.
2. **`updatedAt` 타임존 불일치** — 지시서는 `"오늘날짜 08:00 KST"`로 고정하라고 했으나
   실제로는 US=`EST`, CN=`CST`, JP=`JST`로 각국 현지 시간대를 썼다. KR만 `KST`.

### 다음 할 일

1. 화면에서 실제 렌더링 확인 — `python -m http.server 8000` 후 타임라인·관계도 육안 검수
2. 24건 검수 후 `review`를 `"ok"`로 변경
3. 위 흠 2건을 고칠지 결정 — 고친다면 `scripts/collect-prompt.md`의 검증 체크리스트에
   `related` 존재 여부와 `updatedAt` 타임존 고정을 추가
4. **비용 정책 결정 후 cron 활성화** — 2회 실측 $9.14 / $5.98, 평균 ~$7.5.
   매일 실행 시 월 $225 상당 쿼터

---

## 2026-08-10 (2) — 워크플로 재실행: 수집 성공, **푸시 인증 실패** 원인 규명 및 수정

### 결론

**수집 로직은 정상이었다. 문제는 마지막 `git push` 단계의 인증이었다.**

### 실행 결과 — run `31361075139`

| 항목 | 값 |
| --- | --- |
| 소요 시간 | **24분** (06:11:55Z → 06:36:10Z) |
| Claude 실행 | `is_error: false`, `num_turns: 88`, `total_cost_usd: **$9.14**` |
| 데이터 변경 | ✅ `data/issues.json` **897 insertions, 12 deletions** |
| 로컬 커밋 | ✅ `bb24423 브리핑 2026.08.10` |
| 푸시 | ❌ `remote: Invalid username or token` → exit 128 |
| 최종 결론 | **failure** — 러너가 폐기되며 수집한 데이터도 함께 사라졌다 |

> 12 deletions는 4개국 × (`latestDate`/`period`/`updatedAt`) = 12줄 교체와 정확히 일치한다.
> 지시서대로 동작했다는 뜻이다.

### 원인

로그 타임라인이 원인을 그대로 보여준다.

```
06:12:00  actions/checkout@v4 이 http.https://github.com/.extraheader 에 GITHUB_TOKEN 심음
06:12:06  claude-code-action: "Using GITHUB_TOKEN from OIDC" — 자체 앱 토큰을 OIDC로 발급
06:36:06.9  claude-code-action: "Revoke app token" — 스텝 종료하며 그 앱 토큰을 폐기
06:36:07.3  Commit result 스텝의 git push → 폐기된 토큰을 사용 → 401
```

즉 `claude-code-action`이 자신의 앱 토큰을 git 자격증명에 심어두고 스텝이 끝날 때 폐기하는데,
그 다음 스텝의 `git push`가 그 폐기된 자격증명을 그대로 집어 든다.
**워크플로 자체의 `GITHUB_TOKEN`은 멀쩡했지만 쓰이지 않았다.**

### 적용한 수정 — `.github/workflows/daily-briefing.yml`

1. `Commit result` 스텝에 `env: GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` 추가
2. 푸시 직전에 오염된 자격증명을 제거하고 워크플로 토큰으로 명시적으로 푸시

```bash
git config --local --unset-all http.https://github.com/.extraheader || true
git push "https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git" HEAD:main
```

3. 폭주 방지용 `timeout-minutes: 45` 추가 (실측 24분 기준)

### 짚고 넘어갈 것 — 비용

**1회 실행에 $9.14, 24분.** 매일 돌리면 월 $270 상당의 구독 쿼터를 쓴다.
`PIPELINE.md`에는 "무료 범위"로 적혀 있으나 실측치는 그렇지 않다. cron을 켜기 전에 결정이 필요하다.

줄이는 선택지:
- 국가 수를 4개 → 2개로 (`scripts/collect-prompt.md`의 '대상')
- 국가당 6건 → 3~4건으로
- `related` 기사 필수 조건 완화 — 기사마다 검색이 2배로 드는 주범
- 매일 → 격일 또는 주 3회

### 다음 할 일

1. 수정된 워크플로로 **재실행해 푸시까지 통과하는지 확인** (다시 ~$9, ~24분 소요)
2. 통과하면 그래프에서 새 노드가 기존 노드와 이어지는지 확인
3. 비용 정책을 정한 뒤 cron 활성화

---

## 2026-08-10 (1) — 로컬 개발 환경 연결, 파이프라인 현황 점검

### 한 일

- `C:\Users\user\Documents\global-daily-briefing`에 리포를 클론해 로컬 작업 폴더로 지정했다.
  - `origin` = `https://github.com/easilyidentified/global-daily-briefing.git`, 브랜치 `main`
  - `gh` CLI가 `easilyidentified` 계정으로 이미 인증되어 있어 push/PR 바로 가능
- 리포 전체를 읽고 프로젝트 맥락 문서 `CLAUDE.md`를 새로 작성했다.
- 세션 진척 로그(이 파일)를 만들었다.

### 확인한 사실

**자동화 파이프라인 — 절반만 동작 중**

| 항목 | 상태 |
| --- | --- |
| 리포 시크릿 `CLAUDE_CODE_OAUTH_TOKEN` | ✅ 등록됨 (2026-08-10 05:48 UTC) |
| GitHub Pages 배포 | ✅ 성공 (run `31360041320`) |
| 워크플로 수동 실행 | ⚠️ 2회 실패 후 3회차 성공 — 그러나 **데이터가 갱신되지 않음** |
| cron 자동 실행 | ❌ 아직 주석 처리 상태 |

- 실패한 실행: `31359446040`(28s), `31359570208`(31s) — 둘 다 시크릿 등록 이전 시각이라 인증 문제로 보인다.
- 성공한 실행: `31359799043` (05:49 UTC, 2m25s)
  - `is_error: false`, `num_turns: 9`, `total_cost_usd: 1.35` — 액션 자체는 정상 완료
  - 그러나 커밋 스텝 로그가 **"변경 없음 — 커밋하지 않습니다."**
  - 즉 Claude가 `data/issues.json`을 건드리지 않았다
  - 이 실행이 체크아웃한 커밋은 `02667638`이고, 현재 HEAD인 `1031c57`("Add files via upload")은 05:53 —
    **실행 이후에 사람이 파일을 업로드**했다. 실행 시점의 리포 상태가 지금과 달랐을 가능성이 있다.

**데이터 현황** — `data/issues.json`

- `SUPPORTED_COUNTRIES` 12개국 정의됨
- 실제 기사가 있는 국가는 4개: KR / US / CN / JP, 각각 12건
- 네 국가 모두 `latestDate` = `2026.08.09`
- `review: "pending"` 항목 0건
- → **오늘(2026.08.10) 브리핑은 아직 수집되지 않았다.**

### 다음 할 일

1. **워크플로를 현재 HEAD 기준으로 다시 수동 실행**해서 `data/issues.json`이 실제로 갱신되는지 확인
   `gh workflow run "Daily Briefing"` → `gh run watch`
2. 갱신되지 않으면 실행 로그에서 Claude의 실제 응답을 확인하고 `scripts/collect-prompt.md`를 조정
   (지시서가 "변경 불필요"로 판단하게 만드는 문구가 있는지 점검)
3. 결과가 정상이면 `.github/workflows/daily-briefing.yml`의 `schedule` 블록 주석을 풀어 **자동 실행 활성화**
4. 첫 자동 수집 후 그래프에서 **새 노드가 기존 노드와 연결되는지** 확인
   — 고립돼 있으면 지시서의 `topics` 재사용 규칙을 강화해야 한다
5. (선택) 화면에 `review: "pending"` 배지 표시 — `PIPELINE.md`에 후보로 적혀 있음

### 미해결 질문

- 성공한 실행이 데이터를 갱신하지 않은 원인이 **지시서 문제**인지 **체크아웃 시점 문제**인지 아직 구분되지 않았다.
  1번 항목(재실행)으로 판별 가능하다.
