# 자동 수집 파이프라인

매일 아침 AI가 4개국 기사를 수집해 `data/issues.json`을 갱신하고, 게시 후 사람이 검수하는 구조입니다.

```
매일 06:40 KST
  GitHub Actions 실행
    → Claude Code Action이 웹 검색으로 뉴스 수집 + 요약
    → data/issues.json 갱신
    → 자동 커밋 & 푸시
  이후 사람이 검수 → 문제 있으면 해당 항목 수정 또는 커밋 되돌리기
```

**비용** — GitHub Actions는 무료 범위 안이고, Claude Code Action은 OAuth 토큰으로 기존 구독 사용량을 씁니다. 별도 API 과금이 발생하지 않습니다. 다만 본인 구독 쿼터를 함께 소모하므로 실행 시각을 새벽으로 잡아 두었습니다.

---

## 만들어 둔 파일

| 파일 | 역할 |
| --- | --- |
| `.github/workflows/daily-briefing.yml` | 실행 스케줄과 커밋 처리 |
| `scripts/collect-prompt.md` | AI에게 주는 수집 지시서 — 스키마, 검증 규칙, topics 재사용 규칙 |

수집 로직은 코드가 아니라 **지시서(마크다운)** 에 담겨 있습니다. 요약 방식을 바꾸고 싶으면 `collect-prompt.md`만 고치면 됩니다.

---

## 진행 순서

### 1. 토큰 발급 (로컬 터미널)

```bash
claude setup-token
```

출력된 토큰 값은 **누구에게도 붙여넣지 마세요.** 다음 단계에서 바로 씁니다.

### 2. 저장소에 등록

저장소 → **Settings → Secrets and variables → Actions → New repository secret**

- Name: `CLAUDE_CODE_OAUTH_TOKEN`
- Secret: 1단계에서 나온 값

### 3. 첫 수동 실행

저장소 → **Actions → Daily Briefing → Run workflow**

cron은 일부러 주석 처리해 두었습니다. 버튼으로 먼저 돌려보고 결과를 확인하는 순서입니다.

### 4. 결과 확인

- 새로 생긴 커밋의 `data/issues.json` diff를 봅니다.
- 화면을 열어 타임라인과 이슈 관계도가 정상인지 확인합니다.
- **특히 그래프에 새 점이 기존 점과 이어지는지 봅니다.** 고립돼 있으면 `topics` 재사용이 안 된 것이니 지시서의 topics 규칙을 강화해야 합니다.

### 5. 자동 실행 켜기

결과가 만족스러우면 워크플로 파일에서 `schedule` 블록의 주석을 풉니다.

```yaml
  schedule:
    - cron: "40 21 * * *"   # UTC 21:40 = KST 06:40
```

---

## 사후 검수

자동 수집된 기사는 `"review": "pending"` 상태로 들어옵니다.

- 확인 후 문제없으면 `"ok"`로 바꿉니다.
- 잘못된 기사는 해당 객체만 지우고 커밋합니다.
- 전체를 되돌리려면 GitHub에서 해당 커밋의 **Revert** 버튼을 누릅니다.

화면에 '검수 전' 표시를 붙이고 싶으면 말씀해 주세요. `review` 값을 읽어 배지를 다는 건 간단합니다.

---

## 주의할 점

- **명령어와 액션 버전은 바뀔 수 있습니다.** 실행 전 https://docs.claude.com/en/docs/claude-code/overview 에서 확인하세요. 특히 `claude-code-action`의 입력 이름(`prompt_file`, `allowed_tools`)이 달라졌을 수 있습니다.
- **날짜는 KST로 계산해야 합니다.** Actions는 UTC로 돕니다. 워크플로의 커밋 메시지에 `TZ=Asia/Seoul`을 붙여 둔 이유입니다.
- **검증 실패 시 저장하지 않습니다.** 지시서에 명시해 두었습니다. 어제 데이터가 그대로 남는 편이 잘못된 기사가 올라가는 것보다 낫습니다.
- **속보(`data/flashes.json`)는 자동화 대상이 아닙니다.** 이벤트성이라 사람이 직접 넣는 편이 낫습니다.
- **기사 전문은 저장하지 않습니다.** 요약과 링크만 둡니다.

---

## 국가를 늘리려면

`scripts/collect-prompt.md`의 '대상' 항목에 국가 코드를 추가하고, `data/issues.json`의 `COUNTRIES`에 해당 국가 객체를 만들어 두면 됩니다. 지원 국가 코드는 `SUPPORTED_COUNTRIES`의 12개입니다. 국가를 늘리면 그만큼 구독 쿼터를 더 씁니다.
