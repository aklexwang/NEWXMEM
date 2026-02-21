import { useState, useEffect, useCallback, useRef } from 'react';
import { sellerSessionUser, createBuyerUserForIndex, createSellerUserForIndex } from './data/matchMock';
import type { User } from './types';
import { computeMatchResult } from './data/matchMock';

const MATCH_DELAY_MS = 2000;
const CONFIRM_DELAY_MS = 1500;
const MAX_BUYERS = 5;
const MAX_SELLERS = 5;

type SimPhase = 'idle' | 'searching' | 'confirming' | 'trading' | 'completed';

/** 판매자 한 명 분의 상태 (한 개의 판매자 화면) */
export type SellerSlot = {
  user: User;
  amount: number;
  remainingAmount: number;
  started: boolean;
  clickedNew: boolean;
  searchTimerSeconds: number;
  currentPoints: number;
};

function createInitialSellerSlot(index: number): SellerSlot {
  return {
    user: createSellerUserForIndex(index),
    amount: 0,
    remainingAmount: 0,
    started: false,
    clickedNew: false,
    searchTimerSeconds: 600,
    currentPoints: 1_000_000,
  };
}

/** 구매자 한 명 분의 상태 (한 개의 구매자 화면) */
export type BuyerSlot = {
  user: User;
  amount: number;
  started: boolean;
  depositDone: boolean;
  clickedNew: boolean;
  searchTimerSeconds: number;
  currentPoints: number;
  matchConfirmed: boolean;
};

function createInitialBuyerSlot(index: number): BuyerSlot {
  return {
    user: createBuyerUserForIndex(index),
    amount: 0,
    started: false,
    depositDone: false,
    clickedNew: false,
    searchTimerSeconds: 300,
    currentPoints: 0,
    matchConfirmed: false,
  };
}

/** 아이폰 목업 프레임: 홈바, 스크롤바 제거. 반응형: 작은 화면에서 축소. titleAction은 제목 오른쪽(숫자 옆)에 붙음. variant=buyer 시 주황 테마 */
function IPhoneFrame({
  title,
  titleAction,
  variant = 'seller',
  children,
}: {
  title: string;
  titleAction?: React.ReactNode;
  variant?: 'buyer' | 'seller';
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center w-full sm:w-auto ${variant === 'buyer' ? 'iphone-frame-buyer' : ''}`}
    >
      <div className="flex items-center justify-center gap-1.5 mb-2 sm:mb-3">
        <span className="text-slate-400 text-xs sm:text-sm font-medium font-display tracking-wider">{title}</span>
        {titleAction}
      </div>
      <div className="relative w-[280px] min-[380px]:w-[300px] sm:w-[318px] rounded-[2.25rem] min-[380px]:rounded-[2.5rem] sm:rounded-[2.75rem] p-1.5 min-[380px]:p-2 bg-slate-800/90 shadow-2xl ring-1 ring-white/10 backdrop-blur-sm">
        <div className="rounded-[1.9rem] min-[380px]:rounded-[2.1rem] sm:rounded-[2.25rem] overflow-hidden bg-slate-900/95 ring-2 ring-white/5">
          <div className="h-[484px] min-[380px]:h-[520px] sm:h-[554px] overflow-y-auto overflow-x-hidden scrollbar-hide flex flex-col bg-gradient-to-b from-slate-900/80 to-slate-800/80 px-3 min-[380px]:px-4 pt-1 sm:pt-2 pb-0">
            {children}
          </div>
          {/* 홈 바 (Home Bar) */}
          <div className="h-5 min-[380px]:h-6 sm:h-7 flex justify-center items-center bg-slate-900/98 pb-0.5 sm:pb-1">
            <div className="w-24 min-[380px]:w-28 sm:w-32 h-0.5 sm:h-1 rounded-full bg-slate-500/80" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** 홀로그램 그리드 느낌의 AU 봇 - 반투명 그리드·시안 글로우·스캔 연출 */
function AIBot() {
  return (
    <div className="flex flex-col items-center justify-center animate-bot-float">
      <div className="relative hologram-bot-wrap">
        <svg width="68" height="76" viewBox="0 0 68 76" fill="none" className="relative hologram-bot-svg" aria-hidden>
          <defs>
            {/* 홀로그램 그리드 패턴 */}
            <pattern id="hologramGrid" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M 8 0 L 0 0 0 8" fill="none" stroke="rgba(34,211,238,0.35)" strokeWidth="0.6" />
            </pattern>
            <pattern id="hologramGridDense" width="4" height="4" patternUnits="userSpaceOnUse">
              <path d="M 4 0 L 0 0 0 4" fill="none" stroke="rgba(167,139,250,0.25)" strokeWidth="0.4" />
            </pattern>
            {/* 반투명 홀로그램 그라데이션 */}
            <linearGradient id="hologramBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(34,211,238,0.22)" />
              <stop offset="50%" stopColor="rgba(139,92,246,0.18)" />
              <stop offset="100%" stopColor="rgba(236,72,153,0.15)" />
            </linearGradient>
            <linearGradient id="hologramStroke" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(34,211,238,0.7)" />
              <stop offset="100%" stopColor="rgba(244,114,182,0.5)" />
            </linearGradient>
            <filter id="ledGlow">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="hologramGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur" />
              <feFlood floodColor="#22d3ee" floodOpacity="0.25" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* 몸통: 홀로그램 그리드 + 반투명 채우기 */}
          <rect x="12" y="38" width="44" height="28" rx="8" fill="url(#hologramBody)" stroke="url(#hologramStroke)" strokeWidth="1.2" opacity="0.95" />
          <rect x="12" y="38" width="44" height="28" rx="8" fill="url(#hologramGrid)" stroke="none" opacity="0.6" />
          <line x1="34" y1="38" x2="34" y2="66" stroke="rgba(34,211,238,0.4)" strokeWidth="1" />
          {/* 가슴 패널 */}
          <rect x="22" y="44" width="24" height="16" rx="4" fill="rgba(15,23,42,0.85)" stroke="#22d3ee" strokeWidth="1" strokeOpacity="0.8" />
          <circle cx="34" cy="52" r="2.5" fill="#67e8f9" filter="url(#ledGlow)" className="animate-pulse" />
          {/* 좌우 팔 */}
          <rect x="4" y="46" width="12" height="14" rx="4" fill="url(#hologramBody)" stroke="url(#hologramStroke)" strokeWidth="1" opacity="0.9" />
          <rect x="52" y="46" width="12" height="14" rx="4" fill="url(#hologramBody)" stroke="url(#hologramStroke)" strokeWidth="1" opacity="0.9" />
          <rect x="4" y="46" width="12" height="14" rx="4" fill="url(#hologramGridDense)" stroke="none" opacity="0.5" />
          <rect x="52" y="46" width="12" height="14" rx="4" fill="url(#hologramGridDense)" stroke="none" opacity="0.5" />
          {/* 머리 */}
          <rect x="18" y="8" width="32" height="28" rx="10" fill="url(#hologramBody)" stroke="url(#hologramStroke)" strokeWidth="1.2" opacity="0.95" />
          <rect x="18" y="8" width="32" height="28" rx="10" fill="url(#hologramGrid)" stroke="none" opacity="0.55" />
          {/* 얼굴 디스플레이 */}
          <rect x="22" y="14" width="24" height="16" rx="4" fill="rgba(15,23,42,0.9)" stroke="#22d3ee" strokeWidth="1" strokeOpacity="0.75" />
          <rect x="26" y="18" width="5" height="4" rx="1" fill="#67e8f9" filter="url(#ledGlow)" />
          <rect x="37" y="18" width="5" height="4" rx="1" fill="#67e8f9" filter="url(#ledGlow)" />
          <circle cx="28" cy="20" r="0.6" fill="#f0fdfa" />
          <circle cx="40" cy="20" r="0.6" fill="#f0fdfa" />
          <rect x="28" y="25" width="12" height="2" rx="1" fill="#67e8f9" opacity="0.95" />
          {/* 안테나 */}
          <path d="M28 8 L26 0" stroke="rgba(34,211,238,0.85)" strokeWidth="2" strokeLinecap="round" />
          <path d="M40 8 L42 0" stroke="rgba(34,211,238,0.85)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="26" cy="0" r="3" fill="#67e8f9" filter="url(#ledGlow)" />
          <circle cx="42" cy="0" r="3" fill="#67e8f9" filter="url(#ledGlow)" />
        </svg>
      </div>
    </div>
  );
}

/** 홀로그램 그리드 - 실제 스캔 중인 느낌 (스캔 라인 + 데이터 읽기 연출) */
function HologramGrid() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="hologram-scan-wrapper">
        <div className="hologram-scan-line" aria-hidden />
        <div className="hologram-grid">
          {Array.from({ length: 25 }, (_, i) => (
            <span key={i} data-cell />
          ))}
        </div>
      </div>
      <p className="text-cyan-300/90 text-xs font-display tracking-widest animate-pulse">SCANNING...</p>
    </div>
  );
}

export default function App() {
  const MIN_POINT_AMOUNT = 10_000;
  /** 만원 단위만 허용 (10,000 / 20,000 / 30,000 ...). 12,000원, 10,500원 등 불가 */
  const isValidAmount = (n: number) => n >= MIN_POINT_AMOUNT && n % 10_000 === 0;
  const [sellerSlots, setSellerSlots] = useState<SellerSlot[]>(() => [createInitialSellerSlot(0)]);
  const [phase, setPhase] = useState<SimPhase>('idle');
  const [matchResult, setMatchResult] = useState<ReturnType<typeof computeMatchResult>>(null);
  const [sellerConfirmed, setSellerConfirmed] = useState(false);
  const [sellerClickedNew, setSellerClickedNew] = useState(false);

  const sellerAmount = sellerSlots[0]?.amount ?? 0;
  const sellerRemainingAmount = sellerSlots[0]?.remainingAmount ?? 0;
  const sellerStarted = sellerSlots[0]?.started ?? false;
  const sellerCurrentPoints = sellerSlots[0]?.currentPoints ?? 1_000_000;

  const setSellerSlotAt = useCallback((index: number, updater: (prev: SellerSlot) => SellerSlot) => {
    setSellerSlots((prev) => prev.map((s, i) => (i === index ? updater(s) : s)));
  }, []);

  const setSellerAmount = useCallback((n: number) => setSellerSlotAt(0, (s) => ({ ...s, amount: n })), [setSellerSlotAt]);
  const setSellerRemainingAmount = useCallback(
    (n: number | ((p: number) => number)) =>
      setSellerSlotAt(0, (s) => ({ ...s, remainingAmount: typeof n === 'function' ? n(s.remainingAmount) : n })),
    [setSellerSlotAt]
  );
  const setSellerStarted = useCallback((b: boolean) => setSellerSlotAt(0, (s) => ({ ...s, started: b })), [setSellerSlotAt]);
  const setSellerCurrentPoints = useCallback(
    (n: number | ((p: number) => number)) =>
      setSellerSlotAt(0, (s) => ({ ...s, currentPoints: typeof n === 'function' ? n(s.currentPoints) : n })),
    [setSellerSlotAt]
  );
  const sellerSearchTimerSeconds = sellerSlots[0]?.searchTimerSeconds ?? 600;
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
  const [violationHistory, setViolationHistory] = useState<Array<{ type: string; message: string }>>([]);
  const [sellerMatchConfirmed, setSellerMatchConfirmed] = useState(false);
  const [confirmTimerSeconds, setConfirmTimerSeconds] = useState(180);
  const [buyerSlots, setBuyerSlots] = useState<BuyerSlot[]>(() => [
    createInitialBuyerSlot(0),
    createInitialBuyerSlot(1),
  ]);
  const [matchedBuyerIndex, setMatchedBuyerIndex] = useState<number | null>(null);

  const matchedSlot = matchedBuyerIndex !== null ? buyerSlots[matchedBuyerIndex] : null;
  const buyerDepositDone = matchedSlot?.depositDone ?? false;
  const buyerMatchConfirmed = matchedSlot?.matchConfirmed ?? false;
  const anyBuyerStarted = buyerSlots.some((s) => s.started);
  const amountsMatch =
    matchedSlot != null &&
    Math.min(sellerRemainingAmount, matchedSlot.amount) > 0 &&
    isValidAmount(sellerRemainingAmount) &&
    isValidAmount(matchedSlot.amount);

  const setBuyerSlotAt = useCallback((index: number, updater: (prev: BuyerSlot) => BuyerSlot) => {
    setBuyerSlots((prev) => prev.map((s, i) => (i === index ? updater(s) : s)));
  }, []);

  // 판매자: AI 매칭 시작 누른 시점에 10분 타이머 시작
  const prevSellerStarted = useRef(false);
  useEffect(() => {
    if (sellerStarted && !prevSellerStarted.current) setSellerSearchTimerSeconds(600);
    prevSellerStarted.current = sellerStarted;
  }, [sellerStarted]);
  useEffect(() => {
    if (!sellerStarted) return;
    if (phase !== 'idle' && phase !== 'searching' && phase !== 'confirming' && phase !== 'trading') return;
    const id = setInterval(() => setSellerSearchTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [sellerStarted, phase]);

  // 추가 판매자 슬롯(2번째~) 검색 타이머 1초 감소
  useEffect(() => {
    const id = setInterval(() => {
      setSellerSlots((prev) =>
        prev.map((s, i) =>
          i < 1 ? s : s.started && s.searchTimerSeconds > 0 ? { ...s, searchTimerSeconds: s.searchTimerSeconds - 1 } : s
        )
      );
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // 구매자별 타이머: started인 슬롯 중 매칭된 슬롯 또는 idle일 때 1초마다 감소
  useEffect(() => {
    const id = setInterval(() => {
      setBuyerSlots((prev) =>
        prev.map((s, i) => {
          const isMatched = matchedBuyerIndex === i;
          const active =
            s.started &&
            (phase === 'idle' || phase === 'searching' || phase === 'confirming' || phase === 'trading');
          if (!active || (phase !== 'idle' && !isMatched)) return s;
          return { ...s, searchTimerSeconds: s.searchTimerSeconds > 0 ? s.searchTimerSeconds - 1 : 0 };
        })
      );
    }, 1000);
    return () => clearInterval(id);
  }, [phase, matchedBuyerIndex]);

  // 1) 판매자와 어느 한 구매자라도 매칭 가능(min > 0)이면 그 구매자와 SEARCHING (다중 매칭)
  useEffect(() => {
    if (!sellerStarted || phase !== 'idle') return;
    for (let i = 0; i < buyerSlots.length; i++) {
      const slot = buyerSlots[i];
      const matchAmount = Math.min(sellerAmount, slot.amount);
      if (slot.started && matchAmount > 0 && isValidAmount(sellerAmount) && isValidAmount(slot.amount)) {
        setSellerRemainingAmount(sellerAmount);
        setMatchedBuyerIndex(i);
        setPhase('searching');
        return;
      }
    }
  }, [sellerStarted, phase, sellerAmount, buyerSlots]);

  // 1b) SEARCHING인데 아직 매칭 상대 없을 때 (판매자 확인 후 재검색) → 매칭 가능한 구매자 찾기
  useEffect(() => {
    if (phase !== 'searching' || matchedBuyerIndex !== null || !sellerStarted || sellerRemainingAmount <= 0) return;
    for (let i = 0; i < buyerSlots.length; i++) {
      const slot = buyerSlots[i];
      const matchAmount = Math.min(sellerRemainingAmount, slot.amount);
      if (slot.started && matchAmount > 0 && isValidAmount(slot.amount)) {
        setSellerClickedNew(false);
        setMatchedBuyerIndex(i);
        return;
      }
    }
  }, [phase, matchedBuyerIndex, sellerStarted, sellerRemainingAmount, buyerSlots]);

  // 2) SEARCHING 2초 뒤 매칭 성사 → confirming (거래 금액 = min(판매 남은금액, 구매 신청금액))
  const matchSearchRef = useRef({
    sellerRemainingAmount: 0,
    matchedBuyerIndex: null as number | null,
    buyerSlots: [] as BuyerSlot[],
  });
  matchSearchRef.current = { sellerRemainingAmount, matchedBuyerIndex, buyerSlots };
  useEffect(() => {
    if (phase !== 'searching' || matchedBuyerIndex === null) return;
    const slot = buyerSlots[matchedBuyerIndex];
    const matchAmount = Math.min(sellerRemainingAmount, slot?.amount ?? 0);
    if (!sellerStarted || !slot?.started || matchAmount <= 0) return;
    const timer = setTimeout(() => {
      const { sellerRemainingAmount: rem, matchedBuyerIndex: idx, buyerSlots: slots } = matchSearchRef.current;
      if (idx === null) return;
      const s = slots[idx];
      if (!s) return;
      const result = computeMatchResult(rem, s.amount, sellerSessionUser, s.user);
      setMatchResult(result);
      setPhase('confirming');
      setSellerMatchConfirmed(false);
      setBuyerSlotAt(idx, (prev) => ({ ...prev, depositDone: false, matchConfirmed: false }));
      setSellerConfirmed(false);
    }, MATCH_DELAY_MS);
    return () => clearTimeout(timer);
    // buyerSlots 제외: 1초마다 구매자 타이머 갱신으로 인해 effect가 재실행되면 2초 타이머가 리셋되어 매칭이 안 됨
  }, [phase, matchedBuyerIndex, sellerStarted, sellerRemainingAmount, setBuyerSlotAt]);

  // 3) 양쪽 모두 매칭 확인 시 거래(trading) 단계
  useEffect(() => {
    if (phase !== 'confirming' || matchedBuyerIndex === null || !sellerMatchConfirmed) return;
    const slot = buyerSlots[matchedBuyerIndex];
    if (!slot?.matchConfirmed) return;
    setPhase('trading');
    setSellerMatchConfirmed(false);
    setBuyerSlotAt(matchedBuyerIndex, (s) => ({ ...s, matchConfirmed: false }));
  }, [phase, matchedBuyerIndex, sellerMatchConfirmed, buyerSlots, setBuyerSlotAt]);

  // trading → completed: buyerSlots 의존 제거해 타이머가 1초마다 리셋되지 않도록
  const tradingCompleteRef = useRef({ buyerSlots, matchedBuyerIndex, sellerConfirmed });
  tradingCompleteRef.current = { buyerSlots, matchedBuyerIndex, sellerConfirmed };
  useEffect(() => {
    if (phase !== 'trading' || !matchResult || matchedBuyerIndex === null) return;
    const slot = buyerSlots[matchedBuyerIndex];
    if (!slot?.depositDone || !sellerConfirmed) return;
    const total = matchResult.totalAmount;
    const idx = matchedBuyerIndex;
    const t = setTimeout(() => {
      const { buyerSlots: slots, sellerConfirmed: confirmed } = tradingCompleteRef.current;
      if (!confirmed || idx === null) return;
      const s = slots[idx];
      if (!s?.depositDone) return;
      setPhase('completed');
      setSellerCurrentPoints((prev) => prev - total);
      setSellerRemainingAmount((prev) => Math.max(0, prev - total));
      setBuyerSlotAt(idx, (prev) => ({ ...prev, currentPoints: prev.currentPoints + total, started: false, amount: 0 }));
    }, CONFIRM_DELAY_MS);
    return () => clearTimeout(t);
  }, [phase, matchResult, matchedBuyerIndex, sellerConfirmed, setBuyerSlotAt]);

  const reset = useCallback(() => {
    setSellerSlots((prev) =>
      prev.map((s, i) => (i === 0 ? { ...createInitialSellerSlot(0), user: s.user } : s))
    );
    setPhase('idle');
    setMatchResult(null);
    setSellerConfirmed(false);
    setSellerClickedNew(false);
    setSellerMatchConfirmed(false);
    setMatchedBuyerIndex(null);
    setBuyerSlots((prev) =>
      prev.map((s) => ({
        ...s,
        amount: 0,
        started: false,
        depositDone: false,
        clickedNew: false,
        matchConfirmed: false,
        searchTimerSeconds: 300,
      }))
    );
  }, []);

  /** 매칭 확인: 판매자 확인 */
  const handleSellerConfirmMatch = useCallback(() => setSellerMatchConfirmed(true), []);

  /** 매칭 확인: 구매자 확인 (해당 슬롯) */
  const handleBuyerConfirmMatch = useCallback(
    (buyerIndex: number) => setBuyerSlotAt(buyerIndex, (s) => ({ ...s, matchConfirmed: true })),
    [setBuyerSlotAt]
  );

  /** 매칭 확인 단계: 취소 시 초기 화면으로 */
  const handleDeclineMatch = useCallback(() => {
    setViolationHistory((prev) => [...prev, { type: '취소', message: '매칭 확인 시간 초과 또는 취소' }]);
    setSellerAmount(0);
    setSellerRemainingAmount(0);
    setPhase('idle');
    setMatchResult(null);
    setSellerStarted(false);
    setSellerMatchConfirmed(false);
    setMatchedBuyerIndex(null);
    setBuyerSlots((prev) =>
      prev.map((s) => ({
        ...s,
        amount: 0,
        started: false,
        depositDone: false,
        clickedNew: false,
        matchConfirmed: false,
        searchTimerSeconds: 300,
      }))
    );
  }, []);

  useEffect(() => {
    if (phase !== 'confirming') return;
    setConfirmTimerSeconds(180);
    const id = setInterval(() => setConfirmTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [phase]);
  useEffect(() => {
    if (phase === 'confirming' && confirmTimerSeconds === 0) handleDeclineMatch();
  }, [phase, confirmTimerSeconds, handleDeclineMatch]);

  /** 판매자 '확인' 클릭: 남은금액 있으면 거래완료만 닫고 재검색, 없으면 초기화 */
  const handleSellerNewTrade = useCallback(() => {
    setSellerClickedNew(true);
    if (sellerRemainingAmount > 0) {
      setPhase('searching');
      setMatchResult(null);
      setMatchedBuyerIndex(null);
      setSellerConfirmed(false);
    } else {
      setSellerAmount(0);
      setSellerRemainingAmount(0);
      setSellerStarted(false);
      const matchedSlot = matchedBuyerIndex !== null ? buyerSlots[matchedBuyerIndex] : null;
      if (matchedSlot?.clickedNew) {
        setPhase('idle');
        setMatchResult(null);
        setSellerConfirmed(false);
        setSellerClickedNew(false);
        setMatchedBuyerIndex(null);
        setBuyerSlots((prev) =>
          prev.map((s) => ({ ...s, amount: 0, started: false, depositDone: false, clickedNew: false, searchTimerSeconds: 300 }))
        );
      }
    }
  }, [matchedBuyerIndex, buyerSlots, sellerRemainingAmount]);

  /** 구매자 '새 거래' 클릭 (buyerIndex) */
  const handleBuyerNewTrade = useCallback(
    (buyerIndex: number) => {
      setBuyerSlotAt(buyerIndex, (s) => ({ ...s, clickedNew: true, amount: 0, started: false, searchTimerSeconds: 300 }));
      if (sellerClickedNew && matchedBuyerIndex === buyerIndex) {
        setPhase('idle');
        setMatchResult(null);
        setSellerConfirmed(false);
        setSellerClickedNew(false);
        setMatchedBuyerIndex(null);
        setBuyerSlots((prev) =>
          prev.map((s) => ({ ...s, amount: 0, started: false, depositDone: false, clickedNew: false, searchTimerSeconds: 300 }))
        );
      }
    },
    [sellerClickedNew, matchedBuyerIndex, setBuyerSlotAt]
  );

  /** 판매자 매칭 검색 취소 */
  const handleCancelSellerSearch = useCallback(() => {
    setSellerStarted(false);
    if (phase === 'searching') {
      setPhase('idle');
      setMatchResult(null);
      setMatchedBuyerIndex(null);
    }
  }, [phase]);

  /** 구매자 매칭 검색 취소 */
  const handleCancelBuyerSearch = useCallback(
    (buyerIndex: number) => {
      setBuyerSlotAt(buyerIndex, (s) => ({ ...s, started: false, amount: 0 }));
      if (matchedBuyerIndex === buyerIndex) {
        setPhase('idle');
        setMatchResult(null);
        setMatchedBuyerIndex(null);
      }
    },
    [matchedBuyerIndex, setBuyerSlotAt]
  );

  /** 구매자 거부 → 매칭 취소, 판매자에게 사유 모달 */
  const handleRejectMatch = useCallback(
    (buyerIndex: number, reason: string) => {
      setViolationHistory((prev) => [...prev, { type: '거부', message: `구매자 거부: ${reason}` }]);
      setRejectReason(reason);
      setSellerAmount(0);
      setSellerRemainingAmount(0);
      setPhase('idle');
      setMatchResult(null);
      setSellerStarted(false);
      setSellerConfirmed(false);
      setMatchedBuyerIndex(null);
      setBuyerSlots((prev) =>
        prev.map((s, i) =>
          i === buyerIndex
            ? { ...s, amount: 0, started: false, depositDone: false, clickedNew: false, searchTimerSeconds: 300 }
            : s
        )
      );
    },
    []
  );

  const clearRejectReason = useCallback(() => setRejectReason(null), []);

  /** 판매자 입금 거부 → 해당 구매자에게만 사유 표시 */
  const handleSellerRejectDeposit = useCallback((reason: string) => {
    const idx = matchedBuyerIndex;
    setViolationHistory((prev) => [...prev, { type: '거부', message: `판매자 입금 거부: ${reason}` }]);
    setSellerRejectDepositReason(reason);
    setSellerRejectDepositReasonBuyerIndex(idx);
    setSellerRemainingAmount(0);
    setPhase('idle');
    setMatchResult(null);
    setSellerStarted(false);
    setSellerConfirmed(false);
    setMatchedBuyerIndex(null);
    setBuyerSlots((prev) =>
      prev.map((s, i) =>
        i === idx ? { ...s, amount: 0, started: false, depositDone: false, searchTimerSeconds: 300 } : s
      )
    );
    setSellerAmount(0);
  }, [matchedBuyerIndex]);
  const clearSellerRejectDepositReason = useCallback(() => {
    setSellerRejectDepositReason(null);
    setSellerRejectDepositReasonBuyerIndex(null);
  }, []);

  /** 새 구매자 화면 추가 (최대 5개) */
  const addBuyerSlot = useCallback(() => {
    setBuyerSlots((prev) => {
      if (prev.length >= MAX_BUYERS) return prev;
      return [...prev, createInitialBuyerSlot(prev.length)];
    });
  }, []);

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
      return [...prev, createInitialSellerSlot(prev.length)];
    });
  }, []);

  /** 추가된 판매자 화면 삭제 (1번은 유지, 2~5번만 삭제 가능) */
  const removeSellerSlot = useCallback((sellerIndex: number) => {
    if (sellerIndex < 1) return;
    setSellerSlots((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== sellerIndex);
    });
  }, []);

  const sellerDisplayPoints = sellerCurrentPoints;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center mesh-bg py-4 px-3 sm:py-6 sm:px-4 md:py-8 lg:py-10 lg:px-4 overflow-auto scrollbar-hide">
      <h1 className="text-slate-300/90 text-xs sm:text-sm font-display font-medium tracking-[0.15em] sm:tracking-[0.2em] mb-4 sm:mb-6 lg:mb-8">실시간 매칭 시뮬레이터</h1>
      <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4 sm:gap-6 md:gap-8 lg:gap-12 xl:gap-16 w-full max-w-[1800px]">
        {/* 구매자 화면 1 (제목 "1" 옆에 + 버튼, 주황 테마) */}
        <IPhoneFrame
          variant="buyer"
          title="구매자 화면 1"
          titleAction={
            buyerSlots.length < MAX_BUYERS ? (
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
            phase={phase}
            buyerStarted={buyerSlots[0].started}
            sellerStarted={sellerStarted}
            showInitialScreen={!buyerSlots[0].started && matchedBuyerIndex !== 0}
            amountsMatch={matchedBuyerIndex === 0 && amountsMatch}
            buyerAmount={buyerSlots[0].amount}
            setBuyerAmount={(n) => setBuyerSlotAt(0, (s) => ({ ...s, amount: n }))}
            minPointAmount={MIN_POINT_AMOUNT}
            isValidAmount={isValidAmount(buyerSlots[0].amount)}
            setBuyerStarted={() =>
              setBuyerSlotAt(0, (s) => ({ ...s, started: true, searchTimerSeconds: 300 }))
            }
            matchResult={matchedBuyerIndex === 0 ? matchResult : null}
            buyerDepositDone={buyerSlots[0].depositDone}
            setBuyerDepositDone={(b) => setBuyerSlotAt(0, (s) => ({ ...s, depositDone: b }))}
            displayPoints={buyerSlots[0].currentPoints}
            completed={phase === 'completed' && matchedBuyerIndex === 0}
            onReset={reset}
            buyerClickedNew={buyerSlots[0].clickedNew}
            onNewTrade={() => handleBuyerNewTrade(0)}
            buyerSearchTimerSeconds={buyerSlots[0].searchTimerSeconds}
            onRejectMatch={(reason) => handleRejectMatch(0, reason)}
            rejectReasonOptions={['계좌번호 불일치', '입금자명 불일치', '은행 정검시간']}
            matchConfirming={phase === 'confirming' && matchedBuyerIndex === 0}
            sellerMatchConfirmed={sellerMatchConfirmed}
            buyerMatchConfirmed={buyerSlots[0].matchConfirmed}
            onConfirmMatch={() => handleBuyerConfirmMatch(0)}
            onDeclineMatch={handleDeclineMatch}
            confirmTimerSeconds={confirmTimerSeconds}
            sellerRejectDepositReason={
              sellerRejectDepositReasonBuyerIndex === 0 ? sellerRejectDepositReason : null
            }
            onClearSellerRejectDepositReason={clearSellerRejectDepositReason}
            violationHistory={violationHistory}
            memberId={buyerSlots[0].user.id}
            onCancelSearch={() => handleCancelBuyerSearch(0)}
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
                phase={phase}
                buyerStarted={slot.started}
                sellerStarted={sellerStarted}
                showInitialScreen={!slot.started && matchedBuyerIndex !== buyerIndex}
                amountsMatch={matchedBuyerIndex === buyerIndex && amountsMatch}
                buyerAmount={slot.amount}
                setBuyerAmount={(n) => setBuyerSlotAt(buyerIndex, (s) => ({ ...s, amount: n }))}
                minPointAmount={MIN_POINT_AMOUNT}
                isValidAmount={isValidAmount(slot.amount)}
                setBuyerStarted={() =>
                  setBuyerSlotAt(buyerIndex, (s) => ({ ...s, started: true, searchTimerSeconds: 300 }))
                }
                matchResult={matchedBuyerIndex === buyerIndex ? matchResult : null}
                buyerDepositDone={slot.depositDone}
                setBuyerDepositDone={(b) => setBuyerSlotAt(buyerIndex, (s) => ({ ...s, depositDone: b }))}
                displayPoints={slot.currentPoints}
                completed={phase === 'completed' && matchedBuyerIndex === buyerIndex}
                onReset={reset}
                buyerClickedNew={slot.clickedNew}
                onNewTrade={() => handleBuyerNewTrade(buyerIndex)}
                buyerSearchTimerSeconds={slot.searchTimerSeconds}
                onRejectMatch={(reason) => handleRejectMatch(buyerIndex, reason)}
                rejectReasonOptions={['계좌번호 불일치', '입금자명 불일치', '은행 정검시간']}
                matchConfirming={phase === 'confirming' && matchedBuyerIndex === buyerIndex}
                sellerMatchConfirmed={sellerMatchConfirmed}
                buyerMatchConfirmed={slot.matchConfirmed}
                onConfirmMatch={() => handleBuyerConfirmMatch(buyerIndex)}
                onDeclineMatch={handleDeclineMatch}
                confirmTimerSeconds={confirmTimerSeconds}
                sellerRejectDepositReason={
                  sellerRejectDepositReasonBuyerIndex === buyerIndex ? sellerRejectDepositReason : null
                }
                onClearSellerRejectDepositReason={clearSellerRejectDepositReason}
                violationHistory={violationHistory}
                memberId={slot.user.id}
                onCancelSearch={() => handleCancelBuyerSearch(buyerIndex)}
              />
            </IPhoneFrame>
          );
        })}
        {/* 판매자 화면 1 (제목 옆에 + 버튼) */}
        <IPhoneFrame
          title="판매자 화면 1"
          titleAction={
            sellerSlots.length < MAX_SELLERS ? (
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
            matchResult={matchResult}
            buyerDepositDone={buyerDepositDone}
            sellerConfirmed={sellerConfirmed}
            setSellerConfirmed={setSellerConfirmed}
            displayPoints={sellerDisplayPoints}
            completed={phase === 'completed'}
            onReset={reset}
            sellerClickedNew={sellerClickedNew}
            onNewTrade={handleSellerNewTrade}
            sellerSearchTimerSeconds={sellerSearchTimerSeconds}
            rejectReason={rejectReason}
            onClearRejectReason={clearRejectReason}
            matchConfirming={phase === 'confirming'}
            sellerMatchConfirmed={sellerMatchConfirmed}
            buyerMatchConfirmed={buyerMatchConfirmed}
            onConfirmMatch={handleSellerConfirmMatch}
            onDeclineMatch={handleDeclineMatch}
            confirmTimerSeconds={confirmTimerSeconds}
            onRejectDeposit={handleSellerRejectDeposit}
            violationHistory={violationHistory}
            memberId={sellerSlots[0]?.user.id ?? sellerSessionUser.id}
            onCancelSearch={handleCancelSellerSearch}
          />
        </IPhoneFrame>
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
                setSellerAmount={(n) => setSellerSlotAt(sellerIndex, (s) => ({ ...s, amount: n }))}
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
                onNewTrade={() => setSellerSlotAt(sellerIndex, (s) => ({ ...s, clickedNew: true, amount: 0, started: false, searchTimerSeconds: 600 }))}
                sellerSearchTimerSeconds={slot.searchTimerSeconds}
                rejectReason={null}
                onClearRejectReason={() => {}}
                matchConfirming={false}
                sellerMatchConfirmed={false}
                buyerMatchConfirmed={false}
                onConfirmMatch={() => {}}
                onDeclineMatch={() => {}}
                confirmTimerSeconds={180}
                onRejectDeposit={() => {}}
                violationHistory={[]}
                memberId={slot.user.id}
              />
            </IPhoneFrame>
          );
        })}
      </div>
    </div>
  );
}

function SellerPhoneContent({
  phase,
  sellerStarted,
  buyerStarted,
  amountsMatch,
  sellerAmount,
  sellerRemainingAmount,
  setSellerAmount,
  minPointAmount: _minPointAmount,
  isValidAmount,
  setSellerStarted,
  matchResult,
  buyerDepositDone,
  sellerConfirmed,
  setSellerConfirmed,
  displayPoints,
  completed: _completed,
  onReset,
  sellerClickedNew,
  onNewTrade,
  sellerSearchTimerSeconds,
  rejectReason,
  onClearRejectReason,
  matchConfirming,
  sellerMatchConfirmed,
  buyerMatchConfirmed,
  onConfirmMatch,
  onDeclineMatch,
  confirmTimerSeconds,
  onRejectDeposit,
  violationHistory,
  memberId,
  onCancelSearch,
}: {
  phase: SimPhase;
  sellerStarted: boolean;
  buyerStarted: boolean;
  amountsMatch: boolean;
  sellerAmount: number;
  sellerRemainingAmount: number;
  setSellerAmount: (n: number) => void;
  minPointAmount: number;
  isValidAmount: boolean;
  setSellerStarted: (b: boolean) => void;
  matchResult: ReturnType<typeof computeMatchResult>;
  buyerDepositDone: boolean;
  sellerConfirmed: boolean;
  setSellerConfirmed: (b: boolean) => void;
  displayPoints: number;
  completed: boolean;
  onReset: () => void; // passed for consistency, may be used later
  sellerClickedNew: boolean;
  onNewTrade: () => void;
  sellerSearchTimerSeconds: number;
  rejectReason: string | null;
  onClearRejectReason: () => void;
  matchConfirming: boolean;
  sellerMatchConfirmed: boolean;
  buyerMatchConfirmed: boolean;
  onConfirmMatch: () => void;
  onDeclineMatch: () => void; // passed for consistency, may be used later
  confirmTimerSeconds: number;
  onRejectDeposit: (reason: string) => void;
  violationHistory: Array<{ type: string; message: string }>;
  memberId: string;
  onCancelSearch?: () => void;
}) {
  void onReset, onDeclineMatch; // reserve for future use
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferConfirmChecked, setTransferConfirmChecked] = useState(false);
  const [showSellerRejectModal, setShowSellerRejectModal] = useState(false);
  const [sellerRejectReason, setSellerRejectReason] = useState<string | null>(null);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [lastSeenViolationCount, setLastSeenViolationCount] = useState(0);
  const hasNewViolations = violationHistory.length > lastSeenViolationCount;

  const sellerRejectReasonOptions = ['입금금액 불일치', '미입금', '입금정보 불일치'];

  const handleTransferConfirm = () => {
    if (!transferConfirmChecked) return;
    setSellerConfirmed(true);
    setShowTransferModal(false);
    setTransferConfirmChecked(false);
  };

  const showIdleInput = (phase === 'idle' && !sellerStarted) || (phase === 'completed' && sellerClickedNew && !sellerStarted);
  const showSearching = sellerStarted && (phase === 'idle' || phase === 'searching' || (phase === 'completed' && sellerClickedNew));

  return (
    <div className="relative min-h-full flex flex-col transition-all duration-300 ease-out">
      {/* 모든 화면에서 고정: 회원아이디 + 위반내역 영역 (다중 매칭 구분용) */}
      <div className="flex-shrink-0 h-10 flex items-center justify-between gap-2 px-2">
        <span className="text-slate-400 text-[10px] sm:text-xs font-display font-bold truncate min-w-0" title={memberId}>
          회원아이디 {memberId}
        </span>
        <button
          type="button"
          onClick={() => {
            setShowViolationModal(true);
            setLastSeenViolationCount(violationHistory.length);
          }}
          className={`flex-shrink-0 py-1.5 px-2.5 rounded-lg text-xs font-display text-slate-400 hover:text-cyan-400 border bg-slate-800/80 transition-colors ${hasNewViolations ? 'animate-violation-btn-blink border-red-400/60' : 'border-slate-600/60 hover:border-cyan-500/50'}`}
        >
          위반내역
        </button>
      </div>
      {(sellerStarted && phase !== 'completed') || (phase === 'completed' && !sellerClickedNew) ? (
        <div className="flex-shrink-0 px-2 py-2 border-b border-slate-700/50 bg-slate-900/50">
          <div className="text-point-glow text-sm font-display tracking-wider w-full drop-shadow-[0_0_12px_rgba(0,255,255,0.4)]">
            <div className="flex justify-between items-center">
              <span>판매금액</span>
              <span>남은금액</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span>{sellerAmount.toLocaleString('ko-KR')}원</span>
              <span>{phase === 'trading'
                ? `${Math.max(0, sellerRemainingAmount - (matchResult?.totalAmount ?? 0)).toLocaleString('ko-KR')}원`
                : `${sellerRemainingAmount.toLocaleString('ko-KR')}원`}</span>
            </div>
          </div>
        </div>
      ) : null}
      {showViolationModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 rounded-2xl">
          <div className="w-full max-w-[240px] glass-cyber p-4 border border-white/10 max-h-[80%] overflow-y-auto">
            <p className="text-slate-100 font-bold text-sm mb-3">위반내역 (취소·거부)</p>
            {violationHistory.length === 0 ? (
              <p className="text-slate-400 text-xs mb-4">취소·거부 내역이 없습니다.</p>
            ) : (
              <ul className="space-y-2 mb-4 text-xs">
                {violationHistory.map((item, i) => (
                  <li key={i} className="text-slate-300">
                    <span className="text-cyan-400 font-medium">[{item.type}]</span> {item.message}
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => setShowViolationModal(false)}
              className="w-full py-2.5 rounded-xl text-sm font-medium btn-success"
            >
              확인
            </button>
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-h-0">
      {showIdleInput && (
        <>
          <div className="flex-shrink-0">
            <section className="py-4 pt-0 mt-[1cm]">
              <div className="text-slate-400 text-xs mb-1 font-display tracking-wider">보유 포인트</div>
              <div className="text-point-glow text-3xl tracking-wider drop-shadow-[0_0_15px_rgba(0,255,255,0.5)] leading-relaxed text-right">{displayPoints.toLocaleString()} P</div>
            </section>
            <section className="py-4">
              <label className="block text-slate-400 text-xs mb-2 font-display tracking-wider">판매 포인트</label>
              <div className={`flex items-center h-14 rounded-xl overflow-hidden border bg-slate-800/60 transition-all duration-300 ${hasNewViolations ? 'border-amber-500/50 opacity-75 pointer-events-none' : 'border-slate-600/60 input-wrap-glow focus-within:border-cyan-400/60 focus-within:shadow-[0_0_0_2px_rgba(6,182,212,0.2),0_0_24px_rgba(6,182,212,0.2)]'}`}>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="10,000"
                  value={sellerAmount.toLocaleString('ko-KR')}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setSellerAmount(raw === '' ? 0 : Math.min(999_999_999, Number(raw)));
                  }}
                  disabled={hasNewViolations}
                  className="flex-1 min-w-0 h-full px-4 bg-transparent text-slate-100 text-base border-none outline-none placeholder:text-slate-500 font-display text-right disabled:cursor-not-allowed"
                />
                <span className="text-slate-400 text-sm pr-4">원</span>
              </div>
              <p className="text-slate-500 text-xs font-display mt-1.5">만원 단위만 가능합니다.</p>
              {hasNewViolations && <p className="text-amber-400/90 text-xs font-display mt-1">위반내역을 확인한 후 입력 가능합니다.</p>}
            </section>
            <section className="py-4 mt-[1cm] flex flex-col items-center">
              <AIBot />
            </section>
          </div>
          <section className="mt-auto pt-4 pb-[0.5cm]">
            <button
              type="button"
              disabled={hasNewViolations || !isValidAmount}
              onClick={() => isValidAmount && setSellerStarted(true)}
              className="btn-primary w-full text-sm h-14 font-display rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              AI 매칭 시작
            </button>
          </section>
        </>
      )}
      {showSearching && (
        <div className="flex flex-col flex-1 min-h-0 transition-opacity duration-300">
          <div className="flex flex-col items-center justify-center flex-1 min-h-0 pt-4 space-y-6">
            <p className="text-point-glow text-3xl font-display tabular-nums tracking-widest drop-shadow-[0_0_15px_rgba(0,255,255,0.6)]" style={{ marginTop: 'calc(5rem + 1cm - 2cm)' }} aria-label="매칭 제한 시간 (10분)">
              {Math.floor(sellerSearchTimerSeconds / 60)}:{(sellerSearchTimerSeconds % 60).toString().padStart(2, '0')}
            </p>
            <div className="flex flex-col items-center space-y-6 mt-20">
              <p className="text-slate-300 text-xs font-display tracking-wider">구매자를 검색하는 중입니다...</p>
              <HologramGrid />
              {phase === 'completed' && sellerClickedNew && <p className="text-slate-500 text-xs mt-2">구매자도 새 거래를 눌러 주세요</p>}
              {phase !== 'completed' && buyerStarted && !amountsMatch && <p className="text-amber-400/90 text-xs mt-2">금액을 동일하게 맞춰 주세요</p>}
            </div>
          </div>
          {onCancelSearch && (
            <section className="mt-auto pt-4 pb-[0.5cm] flex justify-center">
              <button
                type="button"
                onClick={onCancelSearch}
                className="btn-primary px-6 py-2.5 text-sm font-display rounded-xl font-medium text-white transition-colors"
              >
                취소
              </button>
            </section>
          )}
        </div>
      )}
      {matchConfirming && matchResult && (
        <div className="opacity-0 animate-fade-in flex flex-col flex-1 min-h-0 h-full min-h-[320px] sm:min-h-[420px] py-4 sm:py-6">
          <div className="space-y-4 flex-shrink-0">
            <div className="glass-card-neon p-4 leading-relaxed animate-card-border-blink">
              <div className="flex items-center justify-between gap-2">
                <p className="text-slate-400 text-xs">매칭금액</p>
                <p className="text-point-glow text-base tracking-wider drop-shadow-[0_0_12px_rgba(0,255,255,0.5)]">{matchResult.totalAmount.toLocaleString('ko-KR')}원</p>
              </div>
            </div>
            {sellerMatchConfirmed && !buyerMatchConfirmed ? (
              <p className="text-cyan-400 text-sm font-bold font-display drop-shadow-[0_0_10px_rgba(0,255,255,0.4)] text-center">상대방 확인중입니다.</p>
            ) : (
              <div className="mt-[1cm]">
                <p className="text-cyan-400 text-sm font-bold font-display drop-shadow-[0_0_10px_rgba(0,255,255,0.4)] text-center mt-[1cm]">구매자가 매칭되었습니다.</p>
                <p className="text-slate-400 text-xs text-center leading-relaxed mt-1">
                  판매를 원하실 경우 확인버튼을 눌러주세요.
                  <br />
                  시간내에 확인을 누르지 않을시
                  <br />
                  매칭은 취소됩니다.
                </p>
              </div>
            )}
          </div>
          <div className="flex-grow min-h-0" aria-hidden />
          <section className="flex-shrink-0 mt-[1cm]">
            <p className="text-point-glow text-2xl font-display tabular-nums tracking-widest drop-shadow-[0_0_12px_rgba(0,255,255,0.5)] text-center" aria-label="확인 제한 시간 (180초)">
              {Math.floor(confirmTimerSeconds / 60)}:{(confirmTimerSeconds % 60).toString().padStart(2, '0')}
            </p>
          </section>
          <div className="flex-grow min-h-0" aria-hidden />
          {!sellerMatchConfirmed && (
            <div className="flex-shrink-0 mt-auto mb-5">
              <button type="button" onClick={onConfirmMatch} className="btn-success w-full text-sm h-12 rounded-xl font-display">
                수락
              </button>
            </div>
          )}
        </div>
      )}
      {phase === 'trading' && matchResult && (
        <div className="opacity-0 animate-fade-in flex flex-col justify-between min-h-[320px] sm:min-h-[420px]">
          <div className="space-y-4 mt-[1cm]">
            <p className="text-cyan-400 text-sm font-bold font-display drop-shadow-[0_0_10px_rgba(0,255,255,0.4)] text-center animate-text-blink">
              {buyerDepositDone ? (
                <>
                  구매자가 입금하였습니다.
                  <br />
                  입금 내역을 확인하세요.
                </>
              ) : (
                '구매자의 입금을 기다리는 중입니다.'
              )}
            </p>
            <div className="glass-card-neon p-5 leading-relaxed">
              <p className="text-slate-400 text-xs mb-2 font-display tracking-wider">입금자 정보</p>
              <p className="text-slate-200 text-base font-medium leading-relaxed">{matchResult.buyers[0].bank}</p>
              <p className="text-slate-400 text-sm mt-1 leading-relaxed">예금주 {matchResult.buyers[0].holder}</p>
              <p className="text-point-glow text-xl tracking-wider mt-4 drop-shadow-[0_0_12px_rgba(0,255,255,0.5)] whitespace-nowrap">{matchResult.totalAmount.toLocaleString('ko-KR')}원</p>
            </div>
          </div>
          <section className="pt-2 pb-6 flex flex-col items-center">
            <p className="text-point-glow text-2xl font-display tabular-nums tracking-widest drop-shadow-[0_0_12px_rgba(0,255,255,0.5)] mb-4 mt-[1cm]" aria-label="매칭·입금 제한 시간 (10분)">
              {Math.floor(sellerSearchTimerSeconds / 60)}:{(sellerSearchTimerSeconds % 60).toString().padStart(2, '0')}
            </p>
            {buyerDepositDone ? (
              sellerConfirmed ? (
                <p className="text-cyan-400 text-xs font-display">확인 완료 · 거래 처리 중</p>
              ) : (
                <div className="flex gap-2 w-full mt-4">
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(true)}
                    className="btn-success flex-[2] text-sm h-14 rounded-xl font-display"
                  >
                    입금확인
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSellerRejectModal(true)}
                    className="flex-1 h-14 rounded-xl text-sm font-display font-medium bg-slate-600 text-slate-200 hover:bg-slate-500 border border-slate-500/50 transition-colors"
                  >
                    거부
                  </button>
                </div>
              )
            ) : (
              <p className="text-slate-400 text-sm font-display tracking-wider animate-pulse flex items-center justify-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400/80 animate-pulse" style={{ animationDelay: '0ms' }} />
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400/60 animate-pulse" style={{ animationDelay: '200ms' }} />
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400/40 animate-pulse" style={{ animationDelay: '400ms' }} />
              입금 대기 중...
            </p>
            )}
          </section>
          {/* 입금 확인·포인트 전송 확인 모달 - 판매자 화면 안에만 표시 */}
          {showTransferModal && matchResult && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 rounded-2xl">
              <div className="w-full max-w-[240px] glass-cyber p-4 border-2 border-red-500">
                <p className="text-slate-100 font-bold text-sm mb-3">입금확인</p>
                <div className="rounded-xl bg-slate-700/80 p-3 mb-4 text-xs">
                  <p className="text-slate-400 mb-1">전송 정보</p>
                  <p className="text-slate-200 font-medium">구매자 입금 확인</p>
                  <p className="text-slate-400 mt-1">{matchResult.buyers[0].bank} · 예금주 {matchResult.buyers[0].holder}</p>
                  <p className="text-point-glow mt-2 drop-shadow-[0_0_8px_rgba(0,255,255,0.3)]">{matchResult.totalAmount.toLocaleString('ko-KR')}원</p>
                </div>
                <label className="flex items-center gap-2 mb-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={transferConfirmChecked}
                    onChange={(e) => setTransferConfirmChecked(e.target.checked)}
                    className="rounded border-slate-500 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-slate-300 text-xs">입금을 확인하였습니다.</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowTransferModal(false); setTransferConfirmChecked(false); }}
                    className="flex-1 py-2 rounded-xl text-sm font-medium bg-slate-600 text-slate-200 hover:bg-slate-500"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleTransferConfirm}
                    disabled={!transferConfirmChecked}
                    className="flex-1 py-2 rounded-xl text-sm font-medium btn-success disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    확인
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* 판매자 입금 거부 사유 선택 모달 */}
          {showSellerRejectModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 rounded-2xl">
              <div className="w-full max-w-[240px] glass-cyber p-4 border-2 border-red-500">
                <p className="text-slate-100 font-bold text-sm mb-3">거부 사유 선택</p>
                <div className="space-y-2 mb-4">
                  {sellerRejectReasonOptions.map((option, i) => (
                    <label key={i} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="sellerRejectReason"
                        checked={sellerRejectReason === option}
                        onChange={() => setSellerRejectReason(option)}
                        className="border-slate-500 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
                      />
                      <span className="text-slate-300 text-sm">{i + 1}. {option}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowSellerRejectModal(false); setSellerRejectReason(null); }}
                    className="flex-1 py-2 rounded-xl text-sm font-medium bg-slate-600 text-slate-200 hover:bg-slate-500"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (sellerRejectReason) {
                        onRejectDeposit(sellerRejectReason);
                        setShowSellerRejectModal(false);
                        setSellerRejectReason(null);
                      }
                    }}
                    disabled={!sellerRejectReason}
                    className="flex-1 py-2 rounded-xl text-sm font-medium btn-success disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    확인
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {phase === 'completed' && !sellerClickedNew && (
        <div className="flex flex-col justify-between min-h-[320px] sm:min-h-[420px] transition-all duration-300">
          <section className="py-10 pt-0">
            <p className="text-cyan-400 text-sm font-bold font-display">거래 완료</p>
            <div className="text-point-glow text-3xl tracking-wider tabular-nums animate-count-pop drop-shadow-[0_0_15px_rgba(0,255,255,0.5)] leading-relaxed text-right mt-4">
              {(matchResult?.totalAmount ?? 0).toLocaleString()} P
            </div>
          </section>
          <section className="py-10 pb-0">
            <p className="text-slate-400 text-xs text-center font-display mb-3">
              {sellerRemainingAmount > 0 ? '확인을 누르면 남은 금액 매칭을 시작합니다.' : '모든 거래가 완료되었습니다.'}
            </p>
            <button type="button" onClick={onNewTrade} className="btn-outline w-full h-14 text-sm font-display rounded-xl">
              확인
            </button>
          </section>
        </div>
      )}
      {/* 구매자 거부 사유 알림 모달 - 판매자 화면 */}
      {rejectReason && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 rounded-2xl">
          <div className="w-full max-w-[240px] glass-cyber p-4 border-white/10">
            <p className="text-slate-100 font-bold text-sm mb-3">매칭자 거부사유</p>
            <p className="text-slate-300 text-sm mb-4">{rejectReason}</p>
            <button
              type="button"
              onClick={onClearRejectReason}
              className="w-full py-2.5 rounded-xl text-sm font-medium btn-success"
            >
              확인
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function BuyerPhoneContent({
  buyerIndex: _buyerIndex,
  phase,
  buyerStarted,
  sellerStarted,
  showInitialScreen = false,
  amountsMatch,
  buyerAmount,
  setBuyerAmount,
  minPointAmount: _minPointAmount,
  isValidAmount,
  setBuyerStarted,
  matchResult,
  buyerDepositDone,
  setBuyerDepositDone,
  displayPoints,
  completed: _completedBuyer,
  onReset,
  buyerClickedNew,
  onNewTrade,
  buyerSearchTimerSeconds,
  onRejectMatch,
  rejectReasonOptions,
  matchConfirming,
  sellerMatchConfirmed,
  buyerMatchConfirmed,
  onConfirmMatch,
  onDeclineMatch,
  confirmTimerSeconds,
  sellerRejectDepositReason,
  onClearSellerRejectDepositReason,
  violationHistory,
  memberId,
  onCancelSearch,
}: {
  buyerIndex?: number;
  phase: SimPhase;
  buyerStarted: boolean;
  sellerStarted: boolean;
  showInitialScreen?: boolean;
  amountsMatch: boolean;
  buyerAmount: number;
  setBuyerAmount: (n: number) => void;
  minPointAmount: number;
  isValidAmount: boolean;
  setBuyerStarted: (b?: boolean) => void;
  matchResult: ReturnType<typeof computeMatchResult> | null;
  buyerDepositDone: boolean;
  setBuyerDepositDone: (b: boolean) => void;
  displayPoints: number;
  completed: boolean;
  onReset: () => void;
  buyerClickedNew: boolean;
  onNewTrade: () => void;
  buyerSearchTimerSeconds: number;
  onRejectMatch: (reason: string) => void;
  rejectReasonOptions: string[];
  matchConfirming: boolean;
  sellerMatchConfirmed: boolean;
  buyerMatchConfirmed: boolean;
  onConfirmMatch: () => void;
  onDeclineMatch: () => void;
  confirmTimerSeconds: number;
  sellerRejectDepositReason: string | null;
  onClearSellerRejectDepositReason: () => void;
  violationHistory: Array<{ type: string; message: string }>;
  memberId: string;
  onCancelSearch?: () => void;
}) {
  void onReset, onDeclineMatch; // reserve for future use
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositConfirmChecked, setDepositConfirmChecked] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRejectReason, setSelectedRejectReason] = useState<string | null>(null);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [lastSeenViolationCount, setLastSeenViolationCount] = useState(0);
  const hasNewViolations = violationHistory.length > lastSeenViolationCount;

  const handleDepositConfirm = () => {
    if (!depositConfirmChecked) return;
    setBuyerDepositDone(true);
    setShowDepositModal(false);
    setDepositConfirmChecked(false);
  };

  const showIdleInput =
    (phase === 'idle' && !buyerStarted) ||
    (phase === 'completed' && buyerClickedNew) ||
    (showInitialScreen ?? false);

  return (
    <div className="relative min-h-full flex flex-col transition-all duration-300 ease-out">
      {/* 모든 화면에서 고정: 회원아이디 + 위반내역 영역 (다중 매칭 구분용) */}
      <div className="flex-shrink-0 h-10 flex items-center justify-between gap-2 px-2">
        <span className="text-slate-400 text-[10px] sm:text-xs font-display font-bold truncate min-w-0" title={memberId}>
          회원아이디 {memberId}
        </span>
        <button
          type="button"
          onClick={() => {
            setShowViolationModal(true);
            setLastSeenViolationCount(violationHistory.length);
          }}
          className={`flex-shrink-0 py-1.5 px-2.5 rounded-lg text-xs font-display text-slate-400 hover:text-cyan-400 border bg-slate-800/80 transition-colors ${hasNewViolations ? 'animate-violation-btn-blink border-red-400/60' : 'border-slate-600/60 hover:border-cyan-500/50'}`}
        >
          위반내역
        </button>
      </div>
      {(buyerStarted && phase !== 'completed') || (_completedBuyer && !buyerClickedNew) ? (
        <div className="flex-shrink-0 px-2 py-2 border-b border-slate-700/50 bg-slate-900/50">
          <div className="text-point-glow text-sm font-display tracking-wider w-full drop-shadow-[0_0_12px_rgba(0,255,255,0.4)]">
            <div className="flex justify-between items-center">
              <span>신청금액</span>
              <span>남은금액</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span>{buyerAmount.toLocaleString('ko-KR')}원</span>
              <span>{(phase === 'trading' || phase === 'completed') ? '0원' : `${buyerAmount.toLocaleString('ko-KR')}원`}</span>
            </div>
          </div>
        </div>
      ) : null}
      {showViolationModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 rounded-2xl">
          <div className="w-full max-w-[240px] glass-cyber p-4 border border-white/10 max-h-[80%] overflow-y-auto">
            <p className="text-slate-100 font-bold text-sm mb-3">위반내역 (취소·거부)</p>
            {violationHistory.length === 0 ? (
              <p className="text-slate-400 text-xs mb-4">취소·거부 내역이 없습니다.</p>
            ) : (
              <ul className="space-y-2 mb-4 text-xs">
                {violationHistory.map((item, i) => (
                  <li key={i} className="text-slate-300">
                    <span className="text-cyan-400 font-medium">[{item.type}]</span> {item.message}
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => setShowViolationModal(false)}
              className="w-full py-2.5 rounded-xl text-sm font-medium btn-success"
            >
              확인
            </button>
          </div>
        </div>
      )}
      {/* 판매자 입금 거부 사유 알림 모달 - 구매자 화면 */}
      {sellerRejectDepositReason && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 rounded-2xl">
          <div className="w-full max-w-[240px] glass-cyber p-4 border-2 border-red-500">
            <p className="text-slate-100 font-bold text-sm mb-3">판매자 거부 사유</p>
            <p className="text-slate-300 text-sm mb-4">{sellerRejectDepositReason}</p>
            <button
              type="button"
              onClick={onClearSellerRejectDepositReason}
              className="w-full py-2.5 rounded-xl text-sm font-medium btn-success"
            >
              확인
            </button>
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-h-0">
      {showIdleInput && (
        <>
          <div className="flex-shrink-0">
            <section className="py-4 pt-0 mt-[1cm]">
              <div className="text-slate-400 text-xs mb-1 font-display tracking-wider">보유 포인트</div>
              <div className="text-point-glow text-3xl tracking-wider drop-shadow-[0_0_15px_rgba(0,255,255,0.5)] leading-relaxed text-right">{displayPoints.toLocaleString()} P</div>
            </section>
            <section className="py-4">
              <label className="block text-slate-400 text-xs mb-2 font-display tracking-wider">구매포인트</label>
              <div className={`flex items-center h-14 rounded-xl overflow-hidden border bg-slate-800/60 transition-all duration-300 ${hasNewViolations ? 'border-amber-500/50 opacity-75 pointer-events-none' : 'border-slate-600/60 input-wrap-glow focus-within:border-cyan-400/60 focus-within:shadow-[0_0_0_2px_rgba(6,182,212,0.2),0_0_24px_rgba(6,182,212,0.2)]'}`}>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="10,000"
                  value={buyerAmount.toLocaleString('ko-KR')}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setBuyerAmount(raw === '' ? 0 : Math.min(999_999_999, Number(raw)));
                  }}
                  disabled={hasNewViolations}
                  className="flex-1 min-w-0 h-full px-4 bg-transparent text-slate-100 text-base border-none outline-none placeholder:text-slate-500 font-display text-right disabled:cursor-not-allowed"
                />
                <span className="text-slate-400 text-sm pr-4">원</span>
              </div>
              <p className="text-slate-500 text-xs font-display mt-1.5">만원 단위만 가능합니다.</p>
              {hasNewViolations && <p className="text-amber-400/90 text-xs font-display mt-1">위반내역을 확인한 후 입력 가능합니다.</p>}
            </section>
            <section className="py-4 mt-[1cm] flex flex-col items-center">
              <AIBot />
            </section>
          </div>
          <section className="mt-auto pt-4 pb-[0.5cm]">
            <button
              type="button"
              disabled={hasNewViolations || !isValidAmount}
              onClick={() => isValidAmount && setBuyerStarted(true)}
              className="btn-primary w-full text-sm h-14 font-display rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              AI 매칭 시작
            </button>
          </section>
        </>
      )}
      {buyerStarted && phase !== 'trading' && phase !== 'completed' && !matchConfirming && (
        <div className="flex flex-col flex-1 min-h-0 transition-opacity duration-300">
          <div className="flex flex-col items-center justify-center flex-1 min-h-0 pt-4 space-y-6">
            <p className="text-point-glow text-3xl font-display tabular-nums tracking-widest drop-shadow-[0_0_15px_rgba(0,255,255,0.6)]" style={{ marginTop: 'calc(5rem + 1cm - 2cm)' }} aria-label="매칭 제한 시간 (5분)">
              {Math.floor(buyerSearchTimerSeconds / 60)}:{(buyerSearchTimerSeconds % 60).toString().padStart(2, '0')}
            </p>
            <div className="flex flex-col items-center space-y-6 mt-20">
              <p className="text-slate-300 text-xs font-display tracking-wider">판매자를 검색하는 중입니다...</p>
              <HologramGrid />
              {sellerStarted && !amountsMatch && <p className="text-amber-400/90 text-xs mt-2">금액을 동일하게 맞춰 주세요</p>}
            </div>
          </div>
          {onCancelSearch && (
            <section className="mt-auto pt-4 pb-[0.5cm] flex justify-center">
              <button
                type="button"
                onClick={onCancelSearch}
                className="btn-primary px-6 py-2.5 text-sm font-display rounded-xl font-medium text-white transition-colors"
              >
                취소
              </button>
            </section>
          )}
        </div>
      )}
      {matchConfirming && matchResult && (
        <div className="opacity-0 animate-fade-in flex flex-col flex-1 min-h-0 h-full min-h-[320px] sm:min-h-[420px] py-4 sm:py-6">
          <div className="space-y-4 flex-shrink-0">
            <div className="glass-card-neon p-4 leading-relaxed animate-card-border-blink">
              <div className="flex items-center justify-between gap-2">
                <p className="text-slate-400 text-xs">매칭금액</p>
                <p className="text-point-glow text-base tracking-wider drop-shadow-[0_0_12px_rgba(0,255,255,0.5)]">{matchResult.totalAmount.toLocaleString('ko-KR')}원</p>
              </div>
            </div>
            {buyerMatchConfirmed && !sellerMatchConfirmed ? (
              <p className="text-cyan-400 text-sm font-bold font-display drop-shadow-[0_0_10px_rgba(0,255,255,0.4)] text-center">상대방 확인중입니다.</p>
            ) : (
              <div className="mt-[1cm]">
                <p className="text-cyan-400 text-sm font-bold font-display drop-shadow-[0_0_10px_rgba(0,255,255,0.4)] text-center mt-[1cm]">판매자가 매칭되었습니다.</p>
                <p className="text-slate-400 text-xs text-center leading-relaxed mt-1">
                  구매를 원하실 경우 확인버튼을 눌러주세요.
                  <br />
                  시간내에 확인을 누르지 않을시
                  <br />
                  매칭은 취소됩니다.
                </p>
              </div>
            )}
          </div>
          <div className="flex-grow min-h-0" aria-hidden />
          <section className="flex-shrink-0 mt-[1cm]">
            <p className="text-point-glow text-2xl font-display tabular-nums tracking-widest drop-shadow-[0_0_12px_rgba(0,255,255,0.5)] text-center" aria-label="확인 제한 시간 (180초)">
              {Math.floor(confirmTimerSeconds / 60)}:{(confirmTimerSeconds % 60).toString().padStart(2, '0')}
            </p>
          </section>
          <div className="flex-grow min-h-0" aria-hidden />
          {!buyerMatchConfirmed && (
            <div className="flex-shrink-0 mt-auto mb-5">
              <button type="button" onClick={onConfirmMatch} className="btn-success w-full text-sm h-12 rounded-xl font-display">
                수락
              </button>
            </div>
          )}
        </div>
      )}
      {phase === 'trading' && matchResult && (
        <div className="opacity-0 animate-fade-in flex flex-col justify-between min-h-[320px] sm:min-h-[420px]">
          <div className="space-y-4 mt-[1cm]">
            <p className="text-cyan-400 text-sm font-bold font-display drop-shadow-[0_0_10px_rgba(0,255,255,0.4)] text-center animate-text-blink">
              {buyerDepositDone ? '입금확인 대기중' : '입금 후, 확인버튼을 눌러주세요'}
            </p>
            <div className="glass-card-neon p-5 leading-relaxed w-full">
              <p className="text-slate-400 text-xs mb-2 font-display tracking-wider">입금정보</p>
              <p className="text-slate-200 text-base font-medium leading-relaxed">{matchResult.seller.bank}</p>
              <p className="font-mono text-slate-300 text-sm mt-1 leading-relaxed">{matchResult.seller.account}</p>
              <p className="text-slate-400 text-sm mt-1 leading-relaxed">예금주 {matchResult.seller.holder}</p>
              <p className="text-point-glow text-xl tracking-wider mt-4 drop-shadow-[0_0_12px_rgba(0,255,255,0.5)] whitespace-nowrap">{matchResult.totalAmount.toLocaleString()} P</p>
            </div>
          </div>
          <section className="py-6 flex flex-col items-center justify-center">
            <p className="text-point-glow text-2xl font-display tabular-nums tracking-widest drop-shadow-[0_0_12px_rgba(0,255,255,0.5)] mb-4 text-center" aria-label="입금 제한 시간 (5분)">
              {Math.floor(buyerSearchTimerSeconds / 60)}:{(buyerSearchTimerSeconds % 60).toString().padStart(2, '0')}
            </p>
            <div className="mt-[1cm] w-full flex flex-col items-center">
              {buyerDepositDone ? (
                <p className="text-cyan-400 text-xs font-display">입금 완료</p>
              ) : (
                <div className="flex gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => setShowDepositModal(true)}
                    className="btn-success flex-[2] text-sm h-12 rounded-xl font-display"
                  >
                    확인
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowRejectModal(true); setSelectedRejectReason(null); }}
                    className="flex-1 h-12 rounded-xl text-sm font-display font-medium bg-slate-600 text-slate-200 hover:bg-slate-500 border border-slate-500/50 transition-colors"
                  >
                    최소
                  </button>
                </div>
              )}
            </div>
          </section>
          {/* 거부 사유 선택 모달 - 구매자 화면 */}
          {showRejectModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 rounded-2xl">
              <div className="w-full max-w-[240px] glass-cyber p-4 border-white/10">
                <p className="text-slate-100 font-bold text-sm mb-3">거부 사유 선택</p>
                <div className="space-y-2 mb-4">
                  {rejectReasonOptions.map((option, i) => (
                    <label key={i} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="rejectReason"
                        checked={selectedRejectReason === option}
                        onChange={() => setSelectedRejectReason(option)}
                        className="border-slate-500 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
                      />
                      <span className="text-slate-300 text-sm">{i + 1}. {option}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowRejectModal(false); setSelectedRejectReason(null); }}
                    className="flex-1 py-2 rounded-xl text-sm font-medium bg-slate-600 text-slate-200 hover:bg-slate-500"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedRejectReason) {
                        onRejectMatch(selectedRejectReason);
                        setShowRejectModal(false);
                        setSelectedRejectReason(null);
                      }
                    }}
                    disabled={!selectedRejectReason}
                    className="flex-1 py-2 rounded-xl text-sm font-medium btn-success disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    확인
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* 입금 확인 모달 - 구매자 화면 안에만 표시 */}
          {showDepositModal && matchResult && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 rounded-2xl">
              <div className="w-full max-w-[240px] glass-cyber p-4 border-2 border-red-500">
                <p className="text-slate-100 font-bold text-sm mb-3">입금확인</p>
                <div className="rounded-xl bg-slate-700/80 p-3 mb-4 text-xs">
                  <p className="text-slate-200 font-medium">은행: {matchResult.seller.bank}</p>
                  <p className="font-mono text-slate-300 mt-1">계좌번호 {matchResult.seller.account}</p>
                  <p className="text-slate-400 mt-1">예금주: {matchResult.seller.holder}</p>
                  <p className="text-point-glow mt-2 drop-shadow-[0_0_8px_rgba(0,255,255,0.3)]">{matchResult.totalAmount.toLocaleString('ko-KR')}원</p>
                </div>
                <label className="flex items-center gap-2 mb-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={depositConfirmChecked}
                    onChange={(e) => setDepositConfirmChecked(e.target.checked)}
                    className="rounded border-slate-500 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-slate-300 text-xs">입금확인 완료</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowDepositModal(false); setDepositConfirmChecked(false); }}
                    className="flex-1 py-2 rounded-xl text-sm font-medium bg-slate-600 text-slate-200 hover:bg-slate-500"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleDepositConfirm}
                    disabled={!depositConfirmChecked}
                    className="flex-1 py-2 rounded-xl text-sm font-medium btn-success disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    확인
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {_completedBuyer && !buyerClickedNew && (
        <div className="flex flex-col justify-between min-h-[320px] sm:min-h-[420px] transition-all duration-300">
          <section className="py-10 pt-0">
            <p className="text-cyan-400 text-sm font-bold font-display">거래 완료</p>
            <div className="text-point-glow text-3xl tracking-wider tabular-nums animate-count-pop drop-shadow-[0_0_15px_rgba(0,255,255,0.5)] leading-relaxed text-right mt-4">
              {(matchResult?.totalAmount ?? 0).toLocaleString()} P
            </div>
          </section>
          <section className="py-10 pb-0">
            <button type="button" onClick={onNewTrade} className="btn-outline w-full h-14 text-sm font-display rounded-xl">
              확인
            </button>
          </section>
        </div>
      )}
      </div>
    </div>
  );
}
