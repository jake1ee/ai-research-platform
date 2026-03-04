export interface CompareRequest {
  prompt: string;
  models: string[];
  advancedOptions?: {
    llmAsJudge?: boolean;
    similarityScore?: boolean;
    jsonValidation?: boolean;
    deterministic?: boolean;
  };
}

export interface ModelResponse {
  model: string;
  content: string;
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  cost: number;
}
