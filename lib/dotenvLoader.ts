// Lightweight runtime dotenv loader that uses dynamic ESM import so bundlers
// (Turbopack/Vercel) don't statically try to resolve `dotenv` during build.
export async function loadDotenvIfPresent() {
  try {
    // dynamic import keeps bundlers from statically resolving the dependency
    const dynamicImport: any = (0, eval)("import")
    let dotenvModule: any = null
    try {
      dotenvModule = await dynamicImport('dotenv')
    } catch (e) {
      // module not present; nothing to do
      return
    }

    if (!dotenvModule || !dotenvModule.config) return

    // look for common .env locations (app/data, app root, repo root)
    const path = await dynamicImport('path')
    const fs = await dynamicImport('fs')
    const cwd = process.cwd()
    const candidates = [
      path.join(cwd, '.env.local'),
      path.join(cwd, '.env'),
      path.join(cwd, '../', '.env.local'),
      path.join(cwd, '../', '.env'),
      path.join(cwd, 'data', '.env.local'),
    ]
    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) {
          dotenvModule.config({ path: p })
          // stop after first successful load
          return
        }
      } catch (_) {
        // ignore
      }
    }
  } catch (e) {
    // very defensive: if dynamic import isn't available, just skip
    return
  }
}

export default loadDotenvIfPresent
