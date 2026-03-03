export interface CompareRequest {
  prompt: string;
  models: string[];
}

export interface ModelResponse {
  model: string;
  content: string;
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  cost: number;
}