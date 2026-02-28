import { useState, useRef, useEffect } from 'react';
import type { SimPhase } from '../../types';
import type { MatchResult } from '../../data/matchMock';
import AIBot from './AIBot';
import HologramGrid from './HologramGrid';

export interface BuyerPhoneContentProps {
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
  matchResult: MatchResult | null;
  buyerDepositDone: boolean;
  setBuyerDepositDone: (b: boolean) => void;
  displayPoints: number;
  completed: boolean;
  /** 거래완료 화면에 표시할 금액 (다음 매칭으로 matchResult가 null일 때 사용) */
  completedAmount?: number;
  /** B2S 등: 남은금액 표시용 (있으면 신청금액/남은금액 헤더의 남은금액에 사용) */
  displayRemainingAmount?: number;
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
  /** 거절 시 사유 전달. (타임아웃 시에는 인자 없이 호출) */
  onDeclineMatch: (reason?: string) => void;
  /** 매칭 거절 사유 선택 옵션 (없으면 rejectReasonOptions 사용) */
  declineReasonOptions?: string[];
  confirmTimerSeconds: number;
  sellerRejectDepositReason: string | null;
  onClearSellerRejectDepositReason: () => void;
  violationHistory: Array<{ type: string; message: string }>;
  /** 위반내역 확인 모달에서 확인 클릭 시 호출 (해당 구매자 초기 화면으로). buyerIndex 전달 시 해당 슬롯만 초기화 */
  onViolationConfirmed?: (buyerIndex?: number) => void;
  memberId: string;
  onCancelSearch?: () => void;
  showMatchCanceledModal?: boolean;
  onConfirmMatchCanceledModal?: () => void;
  matchCanceledModalTitle?: string;
  matchCanceledModalSubtitle?: string;
  matchCanceledModalButtonText?: string;
  /** B2S: 구매자 1명·다중 판매자 시 거래완료 + 확인/거래 카드 목록 (있으면 다중 카드 UI 표시) */
  multiOrderedMatchesForBuyer?: Array<
    | { kind: 'completed'; matchId: string; sellerIndex: number; amount: number }
    | { kind: 'confirming'; matchId: string; sellerIndex: number; amount: number; confirmTimerSeconds: number; buyerConfirmed: boolean; sellerConfirmed: boolean }
    | {
        kind: 'trading';
        matchId: string;
        sellerIndex: number;
        amount: number;
        buyerDepositDone: boolean;
        sellerConfirmed: boolean;
        depositTimerSeconds?: number;
        canceledReason?: 'buyer_deposit_timeout';
        matchResult?: MatchResult | null;
      }
  >;
  sellerMemberIds?: string[];
  onConfirmMatchMulti?: (matchId: string) => void;
  /** 다중 매칭 시 건별 거부(매칭 취소). reason 선택 시 두 번째 인자로 전달 */
  onDeclineMatchMulti?: (matchId: string, reason?: string) => void;
  setBuyerDepositDoneMulti?: (matchId: string) => void;
  /** 다중 매칭 시 건별 입금 불가(사유 선택 후 해당 건만 제거, 위반 기록) */
  onRejectDepositMulti?: (matchId: string, reason: string) => void;
  /** 타이머·지연 설정에서 구매자 체크 시 입금확인 모달에 입금 사진첨부 버튼 표시 */
  buyerDepositPhotoEnabled?: boolean;
  /** 분쟁 발생 시: 사진2 스타일 내역 + 분쟁발생 표시(어드민 풀어주기 전까지) */
  dispute?: { amount: number; reason: string } | null;
}

export default function BuyerPhoneContent({
  buyerIndex: _buyerIndex,
  phase,
  buyerStarted,
  sellerStarted: _sellerStarted,
  showInitialScreen = false,
  amountsMatch: _amountsMatch,
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
  completedAmount = 0,
  displayRemainingAmount,
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
  declineReasonOptions,
  confirmTimerSeconds,
  sellerRejectDepositReason,
  onClearSellerRejectDepositReason,
  violationHistory,
  onViolationConfirmed,
  memberId,
  onCancelSearch,
  showMatchCanceledModal = false,
  onConfirmMatchCanceledModal,
  matchCanceledModalTitle = '매칭 미확인',
  matchCanceledModalSubtitle = '3회이상 매칭확인 거부시 이용이 중지됨',
  matchCanceledModalButtonText = '확인',
  multiOrderedMatchesForBuyer,
  sellerMemberIds = [],
  onConfirmMatchMulti,
  onDeclineMatchMulti,
  setBuyerDepositDoneMulti,
  onRejectDepositMulti,
  buyerDepositPhotoEnabled = false,
  dispute = null,
}: BuyerPhoneContentProps) {
  void onReset;
  const declineReasons = declineReasonOptions ?? rejectReasonOptions;
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showDeclineReasonModal, setShowDeclineReasonModal] = useState(false);
  const [selectedDeclineReason, setSelectedDeclineReason] = useState<string | null>(null);
  /** 다중 매칭에서 거절 시 해당 카드의 matchId (단일일 때는 null) */
  const [declineReasonMatchId, setDeclineReasonMatchId] = useState<string | null>(null);
  /** 다중 매칭에서 입금 확인 클릭 시 2차 확인 모달용 (해당 건의 matchId + matchResult) */
  const [depositModalForMulti, setDepositModalForMulti] = useState<{ matchId: string; matchResult: MatchResult } | null>(null);
  /** 다중 매칭에서 입금 불가 클릭 시 거부 사유 모달에서 어떤 건인지 구분용 */
  const [rejectDepositMatchId, setRejectDepositMatchId] = useState<string | null>(null);
  const [depositConfirmChecked, setDepositConfirmChecked] = useState(false);
  const [depositPhotoFiles, setDepositPhotoFiles] = useState<File[]>([]);
  const [depositPhotoPreviewUrls, setDepositPhotoPreviewUrls] = useState<string[]>([]);
  const depositPhotoInputRef = useRef<HTMLInputElement | null>(null);

  const handleDepositPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    setDepositPhotoPreviewUrls((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return files.map((f) => URL.createObjectURL(f));
    });
    setDepositPhotoFiles(files);
    e.target.value = '';
  };

  const clearDepositPhotos = () => {
    setDepositPhotoPreviewUrls((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
    setDepositPhotoFiles([]);
  };
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRejectReason, setSelectedRejectReason] = useState<string | null>(null);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [lastSeenViolationCount, setLastSeenViolationCount] = useState(0);
  const hasNewViolations = violationHistory.length > lastSeenViolationCount;

  /** 위반 발생 시 확인 전까지 다른 동작 불가 → 모달 자동 오픈 */
  useEffect(() => {
    if (hasNewViolations && violationHistory.length > 0) setShowViolationModal(true);
  }, [hasNewViolations, violationHistory.length]);

  const handleDepositConfirm = () => {
    if (!depositConfirmChecked) return;
    if (depositModalForMulti && setBuyerDepositDoneMulti) {
      setBuyerDepositDoneMulti(depositModalForMulti.matchId);
      setDepositModalForMulti(null);
    } else {
      setBuyerDepositDone(true);
      setShowDepositModal(false);
    }
    setDepositConfirmChecked(false);
    clearDepositPhotos();
  };

  /** 매칭된 구매자만 확인/입금 화면, 비매칭 구매자는 계속 검색 중 유지 */
  const isMatchedBuyer = (phase === 'confirming' || phase === 'trading') && matchResult != null;
  const useMultiCards = Boolean(multiOrderedMatchesForBuyer && multiOrderedMatchesForBuyer.length > 0);
  const showSearchingView =
    !_completedBuyer &&
    buyerStarted &&
    !matchConfirming &&
    (phase === 'idle' || phase === 'searching' || !isMatchedBuyer) &&
    !useMultiCards;

  /** 다른 메인 콘텐츠(분쟁/검색/다중카드/확인/입금/거래완료) 표시 여부 */
  const hasOtherMainContent =
    dispute ||
    showSearchingView ||
    (useMultiCards && Boolean(multiOrderedMatchesForBuyer?.length) && !(_completedBuyer && !buyerClickedNew)) ||
    (matchConfirming && matchResult) ||
    (phase === 'trading' && matchResult) ||
    (_completedBuyer && !buyerClickedNew);

  /** 초기 화면: 미시작이면 거래/완료 단계가 아닐 때 표시. 다른 메인 콘텐츠가 없을 때도 첫 화면으로 폴백 */
  const showIdleInput =
    !dispute &&
    !(_completedBuyer && !buyerClickedNew) &&
    ((phase === 'idle' && !buyerStarted) ||
      (phase === 'completed' && buyerClickedNew) ||
      (showInitialScreen ?? false) ||
      (!buyerStarted && phase !== 'trading' && phase !== 'completed') ||
      !hasOtherMainContent);

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
      {(buyerStarted || (_completedBuyer && !buyerClickedNew) || dispute) ? (
        <div
          className="flex-shrink-0 px-2 py-2 border-b border-slate-700/50 bg-slate-900/50"
        >
          <div className="text-point-glow text-sm font-display tracking-wider w-full drop-shadow-[0_0_12px_rgba(0,255,255,0.4)]">
            <div className="flex justify-between items-center">
              <span>신청금액</span>
              <span>남은금액</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span>{(dispute ? dispute.amount : _completedBuyer ? (completedAmount ?? buyerAmount) : buyerAmount).toLocaleString('ko-KR')}원</span>
              <span>{dispute
                ? `${dispute.amount.toLocaleString('ko-KR')}원`
                : _completedBuyer
                  ? '0원'
                  : (phase === 'trading' || phase === 'completed') && matchResult
                    ? `${Math.max(0, (displayRemainingAmount ?? buyerAmount) - matchResult.totalAmount).toLocaleString('ko-KR')}원`
                    : `${(displayRemainingAmount ?? buyerAmount).toLocaleString('ko-KR')}원`}</span>
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
              onClick={() => {
                setLastSeenViolationCount(violationHistory.length);
                setShowViolationModal(false);
                onViolationConfirmed?.(_buyerIndex ?? 0);
              }}
              className="w-full py-2.5 rounded-xl text-sm font-medium btn-success"
            >
              확인
            </button>
          </div>
        </div>
      )}
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
      <div className="flex-1 flex flex-col min-h-0 relative">
      {/* 분쟁 발생: 1:1일 때도 판매자 선택(분쟁 사유) 표시, 다중일 때는 카드+사유. 상단 패딩으로 판매자와 분쟁발생 위치 맞춤 */}
      {dispute && !useMultiCards && (
        <div className="flex-1 flex flex-col items-center justify-start min-h-0 pt-24 pb-10 px-4">
          <p className="text-red-400 text-xl font-bold font-display mb-4">분쟁발생</p>
          {dispute.reason && (
            <p className="text-slate-300 text-sm text-center mb-4 px-2">{dispute.reason}</p>
          )}
          <p className="text-slate-400 text-sm text-center whitespace-pre-line">
            관리자 확인중입니다.
            {'\n'}
            잠시만 기다려 주세요.
          </p>
        </div>
      )}
      {dispute && useMultiCards && (
        <div className="flex flex-col flex-1 min-h-0 py-4 px-3 space-y-4">
          <div className="glass-card-neon p-4 rounded-xl border border-orange-500/30 space-y-3">
            <p className="text-red-400 text-base font-bold font-display mb-2">분쟁발생</p>
            <p className="text-slate-400 text-xs">{dispute.reason}</p>
            <p className="text-slate-500 text-xs mt-2 whitespace-pre-line">관리자 확인중입니다.{'\n'}잠시만 기다려 주세요.</p>
          </div>
        </div>
      )}
      {showIdleInput && (
        <>
          <div className="flex-shrink-0">
            <section className="py-4 pt-0 mt-[1cm]">
              <div className="text-slate-400 text-xs mb-1 font-display tracking-wider">보유 포인트</div>
              <div className="text-point-glow text-3xl tracking-wider drop-shadow-[0_0_15px_rgba(0,255,255,0.5)] leading-relaxed text-right">{displayPoints.toLocaleString()} P</div>
            </section>
            <section className="py-4">
              <label className="block text-slate-400 text-xs mb-2 font-display tracking-wider">구매</label>
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
      {!dispute && showSearchingView && (
        <div className="flex flex-col flex-1 min-h-0 transition-opacity duration-300">
          <div className="flex flex-col items-center justify-center flex-1 min-h-0 pt-4 space-y-6">
            <p className="text-point-glow text-3xl font-display tabular-nums tracking-widest drop-shadow-[0_0_15px_rgba(0,255,255,0.6)]" style={{ marginTop: 'calc(5rem + 1cm - 2cm)' }} aria-label="매칭 제한 시간 (5분)">
              {Math.floor(buyerSearchTimerSeconds / 60)}:{(buyerSearchTimerSeconds % 60).toString().padStart(2, '0')}
            </p>
            <div className="flex flex-col items-center space-y-6 mt-20">
              <p className="text-slate-300 text-xs font-display tracking-wider">판매자를 검색하는 중입니다...</p>
              <HologramGrid />
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
      {/* B2S: 다중 판매자 카드 (확인 대기 + 거래 중). 거래 완료 전체화면일 때는 숨김 → 1:1에서 카드 중복 안 나옴 */}
      {!dispute && useMultiCards && multiOrderedMatchesForBuyer && !(_completedBuyer && !buyerClickedNew) && (
        <div className="flex-1 flex flex-col min-h-0 overflow-auto py-3 space-y-3">
          {multiOrderedMatchesForBuyer.map((item) =>
            item.kind === 'completed' ? (
              <div key={item.matchId} className="flex-shrink-0 glass-card-neon p-4 rounded-xl border border-orange-500/30 space-y-3">
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
                className="flex-shrink-0 glass-card-neon p-4 rounded-xl border border-orange-500/30 space-y-3"
              >
                <div className="flex justify-between items-center gap-2">
                  <p className="text-slate-300 text-sm">매칭금액 {item.amount.toLocaleString('ko-KR')}원</p>
                  <span className="text-point-glow text-lg font-display tabular-nums">{Math.floor(item.confirmTimerSeconds / 60)}:{(item.confirmTimerSeconds % 60).toString().padStart(2, '0')}</span>
                </div>
                <p className="text-cyan-400 text-xs">판매자가 매칭되었습니다. 구매를 원하실 경우 승인을 눌러주세요.</p>
                {!item.buyerConfirmed && (onConfirmMatchMulti || onDeclineMatchMulti) && (
                  <div className="flex gap-2 mt-2">
                    {onConfirmMatchMulti && (
                      <button type="button" onClick={() => onConfirmMatchMulti(item.matchId)} className="btn-success flex-1 text-sm h-10 rounded-lg font-display">
                        승인
                      </button>
                    )}
                    {onDeclineMatchMulti && (
                      <button type="button" onClick={() => { setDeclineReasonMatchId(item.matchId); setShowDeclineReasonModal(true); setSelectedDeclineReason(null); }} className="flex-1 h-10 rounded-lg text-sm font-display font-medium bg-slate-600 text-slate-200 hover:bg-slate-500 border border-slate-500/50">
                        거절
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div
                key={item.matchId}
                className="flex-shrink-0 glass-card-neon p-4 rounded-xl border border-orange-500/30 space-y-3"
              >
                <div className="flex justify-between items-center gap-2">
                  <p className="text-slate-300 text-sm">매칭금액 {item.amount.toLocaleString('ko-KR')}원</p>
                  {!item.canceledReason && typeof item.depositTimerSeconds === 'number' && (
                    <span className="text-point-glow text-lg font-display tabular-nums tracking-widest">
                      {Math.floor(item.depositTimerSeconds / 60)}:{(item.depositTimerSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                </div>
                {item.canceledReason === 'buyer_deposit_timeout' ? (
                  <p className="text-amber-400/90 text-sm font-display text-center py-2">매칭이 취소되었습니다.</p>
                ) : item.buyerDepositDone ? (
                  <p className="text-cyan-400 text-xs">입금 완료 · 판매자 확인 대기 중</p>
                ) : (
                  <>
                    {item.matchResult && (
                      <div className="rounded-lg bg-slate-700/80 p-3 text-xs mb-2">
                        <p className="text-slate-400 mb-1">입금 정보</p>
                        <p className="text-slate-200 font-medium">{item.matchResult.seller.bank}</p>
                        <p className="font-mono text-slate-300 text-sm mt-0.5">{item.matchResult.seller.account}</p>
                        <p className="text-slate-400 text-xs mt-0.5">예금주 {item.matchResult.seller.holder}</p>
                        <p className="text-point-glow mt-2">{item.matchResult.totalAmount.toLocaleString('ko-KR')}원</p>
                      </div>
                    )}
                    {setBuyerDepositDoneMulti && item.matchResult && (
                      <div className="flex gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => { setDepositConfirmChecked(false); clearDepositPhotos(); setDepositModalForMulti({ matchId: item.matchId, matchResult: item.matchResult }); }}
                          className="btn-deposit flex-1 text-sm h-10 rounded-lg font-display"
                        >
                          입금 확인
                        </button>
                        {onRejectDepositMulti && (
                          <button
                            type="button"
                            onClick={() => { setRejectDepositMatchId(item.matchId); setSelectedRejectReason(null); setShowRejectModal(true); }}
                            className="flex-1 h-10 rounded-lg text-sm font-display font-medium bg-slate-600 text-slate-200 hover:bg-slate-500 border border-slate-500/50"
                          >
                            입금 불가
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          )}
          {onCancelSearch && !useMultiCards && (
            <section className="flex-shrink-0 pt-2 flex justify-center">
              <button type="button" onClick={onCancelSearch} className="btn-primary px-6 py-2.5 text-sm font-display rounded-xl font-medium text-white transition-colors">
                취소
              </button>
            </section>
          )}
        </div>
      )}
      {/* 다중 매칭 시 입금 확인 클릭 → 2차 입금확인 모달 (useMultiCards일 때는 위 블록에 모달이 없으므로 여기서 렌더) */}
      {depositModalForMulti && depositModalForMulti.matchResult && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 rounded-2xl">
          <div className="w-full max-w-[280px] glass-cyber border-2 border-red-500 rounded-2xl px-5 py-6 flex flex-col gap-6">
            <p className="text-slate-100 font-bold text-base text-center">입금확인</p>
            <div className="rounded-xl bg-slate-700/80 px-4 py-5 text-center space-y-3">
              <p className="text-slate-400 text-xs font-display tracking-wider">은행</p>
              <p className="text-slate-100 font-medium text-sm">{depositModalForMulti.matchResult.seller.bank}</p>
              <p className="font-mono text-slate-300 text-sm tracking-wide">{depositModalForMulti.matchResult.seller.account}</p>
              <p className="text-slate-400 text-sm">예금주 {depositModalForMulti.matchResult.seller.holder}</p>
              <p className="text-point-glow text-lg font-display mt-4 drop-shadow-[0_0_8px_rgba(0,255,255,0.3)]">{depositModalForMulti.matchResult.totalAmount.toLocaleString('ko-KR')}원</p>
            </div>
            {buyerDepositPhotoEnabled && (
              <div className="flex flex-col items-center gap-2">
                <input ref={depositPhotoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleDepositPhotoChange} />
                <button type="button" onClick={() => depositPhotoInputRef.current?.click()} className="w-full py-2.5 rounded-xl text-sm font-medium border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 transition-colors">
                  입금 사진첨부
                </button>
                {depositPhotoPreviewUrls.length > 0 && (
                  <div className="w-full flex flex-wrap gap-2 justify-center">
                    {depositPhotoPreviewUrls.slice(0, 4).map((url, i) => (
                      <div key={url} className="relative w-14 h-14 rounded-lg overflow-hidden bg-slate-700 border border-slate-600">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {depositPhotoFiles.length > 4 && <span className="text-slate-400 text-xs self-center">+{depositPhotoFiles.length - 4}</span>}
                  </div>
                )}
              </div>
            )}
            <label className="flex items-center justify-center gap-2 cursor-pointer">
              <input type="checkbox" checked={depositConfirmChecked} onChange={(e) => setDepositConfirmChecked(e.target.checked)} className="rounded border-slate-500 bg-slate-700 text-cyan-500 focus:ring-cyan-500 w-4 h-4" />
              <span className="text-slate-300 text-sm">입금확인 완료</span>
            </label>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => { setDepositModalForMulti(null); setDepositConfirmChecked(false); clearDepositPhotos(); }} className="flex-1 py-3 rounded-xl text-sm font-medium bg-slate-600 text-slate-200 hover:bg-slate-500">
                취소
              </button>
              <button type="button" onClick={handleDepositConfirm} disabled={!depositConfirmChecked || (buyerDepositPhotoEnabled && depositPhotoFiles.length === 0)} className="flex-1 py-3 rounded-xl text-sm font-medium btn-deposit disabled:opacity-50 disabled:cursor-not-allowed">
                입금완료
              </button>
            </div>
          </div>
        </div>
      )}
      {!dispute && matchConfirming && matchResult && !useMultiCards && (
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
                  구매를 원하실 경우 승인을 눌러주세요.
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
          {!buyerMatchConfirmed && (
            <div className="flex-shrink-0 mt-auto mb-5 flex gap-2">
              <button type="button" onClick={onConfirmMatch} className="btn-success flex-1 text-sm h-12 rounded-xl font-display">
                승인
              </button>
              <button type="button" onClick={() => { setDeclineReasonMatchId(null); setShowDeclineReasonModal(true); setSelectedDeclineReason(null); }} className="flex-1 h-12 rounded-xl text-sm font-display font-medium bg-slate-600 text-slate-200 hover:bg-slate-500 border border-slate-500/50 transition-colors">
                거절
              </button>
            </div>
          )}
        </div>
      )}
      {showDeclineReasonModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 rounded-2xl">
          <div className="w-full max-w-[240px] glass-cyber p-4 border-white/10">
            <p className="text-slate-100 font-bold text-sm mb-3">거절 사유 선택</p>
            <div className="space-y-2 mb-4">
              {declineReasons.map((option, i) => (
                <label key={i} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="declineReason"
                    checked={selectedDeclineReason === option}
                    onChange={() => setSelectedDeclineReason(option)}
                    className="border-slate-500 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-slate-300 text-sm">{i + 1}. {option}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowDeclineReasonModal(false); setSelectedDeclineReason(null); setDeclineReasonMatchId(null); }}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-slate-600 text-slate-200 hover:bg-slate-500"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedDeclineReason) {
                    if (declineReasonMatchId && onDeclineMatchMulti) {
                      onDeclineMatchMulti(declineReasonMatchId, selectedDeclineReason);
                    } else {
                      onDeclineMatch(selectedDeclineReason);
                    }
                    setShowDeclineReasonModal(false);
                    setSelectedDeclineReason(null);
                    setDeclineReasonMatchId(null);
                  }
                }}
                disabled={!selectedDeclineReason}
                className="flex-1 py-2 rounded-xl text-sm font-medium btn-success disabled:opacity-50 disabled:cursor-not-allowed"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
      {!dispute && phase === 'trading' && matchResult && !useMultiCards && (
        <div className="opacity-0 animate-fade-in flex flex-col items-center justify-center min-h-[320px] sm:min-h-[420px] py-4">
          <div className="w-full max-w-[280px] mx-auto space-y-4 flex flex-col items-center">
            <p className="text-cyan-400 text-sm font-bold font-display drop-shadow-[0_0_10px_rgba(0,255,255,0.4)] text-center animate-text-blink">
              {buyerDepositDone ? '입금확인 대기중' : '입금 후, 입금완료 버튼을 눌러주세요'}
            </p>
            <div className="glass-card-neon p-5 leading-relaxed w-full rounded-xl text-center">
              <p className="text-slate-400 text-xs mb-2 font-display tracking-wider">입금정보</p>
              <p className="text-slate-200 text-base font-medium leading-relaxed">{matchResult.seller.bank}</p>
              <p className="font-mono text-slate-300 text-sm mt-1 leading-relaxed">{matchResult.seller.account}</p>
              <p className="text-slate-400 text-sm mt-1 leading-relaxed">예금주 {matchResult.seller.holder}</p>
              <p className="text-point-glow text-xl tracking-wider mt-4 drop-shadow-[0_0_12px_rgba(0,255,255,0.5)] whitespace-nowrap">{matchResult.totalAmount.toLocaleString()} P</p>
            </div>
          </div>
          <section className="py-6 flex flex-col items-center justify-center w-full max-w-[280px] mx-auto">
            <p className="text-point-glow text-2xl font-display tabular-nums tracking-widest drop-shadow-[0_0_12px_rgba(0,255,255,0.5)] mb-4 text-center" aria-label="입금 제한 시간">
              {Math.floor(buyerSearchTimerSeconds / 60)}:{(buyerSearchTimerSeconds % 60).toString().padStart(2, '0')}
            </p>
            <div className="w-full flex flex-col items-center">
              {buyerDepositDone ? (
                <p className="text-cyan-400 text-xs font-display text-center">입금 완료</p>
              ) : (
                <div className="flex gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => setShowDepositModal(true)}
                    className="btn-deposit flex-1 text-sm h-12 rounded-xl font-display"
                  >
                    입금완료
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowRejectModal(true); setSelectedRejectReason(null); }}
                    className="flex-1 h-12 rounded-xl text-sm font-display font-medium bg-slate-600 text-slate-200 hover:bg-slate-500 border border-slate-500/50 transition-colors"
                  >
                    입금불가
                  </button>
                </div>
              )}
            </div>
          </section>
          {((showDepositModal && matchResult) || depositModalForMulti) && (depositModalForMulti?.matchResult ?? matchResult) && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 rounded-2xl">
              <div className="w-full max-w-[280px] glass-cyber border-2 border-red-500 rounded-2xl px-5 py-6 flex flex-col gap-6">
                <p className="text-slate-100 font-bold text-base text-center">입금확인</p>
                <div className="rounded-xl bg-slate-700/80 px-4 py-5 text-center space-y-3">
                  <p className="text-slate-400 text-xs font-display tracking-wider">은행</p>
                  <p className="text-slate-100 font-medium text-sm">{(depositModalForMulti?.matchResult ?? matchResult)!.seller.bank}</p>
                  <p className="font-mono text-slate-300 text-sm tracking-wide">{(depositModalForMulti?.matchResult ?? matchResult)!.seller.account}</p>
                  <p className="text-slate-400 text-sm">예금주 {(depositModalForMulti?.matchResult ?? matchResult)!.seller.holder}</p>
                  <p className="text-point-glow text-lg font-display mt-4 drop-shadow-[0_0_8px_rgba(0,255,255,0.3)]">{(depositModalForMulti?.matchResult ?? matchResult)!.totalAmount.toLocaleString('ko-KR')}원</p>
                </div>
                {buyerDepositPhotoEnabled && (
                  <div className="flex flex-col items-center gap-2">
                    <input
                      ref={depositPhotoInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleDepositPhotoChange}
                    />
                    <button
                      type="button"
                      onClick={() => depositPhotoInputRef.current?.click()}
                      className="w-full py-2.5 rounded-xl text-sm font-medium border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                    >
                      입금 사진첨부
                    </button>
                    {depositPhotoPreviewUrls.length > 0 && (
                      <div className="w-full flex flex-wrap gap-2 justify-center">
                        {depositPhotoPreviewUrls.slice(0, 4).map((url, i) => (
                          <div key={url} className="relative w-14 h-14 rounded-lg overflow-hidden bg-slate-700 border border-slate-600">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                        {depositPhotoFiles.length > 4 && (
                          <span className="text-slate-400 text-xs self-center">+{depositPhotoFiles.length - 4}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <label className="flex items-center justify-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={depositConfirmChecked}
                    onChange={(e) => setDepositConfirmChecked(e.target.checked)}
                    className="rounded border-slate-500 bg-slate-700 text-cyan-500 focus:ring-cyan-500 w-4 h-4"
                  />
                  <span className="text-slate-300 text-sm">입금확인 완료</span>
                </label>
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => { setShowDepositModal(false); setDepositModalForMulti(null); setDepositConfirmChecked(false); clearDepositPhotos(); }}
                    className="flex-1 py-3 rounded-xl text-sm font-medium bg-slate-600 text-slate-200 hover:bg-slate-500"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleDepositConfirm}
                    disabled={!depositConfirmChecked || (buyerDepositPhotoEnabled && depositPhotoFiles.length === 0)}
                    className="flex-1 py-3 rounded-xl text-sm font-medium btn-deposit disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    입금완료
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {!dispute && _completedBuyer && !buyerClickedNew && (
        <div className="flex flex-col justify-between min-h-[320px] sm:min-h-[420px] transition-all duration-300">
          <section className="py-10 pt-0">
            <p className="text-cyan-400 text-sm font-bold font-display">거래 완료</p>
            <div className="text-point-glow text-3xl tracking-wider tabular-nums animate-count-pop drop-shadow-[0_0_15px_rgba(0,255,255,0.5)] leading-relaxed text-right mt-4">
              {(matchResult?.totalAmount ?? completedAmount ?? 0).toLocaleString()} P
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
      {/* 거부 사유 모달: 단일/다중 공통 — 입금 불가 클릭 시 항상 표시 */}
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
                onClick={() => { setShowRejectModal(false); setSelectedRejectReason(null); setRejectDepositMatchId(null); }}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-slate-600 text-slate-200 hover:bg-slate-500"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedRejectReason) {
                    if (rejectDepositMatchId && onRejectDepositMulti) {
                      onRejectDepositMulti(rejectDepositMatchId, selectedRejectReason);
                      setRejectDepositMatchId(null);
                    } else {
                      onRejectMatch(selectedRejectReason);
                    }
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
      </div>
      </div>
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
              {matchCanceledModalButtonText}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
