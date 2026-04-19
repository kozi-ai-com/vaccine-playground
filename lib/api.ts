import type {
  PipelineRunRequest,
  PipelineRunResponse,
  PipelineStatusResponse,
  PipelineResults,
  RunSummary,
} from '@/types';

const API = process.env.NEXT_PUBLIC_API_URL || '';

async function f<T>(url: string, opts?: RequestInit): Promise<T> {
  try {
    const r = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    if (!r.ok) throw new Error(`API returned ${r.status}: ${await r.text()}`);
    return r.json();
  } catch (err) {
    throw new Error('Backend not reachable. Check API URL or CORS.');
    /*if (err instanceof TypeError && err.message === "Failed to fetch") {
      throw new Error("Backend not reachable. Start FastAPI on port 8000.");
    }*/
    throw err;
  }
}

export const api = {
  health: () => f<{ status: string }>(`${API}/api/health`),
  startRun: (body: PipelineRunRequest) =>
    f<PipelineRunResponse>(`${API}/api/pipeline/run`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getStatus: (id: string) =>
    f<PipelineStatusResponse>(`${API}/api/pipeline/status/${id}`),
  getResults: (id: string) =>
    f<PipelineResults>(`${API}/api/pipeline/results/${id}`),
  listRuns: async () => {
    try {
      const runs = await f<any[]>(`${API}/api/runs`);
      return runs.map((r: any) => ({
        id: r.run_id || r.id,
        pathogen_name: r.input_value || null,
        input_type: r.input_type || 'pathogen',
        status: r.status,
        created_at: r.started_at || r.created_at || '',
        completed_at: r.completed_at || null,
        global_coverage: r.global_coverage ?? null,
      })) as RunSummary[];
    } catch {
      return [];
    }
  },
};
