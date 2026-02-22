import { useState } from 'react';
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
  matchResult: MatchResult;
  buyerDepositDone: boolean;
  sellerConfirmed: boolean;
  setSellerConfirmed: (b: boolean) => void;
  displayPoints: number;
  completed: boolean;
  onReset: () => void;
  sellerClickedNew: boolean;
  onNewTrade: () => void;
  sellerSearchTimerSeconds: number;
  rejectReason: string | null;
  onClearRejectReason: () => void;
  matchConfirming: boolean;
  sellerMatchConfirmed: boolean;
  buyerMatchConfirmed: boolean;
  onConfirmMatch: () => void;
  onDeclineMatch: () => void;
  confirmTimerSeconds: number;
  onRejectDeposit: (reason: string) => void;
  violationHistory: Array<{ type: string; message: string }>;
  memberId: string;
  onCancelSearch?: () => void;
  showMatchCanceledModal?: boolean;
  onConfirmMatchCanceledModal?: () => void;
  matchCanceledModalTitle?: string;
  matchCanceledModalSubtitle?: string;
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
  showMatchCanceledModal = false,
  onConfirmMatchCanceledModal,
  matchCanceledModalTitle = '매칭 미확인',
  matchCanceledModalSubtitle = '3회이상 매칭확인 거부시 이용이 중지됨',
}: SellerPhoneContentProps) {
  void onReset, onDeclineMatch;
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
      {sellerStarted || (phase === 'completed' && !sellerClickedNew) ? (
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
