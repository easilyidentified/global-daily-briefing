# 진척 기록

세션 단위로 **위에서부터 최신순**으로 쌓는다. 각 항목은 `한 일 / 확인한 사실 / 다음 할 일` 구조.
프로젝트 구조와 규칙은 `CLAUDE.md`에 있다. 여기는 **시간순 기록**만 남긴다.

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
