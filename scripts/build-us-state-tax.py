#!/usr/bin/env python3
"""
Build lib/data/us-state-income-tax.json — 2026 state individual income tax
rates, brackets, standard deductions and personal exemptions/credits, for the
US Monthly Budget.

Run:  python3 scripts/build-us-state-tax.py
Needs openpyxl (pip install openpyxl).

Source: Tax Foundation, "State Individual Income Tax Rates and Brackets,
2026" (published February 2026), the workbook linked from
https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
Sheet "2026". Rates and brackets as of January 1, 2026, for single filers and
married couples filing jointly.

What is kept per state: brackets (threshold, rate) for single and joint
filers, the standard deduction, personal exemptions (as deductions, or as
credits where the table says "$X credit"), and the table's footnote letters.
Footnotes flagging rules this simple model can't follow — phase-outs, local
add-ons, capital-gains-only taxes — are kept with their text so the budget
can name them. The script refuses to write if any of the 50 states or DC is
missing.
"""

import io
import json
import os
import re
import sys
import urllib.request
from datetime import date

import openpyxl

URL = "https://taxfoundation.org/wp-content/uploads/2026/02/2026-State-Individual-Income-Tax-Rates-Brackets.xlsx"
PAGE = "https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/"
YEAR = 2026
OUT = os.path.join(os.path.dirname(__file__), "..", "lib", "data", "us-state-income-tax.json")

ABBR = {
    "Ala.": "AL", "Alaska": "AK", "Ariz.": "AZ", "Ark.": "AR", "Calif.": "CA", "Colo.": "CO", "Conn.": "CT",
    "Del.": "DE", "Fla.": "FL", "Ga.": "GA", "Hawaii": "HI", "Idaho": "ID", "Ill.": "IL", "Ind.": "IN",
    "Iowa": "IA", "Kans.": "KS", "Ky.": "KY", "La.": "LA", "Maine": "ME", "Md.": "MD", "Mass.": "MA",
    "Mich.": "MI", "Minn.": "MN", "Miss.": "MS", "Mo.": "MO", "Mont.": "MT", "Nebr.": "NE", "Nev.": "NV",
    "N.H.": "NH", "N.J.": "NJ", "N.M.": "NM", "N.Y.": "NY", "N.C.": "NC", "N.D.": "ND", "Ohio": "OH",
    "Okla.": "OK", "Ore.": "OR", "Pa.": "PA", "R.I.": "RI", "S.C.": "SC", "S.D.": "SD", "Tenn.": "TN",
    "Tex.": "TX", "Utah": "UT", "Vt.": "VT", "Va.": "VA", "Wash.": "WA", "W.Va.": "WV", "Wis.": "WI",
    "Wyo.": "WY", "D.C.": "DC",
}

# Footnotes describing rules the budget's simple bracket model leaves out
COMPLEX = {"l", "p", "q", "r", "v", "y", "z", "aa", "cc", "dd", "ee", "ff", "gg", "hh", "ii", "kk", "tt", "uu"}


def blank(v) -> bool:
    return v is None or (isinstance(v, str) and v.strip() in ("", "\xa0"))


def amount(v):
    """Number, "$X credit", or n.a./none"""
    if blank(v) or (isinstance(v, str) and v.strip().lower().rstrip(".") in ("n.a", "none")):
        return None
    if isinstance(v, (int, float)):
        return {"deduction": float(v)}
    m = re.match(r"\$([\d,]+)\s*credit", str(v).strip())
    if m:
        return {"credit": float(m.group(1).replace(",", ""))}
    sys.exit(f"unrecognised amount {v!r}")


def main() -> None:
    req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0 (Liveability data build)"})
    with urllib.request.urlopen(req, timeout=120) as res:
        wb = openpyxl.load_workbook(io.BytesIO(res.read()), data_only=True)
    rows = list(wb[str(YEAR)].iter_rows(values_only=True))

    footnote_text = {}
    for r in rows:
        first = next((c for c in r if not blank(c)), None)
        m = re.match(r"^\(([a-z]{1,2})\)\s*(.+)", str(first or ""), re.S)
        if m and len(str(first)) > 30:
            footnote_text[m.group(1)] = m.group(2).strip()

    states: dict = {}
    current = None
    for r in rows[2:]:
        label = r[0]
        # The footnotes start right after the last state: "(a) Local income taxes …"
        if isinstance(label, str) and re.match(r"^\([a-z]{1,2}\)\s", label) and len(label) > 30:
            break
        if isinstance(label, str) and not blank(label) and not label.startswith("("):
            name = re.sub(r"\s*\(.*$", "", label).strip()
            if name not in ABBR:
                if len(label) > 30:  # reached the footnotes
                    break
                sys.exit(f"unknown state label {label!r}")
            code = ABBR[name]
            current = states[code] = {
                "single": [], "married": [], "notes": re.findall(r"[a-z]{1,2}", label[len(name):]),
                "standardDeduction": {"single": amount(r[7]), "married": amount(r[8])},
                "personal": {"single": amount(r[9]), "married": amount(r[10]), "dependent": amount(r[11])},
                "none": isinstance(r[1], str) and r[1].strip().lower() == "none",
            }
        elif isinstance(label, str) and label.startswith("(") and current is not None:
            current["notes"] += re.findall(r"[a-z]{1,2}", label)
        if current is None or current["none"]:
            continue
        if isinstance(r[1], (int, float)) and isinstance(r[3], (int, float)):
            current["single"].append([float(r[3]), float(r[1])])
        if isinstance(r[4], (int, float)) and isinstance(r[6], (int, float)):
            current["married"].append([float(r[6]), float(r[4])])

    missing = sorted(set(ABBR.values()) - set(states))
    if missing:
        sys.exit(f"states missing from the sheet: {missing}")

    out_states = {}
    for code, s in sorted(states.items()):
        notes = sorted(set(s["notes"]))
        # Washington taxes capital gains only (footnote tt): no tax on wages
        wage_tax = not s["none"] and "tt" not in notes
        out_states[code] = {
            "wageTax": wage_tax,
            "single": s["single"] if wage_tax else [],
            "married": s["married"] if wage_tax else [],
            "standardDeduction": s["standardDeduction"],
            "personal": s["personal"],
            "notes": notes,
            "simplified": [footnote_text[n] for n in notes if n in COMPLEX and n in footnote_text],
        }

    out = {
        "year": YEAR,
        "generated": date.today().isoformat(),
        "source": f"Tax Foundation, State Individual Income Tax Rates and Brackets, {YEAR} (published February {YEAR})",
        "sourceUrl": PAGE,
        "states": out_states,
    }
    with open(OUT, "w") as fh:
        json.dump(out, fh, separators=(",", ":"), ensure_ascii=False)
    taxed = sum(1 for s in out_states.values() if s["wageTax"])
    print(f"wrote {len(out_states)} jurisdictions ({taxed} tax wages) to {os.path.relpath(OUT)} ({os.path.getsize(OUT) // 1024} KB)")


if __name__ == "__main__":
    main()
