import { useState, useEffect, useCallback, useRef } from 'react';
import { sellerSessionUser, buyerSessionUser } from './data/matchMock';
import { computeMatchResult } from './data/matchMock';

const MATCH_DELAY_MS = 2000;
const CONFIRM_DELAY_MS = 1500;
const COUNT_DURATION_MS = 1200;

type SimPhase = 'idle' | 'searching' | 'confirming' | 'trading' | 'completed';

/** 아이폰 목업 프레임: 홈바, 스크롤바 제거. 반응형: 작은 화면에서 축소 */
function IPhoneFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center w-full sm:w-auto">
      <div className="text-slate-400 text-xs sm:text-sm mb-2 sm:mb-3 font-medium font-display tracking-wider">{title}</div>
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

/** 숫자 카운팅 애니메이션 */
function useCountUp(end: number, start: number, active: boolean) {
  const [value, setValue] = useState(start);
  useEffect(() => {
    if (!active) {
      setValue(start);
      return;
    }
    const startTime = Date.now();
    const tick = () => {
      const t = (Date.now() - startTime) / COUNT_DURATION_MS;
      const progress = Math.min(t, 1);
      const easeOut = 1 - Math.pow(1 - progress, 2);
      setValue(Math.round(start + (end - start) * easeOut));
      if (progress < 1) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [active, end, start]);
  return value;
}

export default function App() {
  const MIN_POINT_AMOUNT = 10_000;
  const [sellerAmount, setSellerAmount] = useState(0);
  const [buyerAmount, setBuyerAmount] = useState(0);
  const [sellerStarted, setSellerStarted] = useState(false);
  const [buyerStarted, setBuyerStarted] = useState(false);
  const [phase, setPhase] = useState<SimPhase>('idle');
  const [matchResult, setMatchResult] = useState<ReturnType<typeof computeMatchResult>>(null);
  const [buyerDepositDone, setBuyerDepositDone] = useState(false);
  const [sellerConfirmed, setSellerConfirmed] = useState(false);
  const [sellerCurrentPoints, setSellerCurrentPoints] = useState(1_000_000);
  const [buyerCurrentPoints, setBuyerCurrentPoints] = useState(0);
  const [sellerClickedNew, setSellerClickedNew] = useState(false);
  const [buyerClickedNew, setBuyerClickedNew] = useState(false);
  const [sellerSearchTimerSeconds, setSellerSearchTimerSeconds] = useState(600); // 10분, 판매자 AI매칭시작 시점부터
  const [buyerSearchTimerSeconds, setBuyerSearchTimerSeconds] = useState(300);   // 5분, 구매자 AI매칭시작 시점부터
  const [rejectReason, setRejectReason] = useState<string | null>(null); // 구매자 거부 사유 → 판매자 모달용
  const [sellerRejectDepositReason, setSellerRejectDepositReason] = useState<string | null>(null); // 판매자 입금 거부 사유 → 구매자 모달용
  const [violationHistory, setViolationHistory] = useState<Array<{ type: string; message: string }>>([]); // 취소·거부 위반내역
  const [sellerMatchConfirmed, setSellerMatchConfirmed] = useState(false); // 매칭 확인 단계: 판매자 확인
  const [buyerMatchConfirmed, setBuyerMatchConfirmed] = useState(false);   // 매칭 확인 단계: 구매자 확인
  const [confirmTimerSeconds, setConfirmTimerSeconds] = useState(180);      // 매칭 확인 180초 타이머, 만료 시 취소
  const amountsMatch = sellerAmount === buyerAmount && sellerAmount >= MIN_POINT_AMOUNT && buyerAmount >= MIN_POINT_AMOUNT;

  // 판매자: AI 매칭 시작 누른 시점에 10분 타이머 시작 (한 번만 600으로 설정)
  const prevSellerStarted = useRef(false);
  useEffect(() => {
    if (sellerStarted && !prevSellerStarted.current) setSellerSearchTimerSeconds(600);
    prevSellerStarted.current = sellerStarted;
  }, [sellerStarted]);
  useEffect(() => {
    if (!sellerStarted) return;
    if (phase !== 'idle' && phase !== 'searching' && phase !== 'confirming' && phase !== 'trading') return;
    const id = setInterval(() => {
      setSellerSearchTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [sellerStarted, phase]);

  // 구매자: AI 매칭 시작 누른 시점에 5분 타이머 시작 (한 번만 300으로 설정)
  const prevBuyerStarted = useRef(false);
  useEffect(() => {
    if (buyerStarted && !prevBuyerStarted.current) setBuyerSearchTimerSeconds(300);
    prevBuyerStarted.current = buyerStarted;
  }, [buyerStarted]);
  useEffect(() => {
    if (!buyerStarted) return;
    if (phase !== 'idle' && phase !== 'searching' && phase !== 'confirming' && phase !== 'trading') return;
    const id = setInterval(() => {
      setBuyerSearchTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [buyerStarted, phase]);

  // 1) 양쪽 모두 'AI 매칭 시작'을 눌렀고 금액이 일치하면 → 바로 SEARCHING(홀로그램 그리드)
  useEffect(() => {
    if (!sellerStarted || !buyerStarted || phase !== 'idle') return;
    if (amountsMatch) {
      setPhase('searching');
    }
  }, [sellerStarted, buyerStarted, amountsMatch, phase]);

  // 2) 양쪽이 모두 SEARCHING이 되면 2초 뒤 매칭 성사 → 확인 단계(confirming)로
  useEffect(() => {
    if (phase !== 'searching' || !sellerStarted || !buyerStarted || !amountsMatch) return;
    const timer = setTimeout(() => {
      const result = computeMatchResult(sellerAmount, buyerAmount, sellerSessionUser, buyerSessionUser);
      setMatchResult(result);
      setPhase('confirming');
      setSellerMatchConfirmed(false);
      setBuyerMatchConfirmed(false);
      setBuyerDepositDone(false);
      setSellerConfirmed(false);
    }, MATCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [phase, sellerStarted, buyerStarted, amountsMatch, sellerAmount, buyerAmount]);

  // 3) 양쪽 모두 매칭 확인을 누르면 거래(trading) 단계로
  useEffect(() => {
    if (phase !== 'confirming' || !sellerMatchConfirmed || !buyerMatchConfirmed) return;
    setPhase('trading');
    setSellerMatchConfirmed(false);
    setBuyerMatchConfirmed(false);
  }, [phase, sellerMatchConfirmed, buyerMatchConfirmed]);

  useEffect(() => {
    if (phase !== 'trading' || !matchResult) return;
    if (buyerDepositDone && sellerConfirmed) {
      const total = matchResult.totalAmount;
      const t = setTimeout(() => {
        setPhase('completed');
        setSellerCurrentPoints((prev) => prev - total);
        setBuyerCurrentPoints((prev) => prev + total);
      }, CONFIRM_DELAY_MS);
      return () => clearTimeout(t);
    }
  }, [phase, matchResult, buyerDepositDone, sellerConfirmed]);

  const reset = useCallback(() => {
    setSellerAmount(0);
    setBuyerAmount(0);
    setSellerStarted(false);
    setBuyerStarted(false);
    setPhase('idle');
    setMatchResult(null);
    setBuyerDepositDone(false);
    setSellerConfirmed(false);
    setSellerClickedNew(false);
    setBuyerClickedNew(false);
    setSellerMatchConfirmed(false);
    setBuyerMatchConfirmed(false);
  }, []);

  /** 매칭 확인 단계: 판매자/구매자가 '거래 진행' 선택 */
  const handleSellerConfirmMatch = useCallback(() => setSellerMatchConfirmed(true), []);
  const handleBuyerConfirmMatch = useCallback(() => setBuyerMatchConfirmed(true), []);

  /** 매칭 확인 단계: 취소 시 초기 화면으로 (타이머 만료 또는 사용자 취소) */
  const handleDeclineMatch = useCallback(() => {
    setViolationHistory((prev) => [...prev, { type: '취소', message: '매칭 확인 시간 초과 또는 취소' }]);
    setSellerAmount(0);
    setBuyerAmount(0);
    setPhase('idle');
    setMatchResult(null);
    setSellerStarted(false);
    setBuyerStarted(false);
    setSellerMatchConfirmed(false);
    setBuyerMatchConfirmed(false);
  }, []);

  // 매칭 확인 180초 타이머: confirming 진입 시 180으로 설정, 1초마다 감소, 0이 되면 자동 취소
  useEffect(() => {
    if (phase !== 'confirming') return;
    setConfirmTimerSeconds(180);
    const id = setInterval(() => {
      setConfirmTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);
  useEffect(() => {
    if (phase === 'confirming' && confirmTimerSeconds === 0) {
      handleDeclineMatch();
    }
  }, [phase, confirmTimerSeconds, handleDeclineMatch]);

  /** 판매자가 '새 거래' 클릭 → 판매자만 새매칭 화면으로, 금액 0. 둘 다 눌렀으면 전체 초기화 */
  const handleSellerNewTrade = useCallback(() => {
    setSellerClickedNew(true);
    setSellerAmount(0);
    setSellerStarted(false);
    if (buyerClickedNew) {
      setBuyerAmount(0);
      setPhase('idle');
      setMatchResult(null);
      setBuyerDepositDone(false);
      setSellerConfirmed(false);
      setSellerClickedNew(false);
      setBuyerClickedNew(false);
    }
  }, [buyerClickedNew]);

  /** 구매자가 '새 거래' 클릭 → 구매자만 새매칭 화면으로, 금액 0. 둘 다 눌렀으면 전체 초기화 */
  const handleBuyerNewTrade = useCallback(() => {
    setBuyerClickedNew(true);
    setBuyerAmount(0);
    setBuyerStarted(false);
    if (sellerClickedNew) {
      setSellerAmount(0);
      setPhase('idle');
      setMatchResult(null);
      setBuyerDepositDone(false);
      setSellerConfirmed(false);
      setSellerClickedNew(false);
      setBuyerClickedNew(false);
    }
  }, [sellerClickedNew]);

  /** 구매자가 거부 사유 선택 후 확인 → 사유 저장, 매칭 취소 후 판매자에게 사유 모달 표시 */
  const handleRejectMatch = useCallback((reason: string) => {
    setViolationHistory((prev) => [...prev, { type: '거부', message: `구매자 거부: ${reason}` }]);
    setRejectReason(reason);
    setSellerAmount(0);
    setBuyerAmount(0);
    setPhase('idle');
    setMatchResult(null);
    setBuyerDepositDone(false);
    setSellerConfirmed(false);
    setSellerStarted(false);
    setBuyerStarted(false);
  }, []);

  /** 판매자가 거부 사유 모달에서 확인 → 사유 초기화 */
  const clearRejectReason = useCallback(() => {
    setRejectReason(null);
  }, []);

  /** 판매자가 입금 확인 거부(사유 선택 후 확인) → 사유를 구매자에게 표시, 둘 다 첫화면·포인트 입력 0 */
  const handleSellerRejectDeposit = useCallback((reason: string) => {
    setViolationHistory((prev) => [...prev, { type: '거부', message: `판매자 입금 거부: ${reason}` }]);
    setSellerRejectDepositReason(reason);
    setPhase('idle');
    setMatchResult(null);
    setSellerStarted(false);
    setBuyerStarted(false);
    setBuyerDepositDone(false);
    setSellerConfirmed(false);
    setSellerAmount(0);
    setBuyerAmount(0);
  }, []);
  const clearSellerRejectDepositReason = useCallback(() => setSellerRejectDepositReason(null), []);

  const sellerDisplayPoints = sellerCurrentPoints;
  const buyerDisplayPoints = buyerCurrentPoints;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center mesh-bg py-4 px-3 sm:py-6 sm:px-4 md:py-8 lg:py-10 lg:px-4 overflow-auto scrollbar-hide">
      <h1 className="text-slate-300/90 text-xs sm:text-sm font-display font-medium tracking-[0.15em] sm:tracking-[0.2em] mb-4 sm:mb-6 lg:mb-8">실시간 매칭 시뮬레이터</h1>
      <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4 sm:gap-6 md:gap-8 lg:gap-12 xl:gap-16 w-full max-w-[1800px]">
        {/* 왼쪽 아이폰: 판매자 */}
        <IPhoneFrame title="판매자 화면">
          <SellerPhoneContent
            phase={phase}
            sellerStarted={sellerStarted}
            buyerStarted={buyerStarted}
            amountsMatch={amountsMatch}
            sellerAmount={sellerAmount}
            setSellerAmount={setSellerAmount}
            minPointAmount={MIN_POINT_AMOUNT}
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
          />
        </IPhoneFrame>

        {/* 오른쪽 아이폰: 구매자 */}
        <IPhoneFrame title="구매자 화면">
          <BuyerPhoneContent
            phase={phase}
            buyerStarted={buyerStarted}
            sellerStarted={sellerStarted}
            amountsMatch={amountsMatch}
            buyerAmount={buyerAmount}
            setBuyerAmount={setBuyerAmount}
            minPointAmount={MIN_POINT_AMOUNT}
            setBuyerStarted={setBuyerStarted}
            matchResult={matchResult}
            buyerDepositDone={buyerDepositDone}
            setBuyerDepositDone={setBuyerDepositDone}
            displayPoints={buyerDisplayPoints}
            completed={phase === 'completed'}
            onReset={reset}
            buyerClickedNew={buyerClickedNew}
            onNewTrade={handleBuyerNewTrade}
            buyerSearchTimerSeconds={buyerSearchTimerSeconds}
            onRejectMatch={handleRejectMatch}
            rejectReasonOptions={['계좌번호 불일치', '입금자명 불일치', '은행 정검시간']}
            matchConfirming={phase === 'confirming'}
            sellerMatchConfirmed={sellerMatchConfirmed}
            buyerMatchConfirmed={buyerMatchConfirmed}
            onConfirmMatch={handleBuyerConfirmMatch}
            onDeclineMatch={handleDeclineMatch}
            confirmTimerSeconds={confirmTimerSeconds}
            sellerRejectDepositReason={sellerRejectDepositReason}
            onClearSellerRejectDepositReason={clearSellerRejectDepositReason}
            violationHistory={violationHistory}
          />
        </IPhoneFrame>
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
  setSellerAmount,
  minPointAmount,
  setSellerStarted,
  matchResult,
  buyerDepositDone,
  sellerConfirmed,
  setSellerConfirmed,
  displayPoints,
  completed,
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
}: {
  phase: SimPhase;
  sellerStarted: boolean;
  buyerStarted: boolean;
  amountsMatch: boolean;
  sellerAmount: number;
  setSellerAmount: (n: number) => void;
  minPointAmount: number;
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
}) {
  void onReset, onDeclineMatch; // reserve for future use
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferConfirmChecked, setTransferConfirmChecked] = useState(false);
  const [showSellerRejectModal, setShowSellerRejectModal] = useState(false);
  const [sellerRejectReason, setSellerRejectReason] = useState<string | null>(null);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const countUp = useCountUp(displayPoints, displayPoints + (matchResult?.totalAmount ?? 0), completed);

  const sellerRejectReasonOptions = ['입금금액 불일치', '미입금', '입금정보 불일치'];
  const displayValue = completed ? countUp : displayPoints;

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
      {/* 모든 화면에서 고정: 오른쪽 상단 위반내역 영역 */}
      <div className="flex-shrink-0 h-10 flex items-center justify-end px-2">
        <button
          type="button"
          onClick={() => setShowViolationModal(true)}
          className="py-1.5 px-2.5 rounded-lg text-xs font-display text-slate-400 hover:text-cyan-400 border border-slate-600/60 hover:border-cyan-500/50 bg-slate-800/80 transition-colors"
        >
          위반내역
        </button>
      </div>
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
              <div className="flex items-center h-14 rounded-xl overflow-hidden border border-slate-600/60 bg-slate-800/60 transition-all duration-300 input-wrap-glow focus-within:border-cyan-400/60 focus-within:shadow-[0_0_0_2px_rgba(6,182,212,0.2),0_0_24px_rgba(6,182,212,0.2)]">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="10,000"
                  value={sellerAmount.toLocaleString('ko-KR')}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setSellerAmount(raw === '' ? 0 : Math.min(999_999_999, Number(raw)));
                  }}
                  className="flex-1 min-w-0 h-full px-4 bg-transparent text-slate-100 text-base border-none outline-none placeholder:text-slate-500 font-display text-right"
                />
                <span className="text-slate-400 text-sm pr-4">원</span>
              </div>
              {sellerAmount > 0 && sellerAmount < 10000 && (
                <p className="sr-only text-xs font-display">10,000부터 가능합니다.</p>
              )}
            </section>
            <section className="py-4 mt-[1cm] flex flex-col items-center">
              <AIBot />
            </section>
          </div>
          <section className="mt-auto pt-4 pb-[0.5cm]">
            <button
              type="button"
              disabled={sellerAmount < minPointAmount}
              onClick={() => sellerAmount >= minPointAmount && setSellerStarted(true)}
              className="btn-primary w-full text-sm h-14 font-display rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              AI 매칭 시작
            </button>
          </section>
        </>
      )}
      {showSearching && (
        <div className="min-h-[320px] sm:min-h-[420px] flex flex-col items-center justify-center py-6 sm:py-10 transition-opacity duration-300 space-y-6">
          <p className="text-point-glow text-3xl font-display tabular-nums tracking-widest drop-shadow-[0_0_15px_rgba(0,255,255,0.6)]" aria-label="매칭 제한 시간 (10분)">
            {Math.floor(sellerSearchTimerSeconds / 60)}:{(sellerSearchTimerSeconds % 60).toString().padStart(2, '0')}
          </p>
          <p className="text-slate-300 text-xs font-display tracking-wider">매칭자를 찾고 있습니다...</p>
          <HologramGrid />
          {phase === 'completed' && sellerClickedNew && <p className="text-slate-500 text-xs mt-2">구매자도 새 거래를 눌러 주세요</p>}
          {phase !== 'completed' && buyerStarted && !amountsMatch && <p className="text-amber-400/90 text-xs mt-2">금액을 동일하게 맞춰 주세요</p>}
        </div>
      )}
      {matchConfirming && matchResult && (
        <div className="opacity-0 animate-fade-in flex flex-col flex-1 min-h-0 h-full min-h-[320px] sm:min-h-[420px] py-4 sm:py-6">
          <div className="space-y-4 flex-shrink-0">
            <div className="glass-card-neon p-4 leading-relaxed">
              <p className="text-slate-400 text-xs mb-1 font-display tracking-wider">매칭 금액</p>
              <p className="text-point-glow text-2xl tracking-wider drop-shadow-[0_0_12px_rgba(0,255,255,0.5)]">{matchResult.totalAmount.toLocaleString('ko-KR')} 원</p>
              <p className="text-slate-400 text-xs mt-2">구매자 확인 {buyerMatchConfirmed ? '완료' : '대기 중...'}</p>
            </div>
            {sellerMatchConfirmed && !buyerMatchConfirmed ? (
              <p className="text-cyan-400 text-sm font-bold font-display drop-shadow-[0_0_10px_rgba(0,255,255,0.4)] text-center">상대방 확인중입니다.</p>
            ) : (
              <>
                <p className="text-cyan-400 text-sm font-bold font-display drop-shadow-[0_0_10px_rgba(0,255,255,0.4)] text-center">구매자가 매칭되었습니다.</p>
                <p className="text-slate-400 text-xs text-center leading-relaxed mt-1">
                  판매를 원하실 경우 확인버튼을 눌러주세요.
                  <br />
                  시간내에 확인을 누르지 않을시
                  <br />
                  매칭은 취소됩니다.
                </p>
              </>
            )}
          </div>
          <div className="flex-grow min-h-0" aria-hidden />
          <section className="flex-shrink-0">
            <p className="text-point-glow text-2xl font-display tabular-nums tracking-widest drop-shadow-[0_0_12px_rgba(0,255,255,0.5)] text-center" aria-label="확인 제한 시간 (180초)">
              {Math.floor(confirmTimerSeconds / 60)}:{(confirmTimerSeconds % 60).toString().padStart(2, '0')}
            </p>
          </section>
          <div className="flex-grow min-h-0" aria-hidden />
          {!sellerMatchConfirmed && (
            <div className="flex-shrink-0 mt-auto mb-5">
              <button type="button" onClick={onConfirmMatch} className="btn-success w-full text-sm h-12 rounded-xl font-display">
                확인
              </button>
            </div>
          )}
        </div>
      )}
      {phase === 'trading' && matchResult && (
        <div className="opacity-0 animate-fade-in flex flex-col justify-between min-h-[320px] sm:min-h-[420px]">
          <div className="space-y-4 mt-[1cm]">
            <p className="text-cyan-400 text-sm font-bold font-display drop-shadow-[0_0_10px_rgba(0,255,255,0.4)] text-center animate-text-blink">
              {buyerDepositDone ? '상대방이 입금하였습니다.' : '상대방이 입금중입니다.'}
            </p>
            <div className="glass-card-neon p-5 leading-relaxed">
              <p className="text-slate-400 text-xs mb-2 font-display tracking-wider">입금자 정보</p>
              <p className="text-slate-200 text-base font-medium leading-relaxed">{matchResult.buyers[0].bank}</p>
              <p className="text-slate-400 text-sm mt-1 leading-relaxed">예금주 {matchResult.buyers[0].holder}</p>
              <p className="text-point-glow text-xl tracking-wider mt-4 drop-shadow-[0_0_12px_rgba(0,255,255,0.5)] whitespace-nowrap">{matchResult.totalAmount.toLocaleString('ko-KR')} 원</p>
            </div>
          </div>
          <section className="pt-2 pb-6 flex flex-col items-center">
            <p className="text-point-glow text-2xl font-display tabular-nums tracking-widest drop-shadow-[0_0_12px_rgba(0,255,255,0.5)] mb-4" aria-label="매칭·입금 제한 시간 (10분)">
              {Math.floor(sellerSearchTimerSeconds / 60)}:{(sellerSearchTimerSeconds % 60).toString().padStart(2, '0')}
            </p>
            {buyerDepositDone ? (
              sellerConfirmed ? (
                <p className="text-cyan-400 text-xs font-display">확인 완료 · 거래 처리 중</p>
              ) : (
                <div className="flex gap-2 w-full">
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
                  <p className="text-point-glow mt-2 drop-shadow-[0_0_8px_rgba(0,255,255,0.3)]">{matchResult.totalAmount.toLocaleString('ko-KR')} 원</p>
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
            <div className="text-slate-400 text-xs mb-1 mt-4 font-display tracking-wider">보유 포인트</div>
            <div className="text-point-glow text-3xl tracking-wider tabular-nums animate-count-pop drop-shadow-[0_0_15px_rgba(0,255,255,0.5)] leading-relaxed text-right">
              {displayValue.toLocaleString()} P
            </div>
          </section>
          <section className="py-10 pb-0">
            <button type="button" onClick={onNewTrade} className="btn-outline w-full h-14 text-sm font-display rounded-xl">
              새 거래
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
  phase,
  buyerStarted,
  sellerStarted,
  amountsMatch,
  buyerAmount,
  setBuyerAmount,
  minPointAmount,
  setBuyerStarted,
  matchResult,
  buyerDepositDone,
  setBuyerDepositDone,
  displayPoints,
  completed,
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
}: {
  phase: SimPhase;
  buyerStarted: boolean;
  sellerStarted: boolean;
  amountsMatch: boolean;
  buyerAmount: number;
  setBuyerAmount: (n: number) => void;
  minPointAmount: number;
  setBuyerStarted: (b: boolean) => void;
  matchResult: ReturnType<typeof computeMatchResult>;
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
}) {
  void onReset, onDeclineMatch; // reserve for future use
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositConfirmChecked, setDepositConfirmChecked] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRejectReason, setSelectedRejectReason] = useState<string | null>(null);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const countUp = useCountUp(displayPoints, displayPoints - (matchResult?.totalAmount ?? 0), completed);
  const displayValue = completed ? countUp : displayPoints;

  const handleDepositConfirm = () => {
    if (!depositConfirmChecked) return;
    setBuyerDepositDone(true);
    setShowDepositModal(false);
    setDepositConfirmChecked(false);
  };

  const showIdleInput = (phase === 'idle' && !buyerStarted) || (phase === 'completed' && buyerClickedNew);

  return (
    <div className="relative min-h-full flex flex-col transition-all duration-300 ease-out">
      {/* 모든 화면에서 고정: 오른쪽 상단 위반내역 영역 */}
      <div className="flex-shrink-0 h-10 flex items-center justify-end px-2">
        <button
          type="button"
          onClick={() => setShowViolationModal(true)}
          className="py-1.5 px-2.5 rounded-lg text-xs font-display text-slate-400 hover:text-cyan-400 border border-slate-600/60 hover:border-cyan-500/50 bg-slate-800/80 transition-colors"
        >
          위반내역
        </button>
      </div>
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
              <div className="flex items-center h-14 rounded-xl overflow-hidden border border-slate-600/60 bg-slate-800/60 transition-all duration-300 input-wrap-glow focus-within:border-cyan-400/60 focus-within:shadow-[0_0_0_2px_rgba(6,182,212,0.2),0_0_24px_rgba(6,182,212,0.2)]">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="10,000"
                  value={buyerAmount.toLocaleString('ko-KR')}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setBuyerAmount(raw === '' ? 0 : Math.min(999_999_999, Number(raw)));
                  }}
                  className="flex-1 min-w-0 h-full px-4 bg-transparent text-slate-100 text-base border-none outline-none placeholder:text-slate-500 font-display text-right"
                />
                <span className="text-slate-400 text-sm pr-4">원</span>
              </div>
              {buyerAmount > 0 && buyerAmount < 10000 && (
                <p className="sr-only text-xs font-display">10,000부터 가능합니다.</p>
              )}
            </section>
            <section className="py-4 mt-[1cm] flex flex-col items-center">
              <AIBot />
            </section>
          </div>
          <section className="mt-auto pt-4 pb-[0.5cm]">
            <button
              type="button"
              disabled={buyerAmount < minPointAmount}
              onClick={() => buyerAmount >= minPointAmount && setBuyerStarted(true)}
              className="btn-primary w-full text-sm h-14 font-display rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              AI 매칭 시작
            </button>
          </section>
        </>
      )}
      {buyerStarted && phase !== 'trading' && phase !== 'completed' && !matchConfirming && (
        <div className="min-h-[320px] sm:min-h-[420px] flex flex-col items-center justify-center py-6 sm:py-10 transition-opacity duration-300 space-y-6">
          <p className="text-point-glow text-3xl font-display tabular-nums tracking-widest drop-shadow-[0_0_15px_rgba(0,255,255,0.6)]" aria-label="매칭 제한 시간 (5분)">
            {Math.floor(buyerSearchTimerSeconds / 60)}:{(buyerSearchTimerSeconds % 60).toString().padStart(2, '0')}
          </p>
          <p className="text-slate-300 text-xs font-display tracking-wider">매칭자를 찾고 있습니다...</p>
          <HologramGrid />
          {sellerStarted && !amountsMatch && <p className="text-amber-400/90 text-xs mt-2">금액을 동일하게 맞춰 주세요</p>}
        </div>
      )}
      {matchConfirming && matchResult && (
        <div className="opacity-0 animate-fade-in flex flex-col flex-1 min-h-0 h-full min-h-[320px] sm:min-h-[420px] py-4 sm:py-6">
          <div className="space-y-4 flex-shrink-0">
            <div className="glass-card-neon p-4 leading-relaxed">
              <p className="text-slate-400 text-xs mb-1 font-display tracking-wider">매칭 금액</p>
              <p className="text-point-glow text-2xl tracking-wider drop-shadow-[0_0_12px_rgba(0,255,255,0.5)]">{matchResult.totalAmount.toLocaleString('ko-KR')} 원</p>
              <p className="text-slate-400 text-xs mt-2">판매자 확인 {sellerMatchConfirmed ? '완료' : '대기 중...'}</p>
            </div>
            {buyerMatchConfirmed && !sellerMatchConfirmed ? (
              <p className="text-cyan-400 text-sm font-bold font-display drop-shadow-[0_0_10px_rgba(0,255,255,0.4)] text-center">상대방 확인중입니다.</p>
            ) : (
              <>
                <p className="text-cyan-400 text-sm font-bold font-display drop-shadow-[0_0_10px_rgba(0,255,255,0.4)] text-center">판매자가 매칭되었습니다.</p>
                <p className="text-slate-400 text-xs text-center leading-relaxed mt-1">
                  구매를 원하실 경우 확인버튼을 눌러주세요.
                  <br />
                  시간내에 확인을 누르지 않을시
                  <br />
                  매칭은 취소됩니다.
                </p>
              </>
            )}
          </div>
          <div className="flex-grow min-h-0" aria-hidden />
          <section className="flex-shrink-0">
            <p className="text-point-glow text-2xl font-display tabular-nums tracking-widest drop-shadow-[0_0_12px_rgba(0,255,255,0.5)] text-center" aria-label="확인 제한 시간 (180초)">
              {Math.floor(confirmTimerSeconds / 60)}:{(confirmTimerSeconds % 60).toString().padStart(2, '0')}
            </p>
          </section>
          <div className="flex-grow min-h-0" aria-hidden />
          {!buyerMatchConfirmed && (
            <div className="flex-shrink-0 mt-auto mb-5">
              <button type="button" onClick={onConfirmMatch} className="btn-success w-full text-sm h-12 rounded-xl font-display">
                확인
              </button>
            </div>
          )}
        </div>
      )}
      {phase === 'trading' && matchResult && (
        <div className="opacity-0 animate-fade-in flex flex-col justify-between min-h-[320px] sm:min-h-[420px]">
          <div className="space-y-4 mt-[1cm]">
            <p className="text-cyan-400 text-sm font-bold font-display drop-shadow-[0_0_10px_rgba(0,255,255,0.4)] text-center animate-text-blink">
              {buyerDepositDone ? '입금확인 대기중' : '입금을 하세요'}
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
            <div className="mt-[2cm] w-full flex flex-col items-center">
              {buyerDepositDone ? (
                <p className="text-cyan-400 text-xs font-display">입금 완료</p>
              ) : (
                <div className="flex gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => setShowDepositModal(true)}
                    className="btn-success flex-[2] text-sm h-12 rounded-xl font-display"
                  >
                    입금 완료
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowRejectModal(true); setSelectedRejectReason(null); }}
                    className="flex-1 h-12 rounded-xl text-sm font-display font-medium bg-slate-600 text-slate-200 hover:bg-slate-500 border border-slate-500/50 transition-colors"
                  >
                    거부
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
                  <p className="text-point-glow mt-2 drop-shadow-[0_0_8px_rgba(0,255,255,0.3)]">{matchResult.totalAmount.toLocaleString('ko-KR')} 원</p>
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
      {phase === 'completed' && !buyerClickedNew && (
        <div className="flex flex-col justify-between min-h-[320px] sm:min-h-[420px] transition-all duration-300">
          <section className="py-10 pt-0">
            <p className="text-cyan-400 text-sm font-bold font-display">거래 완료</p>
            <div className="text-slate-400 text-xs mb-1 mt-4 font-display tracking-wider">보유 포인트</div>
            <div className="text-point-glow text-3xl tracking-wider tabular-nums animate-count-pop drop-shadow-[0_0_15px_rgba(0,255,255,0.5)] leading-relaxed text-right">
              {displayValue.toLocaleString()} P
            </div>
          </section>
          <section className="py-10 pb-0">
            <button type="button" onClick={onNewTrade} className="btn-outline w-full h-14 text-sm font-display rounded-xl">
              새 거래
            </button>
          </section>
        </div>
      )}
      </div>
    </div>
  );
}
