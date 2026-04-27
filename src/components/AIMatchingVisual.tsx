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
  const [time, setTime] = useState(297);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 280;
    canvas.height = 280;

    const particles = Array.from({ length: 14 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 6 + 2,
      speed: Math.random() * 0.8 + 0.2,
      opacity: Math.random() * 0.45 + 0.2,
    }));

    let rafId = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = 140;
      const cy = 140;
      const baseRadius = 62;

      const bgGrad = ctx.createRadialGradient(cx, cy, 8, cx, cy, 130);
      bgGrad.addColorStop(0, 'rgba(12, 42, 97, 0.55)');
      bgGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
      ctx.lineWidth = 16;
      ctx.stroke();

      particles.forEach((p) => {
        p.y -= p.speed * 0.6;
        p.x += Math.sin((Date.now() / 900) + p.y * 0.03) * 0.35;
        if (p.y < -10) {
          p.y = canvas.height + Math.random() * 30;
          p.x = 40 + Math.random() * 200;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34, 211, 238, ${p.opacity})`;
        ctx.fill();
      });

      const t = Date.now() / 1000;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius + 8, t * 0.9, t * 0.9 + 1.8);
      ctx.strokeStyle = '#7dd3fc';
      ctx.shadowColor = 'rgba(125, 211, 252, 0.7)';
      ctx.shadowBlur = 20;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(30, 64, 175, 0.28)';
      ctx.fill();

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
        fontFamily: "'Inter', 'Pretendard', sans-serif",
      }}
    >
      <div
        className="relative flex flex-col w-full h-full"
        style={{
          background: 'linear-gradient(180deg, #030712 0%, #020617 100%)',
          border: '1px solid rgba(71, 85, 105, 0.45)',
          borderRadius: 36,
          boxShadow: '0 30px 60px rgba(0, 0, 0, 0.5)',
          padding: '7%',
          boxSizing: 'border-box',
          color: '#E2E8F0',
        }}
      >
        <div className="flex justify-between items-center mb-2">
          <div
            className="flex items-center"
            style={{
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: 1,
              color: '#F8FAFC',
            }}
          >
            MONERO
          </div>
          <div
            style={{
              fontSize: 11,
              padding: '4px 8px',
              background: 'rgba(250, 204, 21, 0.14)',
              color: '#FDE047',
              borderRadius: 100,
              fontWeight: 600,
            }}
          >
            위반 내역
          </div>
        </div>
        <div
          style={{
            width: '100%',
            height: 1,
            background: 'rgba(100, 116, 139, 0.4)',
            marginBottom: 12,
          }}
        />

        <div className="flex justify-between items-center mb-3">
          <div>
            <div style={{ fontSize: 12, color: '#93C5FD' }}>신청 금액</div>
            <div style={{ fontSize: 32, fontWeight: 700, marginTop: 4 }}>100,000</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: '#93C5FD' }}>남은 금액</div>
            <div style={{ fontSize: 32, fontWeight: 700, marginTop: 4 }}>100,000</div>
          </div>
        </div>

        <div
          style={{
            borderRadius: 12,
            border: '1px solid rgba(71, 85, 105, 0.7)',
            background: 'rgba(51, 65, 85, 0.7)',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 16,
            marginBottom: 10,
          }}
        >
          <span style={{ color: '#E2E8F0', fontWeight: 600 }}>구매</span>
          <span style={{ color: '#CBD5E1', fontWeight: 700 }}>매칭중 ...</span>
          <span style={{ color: '#CBD5E1' }}>✕</span>
        </div>

        <div className="flex-1 flex flex-col justify-center items-center">
          <canvas
            ref={canvasRef}
            style={{
              width: '74%',
              maxWidth: 280,
              aspectRatio: '1 / 1',
              filter: 'drop-shadow(0 10px 20px rgba(14, 165, 233, 0.3))',
            }}
          />
          <div
            style={{
              fontSize: 26,
              color: '#94A3B8',
              marginTop: 8,
            }}
          >
            Smart matching
          </div>
          <div
            style={{
              fontSize: 68,
              fontWeight: 500,
              color: '#E2E8F0',
              margin: '2px 0 8px',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: 1,
            }}
          >
            {mm}:{ss}
          </div>
        </div>

        <button
          type="button"
          style={{
            marginTop: 'auto',
            borderRadius: 12,
            background: 'rgba(30, 41, 59, 0.95)',
            border: '1px solid rgba(71, 85, 105, 0.65)',
            color: '#CBD5E1',
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 0.5,
            padding: '14px 16px',
          }}
        >
          Ⓜ 이용가이드
        </button>
      </div>
    </div>
  );
}
