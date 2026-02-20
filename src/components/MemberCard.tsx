import type { MemberProfile } from '../types/matching';

interface MemberCardProps {
  profile: MemberProfile;
  variant: 'buyer' | 'seller';
}

const gradeColors: Record<string, string> = {
  S: 'bg-amber-100 text-amber-800',
  A: 'bg-emerald-100 text-emerald-800',
  'B+': 'bg-blue-100 text-blue-800',
  B: 'bg-slate-100 text-slate-700',
};

export default function MemberCard({ profile, variant }: MemberCardProps) {
  const isBuyer = variant === 'buyer';
  const label = isBuyer ? '구매자' : '판매자';
  const labelBg = isBuyer ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600';
  const borderAccent = isBuyer ? 'border-blue-200' : 'border-emerald-200';

  return (
    <div
      className={`rounded-xl border-2 ${borderAccent} bg-white shadow-lg overflow-hidden transition hover:shadow-xl`}
    >
      <div className={`px-4 py-2 ${labelBg} text-xs font-semibold uppercase tracking-wide`}>
        {label}
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="text-slate-500 text-sm">신용도</span>
          <span className="text-2xl font-bold text-slate-800">{profile.creditScore}</span>
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${
              gradeColors[profile.creditGrade] ?? 'bg-slate-100 text-slate-700'
            }`}
          >
            {profile.creditGrade}등급
          </span>
        </div>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-slate-500">은행명</dt>
            <dd className="font-medium text-slate-800">{profile.bankName}</dd>
          </div>
          <div>
            <dt className="text-slate-500">계좌번호</dt>
            <dd className="font-mono text-slate-800">{profile.accountNumber}</dd>
          </div>
          <div>
            <dt className="text-slate-500">예금주</dt>
            <dd className="font-medium text-slate-800">{profile.accountHolder}</dd>
          </div>
          {profile.point != null && (
            <div>
              <dt className="text-slate-500">보유 포인트</dt>
              <dd className="font-medium text-slate-800">
                {profile.point.toLocaleString()} P
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
