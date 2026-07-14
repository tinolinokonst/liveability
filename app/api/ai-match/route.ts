import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { SWISS_AREAS } from '@/lib/neighborhoods'
import { guardRequest } from '@/lib/apiGuard'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const AREA_SUMMARY = SWISS_AREAS.map(n => ({
  name: n.name,
  scores: {
    walkability: n.walkability,
    airQuality: n.air,
    greenSpace: n.green,
    grocery: n.grocery,
    transit: n.transit,
    safety: n.safety,
    education: n.education,
    healthcare: n.healthcare,
    dining: n.dining,
    quietness: n.quiet,
  },
  avgRent: n.rent,
  highlights: n.notes,
}))

export async function POST(request: NextRequest) {
  const guard = await guardRequest('ai-match', 10, 3600)
  if ('response' in guard) return guard.response

  const body = await request.json().catch(() => null)
  if (!body?.description || typeof body.description !== 'string') {
    return new Response(JSON.stringify({ error: 'description is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const description = body.description.slice(0, 1000)

  const systemPrompt = `You are a Switzerland relocation expert helping someone find their ideal Swiss city to live in.
You have data for ${SWISS_AREAS.length} Swiss cities with scores (0-100) for walkability, air quality, green space, grocery access, transit, safety, education, healthcare, dining, and quietness, plus average rent in CHF.

City data:
${JSON.stringify(AREA_SUMMARY, null, 2)}

Your task:
1. Analyze the user's lifestyle description carefully
2. Recommend the top 3 best-matching Swiss cities
3. For each, explain WHY it fits their needs with specific score references
4. Note any trade-offs honestly

FORMATTING RULES — follow these exactly:
- Use **bold** (markdown double asterisks) around every specific number, score, distance, rent amount, and key data point in your explanatory text. Examples: **85/100**, **CHF 1,800/mo**, **4.2km**, **3 parks within 800m**, **78/100 for air quality**.
- Also bold the city name the first time it appears in the "Why it fits" body text.
- Do NOT bold generic adjectives or filler words — only concrete facts and figures.
- The field labels (**Why it fits:**, **Key scores:**, **Trade-offs:**, **Avg rent:**) are already bold; no change needed there.

Format your response as follows (use this exact structure):
## Top City Matches

### 1. [City Name]
**Why it fits:** [2-3 sentences with key scores and facts bolded, e.g. "**Bern** scores **80/100** for green space and **76/100** for air quality, with **4 parks within 800m**."]
**Key scores:** [list 3-4 relevant scores, each bolded, e.g. "Green space **80/100** · Air quality **76/100** · Safety **86/100**"]
**Trade-offs:** [1 sentence; bold any specific numbers, e.g. "Dining score is only **68/100**, with fewer late-night options."]
**Avg rent:** ~**CHF [amount]**/mo

### 2. [City Name]
...

### 3. [City Name]
...

## Summary
[1-2 sentences summarizing the recommendation; bold city names and any key figures.]

Keep your response concise and focused. Don't pad with generic advice.`

  const stream = await client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    thinking: { type: 'adaptive' },
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: description,
      },
    ],
  })

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Accel-Buffering': 'no',
    },
  })
}
