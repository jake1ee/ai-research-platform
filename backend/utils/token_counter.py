"""
Token counting utilities.

Uses tiktoken for OpenAI-compatible models and falls back to a simple
whitespace approximation for providers that use different tokenisers
(Anthropic, Google, Cohere, etc.).

Example
-------
    from utils.token_counter import count_tokens

    n = count_tokens("Hello, world!", model="gpt-4o")          # 5
    n = count_tokens("Hello, world!", model="claude-3-5-sonnet") # approx
"""

import re
from functools import lru_cache
from typing import Optional

try:
    import tiktoken
    _TIKTOKEN_AVAILABLE = True
except ImportError:
    _TIKTOKEN_AVAILABLE = False


# Models known to use the cl100k_base encoding (GPT-4, GPT-3.5, embeddings …)
_CL100K_MODELS = {
    "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo",
    "text-embedding-3-small", "text-embedding-3-large",
}


@lru_cache(maxsize=8)
def _get_encoding(model: str):
    """Cache tiktoken encodings so they're only loaded once per process."""
    try:
        return tiktoken.encoding_for_model(model)
    except KeyError:
        # Fall back to cl100k if the exact model name is unknown to tiktoken
        return tiktoken.get_encoding("cl100k_base")


def _approx_token_count(text: str) -> int:
    """
    Rough approximation: ~4 characters per token on average for English text.
    Used when tiktoken is unavailable or for non-OpenAI models.
    """
    return max(1, len(text) // 4)


def count_tokens(text: str, model: str = "gpt-4o") -> int:
    """
    Count the number of tokens in *text* for the given *model*.

    Parameters
    ----------
    text  : The string to tokenise.
    model : A LiteLLM model string (e.g. "gpt-4o", "claude-3-5-sonnet-20241022").
            The provider prefix ("openai/", "anthropic/") is stripped before lookup.

    Returns
    -------
    int – token count (exact for OpenAI models, approximate for others).
    """
    # Strip provider prefix if present (e.g. "openai/gpt-4o" → "gpt-4o")
    bare_model = model.split("/")[-1] if "/" in model else model

    if _TIKTOKEN_AVAILABLE:
        return len(_get_encoding(bare_model).encode(text))

    return _approx_token_count(text)


def count_messages_tokens(messages: list[dict], model: str = "gpt-4o") -> int:
    """
    Count tokens for an OpenAI-style messages list.
    Accounts for the ~4-token overhead per message (role + separator).

    Parameters
    ----------
    messages : List of {"role": str, "content": str} dicts.
    model    : Model name for encoding selection.
    """
    total = 0
    for msg in messages:
        # Each message has ~4 overhead tokens
        total += 4
        for value in msg.values():
            total += count_tokens(str(value), model=model)
    # +2 for the conversation-level priming
    return total + 2
