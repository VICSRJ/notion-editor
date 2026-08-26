import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim()
}

function parseResults(html: string) {
  const results: Array<{ title: string; url: string; snippet: string; source: string }> = []
  const pattern = /<div[^>]*class="result[^>]*>[\s\S]*?<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi
  for (const match of html.matchAll(pattern)) {
    try {
      const raw = match[1].startsWith('//') ? `https:${match[1]}` : match[1]
      const u = new URL(raw)
      const url = u.searchParams.get('uddg') ? decodeURIComponent(u.searchParams.get('uddg')!) : raw
      const parsed = new URL(url)
      results.push({ title: stripHtml(match[2]), url, snippet: stripHtml(match[3]), source: parsed.hostname.replace(/^www\./, '') })
      if (results.length === 10) break
    } catch {}
  }
  return results
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q')?.trim() ?? ''
  if (!q) return NextResponse.json({ results: [], query: '' })
  if (q.length > 200) return NextResponse.json({ error: 'Dotaz je příliš dlouhý.' }, { status: 400 })
  try {
    const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, { cache: 'no-store', headers: { 'user-agent': 'NotionEditorCZ/1.0', accept: 'text/html' } })
    if (!response.ok) return NextResponse.json({ error: 'Vyhledávání se nepodařilo načíst.' }, { status: 502 })
    return NextResponse.json({ results: parseResults(await response.text()), query: q })
  } catch {
    return NextResponse.json({ error: 'Vyhledávání je momentálně nedostupné.' }, { status: 503 })
  }
}
