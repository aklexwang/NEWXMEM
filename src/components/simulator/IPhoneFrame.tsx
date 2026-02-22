/** 아이폰 목업 프레임: 홈바, 스크롤바 제거. 반응형: 작은 화면에서 축소. titleAction은 제목 오른쪽(숫자 옆)에 붙음. variant=buyer 시 주황 테마 */
export default function IPhoneFrame({
  title,
  titleAction,
  variant = 'seller',
  children,
}: {
  title: string;
  titleAction?: React.ReactNode;
  variant?: 'buyer' | 'seller';
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center w-full sm:w-auto ${variant === 'buyer' ? 'iphone-frame-buyer' : ''}`}
    >
      <div className="flex items-center justify-center gap-1.5 mb-2 sm:mb-3">
        <span className="text-slate-400 text-xs sm:text-sm font-medium font-display tracking-wider">{title}</span>
        {titleAction}
      </div>
      <div className="relative w-[280px] min-[380px]:w-[300px] sm:w-[318px] rounded-[2.25rem] min-[380px]:rounded-[2.5rem] sm:rounded-[2.75rem] p-1.5 min-[380px]:p-2 bg-slate-800/90 shadow-2xl ring-1 ring-white/10 backdrop-blur-sm">
        <div className="rounded-[1.9rem] min-[380px]:rounded-[2.1rem] sm:rounded-[2.25rem] overflow-hidden bg-slate-900/95 ring-2 ring-white/5">
          <div className="h-[484px] min-[380px]:h-[520px] sm:h-[554px] overflow-y-auto overflow-x-hidden scrollbar-hide flex flex-col bg-gradient-to-b from-slate-900/80 to-slate-800/80 px-3 min-[380px]:px-4 pt-1 sm:pt-2 pb-0">
            {children}
          </div>
          {/* 홈 바 (Home Bar) */}
          <div className="h-5 min-[380px]:h-6 sm:h-7 flex justify-center items-center bg-slate-900/98 pb-0.5 sm:pb-1">
            <div className="w-24 min-[380px]:w-28 sm:w-32 h-0.5 sm:h-1 rounded-full bg-slate-500/80" />
          </div>
        </div>
      </div>
    </div>
  );
}
