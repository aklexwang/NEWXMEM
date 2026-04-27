export type AccessRequestStatus = 'pending' | 'approved' | 'rejected';

export type AccessRequest = {
  id: string;
  siteName: string;
  siteUrl: string;
  telegramId: string;
  status: AccessRequestStatus;
  createdAt: number;
};

type FirebaseRuntimeConfig = {
  apiKey: string;
  projectId: string;
};

let configPromise: Promise<FirebaseRuntimeConfig> | null = null;

function assertNonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

async function getRuntimeConfig(): Promise<FirebaseRuntimeConfig> {
  if (!configPromise) {
    configPromise = fetch(`${import.meta.env.BASE_URL}firebase-runtime-config.json`, {
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('firebase-runtime-config.json 파일을 읽지 못했습니다.');
        const json = (await res.json()) as Partial<FirebaseRuntimeConfig>;
        if (!assertNonEmpty(json.apiKey) || !assertNonEmpty(json.projectId)) {
          throw new Error('Firebase 설정(apiKey, projectId)이 비어 있습니다.');
        }
        return { apiKey: json.apiKey.trim(), projectId: json.projectId.trim() };
      });
  }
  return configPromise;
}

function documentToAccessRequest(doc: any): AccessRequest | null {
  if (!doc || typeof doc !== 'object' || typeof doc.name !== 'string') return null;
  const id = doc.name.split('/').pop();
  if (!id) return null;
  const fields = doc.fields ?? {};
  const siteName = fields.siteName?.stringValue ?? '';
  const siteUrl = fields.siteUrl?.stringValue ?? '';
  const telegramId = fields.telegramId?.stringValue ?? '';
  const statusRaw = fields.status?.stringValue;
  const createdAtRaw = fields.createdAt?.integerValue;
  const status: AccessRequestStatus =
    statusRaw === 'approved' || statusRaw === 'rejected' || statusRaw === 'pending' ? statusRaw : 'pending';
  const createdAt = Number(createdAtRaw ?? 0);
  return {
    id: String(id),
    siteName: String(siteName),
    siteUrl: String(siteUrl),
    telegramId: String(telegramId),
    status,
    createdAt: Number.isFinite(createdAt) ? createdAt : 0,
  };
}

function buildBaseUrl(projectId: string): string {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents`;
}

export async function createAccessRequest(request: Omit<AccessRequest, 'status'>): Promise<AccessRequest> {
  const cfg = await getRuntimeConfig();
  const base = buildBaseUrl(cfg.projectId);
  const url = `${base}/accessRequests?documentId=${encodeURIComponent(request.id)}&key=${encodeURIComponent(cfg.apiKey)}`;
  const body = {
    fields: {
      siteName: { stringValue: request.siteName },
      siteUrl: { stringValue: request.siteUrl },
      telegramId: { stringValue: request.telegramId },
      status: { stringValue: 'pending' },
      createdAt: { integerValue: String(request.createdAt) },
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`접근요청 저장 실패 (${res.status})`);
  const doc = await res.json();
  const parsed = documentToAccessRequest(doc);
  if (!parsed) throw new Error('접근요청 저장 응답 파싱 실패');
  return parsed;
}

export async function getAccessRequestById(id: string): Promise<AccessRequest | null> {
  const cfg = await getRuntimeConfig();
  const base = buildBaseUrl(cfg.projectId);
  const url = `${base}/accessRequests/${encodeURIComponent(id)}?key=${encodeURIComponent(cfg.apiKey)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`접근요청 조회 실패 (${res.status})`);
  const doc = await res.json();
  return documentToAccessRequest(doc);
}

