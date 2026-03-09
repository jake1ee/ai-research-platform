/**
 * API service layer – all calls to the FastAPI backend live here.
 *
 * Import pattern:
 *   import { api } from '@/services/api';
 *   import { compareModels } from '@/services/api';
 */

import { supabase } from '@/lib/supabase';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// ── Auth headers ──────────────────────────────────────────────────────────────

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ── Base fetch wrapper ─────────────────────────────────────────────────────────

async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers ?? {}) },
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.error || errorMessage;
    } catch {
      // ignore JSON parse error
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

// ── API surface ────────────────────────────────────────────────────────────────

export const api = {
  // ── Users ──────────────────────────────────────────────────────────────────
  getMe: () =>
    apiFetch('/users/me'),

  // ── Workspaces ─────────────────────────────────────────────────────────────
  listWorkspaces: () =>
    apiFetch('/users/me/workspaces'),

  createWorkspace: (name: string) =>
    apiFetch('/workspaces', { method: 'POST', body: JSON.stringify({ name }) }),

  getWorkspace: (id: string) =>
    apiFetch(`/workspaces/${id}`),

  getWorkspaceUsage: (id: string) =>
    apiFetch(`/workspaces/${id}/usage`),

  // ── Evaluations ────────────────────────────────────────────────────────────

  /** Synchronous evaluation (blocks until all LLMs respond). */
  runEvaluation: (body: {
    prompt: string;
    model_ids: string[];
    system_prompt?: string;
    temperature?: number;
    max_tokens?: number;
    deterministic_seed?: number;
    require_json_output?: boolean;
    json_schema?: Record<string, unknown>;
    judge_model?: string;
    workspace_id?: string;
  }) =>
    apiFetch('/evaluate', { method: 'POST', body: JSON.stringify(body) }),

  /** Async evaluation via Celery (returns 202, poll by ID). */
  submitEvaluation: (workspaceId: string, body: object) =>
    apiFetch(`/workspaces/${workspaceId}/evaluations`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  listEvaluations: (workspaceId: string, params?: { limit?: number; offset?: number }) => {
    const qs = params ? `?limit=${params.limit ?? 20}&offset=${params.offset ?? 0}` : '';
    return apiFetch(`/workspaces/${workspaceId}/evaluations${qs}`);
  },

  getEvaluation: (evaluationId: string) =>
    apiFetch(`/evaluations/${evaluationId}`),

  // ── Analytics ──────────────────────────────────────────────────────────────
  getAnalytics: (workspaceId: string, days = 30) =>
    apiFetch(`/workspaces/${workspaceId}/analytics?days=${days}`),

  // ── Billing ────────────────────────────────────────────────────────────────
  getBillingReport: (workspaceId: string, year: number, month: number) =>
    apiFetch(`/workspaces/${workspaceId}/billing/report?year=${year}&month=${month}`),

  listBillingRecords: (workspaceId: string) =>
    apiFetch(`/workspaces/${workspaceId}/billing/history`),

  upgradePlan: (workspaceId: string, tier: string, paymentMethodId?: string) =>
    apiFetch(`/workspaces/${workspaceId}/upgrade`, {
      method: 'POST',
      body: JSON.stringify({ tier, payment_method_id: paymentMethodId }),
    }),
};
