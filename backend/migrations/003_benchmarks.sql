-- Public benchmark data (leaderboard domain). Apply to a dev/branch project first.
-- `models` is already used by the evaluation lab, so leaderboard models live in benchmark_models.

CREATE TABLE IF NOT EXISTS public.benchmark_categories (
    slug   TEXT PRIMARY KEY,
    name   TEXT NOT NULL,
    weight NUMERIC(5,4) NOT NULL CHECK (weight > 0 AND weight <= 1)
);

CREATE TABLE IF NOT EXISTS public.providers (
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.benchmark_models (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    family          TEXT NOT NULL,
    provider_id     UUID NOT NULL REFERENCES public.providers(id),
    license_type    TEXT NOT NULL CHECK (license_type IN ('open', 'proprietary')),
    context_window  INTEGER NOT NULL CHECK (context_window > 0),
    input_price     NUMERIC(10,4) NOT NULL DEFAULT 0,   -- USD per 1M tokens
    output_price    NUMERIC(10,4) NOT NULL DEFAULT 0,
    tokens_per_sec  NUMERIC(8,2) NOT NULL DEFAULT 0,
    first_token_ms  INTEGER NOT NULL DEFAULT 0,
    release_date    DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.benchmarks (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug          TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    category_slug TEXT NOT NULL REFERENCES public.benchmark_categories(slug),
    description   TEXT NOT NULL DEFAULT '',
    year          INTEGER,
    format        TEXT,
    difficulty    TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    source_url    TEXT,
    display_only  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.benchmark_results (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id    UUID NOT NULL REFERENCES public.benchmark_models(id) ON DELETE CASCADE,
    benchmark_id UUID NOT NULL REFERENCES public.benchmarks(id) ON DELETE CASCADE,
    score       NUMERIC(6,2) NOT NULL CHECK (score >= 0 AND score <= 100),
    provenance  TEXT NOT NULL CHECK (provenance IN ('lab', 'maintainer', 'independent', 'third_party')),
    source      TEXT NOT NULL,
    source_url  TEXT NOT NULL,
    measured_at DATE NOT NULL,
    UNIQUE (model_id, benchmark_id, source)
);

CREATE INDEX IF NOT EXISTS idx_results_model ON public.benchmark_results(model_id);
CREATE INDEX IF NOT EXISTS idx_results_benchmark ON public.benchmark_results(benchmark_id);

-- Public data: anyone may read, only the service role may write (no write policies).
ALTER TABLE public.benchmark_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_models     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmarks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_results    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON public.benchmark_categories FOR SELECT USING (true);
CREATE POLICY "public read" ON public.providers            FOR SELECT USING (true);
CREATE POLICY "public read" ON public.benchmark_models     FOR SELECT USING (true);
CREATE POLICY "public read" ON public.benchmarks           FOR SELECT USING (true);
CREATE POLICY "public read" ON public.benchmark_results    FOR SELECT USING (true);
