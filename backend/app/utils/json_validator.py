"""
JSON output validation utility.

Import pattern:
    from app.utils.json_validator import validate_json_output, ValidationResult
"""

import json
from dataclasses import dataclass
from typing import Any, Optional

try:
    import jsonschema
    _HAS_JSONSCHEMA = True
except ImportError:
    _HAS_JSONSCHEMA = False


@dataclass
class ValidationResult:
    is_valid: bool
    error: Optional[str] = None
    parsed: Optional[Any] = None


def validate_json_output(
    text: str,
    schema: Optional[dict] = None,
) -> ValidationResult:
    """
    Validate that *text* is valid JSON, optionally conforming to *schema*.

    Parameters
    ----------
    text   : Raw text output from the LLM.
    schema : JSON Schema dict. If None, only basic JSON validity is checked.
    """
    try:
        parsed = json.loads(text.strip())
    except json.JSONDecodeError as exc:
        return ValidationResult(is_valid=False, error=f"Invalid JSON: {exc}")

    if schema is not None:
        if not _HAS_JSONSCHEMA:
            return ValidationResult(
                is_valid=True,
                parsed=parsed,
                error="jsonschema package not installed – schema validation skipped",
            )
        try:
            jsonschema.validate(instance=parsed, schema=schema)
        except jsonschema.ValidationError as exc:
            return ValidationResult(is_valid=False, error=exc.message, parsed=parsed)

    return ValidationResult(is_valid=True, parsed=parsed)
