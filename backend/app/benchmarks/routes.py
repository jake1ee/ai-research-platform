"""Public, versioned, cacheable read API: /v1/*"""

import csv
import hashlib
import io
import json
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import PlainTextResponse

from app.benchmarks import service
from app.benchmarks.dataset import Dataset
from app.core.config import settings
from app.utils.rate_limiter import rate_limit_dependency

router = APIRouter(
    prefix="/v1",
    tags=["public"],
    dependencies=[Depends(rate_limit_dependency(settings.PUBLIC_RATE_LIMIT_PER_MIN, 60, "v1"))],
)

CACHE = "public, max-age=300, stale-while-revalidate=3600"
LICENSE_NOTE = "CC BY-NC 4.0 - attribution required, non-commercial use."


def get_ds() -> Dataset:
    return service.current_dataset()


def _cached(request: Request, payload: Any) -> Response:
    """JSON response with a content-hash ETag and 304 support."""
    body = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    etag = '"' + hashlib.sha256(body.encode()).hexdigest()[:20] + '"'
    headers = {"ETag": etag, "Cache-Control": CACHE}
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers=headers)
    return Response(body, media_type="application/json", headers=headers)


def _found(value: Any, what: str) -> Any:
    if value is None:
        raise HTTPException(status_code=404, detail=f"{what} not found")
    return value


@router.get("/leaderboard")
def get_leaderboard(
    request: Request,
    category: str | None = None,
    license: Literal["open", "proprietary"] | None = None,
    provider: str | None = None,
    q: str | None = Query(None, max_length=80),
    sort: Literal["rank", "score", "name", "price", "context", "speed"] = "rank",
    order: Literal["asc", "desc"] = "asc",
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    ds: Dataset = Depends(get_ds),
):
    if category and category not in {c["slug"] for c in ds.categories}:
        raise HTTPException(status_code=422, detail="Unknown category")
    return _cached(
        request,
        service.leaderboard(
            ds, category=category, license=license, provider=provider, q=q,
            sort=sort, order=order, page=page, page_size=page_size,
        ),
    )


@router.get("/categories")
def get_categories(request: Request, ds: Dataset = Depends(get_ds)):
    return _cached(request, ds.categories)


@router.get("/providers")
def get_providers(request: Request, ds: Dataset = Depends(get_ds)):
    return _cached(request, list(ds.providers.values()))


@router.get("/models")
def list_models(request: Request, ds: Dataset = Depends(get_ds)):
    return _cached(request, service.export_models(ds))


@router.get("/models/{slug}")
def get_model(slug: str, request: Request, ds: Dataset = Depends(get_ds)):
    return _cached(request, _found(service.model_detail(ds, slug), "Model"))


@router.get("/benchmarks")
def list_benchmarks(request: Request, ds: Dataset = Depends(get_ds)):
    return _cached(request, service.benchmarks_directory(ds))


@router.get("/benchmarks/{slug}")
def get_benchmark(slug: str, request: Request, ds: Dataset = Depends(get_ds)):
    return _cached(request, _found(service.benchmark_detail(ds, slug), "Benchmark"))


@router.get("/compare")
def get_compare(
    request: Request,
    models: str = Query(..., description="Comma-separated slugs, 2-5"),
    ds: Dataset = Depends(get_ds),
):
    slugs = list(dict.fromkeys(s.strip() for s in models.split(",") if s.strip()))
    if not 2 <= len(slugs) <= 5:
        raise HTTPException(status_code=422, detail="Provide between 2 and 5 distinct models")
    return _cached(request, _found(service.compare(ds, slugs), "One or more models"))


@router.get("/recommend")
def get_recommend(
    request: Request,
    max_price: float | None = Query(None, ge=0),
    ds: Dataset = Depends(get_ds),
):
    return _cached(request, service.recommend(ds, max_price))


@router.get("/stats")
def get_stats(request: Request, ds: Dataset = Depends(get_ds)):
    return _cached(request, service.stats(ds))


@router.get("/methodology")
def get_methodology(request: Request, ds: Dataset = Depends(get_ds)):
    return _cached(request, service.methodology(ds))


# ── Dataset downloads ─────────────────────────────────────────────────────────
def _exports(ds: Dataset) -> dict[str, list[dict[str, Any]]]:
    return {
        "leaderboard": service.leaderboard(ds, page_size=10_000)["items"],
        "models": service.export_models(ds),
        "benchmarks": service.benchmarks_directory(ds),
        "pricing": service.export_pricing(ds),
        "speed": service.export_speed(ds),
    }


@router.get("/data/manifest.json")
def data_manifest(request: Request, ds: Dataset = Depends(get_ds)):
    files = {}
    for name, rows in _exports(ds).items():
        digest = hashlib.sha256(json.dumps(rows, sort_keys=True).encode()).hexdigest()
        files[f"{name}.json"] = {"rows": len(rows), "sha256": digest}
    return _cached(request, {"license": LICENSE_NOTE, "sample_data": bool(ds.meta.get("sample")), "files": files})


@router.get("/data/{name}.{ext}")
def data_file(name: str, ext: Literal["json", "csv"], request: Request, ds: Dataset = Depends(get_ds)):
    rows = _exports(ds).get(name)
    if rows is None:
        raise HTTPException(status_code=404, detail="Unknown dataset")
    if ext == "json":
        return _cached(request, {"license": LICENSE_NOTE, "data": rows})

    buf = io.StringIO()
    flat = [
        {k: (json.dumps(v) if isinstance(v, dict | list) else v) for k, v in r.items()} for r in rows
    ]
    if flat:
        writer = csv.DictWriter(buf, fieldnames=list(flat[0].keys()))
        writer.writeheader()
        writer.writerows(flat)
    return PlainTextResponse(
        buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{name}.csv"', "Cache-Control": CACHE},
    )

