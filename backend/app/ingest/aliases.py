"""
Maps each of your model slugs to identifiers in external sources.

backend/data/aliases.json:
{
  "my-model-slug": {
    "openrouter": "provider/model-id",   // id in OpenRouter's /models list
    "litellm": "model-key",              // key in LiteLLM's price table
    "probe": "provider/model"            // LiteLLM model string used for latency probes
  }
}
All keys are optional. Models without an alias are never touched by ingestion.
"""

import json
from pathlib import Path

ALIASES_FILE = Path(__file__).parent.parent.parent / "data" / "aliases.json"


def load_aliases(path: Path = ALIASES_FILE) -> dict[str, dict[str, str]]:
    if not path.exists():
        return {}
    raw = json.loads(path.read_text(encoding="utf-8"))
    return {slug: {k: v for k, v in a.items() if isinstance(v, str)} for slug, a in raw.items()}
