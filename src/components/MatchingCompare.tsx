export default function MatchingCompare() {
  return (
    <section className="py-12 px-4">
      <h2 className="text-2xl font-bold text-slate-800 text-center mb-8">
        1:1 매칭 vs 1:N 다중 매칭
      </h2>
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 1:1 */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-lg overflow-hidden">
          <div className="bg-indigo-600 text-white px-6 py-3 text-center font-semibold">
            1:1 매칭
          </div>
          <div className="p-6">
            <p className="text-slate-600 text-sm mb-6">
              구매자 한 명과 판매자 한 명이 직접 연결됩니다. 대량 거래에 적합합니다.
            </p>
            <div className="flex items-center justify-center gap-6 py-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                구매자
              </div>
              <div className="flex-1 h-0.5 bg-gradient-to-r from-blue-400 to-emerald-400 max-w-[60px]" />
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                판매자
              </div>
            </div>
          </div>
        </div>

        {/* 1:N */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-lg overflow-hidden">
          <div className="bg-emerald-600 text-white px-6 py-3 text-center font-semibold">
            1:N 다중 매칭
          </div>
          <div className="p-6">
            <p className="text-slate-600 text-sm mb-6">
              소액 구매자 여러 명을 한 명의 판매자에게 묶어 효율적으로 매칭합니다.
            </p>
            <div className="flex items-center justify-center gap-3 py-4">
              <div className="flex flex-col gap-2">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                  구매1
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                  구매2
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                  구매3
                </div>
              </div>
              <div className="h-16 w-0.5 bg-gradient-to-b from-blue-400 to-emerald-400" />
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                판매자
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
