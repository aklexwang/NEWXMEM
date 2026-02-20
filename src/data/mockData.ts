import type { MemberProfile, MockMatchResult } from '../types/matching';

export const sampleBuyer: MemberProfile = {
  name: '김구매',
  creditScore: 850,
  creditGrade: 'A',
  bankName: '○○은행',
  accountNumber: '123-456-789012',
  accountHolder: '김구매',
  point: 50000,
};

export const sampleSeller: MemberProfile = {
  name: '이판매',
  creditScore: 920,
  creditGrade: 'S',
  bankName: '△△은행',
  accountNumber: '987-654-321098',
  accountHolder: '이판매',
  point: 120000,
};

const sellers: MemberProfile[] = [
  {
    name: '이판매',
    creditScore: 920,
    creditGrade: 'S',
    bankName: '△△은행',
    accountNumber: '987-654-321098',
    accountHolder: '이판매',
    point: 120000,
  },
  {
    name: '박판매',
    creditScore: 880,
    creditGrade: 'A',
    bankName: '□□은행',
    accountNumber: '555-123-456789',
    accountHolder: '박판매',
    point: 80000,
  },
];

const buyersPool: MemberProfile[] = [
  {
    name: '김구매',
    creditScore: 850,
    creditGrade: 'A',
    bankName: '○○은행',
    accountNumber: '123-456-789012',
    accountHolder: '김구매',
    point: 30000,
  },
  {
    name: '최구매',
    creditScore: 810,
    creditGrade: 'B+',
    bankName: '××은행',
    accountNumber: '111-222-333444',
    accountHolder: '최구매',
    point: 15000,
  },
  {
    name: '정구매',
    creditScore: 790,
    creditGrade: 'B',
    bankName: '○○은행',
    accountNumber: '444-555-666777',
    accountHolder: '정구매',
    point: 25000,
  },
];

export function generateMockMatchResult(): MockMatchResult {
  const is1N = Math.random() > 0.5;
  const seller = sellers[Math.floor(Math.random() * sellers.length)];
  const buyerCount = is1N ? 2 + Math.floor(Math.random() * 2) : 1; // 1:1 or 2~3
  const shuffled = [...buyersPool].sort(() => Math.random() - 0.5);
  const buyers = shuffled.slice(0, buyerCount);

  return {
    matchType: is1N ? '1:N' : '1:1',
    seller,
    buyers,
  };
}
