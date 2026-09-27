#!/usr/bin/env python3
"""
Build lib/data/estv-tax-locations.json — BFS commune number → ESTV TaxLocationID.

Run:  python3 scripts/build-estv-locations.py [TAX_YEAR]

Why a static index: the ESTV tax calculator (swisstaxcalculator.estv.admin.ch)
has no lookup by BFS number. Its API_searchLocation matches postcode or place
name only, though every result carries the commune's BfsID. Enumerating every
postcode prefix (and splitting any prefix that hits the API's 200-result cap)
reaches every location, so the complete BFS → location map can be built once.
Resolving by commune name at runtime would be fragile: geo.admin.ch and ESTV
disagree on names ("Biel (BE)" vs "Biel/Bienne").

All locations within one commune share the same tax rates (the communal
multiplier is per commune), so one TaxLocationID per BFS number is enough.

The script cross-checks the result against the FSO official commune register
(AGV snapshot for 1 January of the tax year) and fails if any commune is
missing or extra. Re-run it each year when ESTV publishes a new tax year;
lib/tax.ts reads taxYear from the generated file, so no code change is needed.

No project dependency: standard library only.
"""

import csv
import io
import json
import sys
import time
import urllib.request
from datetime import date
from pathlib import Path

ESTV = 'https://swisstaxcalculator.estv.admin.ch/delegate/ost-integration/v1/lg-proxy/operation/c3b67379_ESTV'
AGV = 'https://www.agvchapp.bfs.admin.ch/api/communes/snapshot?date=01-01-{year}'
RESULT_CAP = 200  # API_searchLocation silently truncates at this many results
OUT = Path(__file__).resolve().parent.parent / 'lib' / 'data' / 'estv-tax-locations.json'


def post(operation: str, body: dict) -> dict:
    req = urllib.request.Request(
        f'{ESTV}/{operation}',
        data=json.dumps(body).encode(),
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=30) as res:
        return json.load(res)['response']


def search(prefix: str, year: int) -> list[dict]:
    return post('API_searchLocation', {'Search': prefix, 'Language': 1, 'TaxYear': year}) or []


def fso_communes(year: int) -> dict[int, str]:
    with urllib.request.urlopen(AGV.format(year=year), timeout=60) as res:
        text = res.read().decode('utf-8-sig')
    # Level 3 rows are political communes
    return {int(r['BfsCode']): r['Name'] for r in csv.DictReader(io.StringIO(text)) if r['Level'] == '3'}


def main() -> None:
    year_range = post('API_getTaxYearRange', {'Calculator': 1})  # 1 = income & wealth tax
    tax_year = int(sys.argv[1]) if len(sys.argv) > 1 else int(year_range['MaxYear'])
    print(f'ESTV income tax years {year_range["MinYear"]}–{year_range["MaxYear"]}; building {tax_year}')

    locations: dict[int, dict] = {}
    queue = [str(p) for p in range(10, 100)]  # single characters return nothing
    calls = 0
    while queue:
        prefix = queue.pop(0)
        results = search(prefix, tax_year)
        calls += 1
        time.sleep(0.1)
        if len(results) >= RESULT_CAP:
            if len(prefix) >= 4:
                sys.exit(f'Prefix {prefix} still capped at {RESULT_CAP}; cannot enumerate it')
            queue += [prefix + str(d) for d in range(10)]
            continue
        for r in results:
            locations[r['TaxLocationID']] = r

    by_bfs: dict[int, dict] = {}
    for loc in sorted(locations.values(), key=lambda r: r['TaxLocationID']):
        by_bfs.setdefault(loc['BfsID'], loc)  # lowest TaxLocationID per commune

    fso = fso_communes(tax_year)
    missing = sorted(set(fso) - set(by_bfs))
    extra = sorted(set(by_bfs) - set(fso))
    print(f'{calls} searches, {len(locations)} locations, {len(by_bfs)} communes; FSO register: {len(fso)}')
    if missing or extra:
        sys.exit(f'Mismatch with FSO register — missing: {missing[:20]} extra: {extra[:20]}')

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        'taxYear': tax_year,
        'generated': date.today().isoformat(),
        'source': 'ESTV tax calculator API_searchLocation (swisstaxcalculator.estv.admin.ch); '
                  f'verified complete against the FSO commune register of 1 January {tax_year}',
        # bfs -> [TaxLocationID, canton]
        'locations': {str(b): [loc['TaxLocationID'], loc['Canton']] for b, loc in sorted(by_bfs.items())},
    }, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f'Wrote {OUT.relative_to(OUT.parent.parent.parent)}')


if __name__ == '__main__':
    main()
