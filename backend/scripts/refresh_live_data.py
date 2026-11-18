"""
Refresh live model data now (same code the Celery beat jobs run).

    python scripts/refresh_live_data.py --metadata   # price / context / release date
    python scripts/refresh_live_data.py --speed      # latency probe (spends tokens)
    python scripts/refresh_live_data.py --discover gpt   # find OpenRouter ids for aliases.json
"""

import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.ingest import pipeline, sources  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--metadata", action="store_true")
    ap.add_argument("--speed", action="store_true")
    ap.add_argument("--discover", metavar="TEXT", help="search OpenRouter model ids")
    args = ap.parse_args()
    if args.discover:
        for mid, info in sorted(sources.fetch_openrouter().items()):
            if args.discover.lower() in mid.lower():
                print(f"{mid:60} in ${info.get('input_price')} out ${info.get('output_price')}")
        return
    if not (args.metadata or args.speed):
        ap.error("choose --metadata and/or --speed")
    if args.metadata:
        print("metadata:", json.dumps(asdict(pipeline.refresh_metadata()), indent=1))
    if args.speed:
        print("speed:", json.dumps(asdict(pipeline.refresh_speed()), indent=1))


if __name__ == "__main__":
    main()
