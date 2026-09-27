import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/apiGuard'
import { readJsonBody } from '@/lib/validate'
import { estimateIncomeTax, MaritalStatus } from '@/lib/tax'
import { employeeSocialContributions } from '@/lib/socialContributions'

// Swiss income tax estimate (federal, cantonal, communal) for a household in a
// given commune, via the ESTV tax calculator. See lib/tax.ts.
//
// POST, not GET: income is sensitive, and query strings end up in access logs.
// Body: { bfsNumber, grossIncome, status: 'single' | 'married', children }
// The income is never logged or stored; see lib/tax.ts for how it is rounded.

const MAX_INCOME = 5_000_000
const MAX_CHILDREN = 10

function parseBody(raw: unknown):
  | { ok: true; bfsNumber: number; grossIncome: number; status: MaritalStatus; children: number }
  | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'JSON object body required' }
  const { bfsNumber, grossIncome, status, children = 0 } = raw as Record<string, unknown>

  if (!Number.isInteger(bfsNumber) || (bfsNumber as number) <= 0) {
    return { ok: false, error: 'bfsNumber must be a positive integer' }
  }
  if (typeof grossIncome !== 'number' || !Number.isFinite(grossIncome) || grossIncome <= 0 || grossIncome > MAX_INCOME) {
    return { ok: false, error: `grossIncome must be a number between 0 and ${MAX_INCOME}` }
  }
  if (status !== 'single' && status !== 'married') {
    return { ok: false, error: "status must be 'single' or 'married'" }
  }
  if (!Number.isInteger(children) || (children as number) < 0 || (children as number) > MAX_CHILDREN) {
    return { ok: false, error: `children must be an integer from 0 to ${MAX_CHILDREN}` }
  }
  return { ok: true, bfsNumber: bfsNumber as number, grossIncome, status, children: children as number }
}

export async function POST(request: NextRequest) {
  const guard = await guardRequest('tax', 30, 3600)
  if ('response' in guard) return guard.response

  const body = await readJsonBody(request)
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: 400 })

  const input = parseBody(body.value)
  if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 })

  const result = await estimateIncomeTax(input)
  if (!result.ok) {
    return result.reason === 'unknown_commune'
      ? NextResponse.json({ error: 'No tax data for this BFS number' }, { status: 404 })
      : NextResponse.json({ error: 'Tax calculator unavailable, try again later' }, { status: 502 })
  }

  return NextResponse.json({
    ...result.estimate,
    // Computed on the same bracket as the tax, for the same single-earner case
    socialContributions: employeeSocialContributions(result.estimate.incomeBracket),
  })
}
