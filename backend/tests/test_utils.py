from app.utils.badge_assigner import assign_badges


def test_badges_fastest_and_cheapest():
    results = [
        {"latency_ms": 100, "cost_usd": 0.02, "judge_score": 7},
        {"latency_ms": 300, "cost_usd": 0.01, "judge_score": 9},
    ]
    out = assign_badges(results)
    assert "fastest" in out[0]["badges"]
    assert "cheapest" in out[1]["badges"]
    assert "best_quality" in out[1]["badges"]


def test_errors_ignored():
    out = assign_badges([{"error": "boom", "latency_ms": 1, "cost_usd": 0}])
    assert out[0]["badges"] == []
