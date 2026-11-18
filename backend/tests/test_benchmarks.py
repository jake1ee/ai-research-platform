import pytest

from app.benchmarks import scoring
from app.benchmarks.dataset import from_dict, load_from_file


def _tiny(results):
    return from_dict(
        {
            "categories": [{"slug": c, "name": c, "weight": w} for c, w in [("a", 0.5), ("b", 0.3), ("c", 0.2)]],
            "providers": [{"slug": "p", "name": "P"}],
            "benchmarks": [{"slug": f"{c}1", "name": c, "category": c} for c in "abc"],
            "models": [
                {"slug": s, "name": s, "family": s, "provider": "p", "license": "open",
                 "context_window": 1, "input_price": 0, "output_price": 0,
                 "tokens_per_sec": 1, "first_token_ms": 1, "release_date": "2026-01-01"}
                for s in ("m1", "m2")
            ],
            "results": results,
        }
    )


def _r(model, bench, score, prov="independent", src="X"):
    return {"model": model, "benchmark": bench, "score": score, "provenance": prov,
            "source": src, "source_url": "u", "measured_at": "2026-01-01"}


def test_weighted_overall_and_no_interpolation():
    ds = _tiny([_r("m1", "a1", 80), _r("m1", "b1", 60), _r("m1", "c1", 40)])
    s = scoring.score_model(ds, "m1")
    assert s.overall == pytest.approx(80 * 0.5 + 60 * 0.3 + 40 * 0.2)


def test_missing_category_renormalises_weights():
    ds = _tiny([_r("m1", "a1", 80), _r("m1", "b1", 60)])
    assert scoring.score_model(ds, "m1").evidence == "unranked"  # < 3 categories


def test_close_call_rule_swaps_estimated_below_supported():
    ds = _tiny(
        [_r("m1", b, 90, "lab") for b in ("a1", "b1", "c1")]  # estimated, 90
        + [_r("m2", b, 89, "independent", "EvalHub") for b in ("a1", "b1", "c1")]
        + [_r("m2", "a1", 89, "maintainer", "Maint")]
    )
    ranked = scoring.rank_models(ds)
    assert [s.slug for s in ranked] == ["m2", "m1"]


def test_sample_dataset_endpoints(client):
    assert len(load_from_file().models) > 5
    r = client.get("/v1/leaderboard?page_size=5")
    assert r.status_code == 200 and r.json()["items"][0]["rank"] == 1
    etag = r.headers["etag"]
    assert client.get("/v1/leaderboard?page_size=5", headers={"If-None-Match": etag}).status_code == 304
    assert client.get("/v1/leaderboard?category=nope").status_code == 422


def test_compare_validation_and_result(client):
    slugs = [m["slug"] for m in client.get("/v1/models").json()][:3]
    ok = client.get("/v1/compare", params={"models": ",".join(slugs)})
    assert ok.status_code == 200 and ok.json()["verdict"]
    assert client.get("/v1/compare", params={"models": slugs[0]}).status_code == 422
    assert client.get("/v1/compare", params={"models": "x,y"}).status_code == 404


def test_detail_downloads_and_recommend(client):
    slug = client.get("/v1/models").json()[0]["slug"]
    assert client.get(f"/v1/models/{slug}").json()["results"]
    assert client.get("/v1/models/nope").status_code == 404
    assert client.get("/v1/data/leaderboard.csv").text.startswith("slug,")
    assert client.get("/v1/data/manifest.json").json()["files"]
    assert client.get("/v1/recommend").json()["picks"]
    assert client.get("/v1/stats").json()["sample_data"] is True
