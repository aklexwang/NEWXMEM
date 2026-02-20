import { useState, useEffect, useCallback } from 'react';
import type { MatchStatus, MockMatchResult } from '../types/matching';
import { generateMockMatchResult } from '../data/mockData';
import MemberCard from './MemberCard';

const MATCH_DELAY_MS = 3000;
const COUNT_DURATION_MS = 1500;

export default function MatchingSimulator() {
  const [status, setStatus] = useState<MatchStatus>('idle');
  const [result, setResult] = useState<MockMatchResult | null>(null);
  const [displayPoint, setDisplayPoint] = useState(0);
  const [targetPoint, setTargetPoint] = useState(0);

  const startMatching = useCallback(() => {
    setStatus('matching');
    setResult(null);
    setDisplayPoint(0);
    setTargetPoint(0);
  }, []);

  useEffect(() => {
    if (status !== 'matching') return;
    const timer = setTimeout(() => {
      const mock = generateMockMatchResult();
      setResult(mock);
      setStatus('matched');
    }, MATCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [status]);

  const showInfoExchange = useCallback(() => {
    setStatus('info_exchange');
  }, []);

  const confirmDeposit = useCallback(() => {
    if (!result) return;
    const total = result.buyers.reduce((sum, b) => sum + (b.point ?? 0), 0);
    setTargetPoint(total);
    setStatus('deposit_confirmed');
  }, [result]);

  // 포인트 카운팅 애니메이션
  useEffect(() => {
    if (status !== 'deposit_confirmed' || targetPoint <= 0) return;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / COUNT_DURATION_MS, 1);
      const easeOut = 1 - Math.pow(1 - progress, 2);
      setDisplayPoint(Math.floor(targetPoint * easeOut));
      if (progress < 1) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [status, targetPoint]);

  return (
    <section className="py-12 px-4">
      <h2 className="text-2xl font-bold text-slate-800 text-center mb-8">
        매칭 프로세스 시뮬레이션
      </h2>
      <div className="max-w-2xl mx-auto">
        {/* 대기 / 매칭 중 */}
        {(status === 'idle' || status === 'matching') && (
          <div className="rounded-2xl bg-white border border-slate-200 shadow-lg p-8 text-center">
            {status === 'idle' && (
              <>
                <p className="text-slate-600 mb-6">
                  아래 버튼을 누르면 3초 후 1:1 또는 1:N 매칭이 랜덤으로 시뮬레이션됩니다.
                </p>
                <button
                  type="button"
                  onClick={startMatching}
                  className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
                >
                  매칭 시작
                </button>
              </>
            )}
            {status === 'matching' && (
              <>
                <p className="text-slate-600 mb-6">
                  적합한 매칭 상대(1:1 또는 1:N)를 찾는 중...
                </p>
                <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-300 animate-radar-pulse" />
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-400 animate-radar-pulse animate-radar-pulse-delay-1" />
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500 animate-radar-pulse animate-radar-pulse-delay-2" />
                  <div className="w-12 h-12 rounded-full bg-indigo-600" />
                </div>
              </>
            )}
          </div>
        )}

        {/* 매칭 성공: 1:N 결과 리스트 */}
        {(status === 'matched' || status === 'info_exchange' || status === 'deposit_confirmed') && result && (
          <div className="space-y-6">
            <div className="rounded-xl bg-white border border-slate-200 shadow p-4">
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                {result.matchType} 매칭 결과
              </span>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-sm">판매자 1명</span>
                  <span className="font-medium">{result.seller.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-500 text-sm">구매자 {result.buyers.length}명</span>
                  {result.buyers.map((b, i) => (
                    <span key={i} className="font-medium text-slate-700">
                      {b.name}
                      {i < result!.buyers.length - 1 ? ',' : ''}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 정보 교환: 매칭된 상대방 계좌 정보 + 입금 확인 버튼 */}
            {(status === 'info_exchange' || status === 'deposit_confirmed') && (
              <div className="rounded-2xl bg-white border border-slate-200 shadow-lg overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                  입금할 계좌 정보 (판매자)
                </div>
                <div className="p-4 space-y-2">
                  <p><span className="text-slate-500">은행</span> {result.seller.bankName}</p>
                  <p><span className="text-slate-500">계좌번호</span> <span className="font-mono">{result.seller.accountNumber}</span></p>
                  <p><span className="text-slate-500">예금주</span> {result.seller.accountHolder}</p>
                </div>
                {status === 'info_exchange' && (
                  <div className="p-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={confirmDeposit}
                      className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
                    >
                      입금 확인
                    </button>
                  </div>
                )}
                {status === 'deposit_confirmed' && (
                  <div className="p-4 border-t border-slate-200 bg-emerald-50 rounded-b-2xl">
                    <p className="text-sm text-slate-600 mb-1">포인트 이전 완료</p>
                    <p className="text-2xl font-bold text-emerald-700 tabular-nums">
                      {displayPoint.toLocaleString()} P
                    </p>
                  </div>
                )}
              </div>
            )}

            {status === 'matched' && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={showInfoExchange}
                  className="px-6 py-2 rounded-xl bg-slate-700 text-white font-medium hover:bg-slate-800 transition"
                >
                  계좌 정보 보기 및 입금 확인
                </button>
              </div>
            )}

            {/* 매칭 결과 카드 미리보기 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MemberCard profile={result.seller} variant="seller" />
              <div className="space-y-3">
                {result.buyers.map((b, i) => (
                  <MemberCard key={i} profile={b} variant="buyer" />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
