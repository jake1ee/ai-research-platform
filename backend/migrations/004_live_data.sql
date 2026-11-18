-- Tracks when ingestion last refreshed a model's price / context / speed.
ALTER TABLE public.benchmark_models ADD COLUMN IF NOT EXISTS live_updated_at TIMESTAMPTZ;
