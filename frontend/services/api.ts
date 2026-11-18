/**
 * API service layer – all calls to the FastAPI backend live here.
 *
 * Import pattern:
 *   import { api } from '@/services/api';
 *   import { compareModels } from '@/services/api';
 */

import { supabase } from '@/lib/supabase';
import type {
  AnalyticsSummary,
  EvaluateRequest,
  EvaluateResponse,
  LabModel,
  MyUsage,
  MyWorkspace,
} from '@/types/api';

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
      errorMessage = errorData.error?.message || errorData.detail || errorMessage;
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
  getMe: () => apiFetch('/users/me'),
  getMyUsage: () => apiFetch<MyUsage>('/users/me/usage'),

  // ── Lab ────────────────────────────────────────────────────────────────────
  listLabModels: () => apiFetch<LabModel[]>('/lab/models'),

  // ── Workspaces ─────────────────────────────────────────────────────────────
  listWorkspaces: () => apiFetch<MyWorkspace[]>('/users/me/workspaces'),

  createWorkspace: (name: string) =>
    apiFetch('/workspaces', { method: 'POST', body: JSON.stringify({ name }) }),

  getWorkspace: (id: string) =>
    apiFetch(`/workspaces/${id}`),

  getWorkspaceUsage: (id: string) =>
    apiFetch(`/workspaces/${id}/usage`),

  // ── Evaluations ────────────────────────────────────────────────────────────

  /** Synchronous evaluation (blocks until all LLMs respond). */
  runEvaluation: (body: EvaluateRequest) =>
    apiFetch<EvaluateResponse>('/evaluate', { method: 'POST', body: JSON.stringify(body) }),

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
  /** Personal analytics by default; pass a workspace id for workspace analytics. */
  getAnalytics: (days = 30, workspaceId?: string) =>
    apiFetch<AnalyticsSummary>(`/analytics?days=${days}${workspaceId ? `&workspace_id=${workspaceId}` : ''}`),

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
