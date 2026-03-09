"""
LLM-as-a-Judge scoring service.

Import pattern:
    from app.services.llm_judge import score_with_judge, JudgeScore
"""

import asyncio
import json
import re
from dataclasses import dataclass
from typing import Dict, Optional

from litellm import acompletion

from app.core.config import settings


@dataclass
class JudgeScore:
    score: Optional[float]      # 0.0 – 10.0, None if parsing failed
    reasoning: Optional[str]
    error: Optional[str] = None


_SYSTEM_PROMPT = """\
You are an objective AI evaluator. Your task is to score an AI model's response
to a given prompt on a scale from 0 to 10, where:
  0   = completely wrong, harmful, or irrelevant
  5   = partially correct or acceptable but not ideal
  10  = perfect, accurate, helpful, and well-structured

Reply ONLY with a valid JSON object in this exact format:
{"score": <number>, "reasoning": "<one to three sentences>"}
"""

_USER_PROMPT_TEMPLATE = """\
Original prompt:
{prompt}

Model's response:
{output}

Rate the response above.
"""


def _parse_judge_response(text: str) -> tuple[Optional[float], Optional[str]]:
    try:
        data = json.loads(text.strip())
        score = float(data.get("score", -1))
        if not 0 <= score <= 10:
            raise ValueError("Score out of range")
        return round(score, 2), data.get("reasoning")
    except (json.JSONDecodeError, ValueError, TypeError):
        pass

    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fence_match:
        try:
            data = json.loads(fence_match.group(1))
            return round(float(data["score"]), 2), data.get("reasoning")
        except (json.JSONDecodeError, KeyError, ValueError):
            pass

    score_match = re.search(r'"?score"?\s*:\s*([0-9]+(?:\.[0-9]+)?)', text)
    reasoning_match = re.search(r'"?reasoning"?\s*:\s*"([^"]+)"', text)
    if score_match:
        score = round(float(score_match.group(1)), 2)
        reasoning = reasoning_match.group(1) if reasoning_match else None
        return score, reasoning

    return None, None


async def _score_single(
    prompt: str,
    model_id: str,
    output: str,
    judge_model: str,
) -> JudgeScore:
    user_content = _USER_PROMPT_TEMPLATE.format(prompt=prompt, output=output)
    try:
        response = await acompletion(
            model=judge_model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            temperature=0,
            timeout=settings.LLM_TIMEOUT_SECONDS,
        )
        judge_text = response.choices[0].message.content or ""
        score, reasoning = _parse_judge_response(judge_text)

        if score is None:
            return JudgeScore(
                score=None,
                reasoning=None,
                error=f"Failed to parse judge response: {judge_text[:200]}",
            )
        return JudgeScore(score=score, reasoning=reasoning)

    except Exception as exc:
        return JudgeScore(score=None, reasoning=None, error=str(exc))


async def score_with_judge(
    prompt: str,
    outputs: Dict[str, str],
    judge_model: Optional[str] = None,
) -> Dict[str, JudgeScore]:
    """Score all model outputs in parallel using an LLM judge."""
    judge = judge_model or f"openai/{settings.DEFAULT_JUDGE_MODEL}"
    to_score = {mid: out for mid, out in outputs.items() if out}

    tasks = {
        model_id: _score_single(
            prompt=prompt,
            model_id=model_id,
            output=output,
            judge_model=judge,
        )
        for model_id, output in to_score.items()
    }

    results_list = await asyncio.gather(*tasks.values())
    scores: Dict[str, JudgeScore] = dict(zip(tasks.keys(), results_list))

    for model_id in outputs:
        if model_id not in scores:
            scores[model_id] = JudgeScore(
                score=None, reasoning=None, error="No output to judge"
            )

    return scores
