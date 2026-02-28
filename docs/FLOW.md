# NEWXMEM 프로젝트 흐름도

## 흐름도 이미지

![전체 흐름](flow-main.png)

**flow-main.png** — 앱 진입 → SimConfig → 판매자 수 분기(1명 vs 2~5명) 및 다중 동시 매칭 단계(시작→예약→확인→거래→완료→idle)

![다중 동시 매칭 상세](flow-detail.png)

**flow-detail.png** — 다중 동시 매칭 상세: 금액 입력·검색 → scheduled → confirming(수락/거절) → trading(입금·입금확인) → 완료/취소 → completed → 확인 클릭 시 idle

이미지가 없으면 Cursor에서 생성된 `flow-main.png`, `flow-detail.png`가 있는 위치(예: `.cursor/projects/.../assets`)에서 아래처럼 복사하면 됩니다.

```bash
node scripts/copy-flow-images.cjs "경로\assets"
```

---

## 1. 앱 진입 및 모드 분기

```mermaid
flowchart TB
    subgraph entry["앱 진입"]
        A[index.html → main.tsx → App]
    end

    subgraph config["상단 설정"]
        B[SimConfig: 타이머·지연·사진첨부]
    end

    subgraph mode["화면 모드 분기"]
        C{sellerSlots.length}
        C -->|1명| D[판매자 1 · 구매자 N]
        C -->|2~5명| E[구매자 1 · 판매자 N<br/>BuyerMultiSellerSimulator]
    end

    A --> B --> C
```

- **판매자 1명** → App에서 구매자 1~5 + 판매자 1 화면 (다중 동시 매칭)
- **판매자 2~5명** → `BuyerMultiSellerSimulator` (B2S: 구매자 1명이 여러 판매자와 매칭)

---

## 2. 모드 A: 판매자 1명 · 구매자 N명 (다중 동시 매칭)

```mermaid
flowchart LR
    subgraph init["시작"]
        I1[판매자: 금액 입력 후<br/>AI 매칭 시작]
        I2[구매자들: 금액 입력 후<br/>매칭 검색 시작]
    end

    subgraph scheduled["예약 (scheduled)"]
        S1[effect: 잔액·검색 타이머 내<br/>구매자별 금액 배분]
        S2[scheduledMatches에 추가<br/>먼저 들어온 순]
    end

    subgraph confirming["확인 (confirming)"]
        C1[2초 후 scheduled → confirming]
        C2[건별 확인 타이머]
        C3[양쪽 수락 → trading]
        C4[거절/타임아웃 → 제거·위반 기록]
    end

    subgraph trading["거래 (trading)"]
        T1[구매자 입금 완료]
        T2[판매자 입금확인]
        T3[완료 → 포인트 이체·카드 완료]
        T4[입금 시간 초과 → 취소·위반]
    end

    subgraph completed["종료"]
        E1[모든 거래 완료·잔액 0]
        E2[phase = completed]
        E3[판매자/구매자 '확인' → idle]
    end

    I1 --> S1
    I2 --> S1
    S1 --> S2 --> C1 --> C2
    C2 --> C3 --> T1 --> T2 --> T3
    C2 --> C4
    T2 --> T3
    T1 --> T4
    T3 --> E1 --> E2 --> E3
```

### 상태 흐름 요약 (판매자 1 · 구매자 N)

| 단계 | 상태 | 설명 |
|------|------|------|
| 1 | idle | 판매자 금액 입력, remainingAmount 설정, 구매자들 검색 시작 |
| 2 | scheduled | effect가 구매자별로 금액 배분 → `scheduledMatches` 추가 |
| 3 | confirming | 2초 후 건별로 `confirmingMatches` 이동, 건별 타이머·수락/거절 |
| 4 | trading | 양쪽 수락 건만 `tradingMatches` 이동, 입금·입금확인 |
| 5 | completed | 거래 중 건 없음 + 잔액 0 → phase `completed`, 이후 '확인' 시 idle |

---

## 3. 모드 B: 구매자 1명 · 판매자 N명 (B2S)

```mermaid
flowchart LR
    subgraph b2s_init["B2S 시작"]
        B1[구매자: 금액 입력 후 검색]
        B2[판매자들: 금액 입력 후<br/>AI 매칭 시작]
    end

    subgraph b2s_scheduled["예약"]
        B3[구매자 잔액 기준<br/>판매자별 배분]
        B4[ScheduledMatchB2S]
    end

    subgraph b2s_confirming["확인"]
        B5[2초 후 → ConfirmingMatchB2S]
        B6[건별 수락/거절·타임아웃]
    end

    subgraph b2s_trading["거래"]
        B7[입금·입금확인]
        B8[완료 또는 취소]
    end

    B1 --> B3
    B2 --> B3
    B3 --> B4 --> B5 --> B6 --> B7 --> B8
```

- `BuyerMultiSellerSimulator` 내부에서 동일한 패턴: **scheduled → confirming → trading**, 건별 타이머·수락/거절.

---

## 4. Phase 정의 (types.ts)

```mermaid
stateDiagram-v2
    [*] --> idle
    idle --> searching: 단일 매칭 시(현재는 B2S에서만)
    searching --> confirming: 2초 후 매칭 성사
    confirming --> trading: 양쪽 수락
    confirming --> idle: 거절/타임아웃
    confirming --> searching: 취소 시 잔액 있음
    trading --> completed: 입금확인 완료
    trading --> idle: 입금 시간 초과
    trading --> searching: 취소 시 잔액 있음
    completed --> idle: 판매자·구매자 '확인'
```

- **다중 동시 매칭(판매자 1 · 구매자 N)**에서는 전역 `phase`는 주로 `idle` ↔ `completed`만 사용하고, 건별 상태는 `scheduledMatches` → `confirmingMatches` → `tradingMatches`로만 관리됨.

---

## 5. 공통 부가 흐름

```mermaid
flowchart TB
    subgraph violations["위반·분쟁"]
        V1[매칭 확인 거절/타임아웃 → 위반 기록]
        V2[입금 시간 초과 → 위반 기록]
        V3[판매자 입금 거부 → 분쟁]
        V4[어드민: 분쟁 해결 → 초기화]
    end

    subgraph modals["모달"]
        M1[매칭 미확인/취소 모달]
        M2[위반내역 확인 모달]
        M3[입금확인 경고 모달]
    end

    subgraph timers["타이머"]
        T1[판매자 검색 타이머 10분]
        T2[구매자 검색 타이머 5분]
        T3[매칭 확인 제한 3분]
        T4[입금 제한 5분]
    end

    V1 --> M2
    V2 --> M2
    V3 --> M1
    V4 --> M1
```

---

## 6. 파일별 역할

| 파일 | 역할 |
|------|------|
| `App.tsx` | SimConfig, 판매자 1·구매자 N 상태(scheduled/confirming/trading), 단일 매칭 phase, 핸들러 |
| `BuyerMultiSellerSimulator.tsx` | B2S(구매자 1·판매자 N) 전용 상태 및 UI |
| `SellerPhoneContent.tsx` | 판매자 화면 (검색/확인/입금확인/완료/다중 카드) |
| `BuyerPhoneContent.tsx` | 구매자 화면 (검색/확인/입금/완료/다중 카드) |
| `matchMock.ts` | User 생성, `computeMatchResult` (1:1 금액 계산) |
| `matchSound.ts` | 매칭 시 사운드 재생/중지 |

이 문서는 프로젝트 루트의 `docs/FLOW.md`에서 확인할 수 있습니다.
