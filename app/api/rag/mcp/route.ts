import { NextResponse } from "next/server"
import { generateWithGroq, queryVectors, buildContextFromProfile, loadProfileFromAppData } from "../../../../lib/rag"

// Test endpoint performs a small RAG flow: load profile, query vectors, call Groq.
export async function GET() {
  try {
    const question = "Summarize the person's main technical skills in one sentence."

    // Load profile from app data (mydigitaltwin/data/digitaltwin.json)
    let profile: any
    try {
      profile = loadProfileFromAppData()
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: `profile not found: ${String(e)}` }, { status: 500 })
    }

    const chunks = buildContextFromProfile(profile)
    if (!chunks || chunks.length === 0) {
      return NextResponse.json({ ok: false, error: 'No chunks built from profile' }, { status: 500 })
    }

    // Query upstash
    let res: any
    try {
      res = await queryVectors(question, 3)
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: `Vector query failed: ${String(err)}` }, { status: 500 })
    }

    // Determine if results exist
    let topTexts: string[] = []
    try {
      if (!res || (Array.isArray(res) && res.length === 0)) {
        return NextResponse.json({ ok: false, error: 'No vectors found in index — please run ingestion script.' }, { status: 404 })
      }
      // Try common shapes
      if (Array.isArray(res)) {
        for (const r of res.slice(0, 3)) {
          const md = r?.metadata || {}
          if (md.content) topTexts.push(md.content)
        }
      } else if (res.matches || res.results) {
        const arr = res.matches || res.results
        for (const r of arr.slice(0, 3)) {
          const md = r?.metadata || r?.payload || {}
          if (md.content) topTexts.push(md.content)
        }
      }
    } catch (e) {
      // ignore and continue
    }

    if (!topTexts.length) {
      return NextResponse.json({ ok: false, error: 'Vectors returned but no content metadata found. Ingest may have different schema.' }, { status: 500 })
    }

    const context = topTexts.join('\n')
    const prompt = `Based on the following information about yourself, answer the question.\\nYour Information:\n${context}\nQuestion: ${question}\nProvide a helpful, professional response:`

    try {
      const answer = await generateWithGroq(prompt)
      return NextResponse.json({ ok: true, answer, sourcesCount: topTexts.length })
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: `Groq generation failed: ${String(e)}` }, { status: 500 })
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
