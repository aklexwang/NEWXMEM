import { useEffect, useRef, useState } from 'react';

/**
 * t.xpaykr.com/test/3.html 의 "SECURE MATCHING" 애니메이션을
 * React 컴포넌트로 포팅한 버전.
 * - 캔버스: 상승 버블 + 중앙 호(원호) 회전 + 정적 광환
 * - 타이머: 04:53 부터 카운트다운
 * - 글래스모피즘 카드 + 민트 그린 포인트
 */
export default function AIMatchingVisual() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [time, setTime] = useState(293);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 240;
    canvas.height = 240;

    const particles = Array.from({ length: 20 }, () => ({
      x: Math.random() * canvas.width,
      y: canvas.height + Math.random() * 100,
      r: Math.random() * 8 + 4,
      speed: Math.random() * 1 + 0.5,
      opacity: Math.random() * 0.5,
    }));

    let rafId = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.beginPath();
      ctx.arc(120, 120, 60, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.lineWidth = 10;
      ctx.stroke();

      particles.forEach((p) => {
        p.y -= p.speed;
        if (p.y < -20) p.y = canvas.height + 20;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16, 185, 129, ${p.opacity})`;
        ctx.fill();
      });

      const t = Date.now() / 1000;
      ctx.beginPath();
      ctx.arc(120, 120, 70, t, t + 1.5);
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();

      rafId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setTime((prev) => (prev <= 0 ? prev : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const mm = Math.floor(time / 60).toString().padStart(2, '0');
  const ss = (time % 60).toString().padStart(2, '0');

  return (
    <div
      className="relative w-full h-full flex items-center justify-center overflow-hidden"
      style={{
        background: 'transparent',
        fontFamily: "'PingFang SC', 'Inter', sans-serif",
      }}
    >
      {/* 은은한 배경 글로우 */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 500,
          height: 500,
          background:
            'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)',
          animation: 'axpay-ambient-move 10s infinite alternate ease-in-out',
        }}
      />

      {/* 메인 글래스 카드 — 원본의 밝은 유리 톤 유지 */}
      <div
        className="relative flex flex-col w-full h-full"
        style={{
          background:
            'linear-gradient(135deg, #fafbfc 0%, #eef2f7 55%, #e2e8f0 100%)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          borderRadius: 48,
          boxShadow: '0 40px 80px rgba(0, 0, 0, 0.35)',
          padding: '7%',
          boxSizing: 'border-box',
          color: '#1E293B',
        }}
      >
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-3">
          <div
            className="flex items-center"
            style={{
              fontWeight: 800,
              fontSize: 14,
              letterSpacing: 1,
              color: '#10B981',
            }}
          >
            <svg
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              style={{ marginRight: 8 }}
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            AXPAY
          </div>
          <div
            style={{
              fontSize: 11,
              padding: '6px 12px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10B981',
              borderRadius: 100,
              fontWeight: 600,
            }}
          >
            AI 매칭 중
          </div>
        </div>

        {/* 애니메이션 영역 */}
        <div className="flex-1 flex flex-col justify-center items-center">
          <canvas
            ref={canvasRef}
            style={{
              width: '70%',
              maxWidth: 240,
              aspectRatio: '1 / 1',
              filter: 'drop-shadow(0 10px 20px rgba(16, 185, 129, 0.25))',
            }}
          />
          <div
            style={{
              fontSize: 48,
              fontWeight: 200,
              color: '#1E293B',
              margin: '16px 0 6px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {mm}:{ss}
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#64748B',
              letterSpacing: 4,
            }}
          >
            SECURE MATCHING
          </div>
        </div>

        {/* 데이터 패널 */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.55)',
            borderRadius: 28,
            padding: 20,
            boxShadow: 'inset 0 2px 10px rgba(255,255,255,1)',
            border: '1px solid rgba(255,255,255,0.4)',
          }}
        >
          <div className="flex justify-between">
            <div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>
                신청 금액
              </div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>10,000.00</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>
                잔여 금액
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#10B981' }}>
                10,000.00
              </div>
            </div>
          </div>
          <div
            style={{
              width: '100%',
              height: 6,
              background: '#eee',
              borderRadius: 10,
              marginTop: 10,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '30%',
                height: '100%',
                background: '#10B981',
                borderRadius: 10,
              }}
            />
          </div>
        </div>
      </div>

      {/* 컴포넌트 전용 keyframes */}
      <style>{`
        @keyframes axpay-ambient-move {
          from { transform: translate(-10%, -10%); }
          to   { transform: translate(10%, 10%); }
        }
      `}</style>
    </div>
  );
}
