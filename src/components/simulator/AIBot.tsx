/** 홀로그램 그리드 느낌의 AU 봇 - 반투명 그리드·시안 글로우·스캔 연출 */
export default function AIBot() {
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
