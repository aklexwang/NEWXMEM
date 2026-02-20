export type MatchType = '1:1' | '1:N';
export type MatchStatus = 'idle' | 'matching' | 'matched' | 'info_exchange' | 'deposit_confirmed';

export interface BankInfo {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface MemberProfile extends BankInfo {
  name: string;
  creditScore: number;
  creditGrade: string;
  point?: number;
}

export interface MockMatchResult {
  matchType: MatchType;
  seller: MemberProfile;
  buyers: MemberProfile[];
}
