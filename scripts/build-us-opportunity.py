#!/usr/bin/env python3
"""
Build lib/data/us-opportunity-atlas.json — upward-mobility outcomes per census
tract from the Opportunity Atlas (Chetty, Friedman, Hendren, Jones & Porter,
"The Opportunity Atlas: Mapping the Childhood Roots of Social Mobility", 2018).

Run:  python3 scripts/build-us-opportunity.py
Standard library only.

Source: Opportunity Insights, tract_outcomes_simple.csv
(https://opportunityinsights.org/data/ — "All Outcomes by Census Tract, Race,
Gender and Parental Income Percentile", simplified file). Children born
1978–1983, outcomes measured in 2014–2015, on 2010 census tract boundaries —
so the app looks tracts up with the Census Geocoder's 2010 vintage.

Kept per tract (the "pooled" estimates, all races and genders):
  - kfr_pooled_pooled_p25: mean household income rank at age ~35 of children
    whose parents were at the 25th national income percentile, stored as a
    percentile ×10 (an integer, e.g. 408 = 40.8th percentile)
  - pooled_pooled_count: children in the estimate (small counts are noisy)
The national mean (weighted by children) is stored for comparison.

Format: tracts["SSCCC"]["TTTTTT"] = [percentile×10, children].
"""

import csv
import io
import json
import os
import urllib.request
from datetime import date

URL = "https://opportunityinsights.org/wp-content/uploads/2018/10/tract_outcomes_simple.csv"
OUT = os.path.join(os.path.dirname(__file__), "..", "lib", "data", "us-opportunity-atlas.json")


def main() -> None:
    req = urllib.request.Request(URL, headers={"User-Agent": "Liveability data build (contact@liveability.live)"})
    with urllib.request.urlopen(req, timeout=600) as res:
        text = res.read().decode("utf-8")

    tracts: dict = {}
    weighted = weight = 0.0
    kept = 0
    for r in csv.DictReader(io.StringIO(text)):
        kfr, n = r.get("kfr_pooled_pooled_p25"), r.get("pooled_pooled_count")
        if not kfr or not n:
            continue
        try:
            value, count = float(kfr), int(float(n))
        except ValueError:
            continue
        county = f"{int(r['state']):02d}{int(r['county']):03d}"
        tract = f"{int(r['tract']):06d}"
        tracts.setdefault(county, {})[tract] = [round(value * 1000), count]
        weighted += value * count
        weight += count
        kept += 1

    out = {
        "generated": date.today().isoformat(),
        "source": "Opportunity Insights, The Opportunity Atlas (2018), tract_outcomes_simple.csv",
        "sourceUrl": "https://www.opportunityatlas.org/",
        "cohort": "Children born 1978–1983; adult household income measured 2014–2015",
        "tractVintage": 2010,
        "nationalMeanP25": round(weighted / weight * 1000),
        "tracts": dict(sorted(tracts.items())),
    }
    with open(OUT, "w") as fh:
        json.dump(out, fh, separators=(",", ":"))
    print(f"wrote {kept} tracts in {len(tracts)} counties to {os.path.relpath(OUT)} ({os.path.getsize(OUT) // 1024} KB); national mean p25 = {out['nationalMeanP25'] / 10}")


if __name__ == "__main__":
    main()
