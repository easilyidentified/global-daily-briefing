# 데이터 구조 안내

기사는 **`issues.json` 한 파일**에만 넣습니다. 오늘 기사와 과거 기사의 형식은 동일합니다.

```
issues.json
├─ SUPPORTED_COUNTRIES   지구본에 찍히는 12개국 좌표·이름
└─ COUNTRIES
   └─ KR
      ├─ countryName / countryNameEn
      ├─ latestDate     이 국가의 최신 브리핑 날짜
      ├─ period / updatedAt
      └─ issues[]       모든 이슈 (최신순)
```

**오늘 기사와 과거 기사를 나누는 것은 `date` 하나뿐입니다.** `date === latestDate`인 항목이 자동으로 '오늘 브리핑'으로 취급됩니다. 별도 아카이브 파일은 없습니다.

---

## 기사 하나 추가하기

`COUNTRIES.<국가코드>.issues` 배열에 객체 하나를 넣습니다.

```json
{
  "id": "kr-pol-3",
  "date": "2026.08.09",
  "category": "politics",
  "categoryLabel": "정치",
  "title": "기사 제목",
  "summary": "Answer First — 결론부터 한두 문장",
  "why": "왜 지금 발생했는가 (매핑 표 왼쪽 칸)",
  "soWhat": "앞으로 무엇이 달라지는가 (매핑 표 오른쪽 칸)",
  "context": {
    "background": "배경 · 기존",
    "issueContext": "문제 · 이슈 맥락",
    "coreQuestion": "질문 · 핵심 Q",
    "resolution": "결론 · 이슈"
  },
  "sources": [{ "name": "연합뉴스", "url": "https://www.yna.co.kr" }],
  "related": {
    "title": "함께 읽으면 좋은 기사 제목",
    "source": "조선비즈",
    "url": "https://biz.chosun.com",
    "type": "반박"
  },
  "topics": ["반도체", "세액공제", "국회", "투자"]
}
```

### 필드 규칙

| 필드 | 규칙 |
| --- | --- |
| `id` | `<국가소문자>-<pol\|eco\|oth>-<번호>`. 스크롤 점프의 키. **중복 금지.** |
| `date` | `YYYY.MM.DD`. 정렬, "N일 전" 라벨, 그래프 기간 필터·색상의 기준. |
| `category` | `politics` / `economy` / `other` 셋 중 하나. `categoryLabel`은 화면에 찍히는 한글. |
| `summary` | 그래프 툴팁의 Answer First. |
| `context` | 4개 필드 모두 필수. 오늘·과거 구분 없이 전부 표시됩니다. |
| `related` | `type`은 `유사` / `반박` / `다름`. 생략하면 블록이 비어 보입니다. |
| `topics` | 4개 안팎의 명사 키워드. **다른 기사와 같은 단어를 공유하면 그래프에 선이 생깁니다.** |

새 날짜의 브리핑을 올릴 때는 `latestDate`·`period`·`updatedAt`도 함께 갱신하세요.

---

## 추가하면 자동으로 반영되는 곳

1. **분야별 타임라인** — 해당 카테고리 탭에 날짜순으로 끼어듭니다.
2. **이슈 관계도** — 노드가 하나 생기고, `topics`가 겹치는 기사와 이어집니다.
3. **매핑 표** — `date === latestDate`인 기사만 `why` / `soWhat` 행으로 들어갑니다.
4. **함께 읽으면 좋은 기사** — 요약 하단에 붙습니다.

## 자주 하는 실수

- `id` 중복 → 그래프 클릭 시 엉뚱한 요약으로 점프합니다.
- `topics` 누락 → 노드가 고립됩니다 (카테고리 허브에만 연결).
- `latestDate` 미갱신 → 새 기사가 '오늘'로 잡히지 않고 과거 이슈로 표시됩니다.
- 지원 국가는 `SUPPORTED_COUNTRIES`의 12개. 기사가 없는 국가는 '준비 중'으로 나옵니다.

---

## 속보 · 이벤트 이슈 — `flashes.json`

지구 화면 위에 뜨는 이벤트성 속보입니다. 배열에 항목을 넣으면 마커와 칩이 생기고, 클릭하면 요약 박스가 열립니다. 코드는 건드리지 않습니다.

**우주에 띄우기** (스타십 등)

```json
{
  "id": "starship-moon",
  "kind": "space",
  "ship": true,
  "position": [1.72, 0.42, -0.9],
  "label": "속보",
  "date": "2026.02.25",
  "category": "우주",
  "title": "제목",
  "summary": "Answer First",
  "source": "조선일보",
  "url": "https://..."
}
```

**국가 위에 점 찍기**

```json
{
  "id": "kr-flash-1",
  "kind": "country",
  "code": "KR",
  "label": "속보",
  "date": "2026.08.09",
  "category": "정치",
  "title": "제목",
  "summary": "Answer First",
  "source": "연합뉴스",
  "url": "https://..."
}
```

- `kind`: `space`(우주 좌표) 또는 `country`(국가 위). country는 지구와 함께 회전하고 뒷면으로 넘어가면 자동으로 숨습니다.
- `ship: true`면 그 자리에 스타십 모델이 놓입니다. 없으면 맥동하는 점만 표시됩니다.
- `position`: `kind: space`일 때만. 지구 반지름이 1이고 달은 `[2.95, -1.25, -2.3]`입니다.
- `label`: 칩에 찍히는 글자. `속보` 대신 `단독`, `LIVE` 등 자유롭게.
- `color`: 생략하면 강조색(#ec3013). 다른 색을 쓰면 마커와 칩이 함께 바뀝니다.
- 여러 개를 동시에 띄울 수 있습니다. 지우려면 배열에서 항목을 빼면 됩니다.

---

## 유사도 연결 방식

`issue-graph.js`의 `similarity(a, b)`가 두 기사의 `topics` 집합에 가중 자카드를 적용하고, 같은 카테고리면 0.08을 더합니다. 임계값 이상이면 링크가 생기고 유사도에 비례해 선이 굵어집니다. 임베딩 기반으로 바꾸려면 이 함수 하나만 교체하면 됩니다.
