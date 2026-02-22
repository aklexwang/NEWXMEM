import { useState } from 'react';
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
  showMatchCanceledModal?: boolean;
  onConfirmMatchCanceledModal?: () => void;
  matchCanceledModalTitle?: string;
  matchCanceledModalSubtitle?: string;
  matchCanceledModalButtonText?: string;
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
  showMatchCanceledModal = false,
  onConfirmMatchCanceledModal,
  matchCanceledModalTitle = '매칭 미확인',
  matchCanceledModalSubtitle = '3회이상 매칭확인 거부시 이용이 중지됨',
  matchCanceledModalButtonText = '확인',
}: BuyerPhoneContentProps) {
  void onReset, onDeclineMatch;
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

  /** 초기 화면: 미시작이면 거래/완료 단계가 아닐 때 항상 표시 (매칭 미확인 확인 후 바로 초기화면) */
  const showIdleInput =
    (phase === 'idle' && !buyerStarted) ||
    (phase === 'completed' && buyerClickedNew) ||
    (showInitialScreen ?? false) ||
    (!buyerStarted && phase !== 'trading' && phase !== 'completed');

  /** 매칭된 구매자만 확인/입금 화면, 비매칭 구매자는 계속 검색 중 유지 */
  const isMatchedBuyer = (phase === 'confirming' || phase === 'trading') && matchResult != null;
  const showSearchingView =
    buyerStarted &&
    !matchConfirming &&
    (phase === 'idle' || phase === 'searching' || !isMatchedBuyer);

  const matchCanceledModalOpen = Boolean(showMatchCanceledModal && onConfirmMatchCanceledModal);
  return (
    <div className="relative min-h-full flex flex-col transition-all duration-300 ease-out">
      <div className={`flex-1 flex flex-col min-h-0 ${matchCanceledModalOpen ? 'pointer-events-none select-none' : ''}`}>
      <div className="flex-shrink-0 h-10 flex items-center justify-between gap-2 px-2">
        <span className="text-slate-400 text-[10px] sm:text-xs font-display font-bold truncate min-w-0" title={memberId}>
          회원아이디 {memberId}
        </span>
        <button
          type="button"
          onClick={() => setShowViolationModal(true)}
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
              <span>{(phase === 'trading' || phase === 'completed') && matchResult ? '0원' : `${buyerAmount.toLocaleString('ko-KR')}원`}</span>
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
      {showSearchingView && (
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
