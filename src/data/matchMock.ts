import type { User, Participant } from '../types';

/** 데모용 '나' 사용자 */
export const me: User = {
  id: 'me-1',
  name: '홍길동',
  creditScore: 850,
  bank: '○○은행',
  accountNumber: '110-123-456789',
  holder: '홍길동',
  points: 50000,
};

/** 좌측 판매자 세션용 사용자 */
export const sellerSessionUser: User = {
  id: 'seller-1',
  name: '강우주',
  creditScore: 920,
  bank: '우리은행',
  accountNumber: '987-654-321098',
  holder: '강우주',
  points: 120000,
};

/** 추가 판매자용 템플릿 (2~5번째 판매자) */
const additionalSellerTemplates: Array<{ bank: string; accountNumber: string; holder: string; name: string }> = [
  { bank: '신한은행', accountNumber: '110-987-654321', holder: '이성찬', name: '이성찬' },
  { bank: '국민은행', accountNumber: '123-789-456012', holder: '박보검', name: '박보검' },
  { bank: 'NH농협', accountNumber: '302-9876-5432-11', holder: '최진실', name: '최진실' },
  { bank: '케이뱅크', accountNumber: '400-9876-543210', holder: '정부미', name: '정부미' },
];

/** 새 판매자 화면용 User 생성 (index 0 = 기존 sellerSessionUser, 1~4 = 추가 판매자) */
export function createSellerUserForIndex(index: number): User {
  if (index === 0) return sellerSessionUser;
  const t = additionalSellerTemplates[index - 1];
  if (!t) return sellerSessionUser;
  return {
    id: `seller-${index + 1}`,
    name: t.name,
    creditScore: 900 + Math.floor(Math.random() * 40),
    bank: t.bank,
    accountNumber: t.accountNumber,
    holder: t.holder,
    points: 120000,
  };
}

/** 우측 구매자 세션용 사용자 (1번째 구매자) */
export const buyerSessionUser: User = {
  id: 'buyer-1',
  name: '김은성',
  creditScore: 850,
  bank: '카카오뱅크',
  accountNumber: '3333-543-543534',
  holder: '김은성',
  points: 50000,
};

/** 추가 구매자용 템플릿 (2~5번째 구매자) - 은행명, 계좌번호, 예금주 */
const additionalBuyerTemplates: Array<{ bank: string; accountNumber: string; holder: string; name: string }> = [
  { bank: '신한은행', accountNumber: '110-234-567890', holder: '이구매', name: '이구매' },
  { bank: '국민은행', accountNumber: '123-456-789012', holder: '박소비', name: '박소비' },
  { bank: 'NH농협', accountNumber: '302-1234-5678-12', holder: '최민수', name: '최민수' },
  { bank: '케이뱅크', accountNumber: '400-1234-567890', holder: '정다희', name: '정다희' },
];

/** 새 구매자 화면용 User 생성 (index 0 = 기존 buyerSessionUser, 1~4 = 추가 구매자) */
export function createBuyerUserForIndex(index: number): User {
  if (index === 0) return buyerSessionUser;
  const t = additionalBuyerTemplates[index - 1];
  if (!t) return buyerSessionUser;
  return {
    id: `buyer-${index + 1}`,
    name: t.name,
    creditScore: 800 + Math.floor(Math.random() * 50),
    bank: t.bank,
    accountNumber: t.accountNumber,
    holder: t.holder,
    points: 50000,
  };
}

const sellerPool: Omit<Participant, 'amount'>[] = [
  { id: 's1', name: '이판매', creditScore: 920, bank: '△△은행', account: '987-654-321098', holder: '이판매' },
  { id: 's2', name: '박판매', creditScore: 880, bank: '□□은행', account: '555-123-456789', holder: '박판매' },
];

const buyerPool: Omit<Participant, 'amount'>[] = [
  { id: 'b1', name: '김구매', creditScore: 850, bank: '○○은행', account: '123-456-789012', holder: '김구매' },
  { id: 'b2', name: '최구매', creditScore: 810, bank: '××은행', account: '111-222-333444', holder: '최구매' },
  { id: 'b3', name: '정구매', creditScore: 790, bank: '○○은행', account: '444-555-666777', holder: '정구매' },
];

function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/** 구매 신청 시: 항상 1:1 (판매자 1명) */
export function generateBuyMatch(amount: number): { type: '1:1'; counterpart: Participant; amount: number } {
  const seller = pickOne(sellerPool);
  return {
    type: '1:1',
    counterpart: { ...seller, amount },
    amount,
  };
}

/** 판매 신청 시: 입력 금액에 따라 1:N 분할 (예: 30,000 → 10,000×3명) */
export function generateSellMatch(totalSellAmount: number): {
  type: '1:1' | '1:N';
  participants: Participant[];
  totalAmount: number;
} {
  const is1N = totalSellAmount >= 20000;
  const count = is1N ? 2 + Math.floor(Math.random() * 2) : 1;
  const perAmount = Math.floor(totalSellAmount / count);
  const shuffled = shuffle(buyerPool).slice(0, count);
  const participants: Participant[] = shuffled.map((b) => ({
    ...b,
    amount: perAmount,
  }));
  const totalAmount = participants.reduce((s, p) => s + p.amount, 0);
  return {
    type: count > 1 ? '1:N' : '1:1',
    participants,
    totalAmount,
  };
}

/** 다중 매칭: 거래 금액 = min(판매 가능 금액, 구매 신청 금액). 1:1 결과만 반환. */
export function computeMatchResult(
  sellerAmount: number,
  buyerAmount: number,
  sellerAccount: User,
  buyerAccount: User
): {
  type: '1:1' | '1:N';
  seller: Participant;
  buyers: Participant[];
  totalAmount: number;
} | null {
  if (sellerAmount <= 0 || buyerAmount <= 0) return null;
  const totalAmount = Math.min(sellerAmount, buyerAmount);
  const sellerParticipant: Participant = {
    id: sellerAccount.id,
    name: sellerAccount.name,
    creditScore: sellerAccount.creditScore,
    bank: sellerAccount.bank,
    account: sellerAccount.accountNumber,
    holder: sellerAccount.holder,
    amount: totalAmount,
  };
  const buyerParticipant: Participant = {
    id: buyerAccount.id,
    name: buyerAccount.name,
    creditScore: buyerAccount.creditScore,
    bank: buyerAccount.bank,
    account: buyerAccount.accountNumber,
    holder: buyerAccount.holder,
    amount: totalAmount,
  };
  return {
    type: '1:1',
    seller: sellerParticipant,
    buyers: [buyerParticipant],
    totalAmount,
  };
}
