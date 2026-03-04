export interface Model {
  id: string;
  provider: string;
  name: string;
  contextWindow: number;
  costPer1kInput: number;
  costPer1kOutput: number;
}

export interface EvaluationResult {
  modelId: string;
  output: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  tokensPerSecond: number;
  isJsonValid?: boolean;
  judgeScore?: number;
  judgeReasoning?: string;
  similarityScore?: number;
  confidenceScore?: number;
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
}

export const AVAILABLE_MODELS: Model[] = [
  { id: 'gpt-4o', provider: 'OpenAI', name: 'GPT-4o', contextWindow: 128000, costPer1kInput: 0.005, costPer1kOutput: 0.015 },
  { id: 'gpt-4-turbo', provider: 'OpenAI', name: 'GPT-4 Turbo', contextWindow: 128000, costPer1kInput: 0.01, costPer1kOutput: 0.03 },
  { id: 'gpt-3.5-turbo', provider: 'OpenAI', name: 'GPT-3.5 Turbo', contextWindow: 16385, costPer1kInput: 0.0005, costPer1kOutput: 0.0015 },
  { id: 'claude-3-opus', provider: 'Anthropic', name: 'Claude 3 Opus', contextWindow: 200000, costPer1kInput: 0.015, costPer1kOutput: 0.075 },
  { id: 'claude-3-sonnet', provider: 'Anthropic', name: 'Claude 3 Sonnet', contextWindow: 200000, costPer1kInput: 0.003, costPer1kOutput: 0.015 },
  { id: 'claude-3-haiku', provider: 'Anthropic', name: 'Claude 3 Haiku', contextWindow: 200000, costPer1kInput: 0.00025, costPer1kOutput: 0.00125 },
  { id: 'gemini-1.5-pro', provider: 'Google', name: 'Gemini 1.5 Pro', contextWindow: 1000000, costPer1kInput: 0.0035, costPer1kOutput: 0.0105 },
  { id: 'gemini-1.5-flash', provider: 'Google', name: 'Gemini 1.5 Flash', contextWindow: 1000000, costPer1kInput: 0.000075, costPer1kOutput: 0.0003 },
  { id: 'llama-3-70b', provider: 'Meta', name: 'Llama 3 70B', contextWindow: 8192, costPer1kInput: 0.00059, costPer1kOutput: 0.00079 },
];
