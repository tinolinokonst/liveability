#!/usr/bin/env python3
"""
Build lib/data/us-broadband.json — fixed broadband availability per US county,
split into the county's urban and rural parts, from the FCC National Broadband
Map (Broadband Data Collection).

Run:  set -a; source .env.local; set +a; python3 scripts/build-us-broadband.py
Needs FCC_USERNAME and FCC_API_TOKEN (an NBM public-data API token; create it
at broadbandmap.fcc.gov after signing in). Standard library only.

Why a prebuilt file: the FCC's public API only lists and serves bulk files —
there is no per-address or per-area query — and the location-level files
can't be placed on a map without the licensed location Fabric. The finest
public geography is the county (plus census places), which this file keeps,
with the urban/rural split the FCC publishes. The FCC releases new data twice
a year (as of June 30 and December 31, published months later); re-run this
script after each release.

Source file: "Summary by Geography Type - Other Geographies", Fixed Broadband
(bdc_us_fixed_broadband_summary_by_geography_*.csv), for the newest
availability as-of date. Kept per county and area (Total, Urban, Rural):
residential units only, and the share of units that can get
  - 100/20 Mbps by wire (technology "All Wired": copper, cable, fiber, other)
  - 1000/100 Mbps by wire
  - 100/20 Mbps by fiber
  - 100/20 Mbps by any terrestrial technology (adds licensed and unlicensed
    fixed wireless; satellite is excluded — it reaches nearly every home, so
    it would make every county look fully served)
Shares are the FCC's own figures (0-1), rounded to three decimals.

Format (compact; ~3,200 counties): counties[fips] = [name, total, urban, rural],
each area either null (no residential units there) or an array in FIELDS order.
"""

import csv
import io
import json
import os
import sys
import urllib.request
import zipfile
from datetime import date

API = "https://broadbandmap.fcc.gov/api/public/map"
OUT = os.path.join(os.path.dirname(__file__), "..", "lib", "data", "us-broadband.json")
TECH = {
    "All Wired": ("wired100", "wired1000"),
    "Fiber": ("fiber100", None),
    "Any Terrestrial": ("terrestrial100", None),
}
AREAS = {"Total": "total", "Urban": "urban", "Rural": "rural"}
FIELDS = ["units", "wired100", "wired1000", "fiber100", "terrestrial100"]


def request(path: str) -> bytes:
    user = os.environ.get("FCC_USERNAME")
    token = os.environ.get("FCC_API_TOKEN")
    if not user or not token:
        sys.exit("FCC_USERNAME and FCC_API_TOKEN must be set (source .env.local)")
    req = urllib.request.Request(
        f"{API}{path}",
        headers={"username": user, "hash_value": token, "User-Agent": "Liveability (contact@liveability.live)"},
    )
    with urllib.request.urlopen(req, timeout=600) as res:
        return res.read()


def main() -> None:
    dates = json.loads(request("/listAsOfDates"))["data"]
    as_of = max(d["as_of_date"] for d in dates if d["data_type"] == "availability")
    files = json.loads(request(f"/downloads/listAvailabilityData/{as_of}"))["data"]
    summary = [
        f for f in files
        if f["category"] == "Summary"
        and f["subcategory"] == "Summary by Geography Type - Other Geographies"
        and f["technology_type"] == "Fixed Broadband"
    ]
    if len(summary) != 1:
        sys.exit(f"expected one fixed-broadband summary file for {as_of}, found {len(summary)}")
    meta = summary[0]
    print(f"as of {as_of}: {meta['file_name']} ({meta['record_count']} rows)")

    archive = zipfile.ZipFile(io.BytesIO(request(f"/downloads/downloadFile/availability/{meta['file_id']}")))
    name = next(n for n in archive.namelist() if n.endswith(".csv"))

    counties: dict = {}
    with archive.open(name) as fh:
        for r in csv.DictReader(io.TextIOWrapper(fh, encoding="utf-8")):
            if r["geography_type"] != "County" or r["biz_res"] != "R":
                continue
            area = AREAS.get(r["area_data_type"])
            fields = TECH.get(r["technology"])
            if not area or not fields:
                continue
            c = counties.setdefault(r["geography_id"], {"name": r["geography_desc_full"]})
            a = c.setdefault(area, {"units": int(float(r["total_units"]))})
            a[fields[0]] = round(float(r["speed_100_20"]), 3)
            if fields[1]:
                a[fields[1]] = round(float(r["speed_1000_100"]), 3)

    def pack(a):
        # No residential units (e.g. a county with no urban part): no area
        if not a or not a["units"]:
            return None
        return [a.get(f) for f in FIELDS]

    out = {
        "asOf": as_of,
        "generated": date.today().isoformat(),
        "source": f"FCC National Broadband Map, {meta['file_name']}",
        "fields": FIELDS,
        "counties": {
            fips: [c["name"], pack(c.get("total")), pack(c.get("urban")), pack(c.get("rural"))]
            for fips, c in sorted(counties.items())
        },
    }
    with open(OUT, "w") as fh:
        json.dump(out, fh, separators=(",", ":"), ensure_ascii=False)
    print(f"wrote {len(counties)} counties to {os.path.relpath(OUT)} ({os.path.getsize(OUT) // 1024} KB)")


if __name__ == "__main__":
    main()
