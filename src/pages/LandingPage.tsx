import { type ReactNode } from 'react';
import AIMatchingVisual from '../components/AIMatchingVisual';

type LandingPageProps = {
  onEnterSimulator: () => void;
};

const SectionTitle = ({ children, sub }: { children: ReactNode; sub?: string }) => (
  <div className="text-center mb-16 sm:mb-24">
    <p className="text-cyan-400/90 text-xs sm:text-sm font-display font-medium tracking-[0.2em] uppercase mb-3">
      {sub}
    </p>
    <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-slate-100 tracking-tight">
      {children}
    </h2>
  </div>
);

const FlowStep = ({
  step,
  title,
  desc,
  descLine2,
  isLast,
}: {
  step: number;
  title: string;
  desc: string;
  descLine2?: string;
  isLast?: boolean;
}) => (
  <div className="group/step relative flex flex-col sm:flex-row sm:items-start gap-6 sm:gap-10">
    {/* 세로 연결선 + 번호 원 (여기에 마우스 올리면 오른쪽 글이 커짐) */}
    <div className="flex flex-col items-center flex-shrink-0">
      <div
        className="step-number w-14 h-14 rounded-full flex items-center justify-center font-display font-bold text-xl text-white border-2 border-cyan-400/80 bg-slate-800/90 shadow-[0_0_24px_rgba(6,182,212,0.4),inset_0_0_20px_rgba(6,182,212,0.1)] cursor-default transition-transform duration-300 group-hover/step:scale-110"
        aria-hidden
      >
        {step}
      </div>
      {!isLast && (
        <div
          className="w-0.5 flex-1 min-h-[32px] mt-2 bg-gradient-to-b from-cyan-400/60 to-cyan-400/20"
          style={{ minHeight: '48px' }}
          aria-hidden
        />
      )}
    </div>
    <div className="flex-1 min-w-0 pb-10 sm:pb-12">
      <h3 className="text-slate-100 font-display font-semibold text-xl sm:text-2xl mb-3 origin-left transition-transform duration-300 group-hover/step:scale-110">
        {title}
      </h3>
      <p className="text-slate-400 text-base sm:text-lg leading-relaxed transition-[color,font-weight] duration-300 group-hover/step:text-slate-200 group-hover/step:font-medium break-words">
        {desc}
        {descLine2 != null && <><br />{descLine2}</>}
      </p>
    </div>
  </div>
);

const FeatureCard = ({
  icon,
  title,
  description,
  detail,
  className = '',
}: {
  icon: ReactNode;
  title: string;
  description: string;
  detail?: string;
  className?: string;
}) => (
  <div
    className={`group relative rounded-2xl bg-slate-800/60 border border-slate-600/40 p-8 sm:p-10 lg:p-12 will-change-transform origin-center transition-[transform,box-shadow,border-color] duration-300 ease-out hover:z-10 hover:scale-[1.04] hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/10 ${className}`.trim()}
  >
    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6 group-hover:bg-cyan-500/15 transition-colors">
      {icon}
    </div>
    <h3 className="text-slate-200 font-display font-semibold text-xl mb-3">{title}</h3>
    <p className="text-slate-400 text-base leading-relaxed mb-3">{description}</p>
    {detail && <p className="text-slate-500 text-sm leading-relaxed">{detail}</p>}
  </div>
);

function openAxpayHowItWorksPage() {
  window.location.href = `${import.meta.env.BASE_URL}axpay-how-it-works.html`;
}

function openNoInstallHowItWorksPage() {
  window.location.href = `${import.meta.env.BASE_URL}axpay-no-install-how-it-works.html`;
}

/** 작동법: 시안 테두리·글래스 — 좌측 2카드 가로 동일(w-full + 부모 고정폭) */
const howItWorksButtonClass =
  'w-full text-center text-base sm:text-lg px-8 py-4 rounded-2xl font-display font-semibold border-2 border-cyan-400/70 text-cyan-100 bg-slate-950/55 backdrop-blur-sm shadow-[0_0_18px_rgba(34,211,238,0.2)] hover:bg-cyan-500/15 hover:border-cyan-300/85 hover:shadow-[0_0_26px_rgba(34,211,238,0.35)] transition-all';

/** 무설치 버전 작동법: 에메랄드 테두리 (작동법·체험과 구분) */
const noInstallHowItWorksButtonClass =
  'w-full text-center text-base sm:text-lg px-8 py-4 rounded-2xl font-display font-semibold border-2 border-emerald-400/70 text-emerald-100 bg-slate-950/55 backdrop-blur-sm shadow-[0_0_18px_rgba(52,211,153,0.2)] hover:bg-emerald-500/15 hover:border-emerald-300/85 hover:shadow-[0_0_26px_rgba(52,211,153,0.35)] transition-all';

/** 체험하기: 동일 글래스 느낌 + 테두리·글로우는 골드(기존 솔리드 색감). 왼쪽 2버튼 스택과 높이 맞춤용 stretch·중앙 정렬 */
const trialButtonClass =
  'inline-flex items-center justify-center self-stretch text-base sm:text-lg px-8 py-4 rounded-2xl font-display font-semibold border-2 border-amber-400/80 text-amber-100 bg-slate-950/55 backdrop-blur-sm shadow-[0_0_20px_rgba(251,191,36,0.28)] hover:bg-amber-500/15 hover:border-amber-300/90 hover:shadow-[0_0_30px_rgba(251,191,36,0.42)] transition-all w-full sm:w-auto sm:min-w-[200px]';

const ctaTrialButtonClass =
  'inline-flex items-center justify-center self-stretch text-lg sm:text-xl px-12 py-5 rounded-2xl font-display font-semibold border-2 border-amber-400/80 text-amber-100 bg-slate-900/65 backdrop-blur-sm shadow-[0_0_22px_rgba(251,191,36,0.3)] hover:bg-amber-500/15 hover:border-amber-300/90 hover:shadow-[0_0_32px_rgba(251,191,36,0.4)] transition-all w-full sm:w-auto sm:min-w-[220px]';

const ctaHowItWorksButtonClass =
  'w-full text-center text-lg sm:text-xl px-12 py-5 rounded-2xl font-display font-semibold border-2 border-cyan-400/70 text-cyan-100 bg-slate-900/65 backdrop-blur-sm shadow-[0_0_20px_rgba(34,211,238,0.22)] hover:bg-cyan-500/15 hover:border-cyan-300/85 hover:shadow-[0_0_28px_rgba(34,211,238,0.33)] transition-all';

const ctaNoInstallHowItWorksButtonClass =
  'w-full text-center text-lg sm:text-xl px-12 py-5 rounded-2xl font-display font-semibold border-2 border-emerald-400/70 text-emerald-100 bg-slate-900/65 backdrop-blur-sm shadow-[0_0_20px_rgba(52,211,153,0.22)] hover:bg-emerald-500/15 hover:border-emerald-300/85 hover:shadow-[0_0_28px_rgba(52,211,153,0.33)] transition-all';

export default function LandingPage({ onEnterSimulator }: LandingPageProps) {
  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      {/* Hero */}
      <header className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 sm:px-8 lg:px-12 pt-24 pb-32 overflow-hidden">
        {/* 룰렛 배경 영상 (고화질: public/videos/roulette-bg.mp4 에 파일 넣기) */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center center' }}
        >
          {/* 고화질 영상은 public/videos/roulette-bg.mp4 에 넣으면 우선 재생 */}
          <source src={`${import.meta.env.BASE_URL}videos/roulette-bg.mp4`} type="video/mp4" />
          {/* fallback: Pixabay 무료 룰렛 영상 (1920x1080) */}
          <source src="https://cdn.pixabay.com/video/2020/11/06/54607-477445139_large.mp4" type="video/mp4" />
        </video>
        {/* 어두운 오버레이 완화: 영상 퀄리티 최대한 보존 + 상·하단만 비네팅 */}
        <div className="absolute inset-0 bg-slate-950/25 pointer-events-none" />
        <div className="absolute inset-0 mesh-bg opacity-20 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/45 via-transparent to-slate-950/55 pointer-events-none" />
        <div className="relative z-10 w-full max-w-5xl mx-auto text-center min-w-0 px-2">
          <h1 className="text-3xl min-[400px]:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight mb-16 flex flex-wrap items-baseline justify-center gap-x-2 sm:gap-x-3 gap-y-4">
            <span className="text-amber-200 font-medium tracking-[0.15em] min-[400px]:tracking-[0.25em] uppercase inline-block drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] break-words max-w-full">
              {'P2P 매칭 플랫폼'.split('').map((char, i) => (
                <span key={i} className="animate-char-pop inline-block" style={{ animationDelay: `${i * 0.12}s` }}>{char}</span>
              ))}
            </span>
            <span className="axpay-logo text-7xl min-[400px]:text-8xl sm:text-9xl md:text-[8.5rem] lg:text-[10rem]">AXPAY</span>
          </h1>
          <p className="text-amber-100/95 text-lg sm:text-xl max-w-2xl mx-auto leading-loose mb-14 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]" style={{ lineHeight: 1.9 }}>
            판매자와 구매자를 실시간으로 연결하고,
            <br />
            매칭부터 입금·확인까지 한 화면에서 체험할 수 있는 시뮬레이터입니다.
          </p>
          <div className="flex flex-wrap items-stretch justify-center gap-4">
            <div className="flex flex-col gap-3 w-full max-w-[320px] sm:w-[300px] sm:max-w-none items-stretch shrink-0">
              <button type="button" onClick={openAxpayHowItWorksPage} className={howItWorksButtonClass}>
                API 버전 작동법
              </button>
              <button type="button" onClick={openNoInstallHowItWorksPage} className={noInstallHowItWorksButtonClass}>
                무설치 버전 작동법
              </button>
            </div>
            <button type="button" onClick={onEnterSimulator} className={trialButtonClass}>
              AXPAY 체험하기
            </button>
          </div>
        </div>
      </header>

      {/* P2P · 플랫폼 비주얼 갤러리 */}
      <section className="relative py-24 sm:py-32 lg:py-40 px-6 sm:px-8 lg:px-12 overflow-hidden">
        <div className="absolute inset-0 bg-slate-950/70" />
        <div className="relative z-10 w-full max-w-7xl mx-auto min-w-0 px-2">
          {/* 핵심 혜택 하이라이트 배지 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-20 sm:mb-24">
            {/* 1. 가장 낮은 수수료 */}
            <div className="group relative rounded-3xl border border-amber-500/30 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-900/90 px-6 sm:px-8 py-10 sm:py-12 overflow-hidden shadow-2xl shadow-amber-500/10 hover:border-amber-400/60 hover:shadow-amber-500/20 transition-all duration-300 text-center">
              <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-yellow-600/5 rounded-full blur-3xl pointer-events-none" />
              <div className="relative flex flex-col items-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400/20 to-yellow-600/20 border border-amber-400/40 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <p className="mt-5 text-amber-300/90 text-xs sm:text-sm font-display tracking-[0.28em] uppercase">
                  Lowest Fee
                </p>
                <p className="mt-5 bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent text-6xl sm:text-7xl font-display font-extrabold leading-none">
                  0.1<span className="text-4xl sm:text-5xl align-top">%</span>
                </p>
                <div className="mt-5 h-px w-12 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
                <p className="mt-5 text-slate-200 text-lg sm:text-xl font-display font-semibold leading-snug whitespace-nowrap">
                  가장 낮은 수수료
                </p>
              </div>
            </div>

            {/* 2. 24시간 실시간 정산 */}
            <div className="group relative rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-900/90 px-6 sm:px-8 py-10 sm:py-12 overflow-hidden shadow-2xl shadow-cyan-500/10 hover:border-cyan-400/60 hover:shadow-cyan-500/20 transition-all duration-300 text-center">
              <div className="absolute -top-24 -right-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
              <div className="relative flex flex-col items-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-blue-600/20 border border-cyan-400/40 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <polyline points="12 7 12 12 15 14" />
                  </svg>
                </div>
                <p className="mt-5 text-cyan-300/90 text-xs sm:text-sm font-display tracking-[0.28em] uppercase">
                  Realtime
                </p>
                <p className="mt-5 bg-gradient-to-r from-cyan-200 via-cyan-300 to-blue-300 bg-clip-text text-transparent text-6xl sm:text-7xl font-display font-extrabold leading-none">
                  24<span className="text-4xl sm:text-5xl align-top">H</span>
                </p>
                <div className="mt-5 h-px w-12 bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
                <p className="mt-5 text-slate-200 text-lg sm:text-xl font-display font-semibold leading-snug whitespace-nowrap">
                  24시간 실시간 정산
                </p>
              </div>
            </div>

            {/* 3. API 설치/무설치 버전 제공 */}
            <div className="group relative rounded-3xl border border-violet-400/30 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-900/90 px-6 sm:px-8 py-10 sm:py-12 overflow-hidden shadow-2xl shadow-violet-500/10 hover:border-violet-400/60 hover:shadow-violet-500/20 transition-all duration-300 text-center">
              <div className="absolute -top-24 -right-24 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-fuchsia-600/5 rounded-full blur-3xl pointer-events-none" />
              <div className="relative flex flex-col items-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-400/20 to-purple-600/20 border border-violet-400/40 flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                </div>
                <p className="mt-5 text-violet-300/90 text-xs sm:text-sm font-display tracking-[0.28em] uppercase">
                  Flexible
                </p>
                <p className="mt-5 bg-gradient-to-r from-violet-200 via-fuchsia-300 to-violet-200 bg-clip-text text-transparent text-6xl sm:text-7xl font-display font-extrabold leading-none">
                  API
                </p>
                <div className="mt-5 h-px w-12 bg-gradient-to-r from-transparent via-violet-400/60 to-transparent" />
                <p className="mt-5 text-slate-200 text-lg sm:text-xl font-display font-semibold leading-snug whitespace-nowrap">
                  설치 / 무설치 버전 제공
                </p>
              </div>
            </div>

            {/* 4. 3년간 무사고 운영 */}
            <div className="group relative rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-900/90 px-6 sm:px-8 py-10 sm:py-12 overflow-hidden shadow-2xl shadow-emerald-500/10 hover:border-emerald-400/60 hover:shadow-emerald-500/20 transition-all duration-300 text-center">
              <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-teal-600/5 rounded-full blur-3xl pointer-events-none" />
              <div className="relative flex flex-col items-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-teal-600/20 border border-emerald-400/40 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                </div>
                <p className="mt-5 text-emerald-300/90 text-xs sm:text-sm font-display tracking-[0.28em] uppercase">
                  Zero Incident
                </p>
                <p className="mt-5 bg-gradient-to-r from-emerald-200 via-green-300 to-emerald-200 bg-clip-text text-transparent text-6xl sm:text-7xl font-display font-extrabold leading-none">
                  3<span className="text-4xl sm:text-5xl align-top">Y</span>
                </p>
                <div className="mt-5 h-px w-12 bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
                <p className="mt-5 text-slate-200 text-lg sm:text-xl font-display font-semibold leading-snug whitespace-nowrap">
                  3년간 무사고 운영
                </p>
              </div>
            </div>
          </div>

          <SectionTitle sub="Visual">P2P와 디지털 거래</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 lg:gap-10 min-w-0">
            <div className="group block rounded-2xl overflow-hidden border border-slate-600/40 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 shadow-xl min-w-0">
              <img src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&q=80" alt="디지털 결제" className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              <p className="p-4 sm:p-5 bg-slate-800/95 text-slate-300 text-sm font-display text-center border-t border-slate-600/40">디지털 결제</p>
            </div>
            <div className="group block rounded-2xl overflow-hidden border border-slate-600/40 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 shadow-xl min-w-0">
              <img src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&q=80" alt="P2P 연결" className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              <p className="p-4 sm:p-5 bg-slate-800/95 text-slate-300 text-sm font-display text-center border-t border-slate-600/40">P2P 연결</p>
            </div>
            <div className="group block rounded-2xl overflow-hidden border border-slate-600/40 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 shadow-xl min-w-0">
              <img src="https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&q=80" alt="송금·이체" className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              <p className="p-4 sm:p-5 bg-slate-800/95 text-slate-300 text-sm font-display text-center border-t border-slate-600/40">송금·이체</p>
            </div>
            <div className="group block rounded-2xl overflow-hidden border border-slate-600/40 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 shadow-xl min-w-0">
              <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80" alt="핀테크" className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              <p className="p-4 sm:p-5 bg-slate-800/95 text-slate-300 text-sm font-display text-center border-t border-slate-600/40">핀테크</p>
            </div>
            <div className="group block rounded-2xl overflow-hidden border border-slate-600/40 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 shadow-xl min-w-0">
              <img src="https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&q=80" alt="안전 거래" className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              <p className="p-4 sm:p-5 bg-slate-800/95 text-slate-300 text-sm font-display text-center border-t border-slate-600/40">안전 거래</p>
            </div>
            <div className="group block rounded-2xl overflow-hidden border border-slate-600/40 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 shadow-xl min-w-0">
              <img src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&q=80" alt="모바일 뱅킹" className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              <p className="p-4 sm:p-5 bg-slate-800/95 text-slate-300 text-sm font-display text-center border-t border-slate-600/40">모바일 뱅킹</p>
            </div>
            <div className="group block rounded-2xl overflow-hidden border border-slate-600/40 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 shadow-xl min-w-0">
              <img src="https://images.unsplash.com/photo-1655635949212-1d8f4f103ea1?w=600&q=80" alt="실시간 매칭" className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              <p className="p-4 sm:p-5 bg-slate-800/95 text-slate-300 text-sm font-display text-center border-t border-slate-600/40">실시간 매칭</p>
            </div>
            <div className="group block rounded-2xl overflow-hidden border border-slate-600/40 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 shadow-xl min-w-0">
              <img src="https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=600&q=80" alt="신뢰·검증" className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              <p className="p-4 sm:p-5 bg-slate-800/95 text-slate-300 text-sm font-display text-center border-t border-slate-600/40">신뢰·검증</p>
            </div>
          </div>
        </div>
      </section>

      {/* What is NEWXPAY */}
      <section className="relative py-24 sm:py-32 lg:py-40 px-6 sm:px-8 lg:px-12 overflow-hidden">
        <div className="absolute inset-0 bg-slate-950/50" />
        <div className="relative z-10 w-full max-w-6xl mx-auto min-w-0 px-2">
          <SectionTitle sub="About">AXPAY는 무엇인가?</SectionTitle>
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center justify-center">
            <div
              className="flex-shrink-0 w-full lg:max-w-[28rem]"
              style={{ aspectRatio: '360 / 680' }}
            >
              <AIMatchingVisual />
            </div>
            <div
              className="flex-shrink-0 w-full lg:max-w-[28rem] flex flex-col p-10 sm:p-12"
              style={{
                aspectRatio: '360 / 680',
                background:
                  'linear-gradient(180deg, rgba(2, 6, 23, 0.96) 0%, rgba(3, 7, 18, 0.98) 100%)',
                border: '1px solid rgba(56, 189, 248, 0.22)',
                borderRadius: 48,
                boxShadow: '0 40px 80px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(15, 23, 42, 0.6)',
                color: '#E2E8F0',
              }}
            >
              {/* 헤더: 폰 카드와 동일한 배지 스타일 */}
              <div className="flex justify-between items-center">
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
                    background: 'rgba(34, 211, 238, 0.14)',
                    color: '#67E8F9',
                    borderRadius: 100,
                    fontWeight: 600,
                  }}
                >
                  소개
                </div>
              </div>

              {/* 타이틀 + 본문: 카드 중앙으로 정렬 */}
              <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
                <p className="text-slate-400 text-[11px] tracking-[0.35em] font-semibold">
                  ABOUT PLATFORM
                </p>
                <h3 className="mt-3 text-slate-100 text-2xl sm:text-3xl font-bold leading-tight">
                  P2P 매칭을
                  <br />한 화면에서
                </h3>
                <span
                  className="block mt-5 h-[2px] w-10 rounded-full"
                  style={{ background: '#22D3EE' }}
                />
                <div className="mt-5 text-slate-300 text-sm sm:text-base leading-relaxed space-y-4">
                  <p>포인트를 <span className="text-emerald-400 font-semibold">판매</span>하려는 회원과</p>
                  <p><span className="text-amber-400 font-semibold">구매</span>하려는 회원을</p>
                  <p>AI 매칭으로 연결하고,</p>
                  <p>거래 단계별로</p>
                  <p><span className="text-slate-100 font-semibold">거래 · 입금 · 입금확인</span>을</p>
                  <p>진행합니다.</p>
                </div>
              </div>

              {/* 포인트 리스트 — 하단을 채우는 3줄 */}
              <div className="mt-auto pt-6 space-y-3 border-t border-slate-700/70">
                <div className="flex items-start gap-3">
                  <span
                    className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold"
                    style={{ background: 'rgba(34, 211, 238, 0.2)', color: '#67E8F9' }}
                  >
                    01
                  </span>
                  <span className="text-slate-300 text-sm leading-snug">
                    실시간 <span className="font-semibold text-slate-100">AI 매칭</span> 엔진
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span
                    className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold"
                    style={{ background: 'rgba(34, 211, 238, 0.2)', color: '#67E8F9' }}
                  >
                    02
                  </span>
                  <span className="text-slate-300 text-sm leading-snug">
                    다중 구매자·판매자 시나리오 지원
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span
                    className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold"
                    style={{ background: 'rgba(34, 211, 238, 0.2)', color: '#67E8F9' }}
                  >
                    03
                  </span>
                  <span className="text-slate-300 text-sm leading-snug">
                    타이머·위반·분쟁 처리까지 완비
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Flow: 5 steps */}
      <section className="relative py-24 sm:py-32 lg:py-40 px-6 sm:px-8 lg:px-12 overflow-hidden">
        <div className="mesh-bg absolute inset-0 opacity-60" />
        <div className="relative z-10 w-full max-w-4xl mx-auto min-w-0 px-2">
          <SectionTitle sub="Process">솔루션 작동 메커니즘</SectionTitle>
          <div className="relative space-y-12 sm:space-y-16">
            <FlowStep
              step={1}
              title="금액입력"
              desc="판매자는 판매할 포인트 금액을, 구매자는 구매 희망 금액을 입력합니다."
              isLast={false}
            />
            <FlowStep
              step={2}
              title="AI 매칭"
              desc="AI 매칭 시작과 동시에 매칭 거래 상대자를 찾습니다."
              isLast={false}
            />
            <FlowStep
              step={3}
              title="거래"
              desc="매칭이 성사되면 양쪽에 거래 내용이 표시됩니다."
              descLine2="구매자·판매자 모두 수락해야 다음 단계로 진행되며, 건별 확인 제한 시간이 적용됩니다."
              isLast={false}
            />
            <FlowStep
              step={4}
              title="거래완료"
              desc="구매자가 입금을 완료하고, 판매자가 입금확인을 하면 해당 건은 거래 완료됩니다."
              descLine2="입금 제한 시간 내에 완료되지 않으면 취소·위반 처리됩니다."
              isLast={false}
            />
            <FlowStep
              step={5}
              title="미매칭분"
              desc="거래 완료 후 포인트가 이체되고, 양쪽에서 '확인'을 누르면 매칭이 완료됩니다."
              descLine2="거래의 잔액이 남아 있으면 다음 매칭상대자를 찾습니다."
              isLast={true}
            />
          </div>
        </div>
      </section>

      {/* P2P 거래·매칭 컨셉 이미지 */}
      <section className="relative py-24 sm:py-32 lg:py-40 px-6 sm:px-8 lg:px-12 overflow-hidden">
        <div className="mesh-bg absolute inset-0 opacity-40" />
        <div className="relative z-10 w-full max-w-7xl mx-auto min-w-0 px-2">
          <SectionTitle sub="Concept">거래와 매칭</SectionTitle>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
            <div className="rounded-2xl overflow-hidden border border-slate-600/40 shadow-xl">
              <img src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=700&q=80" alt="결제 수단·포인트" className="w-full aspect-[16/10] object-cover" loading="lazy" />
              <div className="p-5 sm:p-6 bg-slate-800/80 border-t border-slate-600/40">
                <p className="text-slate-300 text-base font-display font-medium">결제·포인트</p>
                <p className="text-slate-500 text-sm mt-2">다양한 결제 수단과 포인트 거래</p>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden border border-slate-600/40 shadow-xl">
              <img src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=700&q=80" alt="실시간 매칭" className="w-full aspect-[16/10] object-cover" loading="lazy" />
              <div className="p-5 sm:p-6 bg-slate-800/80 border-t border-slate-600/40">
                <p className="text-slate-300 text-base font-display font-medium">실시간 매칭</p>
                <p className="text-slate-500 text-sm mt-2">판매자와 구매자 즉시 연결</p>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden border border-slate-600/40 shadow-xl sm:col-span-2 lg:col-span-1">
              <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=700&q=80" alt="데이터·플랫폼" className="w-full aspect-[16/10] object-cover" loading="lazy" />
              <div className="p-5 sm:p-6 bg-slate-800/80 border-t border-slate-600/40">
                <p className="text-slate-300 text-base font-display font-medium">플랫폼</p>
                <p className="text-slate-500 text-sm mt-2">투명하고 안전한 P2P 환경</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-24 sm:py-32 lg:py-40 px-6 sm:px-8 lg:px-12 overflow-hidden">
        <div className="absolute inset-0 bg-slate-950/50" />
        <div className="relative z-10 w-full max-w-7xl mx-auto min-w-0 px-2">
          <SectionTitle sub="Features">핵심 기능</SectionTitle>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 lg:gap-12">
            <FeatureCard
              icon={<span className="text-2xl font-display">1:N</span>}
              title="다중 동시 매칭"
              description="판매자 1명이 여러 구매자와 동시에 매칭·거래할 수 있습니다. 먼저 들어온 순으로 금액이 배분되며, 건별로 독립적인 타이머와 수락/거절이 적용됩니다."
              detail="구매자 1명 · 판매자 여러 명(B2S) 모드도 지원합니다."
            />
            <FeatureCard
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              title="실시간 타이머"
              description="판매자 검색 타이머, 구매자 검색 타이머, 매칭 확인 제한 시간, 입금 제한 시간을 화면 상단에서 설정할 수 있습니다. 모든 타이머는 초 단위로 동기화되어 동작합니다."
              detail="기본값: 검색 5~10분, 확인 3분, 입금 5분 등."
            />
            <FeatureCard
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              }
              title="위반 · 분쟁 처리"
              description="매칭 거절, 확인 시간 초과, 입금 시간 초과 시 위반 내역이 기록되고 모달로 안내됩니다. 판매자 입금 거부 시에는 분쟁 상태가 되며, 어드민이 해결할 때까지 양쪽에 분쟁 화면이 유지됩니다."
              detail="3회 이상 매칭 확인 거부 시 이용 중지 안내 등 규칙 반영."
            />
            <FeatureCard
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              }
              title="만원 단위 거래"
              description="거래 금액은 10,000원 이상 만원 단위만 허용됩니다. 판매자는 보유 포인트를 초과해 판매할 수 없고, 구매자는 금액 상한 없이 구매 신청이 가능합니다."
              detail="12,000원·10,500원 등은 입력 불가."
              className="lg:col-start-1 lg:row-start-2"
            />
            <div
              className="group/ai flex items-center justify-center self-stretch overflow-hidden bg-transparent p-2 sm:p-3 lg:col-start-2 lg:row-start-2 lg:min-h-0 min-h-[200px] sm:min-h-[240px] rounded-2xl origin-center transition-[transform,box-shadow] duration-300 ease-out will-change-transform hover:z-10 hover:scale-[1.04] hover:shadow-[0_0_32px_rgba(6,182,212,0.15)]"
            >
              <img
                src={`${import.meta.env.BASE_URL}ai.gif`}
                alt="AI 매칭"
                className="h-auto w-full max-h-[min(40vh,280px)] max-w-[min(100%,380px)] object-contain [image-rendering:auto] [filter:drop-shadow(0_8px_28px_rgba(0,0,0,0.45))] transition-transform duration-300 group-hover/ai:scale-105"
                loading="lazy"
                decoding="async"
              />
            </div>
            <FeatureCard
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              }
              title="매칭 사운드"
              description="매칭이 성사되는 순간 사운드가 재생되어, 여러 건이 동시에 올라올 때도 사용자가 놓치지 않도록 합니다. 확인 단계에서 수락 시 사운드가 중지됩니다."
              detail="실제 서비스의 알림 경험을 반영."
              className="lg:col-start-3 lg:row-start-2"
            />
          </div>
        </div>
      </section>

      {/* 구매·판매 진행 모습 — CTA 위 (4단계 플로우 카드) */}
      <section id="axpay-how-it-works" className="relative py-24 sm:py-32 lg:py-40 px-6 sm:px-8 lg:px-12 overflow-hidden scroll-mt-24">
        <div className="absolute inset-0 bg-slate-950/50" />
        <div className="relative z-10 w-full max-w-7xl mx-auto min-w-0 px-2">
          <SectionTitle sub="Process">구매와 판매의 진행</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-12">
            {[
              { step: 1, title: '금액 입력', sub: '구매자·판매자 화면', icon: '💰' },
              { step: 2, title: 'AI 매칭', sub: '구매자·판매자 화면', icon: '🤝' },
              { step: 3, title: '거래·확인', sub: '구매자·판매자 화면', icon: '🧾' },
              { step: 4, title: '완료', sub: '구매자·판매자 화면', icon: '🎉' },
            ].map(({ step, title, sub, icon }) => (
              <div
                key={step}
                className="rounded-xl overflow-hidden border border-slate-600/40 shadow-lg ring-1 ring-cyan-500/20 min-w-0 bg-slate-900/80 flex flex-col origin-center transition-[transform,box-shadow] duration-300 ease-out hover:z-20 hover:scale-[1.04] hover:shadow-2xl hover:shadow-cyan-500/10 hover:ring-cyan-400/35"
              >
                <div className="flex-1 flex flex-col items-center justify-center min-h-[320px] sm:min-h-[400px] p-6 text-center">
                  <span className="text-5xl sm:text-6xl mb-4 opacity-90" aria-hidden>{icon}</span>
                  <p className="text-slate-300 font-display font-medium text-lg">{title}</p>
                  <p className="text-slate-500 text-sm mt-1">{sub}</p>
                </div>
                <p className="p-4 sm:p-5 bg-slate-800/90 text-cyan-300 text-sm sm:text-base font-display font-medium text-center border-t border-slate-600/40">{step}. {title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-28 sm:py-36 lg:py-44 px-6 sm:px-8 lg:px-12 overflow-hidden">
        <div className="mesh-bg absolute inset-0 opacity-80" />
        <div className="relative z-10 w-full max-w-4xl mx-auto text-center min-w-0 px-2">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-slate-100 mb-6">
            직접 흐름을 체험해 보세요
          </h2>
          <p className="text-slate-300 text-lg sm:text-xl font-bold mb-12 mx-auto leading-relaxed sm:whitespace-nowrap overflow-x-auto">
            체험하기에서는 실제 AXPAY 솔루션을 체험할 수 있습니다.
          </p>
          <div className="flex flex-wrap items-stretch justify-center gap-4">
            <div className="flex flex-col gap-3 w-full max-w-[360px] sm:w-[340px] sm:max-w-none items-stretch shrink-0">
              <button type="button" onClick={openAxpayHowItWorksPage} className={ctaHowItWorksButtonClass}>
                API 버전 작동법
              </button>
              <button type="button" onClick={openNoInstallHowItWorksPage} className={ctaNoInstallHowItWorksButtonClass}>
                무설치 버전 작동법
              </button>
            </div>
            <button type="button" onClick={onEnterSimulator} className={ctaTrialButtonClass}>
              AXPAY 체험하기
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 py-12 px-6 sm:px-8 lg:px-12 overflow-x-hidden">
        <div className="w-full max-w-6xl mx-auto min-w-0 flex items-center justify-center">
          <span className="font-copyright text-white text-sm sm:text-base text-center inline-block origin-center transition-transform duration-300 ease-out select-none hover:scale-105 max-w-full px-2 break-words">
            Copyright 2026 All rights reserved AxPay · v{__APP_VERSION__}
          </span>
        </div>
      </footer>
    </div>
  );
}
