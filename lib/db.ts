function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }
  return { url, key };
}

export interface AnalysisRow {
  id: string;
  machine_name: string;
  risk_level: string;
  risk_score: number;
  created_at: string;
}

export async function fetchHistory(): Promise<AnalysisRow[]> {
  const { url, key } = getEnv();
  const res = await fetch(
    `${url}/rest/v1/analyses?select=id,machine_name,risk_level,risk_score,created_at&order=created_at.desc&limit=10`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    }
  );
  if (!res.ok) return [];
  return res.json();
}

export async function insertAnalysis(record: {
  machine_name: string;
  risk_level: string;
  risk_score: number;
  metrics: Record<string, number>;
  sensor_summary: unknown;
  ai_explanation: string;
  recommendations: string[];
  record_count: number;
}): Promise<boolean> {
  const { url, key } = getEnv();
  const res = await fetch(`${url}/rest/v1/analyses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(record),
  });
  return res.ok;
}

export async function deleteAnalysis(id: string): Promise<boolean> {
  const { url, key } = getEnv();
  const res = await fetch(`${url}/rest/v1/analyses?id=eq.${id}`, {
    method: 'DELETE',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  return res.ok;
}
