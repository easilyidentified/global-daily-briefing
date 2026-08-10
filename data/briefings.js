
export const SUPPORTED_COUNTRIES = [
  { code: 'KR', name: '대한민국', nameEn: 'South Korea', flag: '🇰🇷', region: 'Asia', x: 80, y: 38 },
  { code: 'US', name: '미국', nameEn: 'United States', flag: '🇺🇸', region: 'North America', x: 22, y: 34 },
  { code: 'CN', name: '중국', nameEn: 'China', flag: '🇨🇳', region: 'Asia', x: 74, y: 37 },
  { code: 'JP', name: '일본', nameEn: 'Japan', flag: '🇯🇵', region: 'Asia', x: 84, y: 36 },
  { code: 'GB', name: '영국', nameEn: 'United Kingdom', flag: '🇬🇧', region: 'Europe', x: 47, y: 26 },
  { code: 'DE', name: '독일', nameEn: 'Germany', flag: '🇩🇪', region: 'Europe', x: 50, y: 27 },
  { code: 'FR', name: '프랑스', nameEn: 'France', flag: '🇫🇷', region: 'Europe', x: 48, y: 30 },
  { code: 'IL', name: '이스라엘', nameEn: 'Israel', flag: '🇮🇱', region: 'Middle East', x: 57, y: 40 },
  { code: 'UA', name: '우크라이나', nameEn: 'Ukraine', flag: '🇺🇦', region: 'Europe', x: 56, y: 28 },
  { code: 'IN', name: '인도', nameEn: 'India', flag: '🇮🇳', region: 'Asia', x: 67, y: 44 },
  { code: 'BR', name: '브라질', nameEn: 'Brazil', flag: '🇧🇷', region: 'South America', x: 35, y: 68 },
  { code: 'AU', name: '호주', nameEn: 'Australia', flag: '🇦🇺', region: 'Oceania', x: 83, y: 72 },
];

export const MOCK_BRIEFINGS = {
  KR: {
    countryCode: 'KR',
    countryName: '대한민국',
    countryNameEn: 'South Korea',
    flagEmoji: '🇰🇷',
    date: '2026.08.09',
    dayOfWeek: '일',
    period: '2026.08.08 08:00 ~ 2026.08.09 08:00',
    updatedAt: '2026.08.09 08:00 KST',
    newsList: [
      {
        id: 'kr-pol-1',
        category: 'politics',
        categoryLabel: '정치',
        title: '여야, 첨단 반도체 국가전략기술 세액공제 연장안 전격 합의',
        why: '글로벌 반도체 공급망 재편 및 미·중 기술 패권 경쟁 격화 속 국내 첨단 제조 기반 사수 필요성 증대',
        soWhat: '국내 주요 반도체 기업들의 50조 원 규모 차세대 파운드리 및 HBM 시설 투자 집행 가속화 전망',
        summary: '여야가 첨단 반도체 설비 투자 세액공제율을 기존 15%에서 20%로 상향하고 일몰 기한을 3년 연장하는 조세특례제한법 개정안에 전격 합의했습니다.',
        context: {
          background: '2024년 도입되었던 반도체 K-칩스법의 세액공제 혜택 일몰 시한이 다가오면서 업계의 투자 유인 위축 우려가 지속되었습니다.',
          issueContext: '글로벌 경쟁국들이 자국 내 반도체 공장 유치를 위해 수십조 원의 직간접 보조금을 지급하는 상황에서 한국의 세제 지원 연장이 난항을 겪고 있었습니다.',
          coreQuestion: '이번 세제 혜택 연장이 국내 반도체 생태계 전반의 설비 투자를 끌어올리고 글로벌 주도권을 사수할 수 있는가?',
          resolution: '여야는 정책적 연속성을 위해 법안을 이달 임시국회 본회의에서 최우선 통과시키고, 연구개발(R&D) 현금 환급제 도입도 추가 논의하기로 했습니다.'
        },
        sources: [
          { name: '연합뉴스', url: 'https://www.yna.co.kr' },
          { name: '한국경제', url: 'https://www.hankyung.com' }
        ]
      },
      {
        id: 'kr-pol-2',
        category: 'politics',
        categoryLabel: '정치',
        title: '정부, 한미 안보·경제 유기적 긴급 점검 회의 개최',
        why: '미국 차기 행정부의 방위비 분담금 및 첨단 기술 수출 통제 강화 기조에 선제적으로 대응하기 위함',
        soWhat: '대미 외교 전략 재정비 및 안보·산업 협력 태스크포스(TF) 가동을 통한 통상 불확실성 완화 기대',
        summary: '정부는 대통령실 주재로 관계부처 합동 안보·경제 점검 회의를 열고 대미 통상 정책 과제와 한미 동맹 발전 방안을 논의했습니다.',
        context: {
          background: '글로벌 통상 환경의 지정학적 변동성이 확대됨에 따라 안보와 산업 정책을 일체화하는 전략의 중요성이 커졌습니다.',
          issueContext: '공급망 다변화 및 방위비 분담 협상 과정에서 발생할 수 있는 대외 리스크를 최소화해야 하는 과제가 제기되었습니다.',
          coreQuestion: '안보와 통상이 결합된 복합위기 상황에서 정부가 국익을 극대화하는 협상력을 발휘할 수 있는가?',
          resolution: '정부는 안보실과 산업부가 공동 참석하는 상시 협의체를 신설하고, 대미 주력 수출 품목에 대한 맞춤형 리스크 관리 체계를 가동하기로 했습니다.'
        },
        sources: [
          { name: 'KBS 뉴스', url: 'https://news.kbs.co.kr' },
          { name: '동아일보', url: 'https://www.donga.com' }
        ]
      },
      {
        id: 'kr-eco-1',
        category: 'economy',
        categoryLabel: '경제',
        title: '한국은행, 기준금리 동결 속 가계부채 모니터링 강화 발표',
        why: '수도권 중심의 주택 거래 회복세와 가계대출 증가 흐름에 따른 금융 불균형 위험 완화 목적',
        soWhat: '당분간 금리 인하 신중론 유지에 따라 시중은행의 부동산 담보대출 규제 문턱이 더욱 높아질 것으로 예상',
        summary: '한국은행 금융통화위원회가 현 기준금리 수준을 유지하고, 상반기 가계부채 추이를 면밀히 모니터링하겠다고 밝혔습니다.',
        context: {
          background: '내수 회복 지연으로 금리 인하 요구가 거세졌으나, 부동산 가격 상승과 가계대출 증가세가 발목을 잡았습니다.',
          issueContext: '물가 안정세 진입에도 불구하고 가계부채 누증과 환율 변동성이 금리 결정의 주요 걸림돌로 작용했습니다.',
          coreQuestion: '금리 동결 기조 유지가 내수 침체 심화 없이 자산 시장 불균형을 안정시킬 수 있는가?',
          resolution: '한은은 금융당국과의 스트레스 DSR 확대 적용 등 거시건전성 정책 공조를 강화하며 금리 인하 시점을 유연하게 결정하기로 했습니다.'
        },
        sources: [
          { name: '매일경제', url: 'https://www.mk.co.kr' },
          { name: '조선비즈', url: 'https://biz.chosun.com' }
        ]
      },
      {
        id: 'kr-eco-2',
        category: 'economy',
        categoryLabel: '경제',
        title: 'K-배터리 3사, 차세대 전고체 배터리 파일럿 라인 가동 본격화',
        why: '중국산 LFP 배터리의 저가 공세에 맞서 프리미엄 및 초격차 기술 경쟁력 확보 가속화',
        soWhat: '2027년 상용화를 목표로 글로벌 완성차 업체들과의 차세대 전기차 배터리 공급 협상이 진전될 전망',
        summary: '국내 배터리 3사가 꿈의 배터리로 불리는 전고체 배터리 양산 파일럿 라인을 준공하고 고객사 테스트용 샘플 출하를 시작했습니다.',
        context: {
          background: '글로벌 전기차 캐즘(일시적 수요 둔화) 현상 속에서 화재 안전성이 높고 에너지 밀도가 극대화된 전고체 기술 선점이 사활 과제로 부상했습니다.',
          issueContext: '고비용 구조와 기술적 난제로 인해 양산 시점 지연 우려가 제기되어 왔습니다.',
          coreQuestion: '전고체 배터리의 수율 확보와 제조 단가 낮추기가 성공하여 차세대 배터리 시장을 주도할 수 있는가?',
          resolution: '배터리 3사는 국책 과제 연계 및 소재 기업들과의 공동 R&D를 통해 양산 수율을 조기 확보하고 2027~2028년 상용화를 차질 없이 추진할 방침입니다.'
        },
        sources: [
          { name: '전자신문', url: 'https://www.etnews.com' },
          { name: '머니투데이', url: 'https://news.mt.co.kr' }
        ]
      },
      {
        id: 'kr-oth-1',
        category: 'other',
        categoryLabel: '기타',
        title: '정부, 초거대 AI 선도 프로젝트에 1조 원 신규 투입 확정',
        why: '글로벌 빅테크의 AI 독점에 대응하여 독자적 한국어·국산 소버린 AI 인프라 구축 추진',
        soWhat: '국산 NPU 기반 데이터센터 확충 및 의료·법률·행정 특화 AI 모델 개발이 크게 탄력을 받을 예정',
        summary: '과학기술정보통신부가 독자적 AI 기술 주권 확보를 위한 초거대 AI 선도 프로젝트에 1조 원 규모의 예산을 투입하기로 확정했습니다.',
        context: {
          background: '미국 빅테크 주도의 AI 생태계 확산으로 국내 ICT 산업의 기술 종속 우려가 심화되었습니다.',
          issueContext: '고성능 GPU 수급 난항과 방대한 데이터 컴퓨팅 비용 부담이 국내 스타트업 및 연구진의 발목을 잡아왔습니다.',
          coreQuestion: '정부 차원의 AI 데이터센터 인프라 및 컴퓨팅 자원 지원이 국산 AI 생태계의 자립을 이끌어낼 수 있는가?',
          resolution: '과기정통부는 국산 AI 반도체 바우처를 대폭 확대하고 공공 데이터 개방을 적극 추진하여 AI 산업 생태계를 전방위로 육성합니다.'
        },
        sources: [
          { name: '디지털타임스', url: 'https://www.dt.co.kr' },
          { name: '아이뉴스24', url: 'https://www.inews24.com' }
        ]
      },
      {
        id: 'kr-oth-2',
        category: 'other',
        categoryLabel: '기타',
        title: '전국 기온 폭염특보 속 기후변화 대응 재난안전대책 가동',
        why: '한반도 근해 해수면 온도 상승에 따른 이상 고온 및 기습적 폭우 발생 빈도 증가',
        soWhat: '취약계층 보호 대책 및 에너지 수급 관리 비상체계 구축으로 폭염 피해 최소화 도모',
        summary: '행정안전부가 전국적인 폭염 지속에 따라 중앙재난안전대책본부 비상 단계를 가동하고 예찰 활동을 강화했습니다.',
        context: {
          background: '지구 온난화 심화로 한반도 summer 클라이밋이 아열대화되면서 매년 폭염 피해 기록이 경신되고 있습니다.',
          issueContext: '전력 수요 폭증으로 인한 정전 리스크와 온열질환자 급증, 농축산물 피해가 재난 수준으로 확대되었습니다.',
          coreQuestion: '이상 기후 현상 장기화에 대처할 실시간 스마트 재난 예경보 시스템과 전력 인프라가 대폭 강화되었는가?',
          resolution: '정부는 시군구별 살수차 동원, 무더위 쉼터 24시간 개방 및 전력 수급 비상 대응반을 적극 가동하고 있습니다.'
        },
        sources: [
          { name: '경향신문', url: 'https://www.khan.co.kr' },
          { name: 'YTN', url: 'https://www.ytn.co.kr' }
        ]
      }
    ]
  },
  US: {
    countryCode: 'US',
    countryName: '미국',
    countryNameEn: 'United States',
    flagEmoji: '🇺🇸',
    date: '2026.08.09',
    dayOfWeek: '일',
    period: '2026.08.08 08:00 ~ 2026.08.09 08:00',
    updatedAt: '2026.08.09 08:00 EST',
    newsList: [
      {
        id: 'us-pol-1',
        category: 'politics',
        categoryLabel: '정치',
        title: '미 의회, 연방 부채한도 조정 법안 초당적 최종 타결',
        why: '연방정부 셧다운 위험 해소 및 글로벌 금융 시장의 신용 리스크 사전 차단 필요',
        soWhat: '미국 국채 시장 불안 요소 제거로 글로벌 증시 안정화 및 정부 지출안 집행 정상화 기대',
        summary: '미 상원과 하원이 연방 부채한도를 상향 조정하는 초당적 합의안을 가결하여 셧다운 위기를 피했습니다.',
        context: {
          background: '연방정부의 채무 한도 도달 시점이 임박함에 따라 국채 이자 미지급(디폴트) 우려가 심화되었습니다.',
          issueContext: '양당 간 예산 감축 규모를 둘러싼 입장 차이로 대치 국면이 길어졌습니다.',
          coreQuestion: '이번 부채한도 합의가 장기적인 미국 재정 적자 구조를 개선할 수 있는 발판을 마련했는가?',
          resolution: '양당은 향후 2년간 재량적 지출을 동결하는 조건으로 한도를 상향하고 대통령 서명을 거쳐 최종 발효시켰습니다.'
        },
        sources: [
          { name: 'Reuters', url: 'https://www.reuters.com' },
          { name: 'CNN', url: 'https://edition.cnn.com' }
        ]
      },
      {
        id: 'us-pol-2',
        category: 'politics',
        categoryLabel: '정치',
        title: '백악관, 차세대 글로벌 AI 안보 가이드라인 공식 서명',
        why: '생성형 AI의 무기화 및 사이버 공격 악용 방지를 위한 국가 안보 차원의 규제 틀 마련',
        soWhat: '글로벌 빅테크 기업들의 AI 모델 공개 및 평가 절차 의무화로 안전성 기준 강화',
        summary: '미 백악관이 안보 위험을 초래할 수 있는 고성능 AI 개발 규제를 담은 대통령 행정명령에 서명했습니다.',
        context: {
          background: 'AI 기술의 급격한 발전으로 허위 정보 유포 및 국가 주요 인프라 사이버 공격 위험이 부각되었습니다.',
          issueContext: '혁신 위축을 우려하는 테크 업계와 강력한 규제를 요구하는 안보 당국 간 갈등이 계속되었습니다.',
          coreQuestion: '미국의 선제적 AI 규제 가이드라인이 글로벌 표준으로 정착할 수 있을 것인가?',
          resolution: '정부는 안전성 평가 통과 조항을 신설하되 벤처 투자를 촉진하는 공공 인프라 지원책도 병행 추진합니다.'
        },
        sources: [
          { name: 'AP News', url: 'https://apnews.com' },
          { name: 'The Washington Post', url: 'https://www.washingtonpost.com' }
        ]
      },
      {
        id: 'us-eco-1',
        category: 'economy',
        categoryLabel: '경제',
        title: '연준(Fed), 인플레이션 2%대 안착 평가 속 연착륙 기대감 고조',
        why: '소비자물가지수(CPI) 상승률 둔화 및 노동시장 고용지표의 균형 회복 지속',
        soWhat: '피벗(통화정책 전환) 가능성 제기로 신흥국 자금 유출 압력 완화 및 글로벌 증시 훈풍',
        summary: '미 연방준비제도가 물가상승률이 목표치에 지속 수렴함에 따라 금리 정책의 유연성을 강화하겠다고 밝혔습니다.',
        context: {
          background: '고금리 장기화로 인한 상업용 부동산 부실 우려와 경기 침체 경고음이 지속되었습니다.',
          issueContext: '물가 둔화세가 확실해짐에 따라 실질 금리 부담을 낮춰 경기 연착륙을 유도할 시점이 다가왔습니다.',
          coreQuestion: '연준이 경기 후퇴 없이 물가 목표치를 달성하는 완벽한 연착륙을 성공시킬 수 있는가?',
          resolution: '제롬 파월 의장은 향후 발표될 경제 데이터에 기반하여 연내 단계적 금리 조정을 검토하겠다고 유연한 입장을 밝혔습니다.'
        },
        sources: [
          { name: 'Bloomberg', url: 'https://www.bloomberg.com' },
          { name: 'The Wall Street Journal', url: 'https://www.wsj.com' }
        ]
      },
      {
        id: 'us-eco-2',
        category: 'economy',
        categoryLabel: '경제',
        title: '빅테크 기업 2분기 어닝 서프라이즈, AI 클라우드 매출 폭발',
        why: '기업들의 엔터프라이즈 AI 전환 가속화에 따른 수혜 가시화',
        soWhat: '나스닥 지수 신고가 경신 및 대형 기술주 중심의 시장 주도권 강화',
        summary: '엔비디아, 마이크로소프트, 구글 등 주요 빅테크 2분기 실적이 시장 전망치를 크게 상회했습니다.',
        context: {
          background: 'AI 과잉 투자론 및 수익화 지연 우려로 거품 논란이 일기도 했습니다.',
          issueContext: '그러나 실제 클라우드 서비스 및 AI 소프트웨어 매출이 호조를 보이면서 수익성이 입증되었습니다.',
          coreQuestion: 'AI 관련 실적 모멘텀이 지수 전반을 견인하는 구조가 하반기에도 지속될 수 있는가?',
          resolution: '기업들은 AI 인프라 자본지출(CAPEX)을 지속 확대하고 차세대 클라우드 데이터센터 증설을 가속화하기로 했습니다.'
        },
        sources: [
          { name: 'CNBC', url: 'https://www.cnbc.com' },
          { name: 'Financial Times', url: 'https://www.ft.com' }
        ]
      },
      {
        id: 'us-oth-1',
        category: 'other',
        categoryLabel: '기타',
        title: 'NASA, 유인 달 탐사 아르테미스 미션 최종 비행 점검 완료',
        why: '인류의 달 재착륙 및 화성 탐사를 위한 전초기지 구축 프로젝트 단계별 이행',
        soWhat: '글로벌 우주 탐사 경쟁의 주도권 확보 및 관련 우주 항공 산업 생태계 활성화',
        summary: 'NASA가 우주비행사를 탑승시켜 달 궤도를 회행하는 아르테미스 II 미션의 발사전 심층 테스트를 통과시켰습니다.',
        context: {
          background: '아폴로 계획 이후 반세기 만에 추진되는 인류의 본격적인 달 거주 및 자원 탐사 사업입니다.',
          issueContext: '기술적 결함 우려로 발사 일정이 수차례 연기되는 진통을 겪었습니다.',
          coreQuestion: '아르테미스 미션 성공이 우주 자원 확보 및 상업적 우주 여행 시대를 열어젖힐 것인가?',
          resolution: 'NASA는 민간 우주기업 스페이스X와의 긴밀한 공조를 통해 올해 안에 역사적 발사를 추진할 계획입니다.'
        },
        sources: [
          { name: 'NASA Official', url: 'https://www.nasa.gov' },
          { name: 'SpaceNews', url: 'https://spacenews.com' }
        ]
      },
      {
        id: 'us-oth-2',
        category: 'other',
        categoryLabel: '기타',
        title: '미 서부 연안 초대형 태양광·풍력 복합 에너지 단지 가동',
        why: '청정에너지 전환 의무화 목표 달성 및 AI 데이터센터 전력 수요 급증 대응',
        soWhat: '탄소 배출 절감과 동시에 서부 지역 전력망의 획기적 안정화 기여',
        summary: '캘리포니아주에 2GW 규모의 미국 최대 태양광·에너지저장장치(ESS) 복합 단지가 상업 운전을 시작했습니다.',
        context: {
          background: 'AI 데이터센터와 전기차 보급 확대로 미국 내 전력 소비량이 사상 최고치를 경신하고 있습니다.',
          issueContext: '기존 화석연료 발전소 폐쇄 속에서 신재생 에너지의 출력 변동성 보완이 시급했습니다.',
          coreQuestion: '대규모 ESS 결합형 청정에너지가 AI 시대 전력난 극복의 현실적 해법이 될 수 있는가?',
          resolution: '주정부는 연방 인센티브 조항을 적용하여 재생에너지 연계 전력망 구축 사업을 대폭 늘려갈 계획입니다.'
        },
        sources: [
          { name: 'Los Angeles Times', url: 'https://www.latimes.com' },
          { name: 'Reuters Energy', url: 'https://www.reuters.com/business/energy' }
        ]
      }
    ]
  },
  CN: {
    countryCode: 'CN',
    countryName: '중국',
    countryNameEn: 'China',
    flagEmoji: '🇨🇳',
    date: '2026.08.09',
    dayOfWeek: '일',
    period: '2026.08.08 08:00 ~ 2026.08.09 08:00',
    updatedAt: '2026.08.09 08:00 CST',
    newsList: [
      {
        id: 'cn-pol-1',
        category: 'politics',
        categoryLabel: '정치',
        title: '중국 국무원, 내수 진작 및 제조업 고도화 10대 특단책 발표',
        why: '부동산 경기 침체 장기화와 저물가(디플레이션) 우려 속 경제 활력 제고 모색',
        soWhat: '가전·자동차 보상판매(이구환신) 지원금 대폭 확대 및 국유기업 구조개혁 가속화',
        summary: '중국 정부가 소비 촉진과 첨단 기술 부문 투자를 결합한 고강도 내수 자극 패키지를 공식 수립했습니다.',
        context: {
          background: '부동산 개발업체들의 부실 우려와 소비 심리 위축이 성장률 목표 달성의 악재로 작용했습니다.',
          issueContext: '단순 재정 지출 확대를 넘어 실질적인 가계 소득 증대 및 소비 유인책이 부재하다는 지적이 지속되었습니다.',
          coreQuestion: '10대 부양책이 중국 가계의 소비 심리를 돌려놓고 디플레이션 압력을 해소할 수 있는가?',
          resolution: '중앙정부는 지방정부 특별채권 발행 한도를 늘리고 소비 쿠폰 지급 및 첨단 제조업 금융 지원을 다각도로 집행하기로 했습니다.'
        },
        sources: [
          { name: '신화통신', url: 'http://www.xinhuanet.com' },
          { name: '인민일보', url: 'http://paper.people.com.cn' }
        ]
      },
      {
        id: 'cn-pol-2',
        category: 'politics',
        categoryLabel: '정치',
        title: '중·아세안(ASEAN) 자유무역협정(FTA) 3.0 개정안 타결',
        why: '미국의 대중국 통상 압박 극복 및 동남아 지역 역내 공급망 결속력 강화',
        soWhat: '디지털 커머스, 친환경 에너지 및 반도체 후공정 협력 증대로 대외 교역 다변화',
        summary: '중국과 아세안 10개국이 디지털 경제와 공급망 연결성을 대폭 강화하는 FTA 3.0 업그레이드 협상을 타결했습니다.',
        context: {
          background: '미국 중심의 공급망 재편 움직임에 맞서 중국은 최대 교역 상대국인 아세안과의 우호적 관계가 절실했습니다.',
          issueContext: '남중국해 영유권 갈등 속에서도 경제적 실리와 역내 통합 가속화가 당면 과제로 부상했습니다.',
          coreQuestion: '아세안과의 FTA 3.0 타결이 미국 우방국의 통상망 압박을 분산시키는 유효한 카드가 될 수 있는가?',
          resolution: '양측은 관세 장벽을 대폭 낮추고 전자상거래 통관 및 역내 원산지 기준 통합 작업을 빠르게 마무리 짓기로 했습니다.'
        },
        sources: [
          { name: 'CCTV', url: 'https://news.cctv.com' },
          { name: 'Global Times', url: 'https://www.globaltimes.cn' }
        ]
      },
      {
        id: 'cn-eco-1',
        category: 'economy',
        categoryLabel: '경제',
        title: '중국 EV·태양광 굴기, 글로벌 수출액 사상 최고치 경신',
        why: '자국 내 공급과잉 물량의 해외 시장 적극 개척 및 가격 경쟁력 압도',
        soWhat: '유럽연합(EU) 및 서방 국가들의 상계관세 부과 조치 등 무역 마찰 심화 우려',
        summary: '중국의 전기차, 리튬배터리, 태양광 등 신에너지 3대 제품 수출액이 전년 대비 20% 이상 급증했습니다.',
        context: {
          background: '중국 정부의 파격적 보조금과 수직계열화 생태계 덕분에 세계 신에너지 시장 주도권을 확보했습니다.',
          issueContext: '미국과 EU가 중국산 신에너지 제품의 덤핑 수출을 문제 삼아 높은 관세 장벽을 쌓고 있습니다.',
          coreQuestion: '서방의 통상 규제 장벽을 넘기 위해 중국 업체들이 현지 공장 설립 전략으로 전환할 것인가?',
          resolution: 'BYD 등 주요 기업들은 헝가리, 브라질, 동남아 등 현지 생산 기지 구축을 대폭 앞당기고 있습니다.'
        },
        sources: [
          { name: '차이신', url: 'https://www.caixin.com' },
          { name: 'South China Morning Post', url: 'https://www.scmp.com' }
        ]
      },
      {
        id: 'cn-eco-2',
        category: 'economy',
        categoryLabel: '경제',
        title: '중국 인민은행, 유동성 공급 확대를 위한 단기 금리 전격 인하',
        why: '금융 시장 자금난 해소 및 자산시장 부양을 위한 적극적 통화 완화 시그널',
        soWhat: '시중 유동성 급증에 따른 위안화 가치 변동성 확대 및 증시 자금 유입 타진',
        summary: '중국 인민은행이 7일물 역레포 금리를 인하하고 시장에 대규모 유동성을 직접 주입했습니다.',
        context: {
          background: '실물 경기 회복세가 더딘 가운데 실질 금리 부담으로 기업 투자가 위축된 상태였습니다.',
          issueContext: '미국과의 금리 차이로 인한 자본 유출 위험과 국내 유동성 공급 필요성 사이의 균형 잡기가 과제였습니다.',
          coreQuestion: '돈 풀어 경기 살리기가 자산 거품 부작용 없이 실물 투자로 연결될 수 있는가?',
          resolution: '인민은행은 맞춤형 재대출 창구를 확대하여 중소기업과 첨단 제조 기술 기업에 직접 자금이 흘러가도록 관리합니다.'
        },
        sources: [
          { name: '중국증권보', url: 'http://www.cs.com.cn' },
          { name: 'Nikkei Asia', url: 'https://asia.nikkei.com' }
        ]
      },
      {
        id: 'cn-oth-1',
        category: 'other',
        categoryLabel: '기타',
        title: '중국 독자 우주정거장 텐궁, 차세대 생명과학 실험 성공',
        why: '우주 강국 도약 목표 달성 및 우주 환경 활용 바이오 신약 개발 속도',
        soWhat: '글로벌 우주 연구 협력 플랫폼으로서의 입지 다지기 및 독자적 기술 확보',
        summary: '중국 텐궁 우주정거장에 체류 중인 우주비행사들이 미세중력 환경에서의 단백질 결정 육성 실험에 성공했습니다.',
        context: {
          background: '미국 주도의 국제우주정거장(ISS) 배제에 맞서 중국은 독자 우주정거장을 성공적으로 운영 중입니다.',
          issueContext: '장기 우주 체류 기술과 상업적 연구 활용 가능성을 입증해야 하는 단계에 진입했습니다.',
          coreQuestion: '텐궁 우주정거장이 국제 연구자들에게 개방되어 글로벌 우주 연구의 허브가 될 수 있는가?',
          resolution: '중국 국가항천국(CNSA)은 유럽 및 남미 연구기관들과 공동 프로젝트를 확대 발주하기로 했습니다.'
        },
        sources: [
          { name: '신화망 기술', url: 'http://www.xinhuanet.com/tech' },
          { name: 'China Daily', url: 'https://www.chinadaily.com.cn' }
        ]
      },
      {
        id: 'cn-oth-2',
        category: 'other',
        categoryLabel: '기타',
        title: '양자강 대규모 수자원 이동 서조동수 프로젝트 2단계 착공',
        why: '북부 지역 심각한 가뭄 극복 및 수자원 불균형 해소를 통한 식량·산업 인프라 안정화',
        soWhat: '건설 수주 확대를 통한 친환경 인프라 경기 부양 효과 창출',
        summary: '중국 남부의 풍부한 수자원을 북부 건조 지대로 끌어오는 남수북조 관련 대형 수로 건설 사업이 시작되었습니다.',
        context: {
          background: '기후변화로 북부 주요 곡창지대의 용수 부족 사태가 심화되어 국가적 차원의 물 관리가 시급했습니다.',
          issueContext: '막대한 공사비와 생태계 영향 우려가 제기되는 대형 국책 사업입니다.',
          coreQuestion: '환경 훼손을 최소화하면서 수자원 재배치를 성공적으로 마무리할 수 있는가?',
          resolution: '당국은 첨단 친환경 터널링 기술을 적용하고 수질 오염 방지 관제 시스템을 함께 구축하기로 했습니다.'
        },
        sources: [
          { name: '인민망 환경', url: 'http://env.people.com.cn' },
          { name: 'CGTN', url: 'https://news.cgtn.com' }
        ]
      }
    ]
  },
  JP: {
    countryCode: 'JP',
    countryName: '일본',
    countryNameEn: 'Japan',
    flagEmoji: '🇯🇵',
    date: '2026.08.09',
    dayOfWeek: '일',
    period: '2026.08.08 08:00 ~ 2026.08.09 08:00',
    updatedAt: '2026.08.09 08:00 JST',
    newsList: [
      {
        id: 'jp-pol-1',
        category: 'politics',
        categoryLabel: '정치',
        title: '일본 내각, 방위력 강화 및 방위 산업 수출 요건 완화 합의',
        why: '동아시아 안보 환경 변화 속 자국 방위 산업 체질 개선 및 우방국 안보 공조 확대',
        soWhat: '방산 관련 일본 대기업들의 해외 진출 탄력 및 차세대 전투기 공동 개발 사업 가속화',
        summary: '일본 정부가 방위 장비 이전 3원칙 운용 지침을 추가 개정하여 우방국에 대한 완제품 방산 수출을 허용했습니다.',
        context: {
          background: '평화헌법 제약 속에서 유지되어 온 엄격한 방산 수출 규제가 자국 방위 산업의 고사를 초래한다는 위기의식이 높았습니다.',
          issueContext: '영국·이탈리아와 추진 중인 차세대 전투기(GCAP) 개발 및 수출 유연성 확보가 핵심 현안이었습니다.',
          coreQuestion: '일본의 방산 규제 완화가 동아시아 세력 균형과 방위 산업 시장에 어떤 파장을 불러올 것인가?',
          resolution: '연립여당은 국회 보고 의무를 엄격히 두고 평화주의 기조를 유지하면서 실리적 안보 협력을 강화하기로 했습니다.'
        },
        sources: [
          { name: 'NHK News', url: 'https://www.nhk.or.jp' },
          { name: '요미우리 신문', url: 'https://www.yomiuri.co.jp' }
        ]
      },
      {
        id: 'jp-pol-2',
        category: 'politics',
        categoryLabel: '정치',
        title: '일본 저출생 대책 신법 발효, 아동 수당 대폭 인상',
        why: '초저출산 장기화에 따른 인구 절벽 해소 및 국가 지속가능성 확보',
        soWhat: '가계의 육아 부담 대폭 경감 및 육아 휴직 급여 인상을 통한 사회 안전망 강화',
        summary: '일본 정부가 소득 제한을 전면 폐지하고 고등학생까지 아동 수당 지급 범위를 넓히는 신법을 발효했습니다.',
        context: {
          background: '합계출산율이 사상 최저 수준으로 떨어지면서 국가적 비상사태라는 인식이 팽배했습니다.',
          issueContext: '재원 마련을 위한 사회보험료 추가 부담 문제를 두고 가계 부담 증가 논란이 빚어졌습니다.',
          coreQuestion: '수조 엔 규모의 출산 지원책이 젊은 세대의 결혼과 출산율 반등을 이끌어낼 수 있는가?',
          resolution: '정부는 기업들의 유급 육아휴직 참여율을 인센티브와 연계하고 일·가정 양립 지원 환경을 집중 조성하기로 했습니다.'
        },
        sources: [
          { name: '아사히 신문', url: 'https://www.asahi.com' },
          { name: 'Mainichi Shimbun', url: 'https://mainichi.jp' }
        ]
      },
      {
        id: 'jp-eco-1',
        category: 'economy',
        categoryLabel: '경제',
        title: '일본은행(BOJ), 추가 금리 인상 단행… 디플레이션 완전 탈출 선언',
        why: '임금과 물가의 선순환 구조 정착 및 엔저에 따른 수입 물가 상승 압력 완화',
        soWhat: '엔화 가치 반등 및 일본 시중은행들의 이자 수익 증가, 주택담보대출 금리 변동성 확대',
        summary: '일본은행이 단기 정책금리를 추가 인하 없이 상향 조정하며 명실상부한 통화정책 정상화 궤도에 진입했습니다.',
        context: {
          background: '30년간 지속된 초저금리 마이너스 금리 시대가 막을 내리고 고물가·고임금 체제로의 체질 변화가 진행되었습니다.',
          issueContext: '금리 인상이 경기 회복세를 냉각시키고 정부의 과도한 부채 이자 부담을 키울 수 있다는 우려가 공존했습니다.',
          coreQuestion: '일본 경제가 금리 상승 환경 속에서도 견조한 실물 성장을 유지할 수 있는가?',
          resolution: '우에다 가즈오 총재는 과도한 급등락을 방지하기 위해 금융 시장과의 소통을 강화하며 국채 매입을 완만히 줄여가겠다고 밝혔습니다.'
        },
        sources: [
          { name: '니혼게이자이 신문(Nikkei)', url: 'https://www.nikkei.com' },
          { name: 'Kyodo News', url: 'https://english.kyodonews.net' }
        ]
      },
      {
        id: 'jp-eco-2',
        category: 'economy',
        categoryLabel: '경제',
        title: '라피더스(Rapidus), 2나노 첨단 반도체 시제품 제작 성공',
        why: '일본 반도체 산업 재건 및 첨단 파운드리 자립화 추진',
        soWhat: '글로벌 주요 반도체 설계 자산(IP) 기업들과의 제휴 확대 및 국산 파운드리 시장 신뢰 확보',
        summary: '일본 국가 반도체 컨소시엄 라피더스가 홋카이도 공장에서 2나노미터 최첨단 로직 반도체 시제품 가동에 성공했습니다.',
        context: {
          background: '과거 세계 반도체 시장을 호령했던 일본이 최첨단 미세 공정 경쟁에서 뒤처지자 수조 엔의 국비를 투입해 라피더스를 설립했습니다.',
          issueContext: '수율 확보와 고객사 유치 난항 우려가 제기되어 왔으나 기술적 주요 이정표를 달성했습니다.',
          coreQuestion: '라피더스가 2027년 양산 목표를 달성하여 TSMC·삼성전자와 어깨를 견주는 파운드리 거점으로 거듭날 수 있는가?',
          resolution: '일본 정부는 추가 민관 기금을 확충하고 미국 IBM 등과의 기술 협력을 지속 강화하기로 결정했습니다.'
        },
        sources: [
          { name: '産経新聞(산케이)', url: 'https://www.sankei.com' },
          { name: 'Nikkei Tech', url: 'https://xtech.nikkei.com' }
        ]
      },
      {
        id: 'jp-oth-1',
        category: 'other',
        categoryLabel: '기타',
        title: '2026 오사카·관서 엑스포 차세대 공중 모빌리티 eVTOL 시범 운영',
        why: '미래형 첨단 교통수단 시범 운영을 통한 스마트 시티 기술 선점',
        soWhat: '도심 항공 모빌리티(UAM) 상용화 가속화 및 차세대 관광·재난 구조 인프라 활용',
        summary: '오사카 엑스포 회장에서 도심과 회장을 연결하는 플라잉카(eVTOL) 상업 운항용 시범 비행이 실시되었습니다.',
        context: {
          background: '일본 정부는 엑스포를 계기로 도심 상공을 이용하는 차세대 모빌리티의 실증 거점을 마련하고자 했습니다.',
          issueContext: '안전성 검증 문제와 우천·강풍 등 기상 악화 시 운항 대책 수립이 과제로 남았습니다.',
          coreQuestion: '플라잉카가 미래 도시 교통 체계의 안전한 대체 수단으로 정착할 수 있는가?',
          resolution: '국토교통성은 실증 데이터에 기반하여 관제 가이드라인을 최종 확정하고 연내 상용 노선 인가를 완료할 계획입니다.'
        },
        sources: [
          { name: 'MBS News', url: 'https://www.mbs.jp/news' },
          { name: 'JIJI Press', url: 'https://www.jiji.com' }
        ]
      },
      {
        id: 'jp-oth-2',
        category: 'other',
        categoryLabel: '기타',
        title: '일본 방재청, 난카이 트러프 지진 대비 최첨단 해저 감지망 완공',
        why: '수도권 및 태평양 연안 대형 지진·쓰나미 사전 경보 시스템 고도화',
        soWhat: '쓰나미 예측 시간을 대폭 단축하여 연안 주민들의 골든타임 확보 기여',
        summary: '태평양 해저에 설치된 광섬유 케이블 기반의 지진·쓰나미 실시간 관측망(S-net) 확장 공사가 완료되었습니다.',
        context: {
          background: '난카이 트러프 초대형 지진 발생 가능성이 지속 경고됨에 따라 국가적 방재 역량 집중이 요구되었습니다.',
          issueContext: '초음속으로 밀려오는 쓰나미를 수분 전에 정밀 감지하는 해저 관측 인프라 구축이 필수적이었습니다.',
          coreQuestion: '해저 실시간 감지망이 대형 재난 상황에서 주민들의 신속한 피난을 보장할 수 있는가?',
          resolution: '방재청은 스마트폰 긴급재난문자 수신 가이드라인을 정비하고 전국적인 신속 피난 훈련을 병행 실시합니다.'
        },
        sources: [
          { name: '내각부 방재 정보', url: 'https://www.bousai.go.jp' },
          { name: 'NHK 방재', url: 'https://www.nhk.or.jp/bousai' }
        ]
      }
    ]
  }
};

export const DEFAULT_COUNTRY_CODE = 'KR';
