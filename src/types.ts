/** 거래용 사용자 정보 */
export interface User {
  id: string;
  name: string;
  creditScore: number;
  bank: string;
  accountNumber: string;
  holder: string;
  points: number;
}

/** 매칭/거래 진행 상태 */
export type MatchStatus =
  | 'IDLE'
  | 'SEARCHING'
  | 'MATCHED'
  | 'TRANSFERRING'
  | 'COMPLETED';

/** 매칭된 상대방 정보 (거래 금액 포함) */
export interface Participant {
  id: string;
  name: string;
  creditScore: number;
  bank: string;
  account: string;
  holder: string;
  amount: number;
}
