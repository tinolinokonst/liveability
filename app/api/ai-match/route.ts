import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { COLUMBUS_NEIGHBORHOODS } from '@/lib/neighborhoods'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const NEIGHBORHOOD_SUMMARY = COLUMBUS_NEIGHBORHOODS.map(n => ({
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
  const body = await request.json().catch(() => null)
  if (!body?.description || typeof body.description !== 'string') {
    return new Response(JSON.stringify({ error: 'description is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const description = body.description.slice(0, 1000)

  const systemPrompt = `You are a Columbus, Ohio neighborhood expert helping someone find their ideal neighborhood.
You have data for ${COLUMBUS_NEIGHBORHOODS.length} Columbus neighborhoods with scores (0-100) for walkability, air quality, green space, grocery access, transit, safety, education, healthcare, dining, and quietness, plus average rent.

Neighborhood data:
${JSON.stringify(NEIGHBORHOOD_SUMMARY, null, 2)}

Your task:
1. Analyze the user's lifestyle description carefully
2. Recommend the top 3 best-matching neighborhoods
3. For each, explain WHY it fits their needs with specific score references
4. Note any trade-offs honestly

Format your response as follows (use this exact structure):
## Top Neighborhood Matches

### 1. [Neighborhood Name]
**Why it fits:** [2-3 sentences explaining the match]
**Key scores:** [list 3-4 relevant scores]
**Trade-offs:** [1 sentence on downsides]
**Avg rent:** ~$[amount]/mo

### 2. [Neighborhood Name]
...

### 3. [Neighborhood Name]
...

## Summary
[1-2 sentences summarizing the recommendation]

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
