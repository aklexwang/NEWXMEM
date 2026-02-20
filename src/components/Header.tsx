export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">
          P2P 포인트 매칭
        </h1>
        <p className="text-sm text-slate-600 max-w-xl">
          신뢰도 기반 1:1·1:N 매칭으로 포인트를 안전하게 거래하는 에스크로 시스템
        </p>
      </div>
    </header>
  );
}
