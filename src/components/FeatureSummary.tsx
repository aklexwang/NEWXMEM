export default function FeatureSummary() {
  const features = [
    {
      title: '신뢰 기반 거래',
      description:
        '회원의 신용도와 계좌 정보를 기반으로 매칭하여, 검증된 상대와만 거래할 수 있습니다.',
      icon: '🛡️',
    },
    {
      title: '유연한 매칭 로직',
      description:
        '1:1은 물론, 소액 구매자 여러 명을 한 명의 판매자에게 묶어주는 1:N 시스템으로 효율적인 매칭을 제공합니다.',
      icon: '🔗',
    },
    {
      title: '에스크로 방식',
      description:
        '양측의 상호 확인(구매/판매 확인)이 완료될 때만 포인트가 실시간 이전되어 안전합니다.',
      icon: '✓',
    },
  ];

  return (
    <section className="py-16 px-4 bg-slate-100 border-t border-slate-200">
      <h2 className="text-2xl font-bold text-slate-800 text-center mb-10">
        시스템 3대 핵심 포인트
      </h2>
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {features.map((f, i) => (
          <div
            key={i}
            className="rounded-2xl bg-white border border-slate-200 shadow-md p-6 text-center hover:shadow-lg transition"
          >
            <div className="text-4xl mb-3">{f.icon}</div>
            <h3 className="font-bold text-slate-800 text-lg mb-2">{f.title}</h3>
            <p className="text-slate-600 text-sm leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
