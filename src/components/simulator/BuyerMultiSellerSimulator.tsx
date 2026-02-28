/**
 * 구매자 1명 · 다중 판매자 시뮬레이터.
 * 다중 구매자·판매자 1명(App)과 동일한 방식: scheduled → confirming → trading, 건별 타이머/수락/입금확인.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { createBuyerUserForIndex, createSellerUserForIndex } from '../../data/matchMock';
import type { User, SimPhase } from '../../types';
import { computeMatchResult } from '../../data/matchMock';
import type { MatchResult } from '../../data/matchMock';
import type { SimConfig } from '../../App';
import { playMatchSoundLoop, stopMatchSound } from '../../utils/matchSound';
import { DEFAULT_SIM_CONFIG } from '../../App';
import type { ViolationEntry } from '../../App';
import IPhoneFrame from './IPhoneFrame';
import SellerPhoneContent from './SellerPhoneContent';
import BuyerPhoneContent from './BuyerPhoneContent';

const MAX_SELLERS_B2S = 5;
const MIN_POINT_AMOUNT = 10_000;

function generateMatchId() {
  return `b2s-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** B2S 예약 매칭 (matchDelay 후 confirming으로) */
type ScheduledMatchB2S = { matchId: string; sellerIndex: number; amount: number; scheduledAt: number };
/** B2S 확인 단계 */
type ConfirmingMatchB2S = {
  matchId: string;
  sellerIndex: number;
  amount: number;
  confirmTimerSeconds: number;
  buyerConfirmed: boolean;
  sellerConfirmed: boolean;
};
/** B2S 거래 중 (건별 입금 타이머) */
type TradingMatchB2S = {
  matchId: string;
  sellerIndex: number;
  amount: number;
  buyerDepositDone: boolean;
  sellerConfirmed: boolean;
  depositTimerSeconds: number;
  canceledReason?: 'buyer_deposit_timeout';
};

/** B2S용 판매자 슬롯 */
export type SellerSlotB2S = {
  user: User;
  amount: number;
  remainingAmount: number;
  started: boolean;
  clickedNew: boolean;
  sellerConfirmed: boolean;
  showCompletedScreen: boolean;
  lastCompletedAmount: number;
  searchTimerSeconds: number;
  currentPoints: number;
  violationHistory: ViolationEntry[];
};

/** B2S용 구매자 슬롯 (1명) */
export type BuyerSlotB2S = {
  user: User;
  amount: number;
  remainingAmount: number;
  started: boolean;
  depositDone: boolean;
  matchConfirmed: boolean;
  clickedNew: boolean;
  searchTimerSeconds: number;
  currentPoints: number;
  violationHistory: ViolationEntry[];
};

function createInitialSellerSlotB2S(index: number, config: SimConfig = DEFAULT_SIM_CONFIG): SellerSlotB2S {
  return {
    user: createSellerUserForIndex(index),
    amount: 0,
    remainingAmount: 0,
    started: false,
    clickedNew: false,
    sellerConfirmed: false,
    showCompletedScreen: false,
    lastCompletedAmount: 0,
    searchTimerSeconds: config.sellerSearchTimerMinutes * 60,
    currentPoints: 1_000_000,
    violationHistory: [],
  };
}

function createInitialBuyerSlotB2S(config: SimConfig = DEFAULT_SIM_CONFIG): BuyerSlotB2S {
  return {
    user: createBuyerUserForIndex(0),
    amount: 0,
    remainingAmount: 0,
    started: false,
    depositDone: false,
    matchConfirmed: false,
    clickedNew: false,
    searchTimerSeconds: config.buyerSearchTimerMinutes * 60,
    currentPoints: 0,
    violationHistory: [],
  };
}

export interface BuyerMultiSellerSimulatorProps {
  simConfig: SimConfig;
  onReset?: () => void;
  initialSellerCount?: number;
  onSellerCountChange?: (count: number) => void;
}

export default function BuyerMultiSellerSimulator({ simConfig, onReset: _onReset, initialSellerCount, onSellerCountChange }: BuyerMultiSellerSimulatorProps) {
  const isValidAmount = (n: number) => n >= MIN_POINT_AMOUNT && n % 10_000 === 0;

  const [buyerSlot, setBuyerSlot] = useState<BuyerSlotB2S>(() => createInitialBuyerSlotB2S(simConfig));
  const [sellerSlots, setSellerSlots] = useState<SellerSlotB2S[]>(() => {
    const n = initialSellerCount != null && initialSellerCount > 1 ? initialSellerCount : 1;
    return Array.from({ length: n }, (_, i) => createInitialSellerSlotB2S(i, simConfig));
  });

  const [scheduledMatches, setScheduledMatches] = useState<ScheduledMatchB2S[]>([]);
  const [confirmingMatches, setConfirmingMatches] = useState<ConfirmingMatchB2S[]>([]);
  const [tradingMatches, setTradingMatches] = useState<TradingMatchB2S[]>([]);
  const [matchDisplayOrder, setMatchDisplayOrder] = useState<string[]>([]);
  /** B2S: 구매자 화면에 거래완료 카드로 남겨 둘 완료 건 */
  const [completedMultiMatchesForBuyer, setCompletedMultiMatchesForBuyer] = useState<Array<{ matchId: string; sellerIndex: number; amount: number }>>([]);

  const [phase, setPhase] = useState<SimPhase>('idle');
  const setSellerSlotAt = useCallback((index: number, updater: (prev: SellerSlotB2S) => SellerSlotB2S) => {
    setSellerSlots((prev) => prev.map((s, i) => (i === index ? updater(s) : s)));
  }, []);

  const buyerAmount = buyerSlot.amount;
  const buyerRemainingAmount = buyerSlot.remainingAmount;
  const buyerStarted = buyerSlot.started;
  const anySellerStarted = sellerSlots.some((s) => s.started);

  const reservedAmount =
    scheduledMatches.reduce((s, m) => s + m.amount, 0) +
    confirmingMatches.reduce((s, m) => s + m.amount, 0) +
    tradingMatches.reduce((s, m) => s + m.amount, 0);
  const availableToMatch = Math.max(0, buyerRemainingAmount - reservedAmount);

  // 구매자 검색 타이머: 매칭 중일 때만 감소
  useEffect(() => {
    if (!buyerStarted) return;
    if (scheduledMatches.length === 0 && confirmingMatches.length === 0 && tradingMatches.length === 0) return;
    const id = setInterval(() => {
      setBuyerSlot((prev) => (prev.searchTimerSeconds <= 0 ? prev : { ...prev, searchTimerSeconds: prev.searchTimerSeconds - 1 }));
    }, 1000);
    return () => clearInterval(id);
  }, [buyerStarted, scheduledMatches.length, confirmingMatches.length, tradingMatches.length]);

  // 구매자 시작 시 remainingAmount 초기화
  useEffect(() => {
    if (!buyerStarted || buyerRemainingAmount > 0) return;
    if (buyerAmount < MIN_POINT_AMOUNT || !isValidAmount(buyerAmount)) return;
    setBuyerSlot((prev) => ({ ...prev, remainingAmount: buyerAmount }));
  }, [buyerStarted, buyerRemainingAmount, buyerAmount]);

  // 판매자 검색 타이머
  useEffect(() => {
    const id = setInterval(() => {
      setSellerSlots((prev) =>
        prev.map((s) => (s.started && s.searchTimerSeconds > 0 ? { ...s, searchTimerSeconds: s.searchTimerSeconds - 1 } : s))
      );
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // 1) 스케줄: 구매자 시작 + 잔액 있으면, 판매자 순으로 금액 배분해 scheduled에 추가
  useEffect(() => {
    if (!buyerStarted || buyerSlot.searchTimerSeconds <= 0 || availableToMatch < MIN_POINT_AMOUNT) return;
    setScheduledMatches((prev) => {
      let available = buyerRemainingAmount - reservedAmount;
      const next = [...prev];
      for (let i = 0; i < sellerSlots.length; i++) {
        if (available < MIN_POINT_AMOUNT) break;
        const slot = sellerSlots[i];
        const alreadyIn =
          prev.some((m) => m.sellerIndex === i) ||
          confirmingMatches.some((m) => m.sellerIndex === i) ||
          tradingMatches.some((m) => m.sellerIndex === i);
        if (!slot.started || alreadyIn || !isValidAmount(slot.amount) || slot.amount > available) continue;
        const amount = Math.min(available, slot.amount);
        next.push({ matchId: generateMatchId(), sellerIndex: i, amount, scheduledAt: Date.now() });
        available -= amount;
      }
      return next.length === prev.length ? prev : next;
    });
  }, [buyerStarted, buyerSlot.searchTimerSeconds, buyerRemainingAmount, reservedAmount, availableToMatch, sellerSlots, confirmingMatches, tradingMatches]);

  // 2) scheduled → confirming (matchDelaySeconds 후)
  const [scheduledCheckTick, setScheduledCheckTick] = useState(0);
  useEffect(() => {
    if (scheduledMatches.length === 0) return;
    const id = setInterval(() => setScheduledCheckTick((t) => t + 1), 500);
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
        sellerIndex: m.sellerIndex,
        amount: m.amount,
        confirmTimerSeconds: simConfig.confirmTimerSeconds,
        buyerConfirmed: false,
        sellerConfirmed: false,
      })),
    ]);
    setMatchDisplayOrder((prev) => [...prev, ...ready.map((m) => m.matchId)]);
    if (ready.length > 0) playMatchSoundLoop();
  }, [scheduledMatches, scheduledCheckTick, simConfig.matchDelaySeconds, simConfig.confirmTimerSeconds]);

  // 3) confirming 타이머 감소, 0이면 해당 건 제거 + 위반
  const timedOutConfirmingRef = useRef<ConfirmingMatchB2S[]>([]);
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
  useEffect(() => {
    const timedOut = timedOutConfirmingRef.current;
    if (timedOut.length === 0) return;
    timedOutConfirmingRef.current = [];
    const ids = new Set(timedOut.map((m) => m.matchId));
    setMatchDisplayOrder((prev) => prev.filter((id) => !ids.has(id)));
    const violationEntry: ViolationEntry = { type: '취소', message: '매칭 확인 시간 초과 또는 취소' };
    setBuyerSlot((prev) => ({ ...prev, violationHistory: [...prev.violationHistory, violationEntry] }));
    timedOut.forEach((m) => {
      setSellerSlotAt(m.sellerIndex, (s) => ({
        ...s,
        started: false,
        amount: 0,
        remainingAmount: 0,
        sellerConfirmed: false,
        violationHistory: [...s.violationHistory, violationEntry],
        searchTimerSeconds: simConfig.sellerSearchTimerMinutes * 60,
      }));
    });
  }, [confirmingMatches, setSellerSlotAt, simConfig.sellerSearchTimerMinutes]);

  // 4) 양쪽 모두 확인한 건 → trading (입금 타이머 시작)
  useEffect(() => {
    const both = confirmingMatches.filter((m) => m.buyerConfirmed && m.sellerConfirmed);
    if (both.length === 0) return;
    setConfirmingMatches((prev) => prev.filter((m) => !m.buyerConfirmed || !m.sellerConfirmed));
    setTradingMatches((prev) => [
      ...prev,
      ...both.map((m) => ({
        matchId: m.matchId,
        sellerIndex: m.sellerIndex,
        amount: m.amount,
        buyerDepositDone: false,
        sellerConfirmed: false,
        depositTimerSeconds: simConfig.buyerDepositTimerMinutes * 60,
      })),
    ]);
  }, [confirmingMatches, simConfig.buyerDepositTimerMinutes]);

  // 5) 거래 완료: buyerDepositDone && sellerConfirmed → 잔액/포인트 반영, 해당 건은 trading에서만 제거(카드 순서 유지를 위해 matchDisplayOrder에서는 제거하지 않음)
  useEffect(() => {
    const done = tradingMatches.filter((m) => m.buyerDepositDone && m.sellerConfirmed);
    if (done.length === 0) return;
    const doneIds = new Set(done.map((m) => m.matchId));
    setCompletedMultiMatchesForBuyer((prev) => {
      const doneInOrder = matchDisplayOrder.filter((id) => doneIds.has(id)).map((id) => done.find((d) => d.matchId === id)!);
      return [...prev, ...doneInOrder];
    });
    setTradingMatches((prev) => prev.filter((m) => !done.some((d) => d.matchId === m.matchId)));
    const totalDeduct = done.reduce((sum, m) => sum + m.amount, 0);
    setBuyerSlot((prev) => ({
      ...prev,
      currentPoints: prev.currentPoints + totalDeduct,
      remainingAmount: Math.max(0, prev.remainingAmount - totalDeduct),
    }));
    done.forEach((m) => {
      setSellerSlotAt(m.sellerIndex, (prev) => ({
        ...prev,
        currentPoints: prev.currentPoints - m.amount,
        remainingAmount: Math.max(0, (prev.remainingAmount || prev.amount) - m.amount),
        started: false,
        amount: Math.max(0, (prev.remainingAmount || prev.amount) - m.amount),
        showCompletedScreen: true,
        lastCompletedAmount: m.amount,
      }));
    });
  }, [tradingMatches, setSellerSlotAt]);

  // 6) 입금 타이머 만료 → 해당 건 취소(구매자 위반), 판매자 카드에 "매칭이 취소되었습니다"
  const depositTimeoutFiredRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const toCancel = tradingMatches.filter((m) => !m.canceledReason && m.depositTimerSeconds <= 0);
    if (toCancel.length === 0) return;
    toCancel.forEach((m) => {
      if (depositTimeoutFiredRef.current.has(m.matchId)) return;
      depositTimeoutFiredRef.current.add(m.matchId);
    });
    setTradingMatches((prev) =>
      prev.map((m) =>
        toCancel.some((c) => c.matchId === m.matchId) ? { ...m, canceledReason: 'buyer_deposit_timeout' as const } : m
      )
    );
    const entry: ViolationEntry = { type: '취소', message: '입금 확인 시간 초과' };
    setBuyerSlot((prev) => ({
      ...prev,
      violationHistory: [...prev.violationHistory, entry],
    }));
  }, [tradingMatches]);

  // 7) 거래 중 입금 타이머 1초 감소
  useEffect(() => {
    if (tradingMatches.length === 0) return;
    const id = setInterval(() => {
      setTradingMatches((prev) =>
        prev.map((m) => (m.canceledReason ? m : { ...m, depositTimerSeconds: Math.max(0, m.depositTimerSeconds - 1) }))
      );
    }, 1000);
    return () => clearInterval(id);
  }, [tradingMatches.length]);

  // 8) 취소된 매칭 카드 3초 후 제거
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

  // 9) 실제 거래가 있었다가 모두 끝나면 phase = completed
  const hadTradingMatchesRef = useRef(false);
  useEffect(() => {
    if (tradingMatches.length > 0) hadTradingMatchesRef.current = true;
  }, [tradingMatches.length]);
  useEffect(() => {
    if (phase === 'completed') return;
    if (scheduledMatches.length > 0 || confirmingMatches.length > 0 || tradingMatches.length > 0) return;
    if (buyerRemainingAmount > 0 || !buyerStarted) return;
    if (!hadTradingMatchesRef.current) return;
    hadTradingMatchesRef.current = false;
    setPhase('completed');
  }, [phase, scheduledMatches.length, confirmingMatches.length, tradingMatches.length, buyerRemainingAmount, buyerStarted]);

  // phase: searching 표시용 (매칭 진행 중)
  const hasAnyMatch = scheduledMatches.length > 0 || confirmingMatches.length > 0 || tradingMatches.length > 0;
  const effectivePhase: SimPhase =
    phase === 'completed'
      ? 'completed'
      : buyerStarted && hasAnyMatch
        ? 'searching'
        : buyerStarted && buyerRemainingAmount > 0
          ? 'searching'
          : phase;

  const reset = useCallback(() => {
    setBuyerSlot(createInitialBuyerSlotB2S(simConfig));
    setSellerSlots((prev) => prev.map((s, i) => ({ ...createInitialSellerSlotB2S(i, simConfig), user: s.user })));
    setPhase('idle');
    setScheduledMatches([]);
    setConfirmingMatches([]);
    setTradingMatches([]);
    setMatchDisplayOrder([]);
  }, [simConfig]);

  const handleBuyerConfirmMatchMulti = useCallback((matchId: string) => {
    stopMatchSound();
    setConfirmingMatches((prev) => prev.map((m) => (m.matchId === matchId ? { ...m, buyerConfirmed: true } : m)));
  }, []);
  const handleSellerConfirmMatchMulti = useCallback((matchId: string) => {
    stopMatchSound();
    setConfirmingMatches((prev) => prev.map((m) => (m.matchId === matchId ? { ...m, sellerConfirmed: true } : m)));
  }, []);
  const handleSellerDeclineMatchMulti = useCallback(
    (matchId: string) => {
      const m = confirmingMatches.find((x) => x.matchId === matchId);
      if (!m) return;
      const violationEntry: ViolationEntry = { type: '취소', message: '매칭 확인 시간 초과 또는 취소' };
      setSellerSlotAt(m.sellerIndex, (s) => ({
        ...s,
        started: false,
        amount: 0,
        remainingAmount: 0,
        violationHistory: [...s.violationHistory, violationEntry],
        searchTimerSeconds: simConfig.sellerSearchTimerMinutes * 60,
      }));
      setConfirmingMatches((prev) => prev.filter((x) => x.matchId !== matchId));
      setMatchDisplayOrder((prev) => prev.filter((id) => id !== matchId));
    },
    [confirmingMatches, setSellerSlotAt, simConfig.sellerSearchTimerMinutes]
  );
  const handleDeclineMatchMulti = useCallback(
    (matchId: string) => {
      const m = confirmingMatches.find((x) => x.matchId === matchId);
      if (!m) return;
      const violationEntry: ViolationEntry = { type: '취소', message: '매칭 확인 시간 초과 또는 취소' };
      setBuyerSlot((prev) => ({ ...prev, violationHistory: [...prev.violationHistory, violationEntry] }));
      setSellerSlotAt(m.sellerIndex, (s) => ({
        ...s,
        started: false,
        amount: 0,
        remainingAmount: 0,
        sellerConfirmed: false,
        violationHistory: [...s.violationHistory, violationEntry],
        searchTimerSeconds: simConfig.sellerSearchTimerMinutes * 60,
      }));
      setConfirmingMatches((prev) => prev.filter((x) => x.matchId !== matchId));
      setMatchDisplayOrder((prev) => prev.filter((id) => id !== matchId));
    },
    [confirmingMatches, setSellerSlotAt, simConfig.sellerSearchTimerMinutes]
  );
  const handleSellerConfirmDepositMulti = useCallback((matchId: string) => {
    setTradingMatches((prev) => prev.map((m) => (m.matchId === matchId ? { ...m, sellerConfirmed: true } : m)));
  }, []);
  const handleBuyerDepositDoneMulti = useCallback((matchId: string) => {
    setTradingMatches((prev) => prev.map((m) => (m.matchId === matchId ? { ...m, buyerDepositDone: true } : m)));
  }, []);

  /** 구매자 입금 불가: 해당 건만 거래에서 제거, 위반 기록 */
  const handleBuyerRejectDepositMulti = useCallback(
    (matchId: string, reason: string) => {
      const m = tradingMatches.find((x) => x.matchId === matchId);
      if (!m) return;
      const entry: ViolationEntry = { type: '거부', message: `구매자 거부: ${reason}` };
      setSellerSlotAt(m.sellerIndex, (s) => ({ ...s, violationHistory: [...s.violationHistory, entry] }));
      setBuyerSlot((prev) => ({ ...prev, violationHistory: [...prev.violationHistory, entry] }));
      setTradingMatches((prev) => prev.filter((x) => x.matchId !== matchId));
      setMatchDisplayOrder((prev) => prev.filter((id) => id !== matchId));
    },
    [tradingMatches, setSellerSlotAt]
  );

  // 다중 카드 표시용: matchDisplayOrder 순서 유지(완료 건도 원래 위치에 거래완료 카드로 표시)
  const multiOrderedMatchesForBuyer = matchDisplayOrder
    .map((matchId) => {
      const completed = completedMultiMatchesForBuyer.find((c) => c.matchId === matchId);
      if (completed) return { kind: 'completed' as const, ...completed };
      const c = confirmingMatches.find((m) => m.matchId === matchId);
      if (c)
        return {
          kind: 'confirming' as const,
          matchId: c.matchId,
          sellerIndex: c.sellerIndex,
          amount: c.amount,
          confirmTimerSeconds: c.confirmTimerSeconds,
          buyerConfirmed: c.buyerConfirmed,
          sellerConfirmed: c.sellerConfirmed,
        };
      const t = tradingMatches.find((m) => m.matchId === matchId);
      if (t) {
        const seller = sellerSlots[t.sellerIndex];
        const matchResult: MatchResult =
          seller && buyerSlot.user
            ? computeMatchResult(t.amount, t.amount, seller.user, buyerSlot.user)
            : null;
        return {
          kind: 'trading' as const,
          matchId: t.matchId,
          sellerIndex: t.sellerIndex,
          amount: t.amount,
          buyerDepositDone: t.buyerDepositDone,
          sellerConfirmed: t.sellerConfirmed,
          depositTimerSeconds: t.depositTimerSeconds,
          canceledReason: t.canceledReason,
          matchResult,
        };
      }
      return null;
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  const sellerMemberIds = sellerSlots.map((s) => s.user.id);

  const addSellerSlot = useCallback(() => {
    setSellerSlots((prev) => {
      if (prev.length >= MAX_SELLERS_B2S) return prev;
      return [...prev, createInitialSellerSlotB2S(prev.length, simConfig)];
    });
  }, [simConfig]);

  const removeSellerSlot = useCallback((sellerIndex: number) => {
    if (sellerIndex < 1) return;
    setSellerSlots((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== sellerIndex);
      if (next.length === 1 && onSellerCountChange) onSellerCountChange(1);
      return next;
    });
    setScheduledMatches((prev) => prev.filter((m) => m.sellerIndex !== sellerIndex));
    setConfirmingMatches((prev) => prev.filter((m) => m.sellerIndex !== sellerIndex));
    setTradingMatches((prev) => prev.filter((m) => m.sellerIndex !== sellerIndex));
    setMatchDisplayOrder((prev) => {
      const toRemove = new Set(
        [...scheduledMatches, ...confirmingMatches, ...tradingMatches].filter((m) => m.sellerIndex === sellerIndex).map((m) => m.matchId)
      );
      return prev.filter((id) => !toRemove.has(id));
    });
  }, [onSellerCountChange, scheduledMatches, confirmingMatches, tradingMatches]);

  const handleBuyerNewTrade = useCallback(() => {
    setBuyerSlot((prev) => ({ ...prev, clickedNew: true, amount: 0, remainingAmount: 0, started: false, searchTimerSeconds: simConfig.buyerSearchTimerMinutes * 60 }));
    setCompletedMultiMatchesForBuyer([]);
  }, [simConfig.buyerSearchTimerMinutes]);

  const handleSellerNewTrade = useCallback(
    (sellerIndex: number) => {
      setSellerSlotAt(sellerIndex, (s) => ({
        ...s,
        clickedNew: true,
        amount: 0,
        remainingAmount: 0,
        started: false,
        showCompletedScreen: false,
        lastCompletedAmount: 0,
        searchTimerSeconds: simConfig.sellerSearchTimerMinutes * 60,
      }));
    },
    [setSellerSlotAt, simConfig.sellerSearchTimerMinutes]
  );

  const handleCancelBuyerSearch = useCallback(() => {
    setBuyerSlot((prev) => ({ ...prev, started: false, amount: 0, remainingAmount: 0 }));
    setScheduledMatches([]);
    setConfirmingMatches([]);
    setTradingMatches([]);
    setMatchDisplayOrder([]);
    setCompletedMultiMatchesForBuyer([]);
    setPhase('idle');
  }, []);

  const handleCancelSellerSearch = useCallback(
    (sellerIndex: number) => {
      setSellerSlotAt(sellerIndex, (s) => ({ ...s, started: false, amount: 0, remainingAmount: 0 }));
      setScheduledMatches((prev) => prev.filter((m) => m.sellerIndex !== sellerIndex));
      setConfirmingMatches((prev) => prev.filter((m) => m.sellerIndex !== sellerIndex));
      setTradingMatches((prev) => prev.filter((m) => m.sellerIndex !== sellerIndex));
      setMatchDisplayOrder((prev) => {
        const toRemove = new Set(
          [...scheduledMatches, ...confirmingMatches, ...tradingMatches].filter((m) => m.sellerIndex === sellerIndex).map((m) => m.matchId)
        );
        return prev.filter((id) => !toRemove.has(id));
      });
    },
    [setSellerSlotAt, scheduledMatches, confirmingMatches, tradingMatches]
  );

  return (
    <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4 sm:gap-6 md:gap-8 lg:gap-12 xl:gap-16 w-full max-w-[1800px]">
      {/* 구매자 화면 1 */}
      <IPhoneFrame variant="buyer" title="구매자 화면 1">
        <BuyerPhoneContent
          buyerIndex={0}
          phase={effectivePhase}
          buyerStarted={buyerStarted}
          sellerStarted={anySellerStarted}
          showInitialScreen={!buyerStarted && multiOrderedMatchesForBuyer.length === 0}
          amountsMatch={false}
          buyerAmount={buyerSlot.amount}
          setBuyerAmount={(n) => setBuyerSlot((prev) => ({ ...prev, amount: n }))}
          minPointAmount={MIN_POINT_AMOUNT}
          isValidAmount={isValidAmount(buyerSlot.amount)}
          setBuyerStarted={() => setBuyerSlot((prev) => ({ ...prev, started: true, searchTimerSeconds: simConfig.buyerSearchTimerMinutes * 60 }))}
          matchResult={null}
          buyerDepositDone={false}
          setBuyerDepositDone={() => {}}
          displayPoints={buyerSlot.currentPoints}
          completed={phase === 'completed'}
          completedAmount={phase === 'completed' ? buyerSlot.amount : undefined}
          displayRemainingAmount={phase === 'completed' ? 0 : buyerRemainingAmount > 0 ? buyerRemainingAmount : undefined}
          onReset={reset}
          buyerClickedNew={buyerSlot.clickedNew}
          onNewTrade={handleBuyerNewTrade}
          buyerSearchTimerSeconds={buyerSlot.searchTimerSeconds}
          onRejectMatch={() => {}}
          rejectReasonOptions={['계좌번호 불일치', '입금자명 불일치', '은행 정검시간']}
          matchConfirming={false}
          sellerMatchConfirmed={false}
          buyerMatchConfirmed={false}
          onConfirmMatch={() => {}}
          onDeclineMatch={() => {}}
          confirmTimerSeconds={simConfig.confirmTimerSeconds}
          sellerRejectDepositReason={null}
          onClearSellerRejectDepositReason={() => {}}
          violationHistory={buyerSlot.violationHistory}
          memberId={buyerSlot.user.id}
          onCancelSearch={handleCancelBuyerSearch}
          buyerDepositPhotoEnabled={simConfig.buyerDepositPhotoEnabled}
          multiOrderedMatchesForBuyer={multiOrderedMatchesForBuyer}
          sellerMemberIds={sellerMemberIds}
          onConfirmMatchMulti={handleBuyerConfirmMatchMulti}
          onDeclineMatchMulti={handleDeclineMatchMulti}
          setBuyerDepositDoneMulti={handleBuyerDepositDoneMulti}
          onRejectDepositMulti={handleBuyerRejectDepositMulti}
        />
      </IPhoneFrame>

      {/* 판매자 화면 1 ~ N */}
      {sellerSlots.map((slot, i) => {
        const sellerIndex = i;
        const confirming = confirmingMatches.find((m) => m.sellerIndex === sellerIndex);
        const trading = tradingMatches.find((m) => m.sellerIndex === sellerIndex);
        const matchForSeller = confirming ?? trading;
        const matchResultForSeller =
          matchForSeller && trading
            ? (() => {
                const seller = sellerSlots[trading.sellerIndex];
                return seller && buyerSlot.user ? computeMatchResult(trading.amount, trading.amount, seller.user, buyerSlot.user) : null;
              })()
            : null;
        const isConfirming = Boolean(confirming);
        const isTrading = Boolean(trading);
        const sellerPhase: SimPhase =
          phase === 'completed' && !slot.showCompletedScreen
            ? 'idle'
            : slot.showCompletedScreen
              ? 'completed'
              : isConfirming
                ? 'confirming'
                : isTrading
                  ? 'trading'
                  : slot.started
                    ? 'searching'
                    : 'idle';

        return (
          <IPhoneFrame
            key={sellerIndex}
            title={`판매자 화면 ${sellerIndex + 1}`}
            titleAction={
              sellerIndex === 0 && sellerSlots.length < MAX_SELLERS_B2S ? (
                <button
                  type="button"
                  onClick={addSellerSlot}
                  className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-slate-500/60 hover:border-cyan-400/70 hover:bg-slate-700/50 text-slate-400 hover:text-cyan-400 flex items-center justify-center text-base font-light transition-all duration-200"
                  aria-label="판매자 화면 추가"
                  title="판매자 추가"
                >
                  +
                </button>
              ) : sellerIndex > 0 ? (
                <button
                  type="button"
                  onClick={() => removeSellerSlot(sellerIndex)}
                  className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-slate-500/60 hover:border-red-400/70 hover:bg-slate-700/50 text-slate-400 hover:text-red-400 flex items-center justify-center text-base font-light transition-all duration-200"
                  aria-label="판매자 화면 삭제"
                  title="판매자 삭제"
                >
                  −
                </button>
              ) : undefined
            }
          >
            <SellerPhoneContent
              phase={sellerPhase}
              sellerStarted={slot.started}
              buyerStarted={buyerStarted}
              amountsMatch={false}
              sellerAmount={slot.amount}
              sellerRemainingAmount={slot.remainingAmount > 0 ? slot.remainingAmount : slot.amount}
              setSellerAmount={(n) => setSellerSlotAt(sellerIndex, (s) => ({ ...s, amount: Math.min(n, s.currentPoints) }))}
              minPointAmount={MIN_POINT_AMOUNT}
              isValidAmount={isValidAmount(slot.amount)}
              setSellerStarted={(b) => setSellerSlotAt(sellerIndex, (s) => ({ ...s, started: b }))}
              matchResult={matchResultForSeller}
              buyerDepositDone={trading?.buyerDepositDone ?? false}
              sellerConfirmed={confirming?.sellerConfirmed ?? trading?.sellerConfirmed ?? false}
              setSellerConfirmed={() => {}}
              displayPoints={slot.currentPoints}
              completed={slot.showCompletedScreen}
              completedSoldAmount={slot.lastCompletedAmount}
              onReset={reset}
              sellerClickedNew={slot.clickedNew}
              onNewTrade={() => handleSellerNewTrade(sellerIndex)}
              sellerSearchTimerSeconds={slot.searchTimerSeconds}
              rejectReason={null}
              onClearRejectReason={() => {}}
              matchConfirming={isConfirming}
              sellerMatchConfirmed={confirming?.sellerConfirmed ?? false}
              buyerMatchConfirmed={confirming?.buyerConfirmed ?? false}
              onConfirmMatch={matchForSeller ? () => handleSellerConfirmMatchMulti(matchForSeller.matchId) : () => {}}
              onDeclineMatch={() => {}}
              confirmTimerSeconds={confirming?.confirmTimerSeconds ?? simConfig.confirmTimerSeconds}
              onRejectDeposit={() => {}}
              violationHistory={slot.violationHistory}
              memberId={slot.user.id}
              onCancelSearch={() => handleCancelSellerSearch(sellerIndex)}
              multiOrderedMatches={
                matchForSeller
                  ? (isConfirming && confirming
                      ? [
                          {
                            kind: 'confirming' as const,
                            matchId: confirming.matchId,
                            buyerIndex: 0,
                            amount: confirming.amount,
                            confirmTimerSeconds: confirming.confirmTimerSeconds,
                            buyerConfirmed: confirming.buyerConfirmed,
                            sellerConfirmed: confirming.sellerConfirmed,
                          },
                        ]
                      : isTrading && trading
                        ? [
                            {
                              kind: 'trading' as const,
                              matchId: trading.matchId,
                              buyerIndex: 0,
                              amount: trading.amount,
                              buyerDepositDone: trading.buyerDepositDone,
                              sellerConfirmed: trading.sellerConfirmed,
                              depositTimerSeconds: trading.depositTimerSeconds,
                              canceledReason: trading.canceledReason,
                            },
                          ]
                        : [])
                  : undefined
              }
              buyerMemberIds={[buyerSlot.user.id]}
              onConfirmMatchMulti={handleSellerConfirmMatchMulti}
              onDeclineMatchMulti={handleSellerDeclineMatchMulti}
              onSellerConfirmDepositMulti={handleSellerConfirmDepositMulti}
              multiTransferMatchResult={isTrading && trading ? matchResultForSeller : undefined}
              sellerDepositPhotoEnabled={simConfig.sellerDepositPhotoEnabled}
            />
          </IPhoneFrame>
        );
      })}
    </div>
  );
}
