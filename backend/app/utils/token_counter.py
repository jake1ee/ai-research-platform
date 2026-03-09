"""
Token counting utility with tiktoken + fallback.

Import pattern:
    from app.utils.token_counter import count_tokens
"""

from typing import Optional

try:
    import tiktoken
    _HAS_TIKTOKEN = True
except ImportError:
    _HAS_TIKTOKEN = False


def count_tokens(text: str, model_id: Optional[str] = None) -> int:
    """
    Count tokens in *text* for the given model.

    Uses tiktoken when available; falls back to a word-count estimate otherwise.
    """
    if _HAS_TIKTOKEN:
        try:
            bare = model_id.split("/")[-1] if model_id and "/" in model_id else model_id
            enc = tiktoken.encoding_for_model(bare or "gpt-4o")
            return len(enc.encode(text))
        except Exception:
            pass

    # Fallback: ~4 chars per token (rough estimate)
    return max(1, len(text) // 4)
