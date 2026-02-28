import { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { sellerSessionUser, createBuyerUserForIndex, createSellerUserForIndex } from './data/matchMock';
import type { User, SimPhase } from './types';
import { computeMatchResult } from './data/matchMock';
import IPhoneFrame from './components/simulator/IPhoneFrame';
import SellerPhoneContent, { type SellerPhoneContentProps } from './components/simulator/SellerPhoneContent';
import BuyerPhoneContent from './components/simulator/BuyerPhoneContent';
import BuyerMultiSellerSimulator from './components/simulator/BuyerMultiSellerSimulator';
import { playMatchSoundLoop, stopMatchSound } from './utils/matchSound';

const MAX_BUYERS = 5;
const MAX_SELLERS = 5;

/** 시뮬레이터 타이머/지연 설정 (화면 상단에서 변경 가능, 단위 통일: 초) */
export type SimConfig = {
  matchDelaySeconds: number;
  confirmDelaySeconds: number;
  sellerSearchTimerMinutes: number;
  buyerSearchTimerMinutes: number;
  /** 구매자 거래 단계(입금·확인) 제한 시간. 구매자 검색 타이머와 별도. */
  buyerDepositTimerMinutes: number;
  confirmTimerSeconds: number;
  /** 입금 시 사진첨부 사용 여부: 구매자 체크 */
  buyerDepositPhotoEnabled: boolean;
  /** 입금 시 사진첨부 사용 여부: 판매자 체크 (추후 판매자 화면 연동) */
  sellerDepositPhotoEnabled: boolean;
};

export const DEFAULT_SIM_CONFIG: SimConfig = {
  matchDelaySeconds: 2,
  confirmDelaySeconds: 1.5,
  sellerSearchTimerMinutes: 10,
  buyerSearchTimerMinutes: 5,
  buyerDepositTimerMinutes: 5,
  confirmTimerSeconds: 180,
  buyerDepositPhotoEnabled: false,
  sellerDepositPhotoEnabled: false,
};

export type ViolationEntry = { type: string; message: string };

/** 다중 동시 매칭: 2초 대기 후 확인 단계로 올라갈 예정인 매칭 (먼저 들어온 순으로 금액 배분) */
export type ScheduledMatch = { matchId: string; buyerIndex: number; amount: number; scheduledAt: number };
/** 확인 단계: 건별 독립 타이머·수락/거절 */
export type ConfirmingMatch = {
  matchId: string;
  buyerIndex: number;
  amount: number;
  confirmTimerSeconds: number;
  buyerConfirmed: boolean;
  sellerConfirmed: boolean;
};
/** 거래 중: 건별 독립 입금/입금확인. canceledReason 있으면 구매자 입금 시간 초과로 취소됨(판매자 위반 아님) */
export type TradingMatch = {
  matchId: string;
  buyerIndex: number;
  amount: number;
  buyerDepositDone: boolean;
  sellerConfirmed: boolean;
  canceledReason?: 'buyer_deposit_timeout';
};

function generateMatchId() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** 판매자 한 명 분의 상태 (한 개의 판매자 화면) */
export type SellerSlot = {
  user: User;
  amount: number;
  remainingAmount: number;
  started: boolean;
  clickedNew: boolean;
  searchTimerSeconds: number;
  currentPoints: number;
  violationHistory: ViolationEntry[];
};

function createInitialSellerSlot(index: number, config: SimConfig = DEFAULT_SIM_CONFIG): SellerSlot {
  return {
    user: createSellerUserForIndex(index),
    amount: 0,
    remainingAmount: 0,
    started: false,
    clickedNew: false,
    searchTimerSeconds: config.sellerSearchTimerMinutes * 60,
    currentPoints: 1_000_000,
    violationHistory: [],
  };
}

/** 구매자 한 명 분의 상태 (한 개의 구매자 화면) */
export type BuyerSlot = {
  user: User;
  amount: number;
  started: boolean;
  depositDone: boolean;
  clickedNew: boolean;
  /** 판매자 입금확인으로 거래가 끝난 뒤, 해당 구매자가 '확인' 누르기 전까지 거래완료 화면 유지 */
  showCompletedScreen: boolean;
  /** 거래완료 화면에 표시할 금액 (matchResult가 다음 매칭으로 null이 되어도 표시 유지) */
  lastCompletedAmount: number;
  searchTimerSeconds: number;
  currentPoints: number;
  matchConfirmed: boolean;
  violationHistory: ViolationEntry[];
};

function createInitialBuyerSlot(index: number, config: SimConfig = DEFAULT_SIM_CONFIG): BuyerSlot {
  return {
    user: createBuyerUserForIndex(index),
    amount: 0,
    started: false,
    depositDone: false,
    clickedNew: false,
    showCompletedScreen: false,
    lastCompletedAmount: 0,
    searchTimerSeconds: config.buyerSearchTimerMinutes * 60,
    currentPoints: 0,
    matchConfirmed: false,
    violationHistory: [],
  };
}

/**
 * 규칙: 상호 연동은 "매칭을 서로 확인하고 거래를 할 때"만 적용.
 * 그 외(매칭 미확인 모달, 타이머, 입력 등)는 구매자/판매자 각 회원별 독립 작동.
 */
export default function App() {
  const MIN_POINT_AMOUNT = 10_000;
  /** 만원 단위만 허용 (10,000 / 20,000 / 30,000 ...). 12,000원, 10,500원 등 불가 */
  const isValidAmount = (n: number) => n >= MIN_POINT_AMOUNT && n % 10_000 === 0;

  const [simConfig, setSimConfig] = useState<SimConfig>(() => ({ ...DEFAULT_SIM_CONFIG }));
  const [timerEdit, setTimerEdit] = useState<{ key: keyof SimConfig; value: string } | null>(null);
  const [sellerSlots, setSellerSlots] = useState<SellerSlot[]>(() => [createInitialSellerSlot(0)]);
  const [phase, setPhase] = useState<SimPhase>('idle');
  const [matchResult, setMatchResult] = useState<ReturnType<typeof computeMatchResult>>(null);
  const [sellerConfirmed, setSellerConfirmed] = useState(false);
  const [sellerClickedNew, setSellerClickedNew] = useState(false);
  const [buyerSlots, setBuyerSlots] = useState<BuyerSlot[]>(() => [
    createInitialBuyerSlot(0),
  ]);
  const [matchedBuyerIndex, setMatchedBuyerIndex] = useState<number | null>(null);

  /** 다중 동시 매칭 (판매자 1 · 구매자 N): 먼저 들어온 순 배분, 건별 독립 타이머/수락/거래 */
  const [scheduledMatches, setScheduledMatches] = useState<ScheduledMatch[]>([]);
  const [confirmingMatches, setConfirmingMatches] = useState<ConfirmingMatch[]>([]);
  const [tradingMatches, setTradingMatches] = useState<TradingMatch[]>([]);
  /** 카드 표시 순서( matchId[] ). 수락해도 위치 유지용 */
  const [matchDisplayOrder, setMatchDisplayOrder] = useState<string[]>([]);
  /** [다중 매칭] 판매자 화면에 거래완료 카드로 남겨 둘 완료 건 (구매자1 등) */
  const [completedMultiMatches, setCompletedMultiMatches] = useState<Array<{ matchId: string; buyerIndex: number; amount: number }>>([]);
  /** 분쟁 발생: 판매자 거부 시 생성, 어드민 풀어주기 전까지 양쪽 분쟁 화면 유지 */
  type ActiveDispute = { matchId: string; buyerIndex: number; amount: number; reason: string };
  const [activeDisputes, setActiveDisputes] = useState<ActiveDispute[]>([]);
  /** 거래 완료 화면에 표시할 판매된 금액(포인트) */
  const [completedSoldAmount, setCompletedSoldAmount] = useState<number>(0);

  const sellerAmount = sellerSlots[0]?.amount ?? 0;
  const sellerRemainingAmount = sellerSlots[0]?.remainingAmount ?? 0;
  const sellerStarted = sellerSlots[0]?.started ?? false;
  const sellerCurrentPoints = sellerSlots[0]?.currentPoints ?? 1_000_000;

  const setSellerSlotAt = useCallback((index: number, updater: (prev: SellerSlot) => SellerSlot) => {
    setSellerSlots((prev) => prev.map((s, i) => (i === index ? updater(s) : s)));
  }, []);

  /** 판매자는 보유 포인트를 초과해 판매 불가 */
  const setSellerAmount = useCallback(
    (n: number) => setSellerSlotAt(0, (s) => ({ ...s, amount: Math.min(n, s.currentPoints) })),
    [setSellerSlotAt]
  );
  const setSellerRemainingAmount = useCallback(
    (n: number | ((p: number) => number)) =>
      setSellerSlotAt(0, (s) => {
        const next = typeof n === 'function' ? n(s.remainingAmount) : n;
        return { ...s, remainingAmount: Math.min(Math.max(0, next), s.currentPoints) };
      }),
    [setSellerSlotAt]
  );
  const setSellerStarted = useCallback((b: boolean) => setSellerSlotAt(0, (s) => ({ ...s, started: b })), [setSellerSlotAt]);
  const setSellerCurrentPoints = useCallback(
    (n: number | ((p: number) => number)) =>
      setSellerSlotAt(0, (s) => ({ ...s, currentPoints: typeof n === 'function' ? n(s.currentPoints) : n })),
    [setSellerSlotAt]
  );
  const sellerSearchTimerSeconds = sellerSlots[0]?.searchTimerSeconds ?? simConfig.sellerSearchTimerMinutes * 60;
  const setSellerSearchTimerSeconds = useCallback(
    (n: number | ((p: number) => number)) =>
      setSellerSlotAt(0, (s) => ({
        ...s,
        searchTimerSeconds: typeof n === 'function' ? n(s.searchTimerSeconds) : n,
      })),
    [setSellerSlotAt]
  );
  const [rejectReason, setRejectReason] = useState<string | null>(null);
  const [sellerRejectDepositReason, setSellerRejectDepositReason] = useState<string | null>(null);
  const [sellerRejectDepositReasonBuyerIndex, setSellerRejectDepositReasonBuyerIndex] = useState<number | null>(null);
  const [sellerMatchConfirmed, setSellerMatchConfirmed] = useState(false);
  const [confirmTimerSeconds, setConfirmTimerSeconds] = useState(simConfig.confirmTimerSeconds);
  const [canceledMatchedBuyerIndex, setCanceledMatchedBuyerIndex] = useState<number | null>(null);
  const [sellerMatchCanceledDismissed, setSellerMatchCanceledDismissed] = useState(false);
  const [buyerMatchCanceledDismissed, setBuyerMatchCanceledDismissed] = useState(false);
  /** 취소 시점에 구매자/판매자가 이미 확인했는지 → 모달 문구 구분용 */
  const [canceledBuyerHadConfirmed, setCanceledBuyerHadConfirmed] = useState(false);
  const [canceledSellerHadConfirmed, setCanceledSellerHadConfirmed] = useState(false);
  /** 구매자 거절/취소 시 true → 판매자 확인 화면 즉시 숨김 (상태 배치 전에도 적용) */
  const [confirmingInvalidated, setConfirmingInvalidated] = useState(false);
  const confirmingMatchedBuyerIndexRef = useRef<number | null>(null);

  const matchedSlot = matchedBuyerIndex !== null ? buyerSlots[matchedBuyerIndex] : null;
  const buyerDepositDone = matchedSlot?.depositDone ?? false;
  const buyerMatchConfirmed = matchedSlot?.matchConfirmed ?? false;
  const anyBuyerStarted = buyerSlots.some((s) => s.started);
  const amountsMatch =
    matchedSlot != null &&
    Math.min(sellerRemainingAmount, matchedSlot.amount) > 0 &&
    isValidAmount(sellerRemainingAmount) &&
    isValidAmount(matchedSlot.amount);

  /** 다중 동시 매칭: 예약된 금액(대기+확인+거래중) 제외한 잔액 */
  const reservedAmount =
    scheduledMatches.reduce((s, m) => s + m.amount, 0) +
    confirmingMatches.reduce((s, m) => s + m.amount, 0) +
    tradingMatches.reduce((s, m) => s + m.amount, 0);
  const availableToMatch = Math.max(0, sellerRemainingAmount - reservedAmount);

  /** 매칭 미확인 모달이 떠 있는 동안(한쪽이라도 확인 전): 모든 동작 중지 */
  const matchCanceledModalOpen =
    canceledMatchedBuyerIndex !== null && (!sellerMatchCanceledDismissed || !buyerMatchCanceledDismissed);

  const setBuyerSlotAt = useCallback((index: number, updater: (prev: BuyerSlot) => BuyerSlot) => {
    setBuyerSlots((prev) => prev.map((s, i) => (i === index ? updater(s) : s)));
  }, []);

  // 판매자: AI 매칭 시작 누른 시점에 검색 타이머 시작
  const prevSellerStarted = useRef(false);
  useEffect(() => {
    if (sellerStarted && !prevSellerStarted.current) setSellerSearchTimerSeconds(simConfig.sellerSearchTimerMinutes * 60);
    prevSellerStarted.current = sellerStarted;
  }, [sellerStarted, simConfig.sellerSearchTimerMinutes]);
  useEffect(() => {
    if (!sellerStarted) return;
    if (phase !== 'idle' && phase !== 'searching' && phase !== 'confirming' && phase !== 'trading') return;
    if (matchCanceledModalOpen) return;
    const id = setInterval(() => setSellerSearchTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [sellerStarted, phase, matchCanceledModalOpen]);

  // 추가 판매자 슬롯(2번째~) 검색 타이머 1초 감소 (매칭 미확인 모달 떠 있으면 중지)
  useEffect(() => {
    if (matchCanceledModalOpen) return;
    const id = setInterval(() => {
      setSellerSlots((prev) =>
        prev.map((s, i) =>
          i < 1 ? s : s.started && s.searchTimerSeconds > 0 ? { ...s, searchTimerSeconds: s.searchTimerSeconds - 1 } : s
        )
      );
    }, 1000);
    return () => clearInterval(id);
  }, [matchCanceledModalOpen]);

  // 구매자별 검색/입금 타이머: idle·searching·confirming에선 비매칭만 감소, trading에선 입금 제한 타이머로 매칭된 구매자도 감소
  useEffect(() => {
    if (matchCanceledModalOpen) return;
    const id = setInterval(() => {
      setBuyerSlots((prev) =>
        prev.map((s, i) => {
          const isMatched = matchedBuyerIndex === i;
          const active =
            s.started &&
            (phase === 'idle' || phase === 'searching' || phase === 'confirming' || phase === 'trading');
          if (!active) return s;
          if (phase !== 'idle' && phase !== 'trading' && isMatched) return s; // confirming만 매칭자 타이머 정지 (확인 타이머 사용)
          return { ...s, searchTimerSeconds: s.searchTimerSeconds > 0 ? s.searchTimerSeconds - 1 : 0 };
        })
      );
    }, 1000);
    return () => clearInterval(id);
  }, [phase, matchedBuyerIndex, matchCanceledModalOpen]);

  // 1) 판매자와 매칭 가능한 구매자: idle 진입 시 잔액 있으면 잔액 기준 재매칭, 없으면 판매금액 기준 첫 매칭 → SEARCHING
  // 다중 동시 매칭(판매자 1명)일 때는 스킵 → phase는 'idle' 유지, 완료 시에만 'completed'로 전환
  useEffect(() => {
    if (sellerSlots.length === 1) return; // useMultiSimultaneous: 단일 매칭 로직 사용 안 함
    if (!sellerStarted || phase !== 'idle') return;
    const useRemaining = sellerRemainingAmount > 0;
    const refAmount = useRemaining ? sellerRemainingAmount : sellerAmount;
    if (!isValidAmount(refAmount) && !useRemaining) return;
    const candidates: { index: number; amount: number }[] = [];
    for (let i = 0; i < buyerSlots.length; i++) {
      const slot = buyerSlots[i];
      const matchAmount = Math.min(refAmount, slot.amount);
      const withinRange = useRemaining ? slot.amount <= refAmount : true;
      if (slot.started && matchAmount > 0 && isValidAmount(slot.amount) && withinRange && (useRemaining || isValidAmount(sellerAmount))) {
        candidates.push({ index: i, amount: slot.amount });
      }
    }
    if (candidates.length === 0) return;
    candidates.sort((a, b) => {
      const diffA = Math.abs(a.amount - refAmount);
      const diffB = Math.abs(b.amount - refAmount);
      return diffA !== diffB ? diffA - diffB : a.index - b.index;
    });
    const best = candidates[0];
    if (!useRemaining) setSellerRemainingAmount(sellerAmount);
    setMatchedBuyerIndex(best.index);
    setPhase('searching');
  }, [sellerStarted, phase, sellerAmount, sellerRemainingAmount, buyerSlots]);

  /** [다중 동시 매칭] 판매자가 AI 매칭 시작했을 때 remainingAmount가 0이면 판매금액으로 초기화 (그래야 availableToMatch > 0 되어 매칭됨) */
  useEffect(() => {
    if (sellerSlots.length !== 1 || !sellerStarted || sellerRemainingAmount > 0) return;
    if (sellerAmount < MIN_POINT_AMOUNT || !isValidAmount(sellerAmount)) return;
    setSellerRemainingAmount(sellerAmount);
  }, [sellerSlots.length, sellerStarted, sellerRemainingAmount, sellerAmount]);

  // [다중 동시 매칭] 판매자 검색 중·10분 내, 먼저 들어온 순(구매자 인덱스 순)으로 금액 배분해 scheduled에 추가
  useEffect(() => {
    if (!sellerStarted || sellerSearchTimerSeconds <= 0 || availableToMatch < MIN_POINT_AMOUNT) return;
    setScheduledMatches((prev) => {
      let available = sellerRemainingAmount - reservedAmount;
      const next = [...prev];
      for (let i = 0; i < buyerSlots.length; i++) {
        if (available < MIN_POINT_AMOUNT) break;
        const slot = buyerSlots[i];
        const alreadyIn =
          prev.some((m) => m.buyerIndex === i) ||
          confirmingMatches.some((m) => m.buyerIndex === i) ||
          tradingMatches.some((m) => m.buyerIndex === i);
        if (
          !slot.started ||
          alreadyIn ||
          !isValidAmount(slot.amount) ||
          slot.amount > available
        )
          continue;
        const amount = Math.min(available, slot.amount);
        next.push({ matchId: generateMatchId(), buyerIndex: i, amount, scheduledAt: Date.now() });
        available -= amount;
      }
      return next.length === prev.length ? prev : next;
    });
  }, [
    sellerStarted,
    sellerSearchTimerSeconds,
    sellerRemainingAmount,
    reservedAmount,
    availableToMatch,
    buyerSlots,
    confirmingMatches,
    tradingMatches,
  ]);

  // [다중 동시 매칭] 2초 지난 scheduled → confirming. scheduledMatches는 참조가 안 바뀌어도 2초 후 확인해야 하므로 주기적으로 체크
  const [scheduledCheckTick, setScheduledCheckTick] = useState(0);
  useEffect(() => {
    if (scheduledMatches.length === 0) return;
    const id = setInterval(() => {
      setScheduledCheckTick((t) => t + 1);
    }, 500);
    return () => clearInterval(id);
  }, [scheduledMatches.length]);
  useEffect(() => {
    if (scheduledMatches.length === 0) return;
    const now = Date.now();
    const ready = scheduledMatches.filter((m) => now - m.scheduledAt >= simConfig.matchDelaySeconds * 1000);
    if (ready.length === 0) return;
    setScheduledMatches((prev) => prev.filter((m) => now - m.scheduledAt < simConfig.matchDelaySeconds * 1000));
    setConfirmingMatches((prev) => [
      ...prev,
      ...ready.map((m) => ({
        matchId: m.matchId,
        buyerIndex: m.buyerIndex,
        amount: m.amount,
        confirmTimerSeconds: simConfig.confirmTimerSeconds,
        buyerConfirmed: false,
        sellerConfirmed: false,
      })),
    ]);
    setMatchDisplayOrder((prev) => [...prev, ...ready.map((m) => m.matchId)]);
    if (ready.length > 0) playMatchSoundLoop();
  }, [scheduledMatches, scheduledCheckTick, simConfig.matchDelaySeconds, simConfig.confirmTimerSeconds]);

  const timedOutConfirmingRef = useRef<ConfirmingMatch[]>([]);
  // [다중 동시 매칭] confirming 타이머 1초마다 감소, 0 되면 해당 건만 제거
  useEffect(() => {
    if (confirmingMatches.length === 0) return;
    const id = setInterval(() => {
      setConfirmingMatches((prev) => {
        const next = prev.map((m) => ({ ...m, confirmTimerSeconds: Math.max(0, m.confirmTimerSeconds - 1) }));
        const timedOut = next.filter((m) => m.confirmTimerSeconds === 0);
        timedOutConfirmingRef.current = timedOut;
        return next.filter((m) => m.confirmTimerSeconds > 0);
      });
    }, 1000);
    return () => clearInterval(id);
  }, [confirmingMatches.length]);
  // 시간 초과된 confirming 건에 대해 위반 기록 및 구매자 초기화
  useEffect(() => {
    const timedOut = timedOutConfirmingRef.current;
    if (timedOut.length === 0) return;
    timedOutConfirmingRef.current = [];
    const ids = new Set(timedOut.map((m) => m.matchId));
    setMatchDisplayOrder((prev) => prev.filter((id) => !ids.has(id)));
    const violationEntry: ViolationEntry = { type: '취소', message: '매칭 확인 시간 초과 또는 취소' };
    timedOut.forEach((m) => {
      setSellerSlotAt(0, (s) => ({ ...s, violationHistory: [...s.violationHistory, violationEntry] }));
      setBuyerSlotAt(m.buyerIndex, (s) => ({
        ...s,
        started: false,
        amount: 0,
        depositDone: false,
        matchConfirmed: false,
        violationHistory: [...s.violationHistory, violationEntry],
        searchTimerSeconds: simConfig.buyerSearchTimerMinutes * 60,
      }));
    });
  }, [confirmingMatches, setSellerSlotAt, setBuyerSlotAt, simConfig.buyerSearchTimerMinutes]);

  // [다중 동시 매칭] 양쪽 모두 확인한 건 → trading으로 이동 (입금 제한 타이머 시작)
  useEffect(() => {
    const both = confirmingMatches.filter((m) => m.buyerConfirmed && m.sellerConfirmed);
    if (both.length === 0) return;
    setConfirmingMatches((prev) => prev.filter((m) => !m.buyerConfirmed || !m.sellerConfirmed));
    setTradingMatches((prev) => [
      ...prev,
      ...both.map((m) => ({
        matchId: m.matchId,
        buyerIndex: m.buyerIndex,
        amount: m.amount,
        buyerDepositDone: false,
        sellerConfirmed: false,
      })),
    ]);
    both.forEach((m) => {
      setBuyerSlotAt(m.buyerIndex, (s) => ({ ...s, depositDone: false, matchConfirmed: false, searchTimerSeconds: simConfig.buyerDepositTimerMinutes * 60 }));
    });
  }, [confirmingMatches, setBuyerSlotAt, simConfig.buyerDepositTimerMinutes]);

  // [다중 동시 매칭] 거래 완료: buyerDepositDone && sellerConfirmed → 잔액/포인트 반영, 해당 건은 trading에서만 제거하고 완료 목록에 추가(카드 순서 유지를 위해 matchDisplayOrder에서는 제거하지 않음)
  // 구매자 슬롯은 한 번의 setBuyerSlots로 원자 갱신해, showCompletedScreen이 유실되지 않도록 함
  useEffect(() => {
    const done = tradingMatches.filter((m) => {
      const slot = buyerSlots[m.buyerIndex];
      return slot?.depositDone && m.sellerConfirmed;
    });
    if (done.length === 0) return;
    const doneIds = new Set(done.map((m) => m.matchId));
    setCompletedMultiMatches((cm) => {
      const doneInOrder = matchDisplayOrder.filter((id) => doneIds.has(id)).map((id) => done.find((d) => d.matchId === id)!);
      return [...cm, ...doneInOrder];
    });
    setTradingMatches((prev) => prev.filter((m) => !done.some((d) => d.matchId === m.matchId)));
    const totalDeduct = done.reduce((sum, m) => sum + m.amount, 0);
    setSellerCurrentPoints((p) => p - totalDeduct);
    setSellerRemainingAmount((p) => Math.max(0, p - totalDeduct));
    const doneByBuyerIndex = new Map(done.map((m) => [m.buyerIndex, m]));
    setBuyerSlots((prev) =>
      prev.map((s, i) => {
        const m = doneByBuyerIndex.get(i);
        if (!m) return s;
        return {
          ...s,
          currentPoints: s.currentPoints + m.amount,
          started: false,
          amount: 0,
          depositDone: false,
          showCompletedScreen: true,
          lastCompletedAmount: m.amount,
        };
      })
    );
  }, [tradingMatches, buyerSlots]);

  // [다중 동시 매칭] 구매자 입금 제한 타이머 만료 → 해당 건 취소(구매자 위반·첫 화면), 판매자 카드에 "매칭이 취소되었습니다" 표시 후 제거
  // 입금을 안 했거나 입금 후 확인을 안 눌러서 타이머가 끝나면 동일하게 적용 (buyerDepositDone 여부 무관)
  const depositTimeoutFiredRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (sellerSlots.length !== 1) return;
    const toCancel = tradingMatches.filter(
      (m) =>
        !m.canceledReason &&
        (buyerSlots[m.buyerIndex]?.searchTimerSeconds ?? 1) <= 0
    );
    if (toCancel.length === 0) return;
    toCancel.forEach((m) => {
      if (depositTimeoutFiredRef.current.has(m.matchId)) return;
      depositTimeoutFiredRef.current.add(m.matchId);
    });
    setTradingMatches((prev) =>
      prev.map((m) =>
        toCancel.some((c) => c.matchId === m.matchId)
          ? { ...m, canceledReason: 'buyer_deposit_timeout' as const }
          : m
      )
    );
    toCancel.forEach((m) => {
      const entry: ViolationEntry = { type: '취소', message: '입금 확인 시간 초과' };
      setBuyerSlotAt(m.buyerIndex, (s) => ({
        ...s,
        started: false,
        amount: 0,
        depositDone: false,
        matchConfirmed: false,
        violationHistory: [...s.violationHistory, entry],
        searchTimerSeconds: simConfig.buyerSearchTimerMinutes * 60,
      }));
    });
  }, [tradingMatches, buyerSlots, sellerSlots.length, setBuyerSlotAt, simConfig.buyerSearchTimerMinutes]);

  // [다중 동시 매칭] 취소된 매칭 카드는 3초 후 제거 (판매자가 "매칭이 취소되었습니다" 확인할 시간)
  const removeCanceledAtRef = useRef<number | null>(null);
  useEffect(() => {
    const canceled = tradingMatches.filter((m) => m.canceledReason);
    if (canceled.length === 0) {
      removeCanceledAtRef.current = null;
      return;
    }
    if (removeCanceledAtRef.current === null) removeCanceledAtRef.current = Date.now();
    const elapsed = Date.now() - (removeCanceledAtRef.current ?? 0);
    const remaining = Math.max(0, 3000 - elapsed);
    const matchIdsToRemove = canceled.map((m) => m.matchId);
    const t = setTimeout(() => {
      setMatchDisplayOrder((prev) => prev.filter((id) => !matchIdsToRemove.includes(id)));
      setTradingMatches((prev) => prev.filter((m) => !m.canceledReason));
      removeCanceledAtRef.current = null;
      matchIdsToRemove.forEach((id) => depositTimeoutFiredRef.current.delete(id));
    }, remaining);
    return () => clearTimeout(t);
  }, [tradingMatches]);

  /** 판매자 1명(다중 구매자)일 땐 다중 동시 매칭, 2명 이상이면 B2S(기존 단일 매칭 로직은 B2S에서 안 씀) */
  const useMultiSimultaneous = sellerSlots.length === 1;

  // [다중 동시 매칭] 실제로 거래가 있었다가 모두 끝났을 때만 '거래 완료'로 전환 (매칭 시작 직후 remainingAmount 0인 초기 상태와 구분)
  const hadTradingMatchesRef = useRef(false);
  useEffect(() => {
    if (tradingMatches.length > 0) {
      hadTradingMatchesRef.current = true;
      return;
    }
  }, [tradingMatches.length]);
  useEffect(() => {
    if (!useMultiSimultaneous || phase === 'completed') return;
    if (tradingMatches.length > 0 || sellerRemainingAmount > 0 || !sellerStarted) return;
    if (!hadTradingMatchesRef.current) return; // 한 번도 거래 중인 건이 없었으면 완료 화면으로 가지 않음
    hadTradingMatchesRef.current = false;
    setCompletedSoldAmount(sellerAmount); // 다중 매칭 시 판매된 금액 = 시작 시 판매금액(전량 판매됨)
    setPhase('completed');
  }, [useMultiSimultaneous, phase, tradingMatches.length, sellerRemainingAmount, sellerStarted, sellerAmount]);

  // 1b) [기존 단일 매칭] searching 중 matchedBuyerIndex가 null이면 후보 재탐색(구매자 취소 시). 후보 없으면 phase → idle
  useEffect(() => {
    if (useMultiSimultaneous || matchCanceledModalOpen) return;
    if (phase !== 'searching' || matchedBuyerIndex !== null || sellerRemainingAmount <= 0) return;
    const candidates: { index: number; amount: number }[] = [];
    for (let i = 0; i < buyerSlots.length; i++) {
      const slot = buyerSlots[i];
      const matchAmount = Math.min(sellerRemainingAmount, slot.amount);
      const withinRange = slot.amount <= sellerRemainingAmount;
      if (slot.started && matchAmount > 0 && isValidAmount(slot.amount) && withinRange) {
        candidates.push({ index: i, amount: slot.amount });
      }
    }
    if (candidates.length === 0) {
      if (sellerStarted) setPhase('idle');
      return;
    }
    candidates.sort((a, b) => {
      const diffA = Math.abs(a.amount - sellerRemainingAmount);
      const diffB = Math.abs(b.amount - sellerRemainingAmount);
      return diffA !== diffB ? diffA - diffB : a.index - b.index;
    });
    setSellerClickedNew(false);
    setMatchedBuyerIndex(candidates[0].index);
  }, [useMultiSimultaneous, phase, matchedBuyerIndex, sellerStarted, sellerRemainingAmount, buyerSlots, matchCanceledModalOpen]);

  // 2) [단일 매칭] SEARCHING 2초 뒤 매칭 성사 → confirming (다중 동시 매칭 시 스킵). 구매자 취소 시 이 타이머를 즉시 해제하기 위해 ref에 보관.
  const matchDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matchSearchRef = useRef({
    sellerRemainingAmount: 0,
    matchedBuyerIndex: null as number | null,
    buyerSlots: [] as BuyerSlot[],
  });
  matchSearchRef.current = { sellerRemainingAmount, matchedBuyerIndex, buyerSlots };
  useEffect(() => {
    if (useMultiSimultaneous || phase !== 'searching' || matchedBuyerIndex === null) return;
    const slot = buyerSlots[matchedBuyerIndex];
    const matchAmount = Math.min(sellerRemainingAmount, slot?.amount ?? 0);
    if (!sellerStarted || !slot?.started || matchAmount <= 0) return;
    const timer = setTimeout(() => {
      const { sellerRemainingAmount: rem, matchedBuyerIndex: idx, buyerSlots: slots } = matchSearchRef.current;
      if (idx === null) return;
      const s = slots[idx];
      if (!s?.started) return;
      const result = computeMatchResult(rem, s.amount, sellerSessionUser, s.user);
      setConfirmingInvalidated(false);
      setMatchResult(result);
      setPhase('confirming');
      playMatchSoundLoop();
      setSellerMatchConfirmed(false);
      setBuyerSlotAt(idx, (prev) => ({ ...prev, depositDone: false, matchConfirmed: false }));
      setSellerConfirmed(false);
    }, simConfig.matchDelaySeconds * 1000);
    matchDelayTimerRef.current = timer;
    return () => {
      clearTimeout(timer);
      matchDelayTimerRef.current = null;
    };
  }, [useMultiSimultaneous, phase, matchedBuyerIndex, sellerStarted, sellerRemainingAmount, setBuyerSlotAt, simConfig.matchDelaySeconds]);

  // 3) [단일 매칭] 양쪽 모두 매칭 확인 시 거래(trading) 단계 (입금 제한 타이머 시작)
  useEffect(() => {
    if (useMultiSimultaneous || phase !== 'confirming' || matchedBuyerIndex === null || !sellerMatchConfirmed) return;
    const slot = buyerSlots[matchedBuyerIndex];
    if (!slot?.matchConfirmed) return;
    setPhase('trading');
    setSellerMatchConfirmed(false);
    setBuyerSlotAt(matchedBuyerIndex, (s) => ({ ...s, matchConfirmed: false, searchTimerSeconds: simConfig.buyerDepositTimerMinutes * 60 }));
  }, [useMultiSimultaneous, phase, matchedBuyerIndex, sellerMatchConfirmed, buyerSlots, setBuyerSlotAt, simConfig.buyerDepositTimerMinutes]);

  // [단일 매칭] trading → completed: 판매자 입금확인 시 거래 완료
  useEffect(() => {
    if (useMultiSimultaneous || phase !== 'trading' || !matchResult || matchedBuyerIndex === null) return;
    const slot = buyerSlots[matchedBuyerIndex];
    if (!slot?.depositDone || !sellerConfirmed) return;
    const total = matchResult.totalAmount;
    const idx = matchedBuyerIndex;
    setCompletedSoldAmount(total);
    setPhase('completed');
    setSellerCurrentPoints((prev) => prev - total);
    setSellerRemainingAmount((prev) => Math.max(0, prev - total));
    setBuyerSlotAt(idx, (prev) => ({
      ...prev,
      currentPoints: prev.currentPoints + total,
      started: false,
      amount: 0,
      showCompletedScreen: true,
      lastCompletedAmount: total,
    }));
  }, [useMultiSimultaneous, phase, matchResult, matchedBuyerIndex, sellerConfirmed, buyerSlots, setBuyerSlotAt]);

  // [단일 매칭] 거래 단계에서 구매자 입금 제한 타이머 만료 → 구매자 위반·첫 화면, 판매자에게 "매칭이 취소되었습니다" 알림
  const singleMatchDepositTimeoutFiredRef = useRef(false);
  useEffect(() => {
    if (phase !== 'trading') singleMatchDepositTimeoutFiredRef.current = false;
  }, [phase]);
  useEffect(() => {
    if (useMultiSimultaneous || phase !== 'trading' || matchedBuyerIndex === null) return;
    if (singleMatchDepositTimeoutFiredRef.current) return;
    const slot = buyerSlots[matchedBuyerIndex];
    if ((slot?.searchTimerSeconds ?? 1) > 0) return;
    singleMatchDepositTimeoutFiredRef.current = true;
    const idx = matchedBuyerIndex;
    const entry: ViolationEntry = { type: '취소', message: '입금 확인 시간 초과' };
    setBuyerSlotAt(idx, (s) => ({
      ...s,
      started: false,
      amount: 0,
      depositDone: false,
      matchConfirmed: false,
      violationHistory: [...s.violationHistory, entry],
      searchTimerSeconds: simConfig.buyerSearchTimerMinutes * 60,
    }));
    setRejectReason('구매자 입금 시간 초과로 매칭이 취소되었습니다.');
    setMatchResult(null);
    setMatchedBuyerIndex(null);
    setSellerConfirmed(false);
    setPhase(sellerRemainingAmount > 0 ? 'searching' : 'idle');
  }, [useMultiSimultaneous, phase, matchedBuyerIndex, buyerSlots, sellerRemainingAmount, setBuyerSlotAt, simConfig.buyerSearchTimerMinutes]);

  // [단일 매칭] completed 직후 잔액 있으면 다음 구매자와 매칭 시작
  useEffect(() => {
    if (useMultiSimultaneous || phase !== 'completed' || sellerRemainingAmount <= 0 || !sellerStarted) return;
    const candidates: { index: number; amount: number }[] = [];
    for (let i = 0; i < buyerSlots.length; i++) {
      const slot = buyerSlots[i];
      const matchAmount = Math.min(sellerRemainingAmount, slot.amount);
      const withinRange = slot.amount <= sellerRemainingAmount;
      if (slot.started && matchAmount > 0 && isValidAmount(slot.amount) && withinRange) {
        candidates.push({ index: i, amount: slot.amount });
      }
    }
    if (candidates.length === 0) return;
    candidates.sort((a, b) => {
      const diffA = Math.abs(a.amount - sellerRemainingAmount);
      const diffB = Math.abs(b.amount - sellerRemainingAmount);
      return diffA !== diffB ? diffA - diffB : a.index - b.index;
    });
    const best = candidates[0];
    setMatchResult(null);
    setSellerMatchConfirmed(false);
    setSellerConfirmed(false);
    setMatchedBuyerIndex(best.index);
    setPhase('searching');
  }, [useMultiSimultaneous, phase, sellerRemainingAmount, sellerStarted, buyerSlots]);

  const reset = useCallback(() => {
    setSellerSlots((prev) =>
      prev.map((s, i) => (i === 0 ? { ...createInitialSellerSlot(0, simConfig), user: s.user } : s))
    );
    setPhase('idle');
    setMatchResult(null);
    setSellerConfirmed(false);
    setSellerClickedNew(false);
    setSellerMatchConfirmed(false);
    setMatchedBuyerIndex(null);
    setScheduledMatches([]);
    setConfirmingMatches([]);
    setTradingMatches([]);
    setMatchDisplayOrder([]);
    setActiveDisputes([]);
    setBuyerSlots((prev) =>
      prev.map((s) => ({
        ...s,
        amount: 0,
        started: false,
        depositDone: false,
        clickedNew: false,
        showCompletedScreen: false,
        lastCompletedAmount: 0,
        matchConfirmed: false,
        searchTimerSeconds: simConfig.buyerSearchTimerMinutes * 60,
      }))
    );
  }, [simConfig]);

  /** 매칭 확인: 판매자 확인 (단일) */
  const handleSellerConfirmMatch = useCallback(() => {
    stopMatchSound();
    setSellerMatchConfirmed(true);
  }, []);

  /** 매칭 확인: 구매자 확인 (단일, 해당 슬롯) */
  const handleBuyerConfirmMatch = useCallback(
    (buyerIndex: number) => {
      stopMatchSound();
      setBuyerSlotAt(buyerIndex, (s) => ({ ...s, matchConfirmed: true }));
    },
    [setBuyerSlotAt]
  );

  /** [다중 동시 매칭] 건별 판매자 수락 */
  const handleSellerConfirmMatchMulti = useCallback((matchId: string) => {
    stopMatchSound();
    setConfirmingMatches((prev) => prev.map((m) => (m.matchId === matchId ? { ...m, sellerConfirmed: true } : m)));
  }, []);
  /** [다중 동시 매칭] 건별 구매자 수락 */
  const handleBuyerConfirmMatchMulti = useCallback((matchId: string) => {
    stopMatchSound();
    setConfirmingMatches((prev) => prev.map((m) => (m.matchId === matchId ? { ...m, buyerConfirmed: true } : m)));
  }, []);
  /** [다중 동시 매칭] 건별 취소/거절: 구매자 거절은 분쟁 아님 → 위반만 기록, 해당 건만 제거. (판매자 입금 거부만 분쟁) */
  const handleDeclineMatchMulti = useCallback(
    (matchId: string, reason?: string) => {
      const m = confirmingMatches.find((x) => x.matchId === matchId);
      if (!m) return;
      const message = reason ? `구매자 거부: ${reason}` : '매칭 확인 시간 초과 또는 취소';
      const violationEntry: ViolationEntry = { type: reason ? '거부' : '취소', message };
      setSellerSlotAt(0, (s) => ({ ...s, violationHistory: [...s.violationHistory, violationEntry] }));
      setBuyerSlotAt(m.buyerIndex, (s) => ({ ...s, violationHistory: [...s.violationHistory, violationEntry] }));
      setConfirmingMatches((prev) => prev.filter((x) => x.matchId !== matchId));
      setMatchDisplayOrder((prev) => prev.filter((id) => id !== matchId));
    },
    [confirmingMatches, setSellerSlotAt, setBuyerSlotAt]
  );
  /** [다중 동시 매칭] 건별 입금확인 */
  const handleSellerConfirmDepositMulti = useCallback((matchId: string) => {
    setTradingMatches((prev) => prev.map((m) => (m.matchId === matchId ? { ...m, sellerConfirmed: true } : m)));
    setTransferModalMatchId(null); // 인라인 확인 후 전역 선택 해제
  }, []);

  /** [다중 동시 매칭] 건별 입금 거부: 분쟁 발생 → 양쪽 분쟁 화면, 위반 기록. 어드민 풀어주기 전까지 유지 */
  const handleSellerRejectDepositMulti = useCallback(
    (matchId: string, reason: string) => {
      const m = tradingMatches.find((x) => x.matchId === matchId);
      if (!m) return;
      const entry: ViolationEntry = { type: '거부', message: `판매자 입금 거부: ${reason}` };
      setSellerSlotAt(0, (s) => ({ ...s, violationHistory: [...s.violationHistory, entry] }));
      setBuyerSlotAt(m.buyerIndex, (s) => ({ ...s, violationHistory: [...s.violationHistory, entry] }));
      setActiveDisputes((prev) => [...prev, { matchId, buyerIndex: m.buyerIndex, amount: m.amount, reason: `판매자 입금 거부: ${reason}` }]);
      setTradingMatches((prev) => prev.filter((x) => x.matchId !== matchId));
      setMatchDisplayOrder((prev) => prev.filter((id) => id !== matchId));
    },
    [tradingMatches, setSellerSlotAt, setBuyerSlotAt]
  );

  /** [다중 동시 매칭] 구매자 입금 불가: 해당 건만 거래에서 제거, 위반 기록(분쟁 아님) */
  const handleBuyerRejectDepositMulti = useCallback(
    (matchId: string, reason: string) => {
      const m = tradingMatches.find((x) => x.matchId === matchId);
      if (!m) return;
      const entry: ViolationEntry = { type: '거부', message: `구매자 거부: ${reason}` };
      setSellerSlotAt(0, (s) => ({ ...s, violationHistory: [...s.violationHistory, entry] }));
      setBuyerSlotAt(m.buyerIndex, (s) => ({ ...s, violationHistory: [...s.violationHistory, entry] }));
      setTradingMatches((prev) => prev.filter((x) => x.matchId !== matchId));
      setMatchDisplayOrder((prev) => prev.filter((id) => id !== matchId));
    },
    [tradingMatches, setSellerSlotAt, setBuyerSlotAt]
  );

  /** 어드민: 분쟁 해결 → 구매자·판매자 모두 초기화면으로, 분쟁 목록 비우기 */
  const resolveDisputes = useCallback(() => {
    setActiveDisputes((prev) => {
      const indices = [...new Set(prev.map((d) => d.buyerIndex))];
      indices.forEach((idx) => {
        setBuyerSlotAt(idx, (s) => ({
          ...s,
          started: false,
          amount: 0,
          depositDone: false,
          matchConfirmed: false,
          showCompletedScreen: false,
          lastCompletedAmount: 0,
          searchTimerSeconds: simConfig.buyerSearchTimerMinutes * 60,
        }));
      });
      return [];
    });
    setSellerSlotAt(0, (s) => ({
      ...s,
      started: false,
      amount: 0,
      remainingAmount: 0,
      clickedNew: false,
      searchTimerSeconds: simConfig.sellerSearchTimerMinutes * 60,
    }));
    setPhase('idle');
    setMatchResult(null);
    setSellerMatchConfirmed(false);
    setMatchedBuyerIndex(null);
    setConfirmingMatches([]);
    setTradingMatches([]);
    setMatchDisplayOrder([]);
    setCompletedMultiMatches([]);
  }, [setBuyerSlotAt, setSellerSlotAt, simConfig.buyerSearchTimerMinutes, simConfig.sellerSearchTimerMinutes]);

  /** 다중 매칭 시 입금확인 모달이 열린 건 (해당 matchResult 전달용) */
  const [transferModalMatchId, setTransferModalMatchId] = useState<string | null>(null);
  const multiTransferMatchResult =
    useMultiSimultaneous && transferModalMatchId
      ? (() => {
          const m = tradingMatches.find((x) => x.matchId === transferModalMatchId);
          if (!m) return null;
          const sellerUser = sellerSlots[0]?.user ?? sellerSessionUser;
          const buyerUser = buyerSlots[m.buyerIndex]?.user;
          if (!buyerUser) return null;
          return computeMatchResult(sellerAmount, m.amount, sellerUser, buyerUser);
        })()
      : null;

  /** confirming 진입 시 매칭된 구매자 인덱스를 ref에 고정 (타이머 만료 시 스테일 클로저 방지) */
  const declineMatchFiredRef = useRef(false);
  useEffect(() => {
    if (phase === 'confirming' && matchedBuyerIndex !== null) {
      confirmingMatchedBuyerIndexRef.current = matchedBuyerIndex;
      declineMatchFiredRef.current = false;
    } else if (phase !== 'confirming') {
      confirmingMatchedBuyerIndexRef.current = null;
    }
  }, [phase, matchedBuyerIndex]);

  /** 매칭 확인 단계: 구매자 거절(사유 선택) 또는 시간 초과 시 해당 매칭만 취소. 구매자는 초기화면, 판매자는 검색 중 화면(10분 타이머)으로. */
  const handleDeclineMatch = useCallback(
    (reason?: string) => {
      flushSync(() => setConfirmingInvalidated(true));
      const idx = confirmingMatchedBuyerIndexRef.current ?? matchedBuyerIndex;
      const buyerHadConfirmed = idx !== null ? (buyerSlots[idx]?.matchConfirmed ?? false) : false;
      const sellerHadConfirmed = sellerMatchConfirmed;
      const violationEntry: ViolationEntry = {
        type: reason ? '거부' : '취소',
        message: reason ? `구매자 거부: ${reason}` : '매칭 확인 시간 초과 또는 취소',
      };
      if (reason) setRejectReason(reason);
      setSellerSlotAt(0, (s) => ({ ...s, violationHistory: [...s.violationHistory, violationEntry] }));
      setMatchResult(null);
      setSellerMatchConfirmed(false);
      setMatchedBuyerIndex(null);
      setPhase('searching');
      if (idx !== null) {
        setCanceledBuyerHadConfirmed(buyerHadConfirmed);
        setCanceledSellerHadConfirmed(sellerHadConfirmed);
        setBuyerSlots((prev) =>
          prev.map((s, i) =>
            i === idx
              ? {
                  ...s,
                  started: false,
                  amount: 0,
                  depositDone: false,
                  matchConfirmed: false,
                  showCompletedScreen: false,
                  lastCompletedAmount: 0,
                  searchTimerSeconds: simConfig.buyerSearchTimerMinutes * 60,
                  violationHistory: [...s.violationHistory, violationEntry],
                }
              : s
          )
        );
        setCanceledMatchedBuyerIndex(idx);
        setSellerMatchCanceledDismissed(false);
        setBuyerMatchCanceledDismissed(false);
      }
      confirmingMatchedBuyerIndexRef.current = null;
    },
    [matchedBuyerIndex, sellerMatchConfirmed, buyerSlots, simConfig.buyerSearchTimerMinutes, setSellerSlotAt]
  );

  /** 위반내역 확인 모달에서 확인 클릭 시 → 취소 모달 닫고, 클릭한 쪽(구매자/판매자) 초기 화면으로 */
  const handleViolationConfirmed = useCallback(
    (buyerIndex?: number) => {
      setCanceledMatchedBuyerIndex(null);
      setBuyerMatchCanceledDismissed(true);
      setSellerMatchCanceledDismissed(true);
      setCanceledBuyerHadConfirmed(false);
      setCanceledSellerHadConfirmed(false);
      if (typeof buyerIndex === 'number') {
        setBuyerSlotAt(buyerIndex, (s) => ({
          ...s,
          started: false,
          amount: 0,
          depositDone: false,
          clickedNew: false,
          showCompletedScreen: false,
          lastCompletedAmount: 0,
          searchTimerSeconds: simConfig.buyerSearchTimerMinutes * 60,
        }));
      } else {
        setPhase('idle');
        setSellerStarted(false);
        setSellerAmount(0);
        setSellerRemainingAmount(0);
        setMatchResult(null);
        setSellerConfirmed(false);
        setMatchedBuyerIndex(null);
        setConfirmingInvalidated(true);
        setScheduledMatches([]);
        setConfirmingMatches([]);
        setTradingMatches([]);
        setMatchDisplayOrder([]);
        setCompletedMultiMatches([]);
        setSellerSlotAt(0, (s) => ({
          ...s,
          amount: 0,
          remainingAmount: 0,
          started: false,
          clickedNew: false,
          searchTimerSeconds: simConfig.sellerSearchTimerMinutes * 60,
        }));
      }
    },
    [setBuyerSlotAt, setSellerSlotAt, simConfig.buyerSearchTimerMinutes, simConfig.sellerSearchTimerMinutes]
  );

  /** 매칭 미확인 모달 "확인": 화면은 이미 초기화면이므로 모달만 닫고, 둘 다 확인 시 정리. */
  const handleMatchCanceledConfirm = useCallback(
    (source: 'seller' | number) => {
      if (source === 'seller') setSellerMatchCanceledDismissed(true);
      else setBuyerMatchCanceledDismissed(true);
      if (source === 'seller' && buyerMatchCanceledDismissed) {
        setCanceledMatchedBuyerIndex(null);
        setCanceledBuyerHadConfirmed(false);
        setCanceledSellerHadConfirmed(false);
      } else if (typeof source === 'number' && sellerMatchCanceledDismissed) {
        setCanceledMatchedBuyerIndex(null);
        setCanceledBuyerHadConfirmed(false);
        setCanceledSellerHadConfirmed(false);
      }
    },
    [sellerMatchCanceledDismissed, buyerMatchCanceledDismissed]
  );

  useEffect(() => {
    if (phase !== 'confirming') return;
    setConfirmTimerSeconds(simConfig.confirmTimerSeconds);
    const id = setInterval(() => setConfirmTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [phase, simConfig.confirmTimerSeconds]);
  useEffect(() => {
    if (phase === 'confirming' && confirmTimerSeconds === 0 && !declineMatchFiredRef.current) {
      declineMatchFiredRef.current = true;
      handleDeclineMatch();
    }
  }, [phase, confirmTimerSeconds, handleDeclineMatch]);

  /** 판매자 '확인' 클릭: 본인 화면만 갱신. 거래완료 후 확인 시 첫 화면(초기 입력)으로. */
  const handleSellerNewTrade = useCallback(() => {
    setSellerClickedNew(true);
    if (phase === 'completed') {
      // [다중 동시 매칭] 거래 완료 후 확인 → 항상 첫 화면으로 (매칭 검색 창이 아닌 초기 화면)
      if (sellerSlots.length === 1) {
        setPhase('idle');
        setSellerStarted(false);
        setSellerAmount(0);
        setSellerRemainingAmount(0);
        setSellerSlots((prev) =>
          prev.map((s, i) => (i === 0 ? { ...createInitialSellerSlot(0, simConfig), user: s.user, currentPoints: s.currentPoints } : s))
        );
        setMatchResult(null);
        setMatchedBuyerIndex(null);
        setSellerConfirmed(false);
        setSellerClickedNew(false);
        setScheduledMatches([]);
        setConfirmingMatches([]);
        setTradingMatches([]);
        setMatchDisplayOrder([]);
        setCompletedMultiMatches([]);
        setActiveDisputes([]);
        setCompletedSoldAmount(0);
        return;
      }
      // [단일 매칭] 양쪽 모두 확인했을 때만 idle/리셋
      const idx = matchedBuyerIndex;
      const matchedSlot = idx !== null ? buyerSlots[idx] : null;
      if (idx !== null && matchedSlot?.clickedNew) {
        setMatchResult(null);
        setMatchedBuyerIndex(null);
        setSellerConfirmed(false);
        setSellerClickedNew(false);
        setCompletedSoldAmount(0);
        if (sellerRemainingAmount > 0) {
          setPhase('idle');
          setBuyerSlotAt(idx, (s) => ({ ...s, amount: 0, started: false, depositDone: false, clickedNew: false, showCompletedScreen: false, lastCompletedAmount: 0, searchTimerSeconds: simConfig.buyerSearchTimerMinutes * 60 }));
        } else {
          setPhase('idle');
          setSellerAmount(0);
          setSellerRemainingAmount(0);
          setSellerStarted(false);
          setSellerSlots((prev) =>
            prev.map((s, i) => (i === 0 ? { ...createInitialSellerSlot(0, simConfig), user: s.user, currentPoints: s.currentPoints } : s))
          );
          setBuyerSlotAt(idx, (s) => ({ ...s, amount: 0, started: false, depositDone: false, clickedNew: false, showCompletedScreen: false, lastCompletedAmount: 0, searchTimerSeconds: simConfig.buyerSearchTimerMinutes * 60 }));
        }
      }
      return;
    }
    if (sellerRemainingAmount > 0) {
      setPhase('searching');
      setMatchResult(null);
      setMatchedBuyerIndex(null);
      setSellerConfirmed(false);
    } else {
      setSellerAmount(0);
      setSellerRemainingAmount(0);
      setSellerStarted(false);
      const idx = matchedBuyerIndex;
      const matchedSlot = idx !== null ? buyerSlots[idx] : null;
      if (idx !== null && matchedSlot?.clickedNew) {
        setPhase('idle');
        setMatchResult(null);
        setSellerConfirmed(false);
        setSellerClickedNew(false);
        setMatchedBuyerIndex(null);
        setBuyerSlotAt(idx, (s) => ({ ...s, amount: 0, started: false, depositDone: false, clickedNew: false, showCompletedScreen: false, lastCompletedAmount: 0, searchTimerSeconds: simConfig.buyerSearchTimerMinutes * 60 }));
      }
    }
  }, [phase, matchedBuyerIndex, buyerSlots, sellerRemainingAmount, sellerSlots.length, setBuyerSlotAt, simConfig]);

  /** 구매자 '확인' 클릭: 본인만 갱신. 양쪽 모두 확인했을 때도 해당 거래한 구매자·판매자만 리셋, 다른 구매자(2,3,4,5)는 건드리지 않음. */
  const handleBuyerNewTrade = useCallback(
    (buyerIndex: number) => {
      setBuyerSlotAt(buyerIndex, (s) => ({ ...s, clickedNew: true, showCompletedScreen: false, lastCompletedAmount: 0, amount: 0, started: false, searchTimerSeconds: simConfig.buyerSearchTimerMinutes * 60 }));
      if (sellerClickedNew && matchedBuyerIndex === buyerIndex) {
        setMatchResult(null);
        setMatchedBuyerIndex(null);
        setSellerConfirmed(false);
        setSellerClickedNew(false);
        if (sellerRemainingAmount > 0) {
          setPhase('idle');
          setBuyerSlotAt(buyerIndex, (s) => ({ ...s, amount: 0, started: false, depositDone: false, clickedNew: false, showCompletedScreen: false, lastCompletedAmount: 0, searchTimerSeconds: simConfig.buyerSearchTimerMinutes * 60 }));
        } else {
          setPhase('idle');
          setSellerAmount(0);
          setSellerRemainingAmount(0);
          setSellerStarted(false);
          setSellerSlots((prev) =>
            prev.map((s, i) => (i === 0 ? { ...createInitialSellerSlot(0, simConfig), user: s.user, currentPoints: s.currentPoints } : s))
          );
          setBuyerSlotAt(buyerIndex, (s) => ({ ...s, amount: 0, started: false, depositDone: false, clickedNew: false, showCompletedScreen: false, lastCompletedAmount: 0, searchTimerSeconds: simConfig.buyerSearchTimerMinutes * 60 }));
        }
      }
    },
    [sellerClickedNew, matchedBuyerIndex, sellerRemainingAmount, setBuyerSlotAt, simConfig]
  );

  /** 판매자 매칭 검색 취소: 취소한 판매자만 초기 화면으로. 구매자(반대편)는 매칭 검색 화면 유지 */
  const handleCancelSellerSearch = useCallback(() => {
    setSellerStarted(false);
    setSellerAmount(0);
    setSellerRemainingAmount(0);
    setMatchResult(null);
    setMatchedBuyerIndex(null);
  }, []);

  /** 구매자 매칭 검색 취소: 취소한 구매자만 초기 화면으로. 예약된 매칭 타이머 즉시 해제해 판매자가 취소한 구매자와 다시 매칭되지 않도록 함 */
  const handleCancelBuyerSearch = useCallback(
    (buyerIndex: number) => {
      if (matchDelayTimerRef.current !== null) {
        clearTimeout(matchDelayTimerRef.current);
        matchDelayTimerRef.current = null;
      }
      flushSync(() => setConfirmingInvalidated(true));
      setBuyerSlotAt(buyerIndex, (s) => ({ ...s, started: false, amount: 0 }));
      if (matchedBuyerIndex === buyerIndex) {
        setMatchResult(null);
        setMatchedBuyerIndex(null);
      }
    },
    [matchedBuyerIndex, setBuyerSlotAt]
  );

  /** 구매자 거부 → 매칭 취소, 구매자 위반 기록·첫화면 이동. 판매자에게 거부 사유 모달 표시, 확인 시 첫화면. */
  const handleRejectMatch = useCallback(
    (buyerIndex: number, reason: string) => {
      flushSync(() => setConfirmingInvalidated(true));
      const entry: ViolationEntry = { type: '거부', message: `구매자 거부: ${reason}` };
      setSellerSlotAt(0, (s) => ({ ...s, violationHistory: [...s.violationHistory, entry] }));
      setBuyerSlotAt(buyerIndex, (s) => ({
        ...s,
        amount: 0,
        started: false,
        depositDone: false,
        clickedNew: false,
        showCompletedScreen: false,
        lastCompletedAmount: 0,
        searchTimerSeconds: simConfig.buyerSearchTimerMinutes * 60,
        violationHistory: [...s.violationHistory, entry],
      }));
      setRejectReason(reason);
      setSellerAmount(0);
      setSellerRemainingAmount(0);
      setPhase('idle');
      setMatchResult(null);
      setSellerStarted(false);
      setSellerConfirmed(false);
      setMatchedBuyerIndex(null);
    },
    [simConfig.buyerSearchTimerMinutes, setSellerSlotAt, setBuyerSlotAt]
  );

  /** 판매자가 매칭자 거부사유 모달에서 확인 클릭 시 → 모달 닫고 판매자 완전 초기 화면으로 */
  const clearRejectReason = useCallback(() => {
    setRejectReason(null);
    setPhase('idle');
    setSellerStarted(false);
    setSellerAmount(0);
    setSellerRemainingAmount(0);
    setMatchResult(null);
    setSellerConfirmed(false);
    setMatchedBuyerIndex(null);
    setConfirmingInvalidated(true);
    setScheduledMatches([]);
    setConfirmingMatches([]);
    setTradingMatches([]);
    setMatchDisplayOrder([]);
    setCompletedMultiMatches([]);
    setSellerSlotAt(0, (s) => ({
      ...s,
      amount: 0,
      remainingAmount: 0,
      started: false,
      clickedNew: false,
      searchTimerSeconds: simConfig.sellerSearchTimerMinutes * 60,
    }));
  }, [setSellerSlotAt, simConfig.sellerSearchTimerMinutes]);

  /** 판매자 입금 거부 → 해당 구매자에게만 사유 표시. 위반내역은 해당 판매자·구매자만 기록. */
  const handleSellerRejectDeposit = useCallback(
    (reason: string) => {
      const idx = matchedBuyerIndex;
      const entry: ViolationEntry = { type: '거부', message: `판매자 입금 거부: ${reason}` };
      setSellerSlotAt(0, (s) => ({ ...s, violationHistory: [...s.violationHistory, entry] }));
      if (idx !== null) {
        setBuyerSlotAt(idx, (s) => ({
          ...s,
          amount: 0,
          started: false,
          depositDone: false,
          searchTimerSeconds: simConfig.buyerSearchTimerMinutes * 60,
          violationHistory: [...s.violationHistory, entry],
        }));
      }
      setSellerRejectDepositReason(reason);
      setSellerRejectDepositReasonBuyerIndex(idx);
      setSellerRemainingAmount(0);
      setPhase('idle');
      setMatchResult(null);
      setSellerStarted(false);
      setSellerConfirmed(false);
      setMatchedBuyerIndex(null);
    },
    [matchedBuyerIndex, setSellerSlotAt, setBuyerSlotAt]
  );
  const clearSellerRejectDepositReason = useCallback(() => {
    setSellerRejectDepositReason(null);
    setSellerRejectDepositReasonBuyerIndex(null);
  }, []);

  /** 새 구매자 화면 추가 (최대 5개) */
  const addBuyerSlot = useCallback(() => {
    setBuyerSlots((prev) => {
      if (prev.length >= MAX_BUYERS) return prev;
      return [...prev, createInitialBuyerSlot(prev.length, simConfig)];
    });
  }, [simConfig]);

  /** 추가된 구매자 화면 삭제 (1번은 유지, 2~5번만 삭제 가능) */
  const removeBuyerSlot = useCallback((buyerIndex: number) => {
    if (buyerIndex < 1) return;
    setBuyerSlots((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== buyerIndex);
      return next;
    });
    setMatchedBuyerIndex((current) => {
      if (current === null) return null;
      if (current === buyerIndex) return null;
      if (current > buyerIndex) return current - 1;
      return current;
    });
    if (matchedBuyerIndex === buyerIndex) {
      setPhase('idle');
      setMatchResult(null);
      setSellerMatchConfirmed(false);
      setSellerAmount(0);
      setSellerStarted(false);
      setSellerConfirmed(false);
    }
  }, [matchedBuyerIndex]);

  /** 새 판매자 화면 추가 (최대 5개) */
  const addSellerSlot = useCallback(() => {
    setSellerSlots((prev) => {
      if (prev.length >= MAX_SELLERS) return prev;
      return [...prev, createInitialSellerSlot(prev.length, simConfig)];
    });
  }, [simConfig]);

  /** 추가된 판매자 화면 삭제 (1번은 유지, 2~5번만 삭제 가능) */
  const removeSellerSlot = useCallback((sellerIndex: number) => {
    if (sellerIndex < 1) return;
    setSellerSlots((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== sellerIndex);
    });
  }, []);

  const sellerDisplayPoints = sellerCurrentPoints;

  /** 다중 동시 매칭 시 구매자 i의 phase, matchResult, 확인 타이머·수락/거절 props */
  const getBuyerMultiProps = useCallback(
    (i: number) => {
      const slot = buyerSlots[i];
      const sellerUser = sellerSlots[0]?.user ?? sellerSessionUser;
      const mc = confirmingMatches.find((m) => m.buyerIndex === i);
      const mt = tradingMatches.find((m) => m.buyerIndex === i);
      if (mc)
        return {
          phase: 'confirming' as const,
          matchResult: computeMatchResult(sellerAmount, mc.amount, sellerUser, slot.user),
          matchConfirming: true,
          sellerMatchConfirmed: mc.sellerConfirmed,
          buyerMatchConfirmed: mc.buyerConfirmed,
          confirmTimerSeconds: mc.confirmTimerSeconds,
          onConfirmMatch: () => handleBuyerConfirmMatchMulti(mc.matchId),
          onDeclineMatch: () => handleDeclineMatchMulti(mc.matchId),
        };
      if (mt)
        return {
          phase: 'trading' as const,
          matchResult: computeMatchResult(sellerAmount, mt.amount, sellerUser, slot.user),
          matchConfirming: false,
          sellerMatchConfirmed: mt.sellerConfirmed,
          buyerMatchConfirmed: false,
          confirmTimerSeconds: simConfig.confirmTimerSeconds,
          onConfirmMatch: () => handleBuyerConfirmMatch(i),
          onDeclineMatch: handleDeclineMatch,
        };
      return {
        phase: (slot.started ? 'searching' : 'idle') as SimPhase,
        matchResult: null as ReturnType<typeof computeMatchResult>,
        matchConfirming: false,
        sellerMatchConfirmed: false,
        buyerMatchConfirmed: false,
        confirmTimerSeconds: simConfig.confirmTimerSeconds,
        onConfirmMatch: () => handleBuyerConfirmMatch(i),
        onDeclineMatch: handleDeclineMatch,
      };
    },
    [
      buyerSlots,
      sellerSlots,
      sellerAmount,
      confirmingMatches,
      tradingMatches,
      handleBuyerConfirmMatchMulti,
      handleDeclineMatchMulti,
      handleBuyerConfirmMatch,
      handleDeclineMatch,
      simConfig.confirmTimerSeconds,
    ]
  );

  const updateSimConfig = useCallback(<K extends keyof SimConfig>(key: K, value: SimConfig[K]) => {
    setSimConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetSimConfig = useCallback(() => {
    setSimConfig({ ...DEFAULT_SIM_CONFIG });
    setTimerEdit(null);
  }, []);

  const timerFields: { key: keyof SimConfig; min: number; max: number }[] = [
    { key: 'matchDelaySeconds', min: 0.1, max: 30 },
    { key: 'confirmDelaySeconds', min: 0.1, max: 10 },
    { key: 'sellerSearchTimerMinutes', min: 1, max: 60 },
    { key: 'buyerSearchTimerMinutes', min: 1, max: 60 },
    { key: 'buyerDepositTimerMinutes', min: 1, max: 60 },
    { key: 'confirmTimerSeconds', min: 1, max: 10 }, // UI는 분 단위, 저장은 초
  ];
  const getTimerDisplayValue = (key: keyof SimConfig) => {
    if (key === 'confirmTimerSeconds')
      return timerEdit?.key === key ? timerEdit.value : String(simConfig.confirmTimerSeconds / 60);
    return timerEdit?.key === key ? timerEdit.value : String(simConfig[key]);
  };
  const handleTimerFocus = (key: keyof SimConfig) =>
    setTimerEdit({ key, value: key === 'confirmTimerSeconds' ? String(simConfig.confirmTimerSeconds / 60) : String(simConfig[key]) });
  const handleTimerChange = (key: keyof SimConfig, raw: string) =>
    setTimerEdit((prev) => (prev?.key === key ? { ...prev, value: raw } : prev));
  const handleTimerBlur = (key: keyof SimConfig, min: number, max: number) => {
    const raw = timerEdit?.key === key ? timerEdit.value : (key === 'confirmTimerSeconds' ? String(simConfig.confirmTimerSeconds / 60) : String(simConfig[key]));
    const num = Number(raw);
    const clamped = Number.isFinite(num) ? Math.min(max, Math.max(min, num)) : min;
    if (key === 'confirmTimerSeconds') {
      updateSimConfig('confirmTimerSeconds', Math.round(clamped * 60) as SimConfig['confirmTimerSeconds']);
    } else {
      updateSimConfig(key, clamped as SimConfig[typeof key]);
    }
    setTimerEdit(null);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center mesh-bg py-4 px-3 sm:py-6 sm:px-4 md:py-8 lg:py-10 lg:px-4 overflow-auto scrollbar-hide">
      <h1 className="text-slate-300/90 text-xs sm:text-sm font-display font-medium tracking-[0.15em] sm:tracking-[0.2em] mb-3 sm:mb-4">실시간 매칭 시뮬레이터</h1>

      {/* 타이머/지연 설정 패널 */}
      <section className="w-full max-w-[1200px] min-w-0 mx-auto mb-4 sm:mb-6 px-6 sm:px-8">
        <div className="rounded-2xl overflow-hidden bg-gradient-to-b from-slate-800/95 to-slate-800/80 shadow-xl shadow-slate-900/50 ring-1 ring-cyan-500/20 backdrop-blur-sm">
          <div className="px-8 pt-5 pb-1 sm:px-12 sm:pt-6 border-b border-slate-600/40">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-slate-300 text-sm sm:text-base font-display font-semibold tracking-wide flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-cyan-400/80" aria-hidden />
                타이머 · 지연 설정
              </h2>
              <button
                type="button"
                onClick={resetSimConfig}
                className="text-slate-400 hover:text-cyan-400 text-xs font-display transition-colors flex-shrink-0 py-1.5 px-2 rounded-lg hover:bg-slate-700/60"
              >
                기본값 복원
              </button>
            </div>
          </div>
          <div className="px-8 py-6 sm:px-12 sm:py-8 overflow-hidden">
            <div className="grid gap-6 sm:gap-8 w-full min-w-0" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
              {[
                { key: 'matchDelaySeconds' as const, label: '매칭 대기 (초)' },
                { key: 'confirmDelaySeconds' as const, label: '거래확인 대기 (초)' },
                { key: 'sellerSearchTimerMinutes' as const, label: '판매자 검색 (분)' },
                { key: 'buyerSearchTimerMinutes' as const, label: '구매자 검색 (분)' },
                { key: 'buyerDepositTimerMinutes' as const, label: '매칭 입금시간 (분)' },
                { key: 'confirmTimerSeconds' as const, label: '매칭 확인 제한 (분)' },
              ].map(({ key, label }) => {
                const { min, max } = timerFields.find((f) => f.key === key)!;
                return (
                  <label key={key} className="flex flex-col gap-2 min-w-0 group">
                    <span className="text-slate-400 text-[10px] sm:text-xs font-display font-medium tracking-wide group-focus-within:text-cyan-400/90 transition-colors">
                      {label}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={getTimerDisplayValue(key)}
                      onFocus={() => handleTimerFocus(key)}
                      onChange={(e) => handleTimerChange(key, e.target.value)}
                      onBlur={() => handleTimerBlur(key, min, max)}
                      className="w-full min-w-0 h-12 rounded-xl bg-slate-700/70 border border-slate-600/50 text-slate-100 text-sm font-medium px-3 text-center placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 focus:outline-none transition-all"
                    />
                  </label>
                );
              })}
              <div className="flex flex-col gap-2 min-w-0">
                <p className="text-slate-400 text-[10px] sm:text-xs font-display font-medium tracking-wide">사진첨부</p>
                <div className="flex flex-wrap gap-4 sm:gap-6 items-center h-12">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simConfig.buyerDepositPhotoEnabled}
                      onChange={(e) => updateSimConfig('buyerDepositPhotoEnabled', e.target.checked)}
                      className="rounded border-slate-500 bg-slate-700 text-cyan-500 focus:ring-cyan-500 w-4 h-4"
                    />
                    <span className="text-slate-300 text-sm font-display">구매자 체크</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simConfig.sellerDepositPhotoEnabled}
                      onChange={(e) => updateSimConfig('sellerDepositPhotoEnabled', e.target.checked)}
                      className="rounded border-slate-500 bg-slate-700 text-cyan-500 focus:ring-cyan-500 w-4 h-4"
                    />
                    <span className="text-slate-300 text-sm font-display">판매자 체크</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 어드민: 분쟁 해결 — 분쟁 발생 시에만 표시 */}
      {activeDisputes.length > 0 && (
        <section className="w-full max-w-[1200px] min-w-0 mx-auto mb-4 px-6 sm:px-8">
          <div className="rounded-2xl overflow-hidden bg-slate-800/90 ring-1 ring-red-500/40 shadow-xl">
            <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-red-400 text-sm font-display font-medium">분쟁 발생 ({activeDisputes.length}건) — 어드민 풀어주기 전까지 양쪽 분쟁 화면 유지</span>
              <button
                type="button"
                onClick={resolveDisputes}
                className="py-2.5 px-5 rounded-xl text-sm font-display font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
              >
                어드민: 분쟁 해결
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4 sm:gap-6 md:gap-8 lg:gap-12 xl:gap-16 w-full max-w-[1800px]">
        {sellerSlots.length > 1 ? (
          <BuyerMultiSellerSimulator
            simConfig={simConfig}
            initialSellerCount={sellerSlots.length}
            onSellerCountChange={(n: number) => setSellerSlots((prev) => (n <= 1 ? [createInitialSellerSlot(0, simConfig)] : prev.slice(0, n)))}
          />
        ) : (
        <>
        {/* 구매자 화면 1 (제목 "1" 옆에 + 버튼, 주황 테마) */}
        <IPhoneFrame
          variant="buyer"
          title="구매자 화면 1"
          titleAction={
            buyerSlots.length < MAX_BUYERS && sellerSlots.length <= 1 ? (
              <button
                type="button"
                onClick={addBuyerSlot}
                className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-slate-500/60 hover:border-orange-400/70 hover:bg-slate-700/50 text-slate-400 hover:text-orange-400 flex items-center justify-center text-base font-light transition-all duration-200"
                aria-label="구매자 화면 추가"
                title="구매자 추가"
              >
                +
              </button>
            ) : undefined
          }
        >
          <BuyerPhoneContent
            buyerIndex={0}
            phase={useMultiSimultaneous ? getBuyerMultiProps(0).phase : phase}
            buyerStarted={buyerSlots[0].started}
            sellerStarted={sellerStarted}
            showInitialScreen={
              useMultiSimultaneous
                ? !buyerSlots[0].started && !confirmingMatches.some((m) => m.buyerIndex === 0) && !tradingMatches.some((m) => m.buyerIndex === 0)
                : !buyerSlots[0].started && matchedBuyerIndex !== 0
            }
            amountsMatch={!useMultiSimultaneous && matchedBuyerIndex === 0 && amountsMatch}
            buyerAmount={buyerSlots[0].amount}
            setBuyerAmount={(n) => setBuyerSlotAt(0, (s) => ({ ...s, amount: n }))}
            minPointAmount={MIN_POINT_AMOUNT}
            isValidAmount={isValidAmount(buyerSlots[0].amount)}
            setBuyerStarted={() =>
              setBuyerSlotAt(0, (s) => ({ ...s, started: true, searchTimerSeconds: simConfig.buyerSearchTimerMinutes * 60 }))
            }
            matchResult={useMultiSimultaneous ? getBuyerMultiProps(0).matchResult : (matchedBuyerIndex === 0 ? matchResult : null)}
            buyerDepositDone={buyerSlots[0].depositDone}
            setBuyerDepositDone={(b) => setBuyerSlotAt(0, (s) => ({ ...s, depositDone: b }))}
            displayPoints={buyerSlots[0].currentPoints}
            completed={(useMultiSimultaneous ? buyerSlots[0].showCompletedScreen : (phase === 'completed' && matchedBuyerIndex === 0)) || buyerSlots[0].showCompletedScreen}
            completedAmount={buyerSlots[0].showCompletedScreen ? buyerSlots[0].lastCompletedAmount : (matchResult?.totalAmount ?? 0)}
            onReset={reset}
            buyerClickedNew={buyerSlots[0].clickedNew}
            onNewTrade={() => handleBuyerNewTrade(0)}
            buyerSearchTimerSeconds={buyerSlots[0].searchTimerSeconds}
            onRejectMatch={(reason) => handleRejectMatch(0, reason)}
            rejectReasonOptions={['계좌번호 불일치', '입금자명 불일치', '은행 정검시간']}
            declineReasonOptions={['구매 의사 없음', '금액 변경 희망', '기타']}
            matchConfirming={useMultiSimultaneous ? getBuyerMultiProps(0).matchConfirming : (phase === 'confirming' && matchedBuyerIndex === 0)}
            sellerMatchConfirmed={useMultiSimultaneous ? getBuyerMultiProps(0).sellerMatchConfirmed : sellerMatchConfirmed}
            buyerMatchConfirmed={useMultiSimultaneous ? getBuyerMultiProps(0).buyerMatchConfirmed : buyerSlots[0].matchConfirmed}
            onConfirmMatch={useMultiSimultaneous ? getBuyerMultiProps(0).onConfirmMatch : () => handleBuyerConfirmMatch(0)}
            onDeclineMatch={useMultiSimultaneous ? getBuyerMultiProps(0).onDeclineMatch : handleDeclineMatch}
            confirmTimerSeconds={useMultiSimultaneous ? getBuyerMultiProps(0).confirmTimerSeconds : confirmTimerSeconds}
            sellerRejectDepositReason={
              sellerRejectDepositReasonBuyerIndex === 0 ? sellerRejectDepositReason : null
            }
            onClearSellerRejectDepositReason={clearSellerRejectDepositReason}
            violationHistory={buyerSlots[0].violationHistory ?? []}
            onViolationConfirmed={handleViolationConfirmed}
            memberId={buyerSlots[0].user.id}
            onCancelSearch={() => handleCancelBuyerSearch(0)}
            dispute={(() => { const d = activeDisputes.find((x) => x.buyerIndex === 0); return d ? { amount: d.amount, reason: d.reason } : null; })()}
            showMatchCanceledModal={canceledMatchedBuyerIndex === 0 && !buyerMatchCanceledDismissed}
            onConfirmMatchCanceledModal={
              canceledBuyerHadConfirmed
                ? () => {
                    handleMatchCanceledConfirm(0);
                    setBuyerSlotAt(0, (s) => ({
                      ...s,
                      started: true,
                      searchTimerSeconds: simConfig.buyerSearchTimerMinutes * 60,
                    }));
                  }
                : () => handleMatchCanceledConfirm(0)
            }
            matchCanceledModalTitle={canceledBuyerHadConfirmed ? '매칭 취소' : '매칭 미확인'}
            matchCanceledModalSubtitle={canceledBuyerHadConfirmed ? '판매자 미확인으로 매칭이 취소되었습니다.' : '3회이상 매칭확인 거부시 이용이 중지됨'}
            matchCanceledModalButtonText={canceledBuyerHadConfirmed ? '재매칭' : '확인'}
            buyerDepositPhotoEnabled={simConfig.buyerDepositPhotoEnabled}
            onRejectDepositMulti={useMultiSimultaneous ? handleBuyerRejectDepositMulti : undefined}
          />
        </IPhoneFrame>
        {/* 구매자 화면 2~5 (제목 옆에 - 삭제 버튼) */}
        {buyerSlots.slice(1).map((slot, i) => {
          const buyerIndex = i + 1;
          return (
            <IPhoneFrame
              variant="buyer"
              key={buyerIndex}
              title={`구매자 화면 ${buyerIndex + 1}`}
              titleAction={
                <button
                  type="button"
                  onClick={() => removeBuyerSlot(buyerIndex)}
                  className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-slate-500/60 hover:border-red-400/70 hover:bg-slate-700/50 text-slate-400 hover:text-red-400 flex items-center justify-center text-base font-light transition-all duration-200"
                  aria-label="구매자 화면 삭제"
                  title="구매자 삭제"
                >
                  −
                </button>
              }
            >
              <BuyerPhoneContent
                buyerIndex={buyerIndex}
                phase={useMultiSimultaneous ? getBuyerMultiProps(buyerIndex).phase : phase}
                buyerStarted={slot.started}
                sellerStarted={sellerStarted}
                showInitialScreen={
                  useMultiSimultaneous
                    ? !slot.started && !confirmingMatches.some((m) => m.buyerIndex === buyerIndex) && !tradingMatches.some((m) => m.buyerIndex === buyerIndex)
                    : !slot.started && matchedBuyerIndex !== buyerIndex
                }
                amountsMatch={!useMultiSimultaneous && matchedBuyerIndex === buyerIndex && amountsMatch}
                buyerAmount={slot.amount}
                setBuyerAmount={(n) => setBuyerSlotAt(buyerIndex, (s) => ({ ...s, amount: n }))}
                minPointAmount={MIN_POINT_AMOUNT}
                isValidAmount={isValidAmount(slot.amount)}
                setBuyerStarted={() =>
                  setBuyerSlotAt(buyerIndex, (s) => ({ ...s, started: true, searchTimerSeconds: simConfig.buyerSearchTimerMinutes * 60 }))
                }
                matchResult={useMultiSimultaneous ? getBuyerMultiProps(buyerIndex).matchResult : (matchedBuyerIndex === buyerIndex ? matchResult : null)}
                buyerDepositDone={slot.depositDone}
                setBuyerDepositDone={(b) => setBuyerSlotAt(buyerIndex, (s) => ({ ...s, depositDone: b }))}
                displayPoints={slot.currentPoints}
                completed={(useMultiSimultaneous ? slot.showCompletedScreen : (phase === 'completed' && matchedBuyerIndex === buyerIndex)) || slot.showCompletedScreen}
                completedAmount={slot.showCompletedScreen ? slot.lastCompletedAmount : (matchResult?.totalAmount ?? 0)}
                onReset={reset}
                buyerClickedNew={slot.clickedNew}
                onNewTrade={() => handleBuyerNewTrade(buyerIndex)}
                buyerSearchTimerSeconds={slot.searchTimerSeconds}
                onRejectMatch={(reason) => handleRejectMatch(buyerIndex, reason)}
                rejectReasonOptions={['계좌번호 불일치', '입금자명 불일치', '은행 정검시간']}
                declineReasonOptions={['구매 의사 없음', '금액 변경 희망', '기타']}
                matchConfirming={useMultiSimultaneous ? getBuyerMultiProps(buyerIndex).matchConfirming : (phase === 'confirming' && matchedBuyerIndex === buyerIndex)}
                sellerMatchConfirmed={useMultiSimultaneous ? getBuyerMultiProps(buyerIndex).sellerMatchConfirmed : sellerMatchConfirmed}
                buyerMatchConfirmed={useMultiSimultaneous ? getBuyerMultiProps(buyerIndex).buyerMatchConfirmed : slot.matchConfirmed}
                onConfirmMatch={useMultiSimultaneous ? getBuyerMultiProps(buyerIndex).onConfirmMatch : () => handleBuyerConfirmMatch(buyerIndex)}
                onDeclineMatch={useMultiSimultaneous ? getBuyerMultiProps(buyerIndex).onDeclineMatch : handleDeclineMatch}
                confirmTimerSeconds={useMultiSimultaneous ? getBuyerMultiProps(buyerIndex).confirmTimerSeconds : confirmTimerSeconds}
                sellerRejectDepositReason={
                  sellerRejectDepositReasonBuyerIndex === buyerIndex ? sellerRejectDepositReason : null
                }
                onClearSellerRejectDepositReason={clearSellerRejectDepositReason}
                violationHistory={buyerSlots[buyerIndex].violationHistory ?? []}
                onViolationConfirmed={handleViolationConfirmed}
                memberId={slot.user.id}
                onCancelSearch={() => handleCancelBuyerSearch(buyerIndex)}
                dispute={(() => { const d = activeDisputes.find((x) => x.buyerIndex === buyerIndex); return d ? { amount: d.amount, reason: d.reason } : null; })()}
                showMatchCanceledModal={canceledMatchedBuyerIndex === buyerIndex && !buyerMatchCanceledDismissed}
                onConfirmMatchCanceledModal={
                  canceledBuyerHadConfirmed
                    ? () => {
                        handleMatchCanceledConfirm(buyerIndex);
                        setBuyerSlotAt(buyerIndex, (s) => ({
                          ...s,
                          started: true,
                          searchTimerSeconds: simConfig.buyerSearchTimerMinutes * 60,
                        }));
                      }
                    : () => handleMatchCanceledConfirm(buyerIndex)
                }
                matchCanceledModalTitle={canceledBuyerHadConfirmed ? '매칭 취소' : '매칭 미확인'}
                matchCanceledModalSubtitle={canceledBuyerHadConfirmed ? '판매자 미확인으로 매칭이 취소되었습니다.' : '3회이상 매칭확인 거부시 이용이 중지됨'}
                matchCanceledModalButtonText={canceledBuyerHadConfirmed ? '재매칭' : '확인'}
                buyerDepositPhotoEnabled={simConfig.buyerDepositPhotoEnabled}
                onRejectDepositMulti={useMultiSimultaneous ? handleBuyerRejectDepositMulti : undefined}
              />
            </IPhoneFrame>
          );
        })}
        {/* 판매자 화면 1 (제목 옆에 + 버튼). 확인 화면은 단일 플래그로만 표시 → 구매자 취소 시 즉시 숨김 */}
        {(() => {
          const showSellerConfirming =
            phase === 'confirming' &&
            matchResult != null &&
            matchedBuyerIndex !== null &&
            (buyerSlots[matchedBuyerIndex]?.started === true) &&
            !confirmingInvalidated;
          return (
        <IPhoneFrame
          title="판매자 화면 1"
          titleAction={
            sellerSlots.length < MAX_SELLERS && buyerSlots.length <= 1 ? (
              <button
                type="button"
                onClick={addSellerSlot}
                className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-slate-500/60 hover:border-cyan-400/70 hover:bg-slate-700/50 text-slate-400 hover:text-cyan-400 flex items-center justify-center text-base font-light transition-all duration-200"
                aria-label="판매자 화면 추가"
                title="판매자 추가"
              >
                +
              </button>
            ) : undefined
          }
        >
          <SellerPhoneContent
            phase={phase}
            sellerStarted={sellerStarted}
            buyerStarted={anyBuyerStarted}
            amountsMatch={amountsMatch}
            sellerAmount={sellerAmount}
            sellerRemainingAmount={sellerRemainingAmount}
            setSellerAmount={setSellerAmount}
            minPointAmount={MIN_POINT_AMOUNT}
            isValidAmount={isValidAmount(sellerAmount)}
            setSellerStarted={setSellerStarted}
            matchResult={showSellerConfirming ? matchResult : null}
            buyerDepositDone={buyerDepositDone}
            sellerConfirmed={sellerConfirmed}
            setSellerConfirmed={setSellerConfirmed}
            displayPoints={sellerDisplayPoints}
            completed={phase === 'completed'}
            completedSoldAmount={completedSoldAmount}
            onReset={reset}
            sellerClickedNew={sellerClickedNew}
            onNewTrade={handleSellerNewTrade}
            sellerSearchTimerSeconds={sellerSearchTimerSeconds}
            rejectReason={rejectReason}
            onClearRejectReason={clearRejectReason}
            matchConfirming={showSellerConfirming}
            matchedBuyerActive={matchedBuyerIndex !== null && (buyerSlots[matchedBuyerIndex]?.started === true)}
            confirmingInvalidated={confirmingInvalidated}
            sellerMatchConfirmed={sellerMatchConfirmed}
            buyerMatchConfirmed={buyerMatchConfirmed}
            onConfirmMatch={handleSellerConfirmMatch}
            onDeclineMatch={handleDeclineMatch}
            confirmTimerSeconds={confirmTimerSeconds}
            onRejectDeposit={handleSellerRejectDeposit}
            onRejectDepositMulti={useMultiSimultaneous ? handleSellerRejectDepositMulti : undefined}
            violationHistory={sellerSlots[0]?.violationHistory ?? []}
            onViolationConfirmed={handleViolationConfirmed}
            memberId={sellerSlots[0]?.user.id ?? sellerSessionUser.id}
            onCancelSearch={handleCancelSellerSearch}
            showMatchCanceledModal={canceledMatchedBuyerIndex !== null && !sellerMatchCanceledDismissed}
            onConfirmMatchCanceledModal={() => handleMatchCanceledConfirm('seller')}
            matchCanceledModalTitle={canceledSellerHadConfirmed ? '매칭 취소' : '매칭 미확인'}
            matchCanceledModalSubtitle={canceledSellerHadConfirmed ? '구매자 미확인으로 매칭이 취소되었습니다.' : '3회이상 매칭확인 거부시 이용이 중지됨'}
            multiOrderedMatches={
              useMultiSimultaneous
                ? (matchDisplayOrder
                    .map((matchId) => {
                      const completed = completedMultiMatches.find((c) => c.matchId === matchId);
                      if (completed) return { kind: 'completed' as const, ...completed };
                      const c = confirmingMatches.find((m) => m.matchId === matchId);
                      if (c) return { kind: 'confirming' as const, ...c };
                      const t = tradingMatches.find((m) => m.matchId === matchId);
                      if (t)
                        return {
                          kind: 'trading' as const,
                          ...t,
                          buyerDepositDone: buyerSlots[t.buyerIndex]?.depositDone ?? t.buyerDepositDone,
                          depositTimerSeconds: buyerSlots[t.buyerIndex]?.searchTimerSeconds ?? 0,
                        };
                      return null;
                    })
                    .filter((x): x is NonNullable<typeof x> => x != null) as SellerPhoneContentProps['multiOrderedMatches'])
                : undefined
            }
            buyerMemberIds={useMultiSimultaneous ? buyerSlots.map((s) => s.user.id) : undefined}
            onConfirmMatchMulti={useMultiSimultaneous ? handleSellerConfirmMatchMulti : undefined}
            onDeclineMatchMulti={useMultiSimultaneous ? handleDeclineMatchMulti : undefined}
            onSellerConfirmDepositMulti={useMultiSimultaneous ? handleSellerConfirmDepositMulti : undefined}
            multiTransferMatchResult={multiTransferMatchResult ?? undefined}
            onOpenTransferModal={useMultiSimultaneous ? setTransferModalMatchId : undefined}
            sellerDepositPhotoEnabled={simConfig.sellerDepositPhotoEnabled}
            hasActiveDispute={useMultiSimultaneous && activeDisputes.length > 0}
          />
        </IPhoneFrame>
          );
        })()}
        {/* 판매자 화면 2~5 (제목 옆에 - 삭제 버튼) */}
        {sellerSlots.slice(1).map((slot, i) => {
          const sellerIndex = i + 1;
          return (
            <IPhoneFrame
              key={sellerIndex}
              title={`판매자 화면 ${sellerIndex + 1}`}
              titleAction={
                <button
                  type="button"
                  onClick={() => removeSellerSlot(sellerIndex)}
                  className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-slate-500/60 hover:border-red-400/70 hover:bg-slate-700/50 text-slate-400 hover:text-red-400 flex items-center justify-center text-base font-light transition-all duration-200"
                  aria-label="판매자 화면 삭제"
                  title="판매자 삭제"
                >
                  −
                </button>
              }
            >
              <SellerPhoneContent
                phase={slot.started ? 'searching' : 'idle'}
                sellerStarted={slot.started}
                buyerStarted={anyBuyerStarted}
                amountsMatch={false}
                sellerAmount={slot.amount}
                sellerRemainingAmount={slot.remainingAmount > 0 ? slot.remainingAmount : slot.amount}
                setSellerAmount={(n) => setSellerSlotAt(sellerIndex, (s) => ({ ...s, amount: Math.min(n, s.currentPoints) }))}
                minPointAmount={MIN_POINT_AMOUNT}
                isValidAmount={isValidAmount(slot.amount)}
                setSellerStarted={(b) => setSellerSlotAt(sellerIndex, (s) => ({ ...s, started: b }))}
                matchResult={null}
                buyerDepositDone={false}
                sellerConfirmed={false}
                setSellerConfirmed={() => {}}
                displayPoints={slot.currentPoints}
                completed={false}
                onReset={reset}
                sellerClickedNew={slot.clickedNew}
                onNewTrade={() => setSellerSlotAt(sellerIndex, (s) => ({ ...s, clickedNew: true, amount: 0, started: false, searchTimerSeconds: simConfig.sellerSearchTimerMinutes * 60 }))}
                sellerSearchTimerSeconds={slot.searchTimerSeconds}
                rejectReason={null}
                onClearRejectReason={() => {}}
                matchConfirming={false}
                sellerMatchConfirmed={false}
                buyerMatchConfirmed={false}
                onConfirmMatch={() => {}}
                onDeclineMatch={() => {}}
                confirmTimerSeconds={simConfig.confirmTimerSeconds}
                onRejectDeposit={() => {}}
                violationHistory={slot.violationHistory ?? []}
                onViolationConfirmed={handleViolationConfirmed}
                memberId={slot.user.id}
                onCancelSearch={() =>
                  setSellerSlotAt(sellerIndex, (s) => ({ ...s, started: false, amount: 0, remainingAmount: 0, searchTimerSeconds: simConfig.sellerSearchTimerMinutes * 60 }))
                }
              />
            </IPhoneFrame>
          );
        })}
        </>
        )}
      </div>
    </div>
  );
}