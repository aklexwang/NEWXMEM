import { useState, useRef, useEffect } from 'react';
import type { SimPhase } from '../../types';
import type { MatchResult } from '../../data/matchMock';
import AIBot from './AIBot';
import HologramGrid from './HologramGrid';

export interface SellerPhoneContentProps {
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
  matchResult: MatchResult | null;
  buyerDepositDone: boolean;
  sellerConfirmed: boolean;
  setSellerConfirmed: (b: boolean) => void;
  displayPoints: number;
  completed: boolean;
  /** 거래 완료 화면에 표시할 판매된 금액(포인트). 없으면 sellerAmount - sellerRemainingAmount 사용 */
  completedSoldAmount?: number;
  onReset: () => void;
  sellerClickedNew: boolean;
  onNewTrade: () => void;
  sellerSearchTimerSeconds: number;
  rejectReason: string | null;
  onClearRejectReason: () => void;
  matchConfirming: boolean;
  /** 매칭된 구매자가 아직 참여 중(started)인지. 취소했으면 false → 확인 화면 숨김 */
  matchedBuyerActive?: boolean;
  /** 구매자 거절/취소로 확인 세션 무효화됐으면 true → 확인 화면 즉시 숨김 */
  confirmingInvalidated?: boolean;
  sellerMatchConfirmed: boolean;
  buyerMatchConfirmed: boolean;
  onConfirmMatch: () => void;
  onDeclineMatch: () => void;
  confirmTimerSeconds: number;
  onRejectDeposit: (reason: string) => void;
  /** 다중 매칭 시 건별 거부 (matchId 전달) */
  onRejectDepositMulti?: (matchId: string, reason: string) => void;
  violationHistory: Array<{ type: string; message: string }>;
  /** 위반내역 확인 모달에서 확인 클릭 시 호출 (초기 화면으로 이동). 인자 없이 호출 시 판매자 초기화 */
  onViolationConfirmed?: (buyerIndex?: number) => void;
  memberId: string;
  onCancelSearch?: () => void;
  showMatchCanceledModal?: boolean;
  onConfirmMatchCanceledModal?: () => void;
  matchCanceledModalTitle?: string;
  matchCanceledModalSubtitle?: string;
  /** 다중 동시 매칭: 거래완료 + 확인 대기 + 거래 중을 표시 순서대로 합친 목록 */
  multiOrderedMatches?: Array<
    | { kind: 'completed'; matchId: string; buyerIndex: number; amount: number }
    | { kind: 'confirming'; matchId: string; buyerIndex: number; amount: number; confirmTimerSeconds: number; buyerConfirmed: boolean; sellerConfirmed: boolean }
    | {
        kind: 'trading';
        matchId: string;
        buyerIndex: number;
        amount: number;
        buyerDepositDone: boolean;
        sellerConfirmed: boolean;
        depositTimerSeconds?: number;
        canceledReason?: 'buyer_deposit_timeout';
      }
  >;
  buyerMemberIds?: string[];
  onConfirmMatchMulti?: (matchId: string) => void;
  onDeclineMatchMulti?: (matchId: string) => void;
  onSellerConfirmDepositMulti?: (matchId: string) => void;
  /** 다중 매칭 시 입금확인 모달용 matchResult (현재 선택된 건) */
  multiTransferMatchResult?: MatchResult | null;
  onOpenTransferModal?: (matchId: string) => void;
  /** 타이머·지연 설정에서 판매자 체크 시 입금확인에 입금완료 사진첨부 버튼 표시 */
  sellerDepositPhotoEnabled?: boolean;
  /** 분쟁 발생 시 true → 분쟁 화면만 표시(어드민 풀어주기 전까지) */
  hasActiveDispute?: boolean;
}

export default function SellerPhoneContent({
  phase,
  sellerStarted,
  buyerStarted: _buyerStarted,
  amountsMatch: _amountsMatch,
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
  completedSoldAmount,
  onReset,
  sellerClickedNew,
  onNewTrade,
  sellerSearchTimerSeconds,
  rejectReason,
  onClearRejectReason,
  matchConfirming,
  matchedBuyerActive = true,
  confirmingInvalidated = false,
  sellerMatchConfirmed,
  buyerMatchConfirmed,
  onConfirmMatch,
  onDeclineMatch,
  confirmTimerSeconds,
  onRejectDeposit,
  onRejectDepositMulti,
  violationHistory,
  onViolationConfirmed,
  memberId,
  onCancelSearch,
  showMatchCanceledModal = false,
  onConfirmMatchCanceledModal,
  matchCanceledModalTitle = '매칭 미확인',
  matchCanceledModalSubtitle = '3회이상 매칭확인 거부시 이용이 중지됨',
  multiOrderedMatches,
  buyerMemberIds: _buyerMemberIds = [],
  onConfirmMatchMulti,
  onDeclineMatchMulti,
  onSellerConfirmDepositMulti,
  multiTransferMatchResult,
  onOpenTransferModal,
  sellerDepositPhotoEnabled = false,
  hasActiveDispute = false,
}: SellerPhoneContentProps) {
  void onReset, onDeclineMatch;
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferModalMatchId, setTransferModalMatchId] = useState<string | null>(null);
  const [transferConfirmChecked, setTransferConfirmChecked] = useState(false);
  /** 다중 매칭 카드 내 입금확인 2차 확인용 (모달 대신 해당 카드 안에서 처리) */
  const [inlineDepositConfirmMatchId, setInlineDepositConfirmMatchId] = useState<string | null>(null);
  /** 입금확인 클릭 시 1차 전체화면 경고 모달 (확인 시 2차 확인으로 이동) */
  const [depositWarningPending, setDepositWarningPending] = useState<{ type: 'multi'; matchId: string } | { type: 'single' } | null>(null);
  /** 경고 문구 한 글자씩 읽히는 효과용 */
  const DEPOSIT_WARNING_TEXT = '최근 입금 내역을 정확히 확인하지 않아\n발생하는 피해 사례가 급증하고 있습니다.\n\n실제 입금이 완료되지 않은 상태에서\n처리하여 발생하는 모든 금전적 손실 및\n불이익에 대한 책임은 전적으로 확인자\n본인에게 있으며, 당사는 이에 대해\n어떠한 법적 책임도 지지 않습니다.';
  const [depositWarningVisibleLen, setDepositWarningVisibleLen] = useState(0);
  useEffect(() => {
    if (!depositWarningPending) {
      setDepositWarningVisibleLen(0);
      return;
    }
    setDepositWarningVisibleLen(0);
    const fullLen = DEPOSIT_WARNING_TEXT.length;
    const interval = setInterval(() => {
      setDepositWarningVisibleLen((prev) => {
        if (prev >= fullLen) {
          clearInterval(interval);
          return fullLen;
        }
        return prev + 1;
      });
    }, 90);
    return () => clearInterval(interval);
  }, [depositWarningPending]);
  const [sellerDepositPhotoFiles, setSellerDepositPhotoFiles] = useState<File[]>([]);
  const [sellerDepositPhotoPreviewUrls, setSellerDepositPhotoPreviewUrls] = useState<string[]>([]);
  const sellerDepositPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [showSellerRejectModal, setShowSellerRejectModal] = useState(false);
  const [sellerRejectReason, setSellerRejectReason] = useState<string | null>(null);
  /** 다중 매칭에서 거부 버튼으로 연 모달일 때, 거부 대상 matchId */
  const [rejectingMatchId, setRejectingMatchId] = useState<string | null>(null);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [lastSeenViolationCount, setLastSeenViolationCount] = useState(0);
  const hasNewViolations = violationHistory.length > lastSeenViolationCount;

  /** 위반 발생 시 확인 전까지 다른 동작 불가 → 모달 자동 오픈 */
  useEffect(() => {
    if (hasNewViolations && violationHistory.length > 0) setShowViolationModal(true);
  }, [hasNewViolations, violationHistory.length]);

  const sellerRejectReasonOptions = ['입금금액 불일치', '미입금', '입금정보 불일치'];

  const handleSellerDepositPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    setSellerDepositPhotoPreviewUrls((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return files.map((f) => URL.createObjectURL(f));
    });
    setSellerDepositPhotoFiles(files);
    e.target.value = '';
  };

  const clearSellerDepositPhotos = () => {
    setSellerDepositPhotoPreviewUrls((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
    setSellerDepositPhotoFiles([]);
  };

  const handleTransferConfirm = () => {
    if (!transferConfirmChecked) return;
    if (transferModalMatchId && onSellerConfirmDepositMulti) {
      onSellerConfirmDepositMulti(transferModalMatchId);
      setTransferModalMatchId(null);
    } else {
      setSellerConfirmed(true);
    }
    setShowTransferModal(false);
    setTransferConfirmChecked(false);
    clearSellerDepositPhotos();
  };

  /** B2S(구매자1·다중판매자)에서 판매자 거래완료 화면 표시 시에는 초기 화면 숨김 */
  const showIdleInput =
    !(_completed && !sellerClickedNew) &&
    ((phase === 'idle' && !sellerStarted) || (phase === 'completed' && sellerClickedNew && !sellerStarted));
  const hasMultiCards = (multiOrderedMatches?.length ?? 0) > 0;
  const showSearching =
    sellerStarted &&
    (phase === 'idle' || phase === 'searching' || (phase === 'completed' && sellerClickedNew)) &&
    !hasMultiCards;

  const matchCanceledModalOpen = Boolean(showMatchCanceledModal && onConfirmMatchCanceledModal);
  return (
    <div className="relative min-h-full flex flex-col transition-all duration-300 ease-out">
      <div className={`flex-1 flex flex-col min-h-0 ${matchCanceledModalOpen ? 'pointer-events-none select-none' : ''}`}>
      <div className="flex-shrink-0 h-10 flex items-center justify-between gap-2 px-2">
        <span className="text-slate-400 text-[10px] sm:text-xs font-display font-bold truncate min-w-0" title={memberId}>
          회원아이디 {memberId}
        </span>
        {violationHistory.length > 0 && hasNewViolations ? (
          <button
            type="button"
            onClick={() => setShowViolationModal(true)}
            className={`flex-shrink-0 py-1.5 px-2.5 rounded-lg text-xs font-display text-slate-400 hover:text-cyan-400 border bg-slate-800/80 transition-colors ${hasNewViolations ? 'animate-violation-btn-blink border-red-400/60' : 'border-slate-600/60 hover:border-cyan-500/50'}`}
          >
            위반내역
          </button>
        ) : (
          <span className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-amber-400/10" title="위반 없음" aria-hidden>
            {/* 노란 카드(경고 카드) 느낌 - 20% 축소 */}
            <span className="w-4 h-6 rounded-sm bg-amber-400 shadow-md border border-amber-500/30 rotate-[-6deg]" />
          </span>
        )}
      </div>
      {(sellerStarted || ((phase === 'completed' || _completed) && !sellerClickedNew) || (multiOrderedMatches?.length ?? 0) > 0) ? (
        <div className="flex-shrink-0 px-2 py-2 border-b border-slate-700/50 bg-slate-900/50">
          <div className="text-point-glow text-sm font-display tracking-wider w-full drop-shadow-[0_0_12px_rgba(0,255,255,0.4)]">
            <div className="flex justify-between items-center">
              <span>판매금액</span>
              <span>남은금액</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span>{(_completed && !sellerClickedNew ? (completedSoldAmount ?? sellerAmount) : sellerAmount).toLocaleString('ko-KR')}원</span>
              <span>{_completed && !sellerClickedNew
                ? '0원'
                : phase === 'trading' && !multiOrderedMatches?.some((m) => m.kind === 'trading')
                  ? `${Math.max(0, sellerRemainingAmount - (matchResult?.totalAmount ?? 0)).toLocaleString('ko-KR')}원`
                  : `${sellerRemainingAmount.toLocaleString('ko-KR')}원`}</span>
            </div>
          </div>
        </div>
      ) : null}
      {/* 분쟁 발생 시: 어드민 풀어주기 전까지 분쟁 화면만 표시. 구매자와 동일한 상단 패딩으로 분쟁발생 위치 맞춤 */}
      {hasActiveDispute && (
        <div className="flex-1 flex flex-col items-center justify-start min-h-0 pt-24 pb-10 px-4">
          <p className="text-red-400 text-xl font-bold font-display mb-4">분쟁발생</p>
          <p className="text-slate-400 text-sm text-center whitespace-pre-line">
            관리자 확인중입니다.
            {'\n'}
            잠시만 기다려 주세요.
          </p>
        </div>
      )}
      {/* 입금확인 1차: 전체화면 경고 모달 → 확인 시 2차 확인으로 */}
      {depositWarningPending && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="flex flex-col items-center justify-center w-full max-w-[320px] mx-auto text-center rounded-2xl overflow-hidden bg-slate-900/95 border border-slate-700/50 shadow-2xl py-6">
            <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400/60 flex items-center justify-center mb-6">
              <span className="text-4xl" aria-hidden>⚠️</span>
            </div>
            <p className="text-orange-400 text-lg font-display font-bold mb-3 animate-warning-sparkle">경고</p>
            <div className="text-slate-200 text-sm leading-loose mb-8 max-h-[40vh] overflow-y-auto text-center px-1">
              <p className="min-h-[8em] text-left whitespace-pre-line">
                {DEPOSIT_WARNING_TEXT.slice(0, depositWarningVisibleLen)}
                {depositWarningVisibleLen < DEPOSIT_WARNING_TEXT.length && (
                  <span className="inline-block w-0.5 h-4 align-middle bg-amber-400 ml-0.5 animate-pulse" aria-hidden />
                )}
              </p>
            </div>
            {/* 단일 매칭(카드 1개): 타이핑 끝난 뒤에만 동의 표시. 다중 매칭(카드 2개 이상): 동의 버튼 바로 표시 */}
            {((depositWarningPending.type === 'multi' && (multiOrderedMatches?.length ?? 0) > 1) || (depositWarningVisibleLen >= DEPOSIT_WARNING_TEXT.length)) && (
              <button
                type="button"
                onClick={() => {
                  if (depositWarningPending.type === 'multi') {
                    setInlineDepositConfirmMatchId(depositWarningPending.matchId);
                    onOpenTransferModal?.(depositWarningPending.matchId);
                  } else {
                    setShowTransferModal(true);
                  }
                  setDepositWarningPending(null);
                }}
                className="w-full max-w-[200px] py-4 rounded-2xl text-base font-display font-medium text-white bg-red-500 hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.35)] hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-fade-in"
              >
                동의
              </button>
            )}
          </div>
        </div>
      )}
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
              onClick={() => {
                setLastSeenViolationCount(violationHistory.length);
                setShowViolationModal(false);
                onViolationConfirmed?.();
              }}
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
              <label className="block text-slate-400 text-xs mb-2 font-display tracking-wider">판매</label>
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
      {!hasActiveDispute && showSearching && (
        <div className="flex flex-col flex-1 min-h-0 transition-opacity duration-300">
          <div className="flex flex-col items-center justify-center flex-1 min-h-0 pt-4 space-y-6 min-h-0 overflow-auto">
            <p className="text-point-glow text-3xl font-display tabular-nums tracking-widest drop-shadow-[0_0_15px_rgba(0,255,255,0.6)]" style={{ marginTop: 'calc(5rem + 1cm - 2cm)' }} aria-label="매칭 제한 시간 (10분)">
              {Math.floor(sellerSearchTimerSeconds / 60)}:{(sellerSearchTimerSeconds % 60).toString().padStart(2, '0')}
            </p>
            <div className="flex flex-col items-center space-y-6 mt-20">
              <p className="text-slate-300 text-xs font-display tracking-wider">구매자를 검색하는 중입니다...</p>
              <HologramGrid />
            </div>
          </div>
          {onCancelSearch && (
            <section className="flex-shrink-0 mt-auto pt-4 pb-[0.5cm] flex justify-center">
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
      {/* 다중 동시 매칭: 확인 대기 카드 + 거래 중 카드 (거래 완료 전체화면일 때는 숨김 → 1:1에서 카드 중복 안 나옴) */}
      {!hasActiveDispute && multiOrderedMatches && multiOrderedMatches.length > 0 && !((phase === 'completed' || _completed) && !sellerClickedNew) ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-auto py-3 space-y-3">
          {multiOrderedMatches.map((item) =>
            item.kind === 'completed' ? (
              <div key={item.matchId} className="flex-shrink-0 rounded-xl border border-slate-600/50 bg-slate-800/50 p-3 space-y-2">
                <div className="rounded-lg bg-slate-800/80 border border-cyan-500/20 p-4 space-y-3">
                  <p className="text-cyan-400 text-sm font-bold font-display">거래 완료</p>
                  <div className="text-point-glow text-xl font-display tabular-nums drop-shadow-[0_0_10px_rgba(0,255,255,0.4)]">
                    {item.amount.toLocaleString()} P
                  </div>
                </div>
              </div>
            ) : item.kind === 'confirming' ? (
              <div
                key={item.matchId}
                className="flex-shrink-0 rounded-xl border border-slate-600/50 bg-slate-800/50 p-3 space-y-2"
              >
                <div className="flex justify-between items-center">
                  <p className="text-slate-300 text-sm">매칭금액 {item.amount.toLocaleString('ko-KR')}원</p>
                  <span className="text-cyan-400/90 text-sm font-display tabular-nums">{Math.floor(item.confirmTimerSeconds / 60)}:{(item.confirmTimerSeconds % 60).toString().padStart(2, '0')}</span>
                </div>
                <p className="text-slate-400 text-xs">
                  구매자가 매칭되었습니다.
                  <br />
                  판매를 원하시면 승인을 눌러주세요.
                </p>
                {!item.sellerConfirmed && (onConfirmMatchMulti || onDeclineMatchMulti) && (
                  <div className="flex gap-2 items-stretch">
                    {onConfirmMatchMulti && (
                      <button type="button" onClick={() => onConfirmMatchMulti(item.matchId)} className="btn-success flex-1 text-sm h-9 min-h-[2.25rem] rounded-lg font-display flex items-center justify-center py-0">
                        승인
                      </button>
                    )}
                    {onDeclineMatchMulti && (
                      <button type="button" onClick={() => onDeclineMatchMulti(item.matchId)} className="flex-1 h-9 min-h-[2.25rem] rounded-lg text-sm font-display font-medium bg-slate-600 text-slate-200 hover:bg-slate-500 border border-slate-500/50 flex items-center justify-center">
                        거절
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div
                key={item.matchId}
                className="flex-shrink-0 rounded-xl border border-slate-600/50 bg-slate-800/50 p-3 space-y-2"
              >
              <div className="flex justify-between items-center gap-2">
                <p className="text-slate-300 text-sm">매칭금액 {item.amount.toLocaleString('ko-KR')}원</p>
                {!item.canceledReason && typeof item.depositTimerSeconds === 'number' && (
                  <span className="text-cyan-400/90 text-sm font-display tabular-nums" aria-label="입금 제한 시간">
                    {Math.floor(item.depositTimerSeconds / 60)}:{(item.depositTimerSeconds % 60).toString().padStart(2, '0')}
                  </span>
                )}
              </div>
              {item.canceledReason === 'buyer_deposit_timeout' ? (
                <p className="text-amber-400/90 text-xs font-display text-center py-1">매칭이 취소되었습니다.</p>
              ) : item.buyerDepositDone ? (
                <>
                  <p className="text-cyan-400/90 text-xs font-display text-center w-full py-1.5 animate-deposit-text-twinkle drop-shadow-[0_0_12px_rgba(34,211,238,0.5)]">
                    {inlineDepositConfirmMatchId === item.matchId ? '입금을 정확히 확인하였습니까?' : '구매자가 입금하였습니다.'}
                  </p>
                  {item.sellerConfirmed ? (
                  /* 해당 건 확인 버튼 누른 뒤 카드 안에 거래완료 화면 */
                  <div className="rounded-lg bg-slate-800/80 border border-cyan-500/20 p-4 space-y-3">
                    <p className="text-cyan-400 text-sm font-bold font-display">거래 완료</p>
                    <p className="text-slate-400 text-[10px] font-display">거래된 포인트</p>
                    <div className="text-point-glow text-xl font-display tabular-nums drop-shadow-[0_0_10px_rgba(0,255,255,0.4)]">
                      {item.amount.toLocaleString()} P
                    </div>
                  </div>
                ) : inlineDepositConfirmMatchId === item.matchId ? (
                  /* 카드 안 2차 확인: 모달 없이 인라인 처리 */
                  <div className="space-y-3 pt-1">
                    {multiTransferMatchResult && (
                      <div className="rounded-lg bg-slate-700/80 p-3 text-xs">
                        <p className="text-slate-400 mb-1">입금 정보</p>
                        <p className="text-slate-200 font-medium">{multiTransferMatchResult.buyers[0].bank} · 예금주 {multiTransferMatchResult.buyers[0].holder}</p>
                      </div>
                    )}
                    {sellerDepositPhotoEnabled && (
                      <div className="flex flex-col gap-2">
                        <input
                          ref={sellerDepositPhotoInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleSellerDepositPhotoChange}
                        />
                        <button
                          type="button"
                          onClick={() => sellerDepositPhotoInputRef.current?.click()}
                          className="w-full py-2 rounded-lg text-sm font-medium border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                        >
                          입금완료 사진첨부
                        </button>
                        {sellerDepositPhotoPreviewUrls.length > 0 && (
                          <div className="flex flex-wrap gap-2 justify-center">
                            {sellerDepositPhotoPreviewUrls.slice(0, 4).map((url) => (
                              <div key={url} className="w-12 h-12 rounded overflow-hidden bg-slate-700 border border-slate-600">
                                <img src={url} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                            {sellerDepositPhotoFiles.length > 4 && (
                              <span className="text-slate-400 text-xs self-center">+{sellerDepositPhotoFiles.length - 4}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer">
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
                        onClick={() => { setInlineDepositConfirmMatchId(null); setTransferConfirmChecked(false); clearSellerDepositPhotos(); }}
                        className="flex-1 py-2 rounded-lg text-sm font-display font-medium bg-slate-600 text-slate-200 hover:bg-slate-500"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!transferConfirmChecked) return;
                          onSellerConfirmDepositMulti?.(item.matchId);
                          setInlineDepositConfirmMatchId(null);
                          setTransferConfirmChecked(false);
                          clearSellerDepositPhotos();
                        }}
                        disabled={!transferConfirmChecked || (sellerDepositPhotoEnabled && sellerDepositPhotoFiles.length === 0)}
                        className="flex-1 py-2 rounded-lg text-sm font-display font-medium bg-cyan-500 hover:bg-cyan-400 text-white border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        확인
                      </button>
                    </div>
                    </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setTransferConfirmChecked(false);
                        setDepositWarningVisibleLen(0);
                        setDepositWarningPending({ type: 'multi', matchId: item.matchId });
                      }}
                      className="flex-1 text-sm min-h-[44px] rounded-lg font-display font-medium cursor-pointer touch-manipulation select-none bg-cyan-500 hover:bg-cyan-400 text-white border-0"
                    >
                      입금확인
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRejectingMatchId(item.matchId); setShowSellerRejectModal(true); }}
                      className="flex-1 min-h-[44px] rounded-lg text-sm font-display font-medium bg-slate-600 text-slate-200 hover:bg-slate-500 border border-slate-500/50 cursor-pointer touch-manipulation"
                    >
                      거부
                    </button>
                  </div>
                )}
                </>
              ) : (
                <p className="text-slate-400 text-xs">입금 대기 중...</p>
              )}
              </div>
            )
          )}
        </div>
      ) : null}
      {!hasActiveDispute && matchConfirming && matchResult && matchedBuyerActive && !confirmingInvalidated && !(multiOrderedMatches && multiOrderedMatches.length > 0) && (
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
                  판매를 원하실 경우 승인을 눌러주세요.
                  <br />
                  시간내에 승인을 누르지 않을시
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
                승인
              </button>
            </div>
          )}
        </div>
      )}
      {!hasActiveDispute && phase === 'trading' && matchResult && !(multiOrderedMatches?.some((m) => m.kind === 'trading')) && (
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
                    onClick={() => { setDepositWarningVisibleLen(0); setDepositWarningPending({ type: 'single' }); }}
                    className="flex-[2] text-sm h-14 rounded-xl font-display font-medium bg-cyan-500 hover:bg-cyan-400 text-white border-0"
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
          {showTransferModal && !inlineDepositConfirmMatchId && (multiTransferMatchResult ?? matchResult) && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 rounded-2xl">
              <div className="w-full max-w-[240px] glass-cyber p-4 border-2 border-red-500">
                <p className="text-slate-100 font-bold text-sm mb-3">입금확인</p>
                <div className="rounded-xl bg-slate-700/80 p-3 mb-4 text-xs">
                  <p className="text-slate-400 mb-1">전송 정보</p>
                  <p className="text-slate-200 font-medium">구매자 입금 확인</p>
                  <p className="text-slate-400 mt-1">{(multiTransferMatchResult ?? matchResult)!.buyers[0].bank} · 예금주 {(multiTransferMatchResult ?? matchResult)!.buyers[0].holder}</p>
                </div>
                {sellerDepositPhotoEnabled && (
                  <div className="flex flex-col gap-2 mb-4">
                    <input
                      ref={sellerDepositPhotoInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleSellerDepositPhotoChange}
                    />
                    <button
                      type="button"
                      onClick={() => sellerDepositPhotoInputRef.current?.click()}
                      className="w-full py-2 rounded-xl text-sm font-medium border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                    >
                      입금완료 사진첨부
                    </button>
                    {sellerDepositPhotoPreviewUrls.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-center">
                        {sellerDepositPhotoPreviewUrls.slice(0, 4).map((url) => (
                          <div key={url} className="w-12 h-12 rounded overflow-hidden bg-slate-700 border border-slate-600">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                        {sellerDepositPhotoFiles.length > 4 && (
                          <span className="text-slate-400 text-xs self-center">+{sellerDepositPhotoFiles.length - 4}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
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
                    onClick={() => { setShowTransferModal(false); setTransferConfirmChecked(false); clearSellerDepositPhotos(); }}
                    className="flex-1 py-2 rounded-xl text-sm font-medium bg-slate-600 text-slate-200 hover:bg-slate-500"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleTransferConfirm}
                    disabled={!transferConfirmChecked || (sellerDepositPhotoEnabled && sellerDepositPhotoFiles.length === 0)}
                    className="flex-1 py-2 rounded-xl text-sm font-medium bg-cyan-500 hover:bg-cyan-400 text-white border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    확인
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {!hasActiveDispute && ((phase === 'completed' || _completed) && !sellerClickedNew) && (
        <div className="flex flex-col justify-between min-h-[320px] sm:min-h-[420px] transition-all duration-300">
          <section className="py-10 pt-0">
            <p className="text-cyan-400 text-sm font-bold font-display">거래 완료</p>
            <div className="text-point-glow text-3xl tracking-wider tabular-nums animate-count-pop drop-shadow-[0_0_15px_rgba(0,255,255,0.5)] leading-relaxed text-right mt-4">
              {(completedSoldAmount ?? Math.max(0, sellerAmount - sellerRemainingAmount)).toLocaleString()} P
            </div>
          </section>
          <section className="py-10 pb-0">
            <p className="text-slate-400 text-xs text-center font-display mb-3">
              모든 거래가 완료되었습니다.
            </p>
            <button type="button" onClick={onNewTrade} className="btn-outline w-full h-14 text-sm font-display rounded-xl">
              확인
            </button>
          </section>
        </div>
      )}
      {!hasActiveDispute && rejectReason && (
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
      {/* 거부 사유 모달: 단일/다중 공통 — 항상 최상위에 렌더해 다중 카드일 때도 표시 */}
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
                onClick={() => { setShowSellerRejectModal(false); setSellerRejectReason(null); setRejectingMatchId(null); }}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-slate-600 text-slate-200 hover:bg-slate-500"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  if (sellerRejectReason) {
                    if (rejectingMatchId && onRejectDepositMulti) {
                      onRejectDepositMulti(rejectingMatchId, sellerRejectReason);
                      setRejectingMatchId(null);
                    } else {
                      onRejectDeposit(sellerRejectReason);
                    }
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
      {matchCanceledModalOpen && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 rounded-2xl">
          <div className="w-full max-w-[260px] glass-cyber p-4 border border-amber-500/40 text-center">
            <p className="text-slate-100 font-bold text-sm mb-1">{matchCanceledModalTitle}</p>
            <p className="text-slate-400 text-xs mb-4">{matchCanceledModalSubtitle}</p>
            <button
              type="button"
              onClick={onConfirmMatchCanceledModal}
              className="w-full py-2.5 rounded-xl text-sm font-medium btn-success"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
