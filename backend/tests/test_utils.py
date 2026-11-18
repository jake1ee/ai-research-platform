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


def test_badges_accept_db_column_names():
    out = assign_badges([
        {"latency_ms": 200, "total_cost": 0.05, "quality_score": 6},
        {"latency_ms": 100, "total_cost": 0.01, "quality_score": 9},
    ])
    assert "cheapest" in out[1]["badges"] and "best_quality" in out[1]["badges"]
