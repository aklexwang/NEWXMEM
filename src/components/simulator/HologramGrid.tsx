/** 홀로그램 그리드 - 실제 스캔 중인 느낌 (스캔 라인 + 데이터 읽기 연출) */
export default function HologramGrid() {
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
