"""
JSON / structured output validation utilities.

Validates that a model's text output:
  1. Is valid JSON (parseable without errors).
  2. Conforms to a user-supplied JSON Schema (optional).

Uses the stdlib `json` module for parsing and `jsonschema` for schema validation.

Example
-------
    from utils.json_validator import validate_json_output

    result = validate_json_output('{"name": "Alice", "age": 30}', schema={
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "age":  {"type": "integer"},
        },
        "required": ["name", "age"],
    })
    result.is_valid   # True
    result.parsed     # {"name": "Alice", "age": 30}
    result.error      # None
"""

import json
import re
from dataclasses import dataclass
from typing import Any, Optional

try:
    import jsonschema
    _JSONSCHEMA_AVAILABLE = True
except ImportError:
    _JSONSCHEMA_AVAILABLE = False


@dataclass
class ValidationResult:
    is_valid: bool
    parsed: Optional[Any]     # The parsed Python object if valid JSON
    error: Optional[str]      # Human-readable error message if invalid


def _extract_json_block(text: str) -> str:
    """
    Extract the first JSON object or array from *text*.

    Models sometimes wrap JSON in markdown code fences or add prose before it.
    This function strips the surrounding text so we can attempt to parse just
    the JSON portion.
    """
    # Try ```json ... ``` fence first
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, re.IGNORECASE)
    if fence_match:
        return fence_match.group(1).strip()

    # Try finding the first '{' or '[' and matching closing bracket
    start = next((i for i, c in enumerate(text) if c in "{["), None)
    if start is not None:
        return text[start:]

    return text


def validate_json_output(
    text: str,
    schema: Optional[dict] = None,
) -> ValidationResult:
    """
    Validate *text* as JSON, optionally against *schema*.

    Parameters
    ----------
    text   : Raw text from the LLM.
    schema : JSON Schema dict. If None, only parses; no schema check.

    Returns
    -------
    ValidationResult with is_valid, parsed, and error fields.
    """
    if not text or not text.strip():
        return ValidationResult(is_valid=False, parsed=None, error="Empty response")

    # Step 1: attempt to parse
    candidate = _extract_json_block(text)
    try:
        parsed = json.loads(candidate)
    except json.JSONDecodeError as exc:
        return ValidationResult(
            is_valid=False,
            parsed=None,
            error=f"JSON parse error: {exc.msg} at line {exc.lineno} col {exc.colno}",
        )

    # Step 2: schema validation (if requested and library available)
    if schema is not None:
        if not _JSONSCHEMA_AVAILABLE:
            # jsonschema not installed – skip validation, warn in error field
            return ValidationResult(
                is_valid=True,
                parsed=parsed,
                error="jsonschema not installed; schema validation skipped",
            )
        try:
            jsonschema.validate(instance=parsed, schema=schema)
        except jsonschema.ValidationError as exc:
            return ValidationResult(
                is_valid=False,
                parsed=parsed,
                error=f"Schema validation error: {exc.message}",
            )

    return ValidationResult(is_valid=True, parsed=parsed, error=None)


# ── Example usage ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    SCHEMA = {
        "type": "object",
        "properties": {
            "summary": {"type": "string"},
            "score":   {"type": "number", "minimum": 0, "maximum": 10},
            "tags":    {"type": "array", "items": {"type": "string"}},
        },
        "required": ["summary", "score"],
    }

    test_cases = [
        ('{"summary": "Great output", "score": 8.5, "tags": ["fast", "accurate"]}', SCHEMA),
        ('Here is the result:\n```json\n{"summary": "OK", "score": 6}\n```', SCHEMA),
        ("This is not JSON at all.", SCHEMA),
        ('{"summary": "Missing score field"}', SCHEMA),
    ]

    for text, schema in test_cases:
        result = validate_json_output(text, schema)
        print(f"valid={result.is_valid}  error={result.error!r}")
        print(f"  parsed={result.parsed}\n")
