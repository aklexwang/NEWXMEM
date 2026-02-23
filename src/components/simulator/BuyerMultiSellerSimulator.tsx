/**
 * 구매자 1명 · 다중 판매자 시뮬레이터.
 * 규칙: 다중 구매자·판매자 1명과 동일 (거래 종료 = 판매자 입금확인 시점, 잔액 있으면 즉시 다음 매칭).
 * 기존 다중 구매자·판매자 로직은 수정하지 않고 이 컴포넌트에서만 B2S 로직 구현.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { createBuyerUserForIndex, createSellerUserForIndex } from '../../data/matchMock';
import type { User, SimPhase } from '../../types';
import { computeMatchResult } from '../../data/matchMock';
import type { MatchResult } from '../../data/matchMock';
import type { SimConfig } from '../../App';
import { DEFAULT_SIM_CONFIG } from '../../App';
import type { ViolationEntry } from '../../App';
import IPhoneFrame from './IPhoneFrame';
import SellerPhoneContent from './SellerPhoneContent';
import BuyerPhoneContent from './BuyerPhoneContent';

const MAX_SELLERS_B2S = 5;
const MIN_POINT_AMOUNT = 10_000;

/** B2S용 판매자 슬롯 (거래완료 후 확인 전까지 화면 유지용 플래그 포함) */
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
  /** 거래완료 화면에서 확인 누른 뒤 초기 화면 표시용 */
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
  /** App에서 다중 판매자로 전환 시 전달. 이 값이 있으면 초기 판매자 수로 사용 */
  initialSellerCount?: number;
  /** 판매자를 줄여 1명이 되었을 때 호출 (다중 구매자 화면으로 전환) */
  onSellerCountChange?: (count: number) => void;
}

export default function BuyerMultiSellerSimulator({ simConfig, onReset: _onReset, initialSellerCount, onSellerCountChange }: BuyerMultiSellerSimulatorProps) {
  const isValidAmount = (n: number) => n >= MIN_POINT_AMOUNT && n % 10_000 === 0;

  const [buyerSlot, setBuyerSlot] = useState<BuyerSlotB2S>(() => createInitialBuyerSlotB2S(simConfig));
  const [sellerSlots, setSellerSlots] = useState<SellerSlotB2S[]>(() => {
    const n = initialSellerCount != null && initialSellerCount > 1 ? initialSellerCount : 1;
    return Array.from({ length: n }, (_, i) => createInitialSellerSlotB2S(i, simConfig));
  });
  const [phase, setPhase] = useState<SimPhase>('idle');
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [matchedSellerIndex, setMatchedSellerIndex] = useState<number | null>(null);
  const [sellerMatchConfirmed, setSellerMatchConfirmed] = useState(false);
  const [confirmTimerSeconds, setConfirmTimerSeconds] = useState(simConfig.confirmTimerSeconds);
  const confirmingMatchedSellerIndexRef = useRef<number | null>(null);

  const buyerAmount = buyerSlot.amount;
  const buyerRemainingAmount = buyerSlot.remainingAmount;
  const buyerStarted = buyerSlot.started;
  const setSellerSlotAt = useCallback((index: number, updater: (prev: SellerSlotB2S) => SellerSlotB2S) => {
    setSellerSlots((prev) => prev.map((s, i) => (i === index ? updater(s) : s)));
  }, []);

  const buyerMatchConfirmed = buyerSlot.matchConfirmed;
  const anySellerStarted = sellerSlots.some((s) => s.started);

  // 구매자 검색 타이머
  useEffect(() => {
    if (phase !== 'idle' && phase !== 'searching') return;
    if (!buyerStarted || (phase === 'searching' && matchedSellerIndex !== null)) return;
    const id = setInterval(() => {
      setBuyerSlot((prev) => (prev.searchTimerSeconds <= 0 ? prev : { ...prev, searchTimerSeconds: prev.searchTimerSeconds - 1 }));
    }, 1000);
    return () => clearInterval(id);
  }, [phase, buyerStarted, matchedSellerIndex]);

  // 1) 구매자와 매칭 가능한 판매자: idle 진입 시 잔액 있으면 재매칭, 없으면 구매금액 기준 첫 매칭 → SEARCHING
  useEffect(() => {
    if (!buyerStarted || phase !== 'idle') return;
    const useRemaining = buyerRemainingAmount > 0;
    const refAmount = useRemaining ? buyerRemainingAmount : buyerAmount;
    if (!isValidAmount(refAmount) && !useRemaining) return;
    const candidates: { index: number; amount: number }[] = [];
    for (let i = 0; i < sellerSlots.length; i++) {
      const slot = sellerSlots[i];
      const matchAmount = Math.min(refAmount, slot.amount);
      const withinRange = useRemaining ? slot.amount <= refAmount : true;
      if (slot.started && matchAmount > 0 && isValidAmount(slot.amount) && withinRange && (useRemaining || isValidAmount(buyerAmount))) {
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
    if (!useRemaining) setBuyerSlot((prev) => ({ ...prev, remainingAmount: buyerAmount }));
    setMatchedSellerIndex(best.index);
    setPhase('searching');
  }, [buyerStarted, phase, buyerAmount, buyerRemainingAmount, sellerSlots]);

  // 1b) SEARCHING 재검색: 구매 남은금액 이하 판매자 중 가장 가까운 금액
  useEffect(() => {
    if (phase !== 'searching' || matchedSellerIndex !== null || !buyerStarted || buyerRemainingAmount <= 0) return;
    const candidates: { index: number; amount: number }[] = [];
    for (let i = 0; i < sellerSlots.length; i++) {
      const slot = sellerSlots[i];
      const matchAmount = Math.min(buyerRemainingAmount, slot.amount);
      const withinRange = slot.amount <= buyerRemainingAmount;
      if (slot.started && matchAmount > 0 && isValidAmount(slot.amount) && withinRange) {
        candidates.push({ index: i, amount: slot.amount });
      }
    }
    if (candidates.length === 0) return;
    candidates.sort((a, b) => {
      const diffA = Math.abs(a.amount - buyerRemainingAmount);
      const diffB = Math.abs(b.amount - buyerRemainingAmount);
      return diffA !== diffB ? diffA - diffB : a.index - b.index;
    });
    setMatchedSellerIndex(candidates[0].index);
  }, [phase, matchedSellerIndex, buyerStarted, buyerRemainingAmount, sellerSlots]);

  // 2) SEARCHING → matchDelaySeconds 후 confirming
  const matchSearchRef = useRef({ buyerRemainingAmount: 0, matchedSellerIndex: null as number | null, sellerSlots: [] as SellerSlotB2S[] });
  matchSearchRef.current = { buyerRemainingAmount, matchedSellerIndex, sellerSlots };
  useEffect(() => {
    if (phase !== 'searching' || matchedSellerIndex === null) return;
    const slot = sellerSlots[matchedSellerIndex];
    const matchAmount = Math.min(buyerRemainingAmount, slot?.amount ?? 0);
    if (!buyerStarted || !slot?.started || matchAmount <= 0) return;
    const timer = setTimeout(() => {
      const { buyerRemainingAmount: rem, matchedSellerIndex: idx, sellerSlots: slots } = matchSearchRef.current;
      if (idx === null) return;
      const s = slots[idx];
      if (!s) return;
      const result = computeMatchResult(s.amount, rem, s.user, buyerSlot.user);
      setMatchResult(result);
      setPhase('confirming');
      setSellerMatchConfirmed(false);
      setSellerSlotAt(idx, (prev) => ({ ...prev, sellerConfirmed: false }));
      setBuyerSlot((prev) => ({ ...prev, depositDone: false, matchConfirmed: false }));
    }, simConfig.matchDelaySeconds * 1000);
    return () => clearTimeout(timer);
  }, [phase, matchedSellerIndex, buyerStarted, buyerRemainingAmount, sellerSlots, buyerSlot.user, setSellerSlotAt, simConfig.matchDelaySeconds]);

  // 3) 양쪽 모두 매칭 확인 시 trading
  useEffect(() => {
    if (phase !== 'confirming' || matchedSellerIndex === null || !sellerMatchConfirmed) return;
    if (!buyerSlot.matchConfirmed) return;
    setPhase('trading');
    setSellerMatchConfirmed(false);
    setBuyerSlot((prev) => ({ ...prev, matchConfirmed: false }));
  }, [phase, matchedSellerIndex, sellerMatchConfirmed, buyerSlot.matchConfirmed]);

  // 4) trading → 판매자 입금확인 시 거래 완료 (규칙: 거래 종료 시점). 잔액 있으면 같은 effect 안에서 즉시 다음 판매자와 매칭 시작.
  useEffect(() => {
    if (phase !== 'trading' || !matchResult || matchedSellerIndex === null) return;
    const slot = sellerSlots[matchedSellerIndex];
    if (!buyerSlot.depositDone || !slot?.sellerConfirmed) return;
    const total = matchResult.totalAmount;
    const idx = matchedSellerIndex;
    const nextRemaining = Math.max(0, buyerSlot.remainingAmount - total);

    setBuyerSlot((prev) => ({
      ...prev,
      currentPoints: prev.currentPoints + total,
      remainingAmount: nextRemaining,
      started: nextRemaining > 0,
      depositDone: false,
    }));
    setSellerSlotAt(idx, (prev) => {
      const rem = Math.max(0, (prev.remainingAmount || prev.amount) - total);
      return {
        ...prev,
        currentPoints: prev.currentPoints - total,
        remainingAmount: rem,
        started: false,
        amount: rem,
        showCompletedScreen: true,
        lastCompletedAmount: total,
      };
    });

    if (nextRemaining > 0) {
      const candidates: { index: number; amount: number }[] = [];
      for (let i = 0; i < sellerSlots.length; i++) {
        if (i === idx) continue;
        const s = sellerSlots[i];
        const matchAmount = Math.min(nextRemaining, s.amount);
        const withinRange = s.amount <= nextRemaining;
        if (s.started && matchAmount > 0 && isValidAmount(s.amount) && withinRange) {
          candidates.push({ index: i, amount: s.amount });
        }
      }
      if (candidates.length > 0) {
        candidates.sort((a, b) => {
          const diffA = Math.abs(a.amount - nextRemaining);
          const diffB = Math.abs(b.amount - nextRemaining);
          return diffA !== diffB ? diffA - diffB : a.index - b.index;
        });
        setMatchResult(null);
        setSellerMatchConfirmed(false);
        setMatchedSellerIndex(candidates[0].index);
        setPhase('searching');
      } else {
        setMatchResult(null);
        setMatchedSellerIndex(null);
        setPhase('completed');
      }
    } else {
      setMatchResult(null);
      setMatchedSellerIndex(null);
      setPhase('completed');
    }
  }, [phase, matchResult, matchedSellerIndex, buyerSlot.depositDone, buyerSlot.remainingAmount, sellerSlots, setSellerSlotAt]);

  // 5) completed 상태에서 잔액이 있으면 판매자 2가 나중에 시작해도 매칭 시도 (사진3 방지: 구매자 화면이 거래완료로 멈추지 않도록)
  useEffect(() => {
    if (phase !== 'completed') return;
    if (buyerRemainingAmount <= 0 || !buyerStarted) return;
    const candidates: { index: number; amount: number }[] = [];
    for (let i = 0; i < sellerSlots.length; i++) {
      const slot = sellerSlots[i];
      const matchAmount = Math.min(buyerRemainingAmount, slot.amount);
      const withinRange = slot.amount <= buyerRemainingAmount;
      if (slot.started && matchAmount > 0 && isValidAmount(slot.amount) && withinRange) {
        candidates.push({ index: i, amount: slot.amount });
      }
    }
    if (candidates.length === 0) return;
    candidates.sort((a, b) => {
      const diffA = Math.abs(a.amount - buyerRemainingAmount);
      const diffB = Math.abs(b.amount - buyerRemainingAmount);
      return diffA !== diffB ? diffA - diffB : a.index - b.index;
    });
    const best = candidates[0];
    setMatchResult(null);
    setSellerMatchConfirmed(false);
    setMatchedSellerIndex(best.index);
    setPhase('searching');
  }, [phase, buyerRemainingAmount, buyerStarted, sellerSlots]);

  const reset = useCallback(() => {
    setBuyerSlot(createInitialBuyerSlotB2S(simConfig));
    setSellerSlots((prev) => prev.map((s, i) => ({ ...createInitialSellerSlotB2S(i, simConfig), user: s.user })));
    setPhase('idle');
    setMatchResult(null);
    setSellerMatchConfirmed(false);
    setMatchedSellerIndex(null);
  }, [simConfig]);

  const handleSellerConfirmMatch = useCallback(() => setSellerMatchConfirmed(true), []);
  const handleBuyerConfirmMatch = useCallback(() => setBuyerSlot((prev) => ({ ...prev, matchConfirmed: true })), []);

  useEffect(() => {
    if (phase === 'confirming' && matchedSellerIndex !== null) confirmingMatchedSellerIndexRef.current = matchedSellerIndex;
    else if (phase !== 'confirming') confirmingMatchedSellerIndexRef.current = null;
  }, [phase, matchedSellerIndex]);

  // 매칭 확인 제한 타이머 (confirming 단계)
  useEffect(() => {
    if (phase !== 'confirming') return;
    const id = setInterval(() => {
      setConfirmTimerSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);
  useEffect(() => {
    if (phase !== 'confirming') setConfirmTimerSeconds(simConfig.confirmTimerSeconds);
  }, [phase, simConfig.confirmTimerSeconds]);

  const handleDeclineMatch = useCallback(() => {
    const idx = confirmingMatchedSellerIndexRef.current ?? matchedSellerIndex;
    const violationEntry: ViolationEntry = { type: '취소', message: '매칭 확인 시간 초과 또는 취소' };
    setMatchResult(null);
    setSellerMatchConfirmed(false);
    setMatchedSellerIndex(null);
    setPhase('idle');
    setBuyerSlot((prev) => ({ ...prev, started: false, amount: 0, remainingAmount: 0, violationHistory: [...prev.violationHistory, violationEntry] }));
    if (idx !== null) {
      setSellerSlotAt(idx, (s) => ({
        ...s,
        started: false,
        amount: 0,
        remainingAmount: 0,
        sellerConfirmed: false,
        showCompletedScreen: false,
        lastCompletedAmount: 0,
        violationHistory: [...s.violationHistory, violationEntry],
        searchTimerSeconds: simConfig.sellerSearchTimerMinutes * 60,
      }));
    }
  }, [matchedSellerIndex, setSellerSlotAt, simConfig.sellerSearchTimerMinutes]);

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
    setMatchedSellerIndex((current) => {
      if (current === null) return null;
      if (current === sellerIndex) return null;
      if (current > sellerIndex) return current - 1;
      return current;
    });
    if (matchedSellerIndex === sellerIndex) {
      setPhase('idle');
      setMatchResult(null);
      setSellerMatchConfirmed(false);
    }
  }, [matchedSellerIndex, onSellerCountChange]);

  const handleBuyerNewTrade = useCallback(() => {
    setBuyerSlot((prev) => ({ ...prev, clickedNew: true, amount: 0, remainingAmount: 0, started: false, searchTimerSeconds: simConfig.buyerSearchTimerMinutes * 60 }));
  }, [simConfig.buyerSearchTimerMinutes]);

  const handleSellerNewTrade = useCallback(
    (sellerIndex: number) => {
      setSellerSlotAt(sellerIndex, (s) => ({ ...s, clickedNew: true, amount: 0, remainingAmount: 0, started: false, showCompletedScreen: false, lastCompletedAmount: 0, searchTimerSeconds: simConfig.sellerSearchTimerMinutes * 60 }));
      if (matchedSellerIndex === sellerIndex) {
        setMatchResult(null);
        setMatchedSellerIndex(null);
        setSellerMatchConfirmed(false);
        if (buyerRemainingAmount > 0) setPhase('idle');
      }
    },
    [matchedSellerIndex, buyerRemainingAmount, setSellerSlotAt, simConfig.sellerSearchTimerMinutes]
  );

  const handleCancelBuyerSearch = useCallback(() => {
    setBuyerSlot((prev) => ({ ...prev, started: false, amount: 0, remainingAmount: 0 }));
    if (matchedSellerIndex !== null) {
      setPhase('idle');
      setMatchResult(null);
      setMatchedSellerIndex(null);
    }
  }, [matchedSellerIndex]);

  const handleCancelSellerSearch = useCallback(
    (sellerIndex: number) => {
      setSellerSlotAt(sellerIndex, (s) => ({ ...s, started: false, amount: 0, remainingAmount: 0 }));
      if (matchedSellerIndex === sellerIndex) {
        setPhase('idle');
        setMatchResult(null);
        setMatchedSellerIndex(null);
      }
    },
    [matchedSellerIndex, setSellerSlotAt]
  );

  const mainSeller = sellerSlots[0];

  return (
    <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4 sm:gap-6 md:gap-8 lg:gap-12 xl:gap-16 w-full max-w-[1800px]">
      {/* 구매자 화면 1 (1명 고정) */}
      <IPhoneFrame variant="buyer" title="구매자 화면 1">
        <BuyerPhoneContent
          buyerIndex={0}
          phase={phase}
          buyerStarted={buyerStarted}
          sellerStarted={anySellerStarted}
          showInitialScreen={!buyerStarted && matchedSellerIndex !== 0}
          amountsMatch={false}
          buyerAmount={buyerSlot.amount}
          setBuyerAmount={(n) => setBuyerSlot((prev) => ({ ...prev, amount: n }))}
          minPointAmount={MIN_POINT_AMOUNT}
          isValidAmount={isValidAmount(buyerSlot.amount)}
          setBuyerStarted={() => setBuyerSlot((prev) => ({ ...prev, started: true, searchTimerSeconds: simConfig.buyerSearchTimerMinutes * 60 }))}
          matchResult={matchResult}
          buyerDepositDone={buyerSlot.depositDone}
          setBuyerDepositDone={(b) => setBuyerSlot((prev) => ({ ...prev, depositDone: b }))}
          displayPoints={buyerSlot.currentPoints}
          completed={phase === 'completed'}
          completedAmount={phase === 'completed' ? buyerSlot.amount : undefined}
          displayRemainingAmount={phase === 'completed' ? 0 : (buyerSlot.remainingAmount > 0 ? buyerSlot.remainingAmount : undefined)}
          onReset={reset}
          buyerClickedNew={buyerSlot.clickedNew}
          onNewTrade={handleBuyerNewTrade}
          buyerSearchTimerSeconds={buyerSlot.searchTimerSeconds}
          onRejectMatch={() => {}}
          rejectReasonOptions={[]}
          matchConfirming={phase === 'confirming'}
          sellerMatchConfirmed={sellerMatchConfirmed}
          buyerMatchConfirmed={buyerMatchConfirmed}
          onConfirmMatch={handleBuyerConfirmMatch}
          onDeclineMatch={handleDeclineMatch}
          confirmTimerSeconds={confirmTimerSeconds}
          sellerRejectDepositReason={null}
          onClearSellerRejectDepositReason={() => {}}
          violationHistory={buyerSlot.violationHistory}
          memberId={buyerSlot.user.id}
          onCancelSearch={handleCancelBuyerSearch}
        />
      </IPhoneFrame>

      {/* 판매자 화면 1 */}
      <IPhoneFrame
        title="판매자 화면 1"
        titleAction={
          sellerSlots.length < MAX_SELLERS_B2S ? (
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
          phase={matchedSellerIndex === 0 ? phase : (mainSeller?.showCompletedScreen ? 'completed' : mainSeller?.started ? 'searching' : 'idle')}
          sellerStarted={mainSeller?.started ?? false}
          buyerStarted={buyerStarted}
          amountsMatch={matchedSellerIndex === 0 && matchResult != null}
          sellerAmount={mainSeller?.amount ?? 0}
          sellerRemainingAmount={mainSeller?.remainingAmount ?? 0}
          setSellerAmount={(n) => setSellerSlotAt(0, (s) => ({ ...s, amount: Math.min(n, s.currentPoints) }))}
          minPointAmount={MIN_POINT_AMOUNT}
          isValidAmount={isValidAmount(mainSeller?.amount ?? 0)}
          setSellerStarted={(b) => setSellerSlotAt(0, (s) => ({ ...s, started: b }))}
          matchResult={matchedSellerIndex === 0 ? matchResult : null}
          buyerDepositDone={buyerSlot.depositDone}
          sellerConfirmed={mainSeller?.sellerConfirmed ?? false}
          setSellerConfirmed={(b) => setSellerSlotAt(0, (s) => ({ ...s, sellerConfirmed: b }))}
          displayPoints={mainSeller?.currentPoints ?? 1_000_000}
          completed={(phase === 'completed' && matchedSellerIndex === 0) || (mainSeller?.showCompletedScreen ?? false)}
          onReset={reset}
          sellerClickedNew={mainSeller?.clickedNew ?? false}
          onNewTrade={() => handleSellerNewTrade(0)}
          sellerSearchTimerSeconds={mainSeller?.searchTimerSeconds ?? simConfig.sellerSearchTimerMinutes * 60}
          rejectReason={null}
          onClearRejectReason={() => {}}
          matchConfirming={phase === 'confirming' && matchedSellerIndex === 0}
          sellerMatchConfirmed={sellerMatchConfirmed}
          buyerMatchConfirmed={buyerMatchConfirmed}
          onConfirmMatch={handleSellerConfirmMatch}
          onDeclineMatch={handleDeclineMatch}
          confirmTimerSeconds={confirmTimerSeconds}
          onRejectDeposit={() => {}}
          violationHistory={mainSeller?.violationHistory ?? []}
          memberId={mainSeller?.user.id ?? ''}
          onCancelSearch={() => handleCancelSellerSearch(0)}
        />
      </IPhoneFrame>

      {/* 판매자 화면 2~5 */}
      {sellerSlots.slice(1).map((slot, i) => {
        const sellerIndex = i + 1;
        const isMatched = matchedSellerIndex === sellerIndex;
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
              phase={isMatched ? phase : slot.showCompletedScreen ? 'completed' : slot.started ? 'searching' : 'idle'}
              sellerStarted={slot.started}
              buyerStarted={buyerStarted}
              amountsMatch={false}
              sellerAmount={slot.amount}
              sellerRemainingAmount={slot.remainingAmount > 0 ? slot.remainingAmount : slot.amount}
              setSellerAmount={(n) => setSellerSlotAt(sellerIndex, (s) => ({ ...s, amount: Math.min(n, s.currentPoints) }))}
              minPointAmount={MIN_POINT_AMOUNT}
              isValidAmount={isValidAmount(slot.amount)}
              setSellerStarted={(b) => setSellerSlotAt(sellerIndex, (s) => ({ ...s, started: b }))}
              matchResult={isMatched ? matchResult : null}
              buyerDepositDone={buyerSlot.depositDone}
              sellerConfirmed={slot.sellerConfirmed}
              setSellerConfirmed={(b) => setSellerSlotAt(sellerIndex, (s) => ({ ...s, sellerConfirmed: b }))}
              displayPoints={slot.currentPoints}
              completed={(phase === 'completed' && matchedSellerIndex === sellerIndex) || slot.showCompletedScreen}
              onReset={reset}
              sellerClickedNew={slot.clickedNew}
              onNewTrade={() => handleSellerNewTrade(sellerIndex)}
              sellerSearchTimerSeconds={slot.searchTimerSeconds}
              rejectReason={null}
              onClearRejectReason={() => {}}
              matchConfirming={phase === 'confirming' && matchedSellerIndex === sellerIndex}
              sellerMatchConfirmed={sellerMatchConfirmed}
              buyerMatchConfirmed={buyerMatchConfirmed}
              onConfirmMatch={handleSellerConfirmMatch}
              onDeclineMatch={handleDeclineMatch}
              confirmTimerSeconds={confirmTimerSeconds}
              onRejectDeposit={() => {}}
              violationHistory={slot.violationHistory}
              memberId={slot.user.id}
              onCancelSearch={() => handleCancelSellerSearch(sellerIndex)}
            />
          </IPhoneFrame>
        );
      })}
    </div>
  );
}
