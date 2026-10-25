// Module hooks that let `node --experimental-strip-types` run the app's
// server modules from a script: extensionless relative imports resolve to
// .ts, JSON imports work without import attributes, `@/` maps to the repo
// root, and next/cache's unstable_cache becomes a pass-through (no cache).
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve as resolvePath } from 'node:path'

const ROOT = resolvePath(fileURLToPath(new URL('../..', import.meta.url)))
const STUB = 'export const unstable_cache = (fn) => fn;'

export async function resolve(spec, ctx, next) {
  if (spec === 'next/cache') return { url: 'stub:next-cache', shortCircuit: true }
  // next/headers, next/server: CommonJS files without an exports map entry for ESM
  if (/^next\/[a-z-]+$/.test(spec)) return next(`${spec}.js`, ctx)
  let target = null
  if (spec.startsWith('@/')) target = resolvePath(ROOT, spec.slice(2))
  else if ((spec.startsWith('.') || spec.startsWith('/')) && ctx.parentURL?.startsWith('file:')) target = fileURLToPath(new URL(spec, ctx.parentURL))
  if (target) {
    for (const candidate of [target, `${target}.ts`, `${target}/index.ts`]) {
      if (existsSync(candidate) && !candidate.endsWith('/')) {
        try { if ((await import('node:fs')).statSync(candidate).isFile()) return { url: pathToFileURL(candidate).href, shortCircuit: true } } catch { /* next */ }
      }
    }
  }
  return next(spec, ctx)
}

export async function load(url, ctx, next) {
  if (url === 'stub:next-cache') return { format: 'module', source: STUB, shortCircuit: true }
  if (url.endsWith('.json')) return { format: 'module', source: `export default ${await readFile(fileURLToPath(url), 'utf8')}`, shortCircuit: true }
  return next(url, ctx)
}
