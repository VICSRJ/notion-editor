'use client'

import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { useEffect, useRef, useState } from 'react'
import { GripVertical, Plus, Search, X } from 'lucide-react'

type Result = { title: string; url: string; snippet: string; source: string }

type Menu = { x: number; y: number }

function clampMenu(menu: Menu) {
  return { x: Math.max(8, Math.min(menu.x, window.innerWidth - 228)), y: Math.max(8, Math.min(menu.y, window.innerHeight - 220)) }
}

export default function Home() {
  const [menu, setMenu] = useState<Menu | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [selected, setSelected] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [gutter, setGutter] = useState<{ top: number; height: number } | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Začněte psát…' }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: '<h1>Nový dokument</h1><p>Začněte psát. Pohybujte kurzorem do levého prostoru bloku pro ovládání.</p><p>Pravým kliknutím otevřete nabídku. ⌘/Ctrl + K otevře vyhledávání webu.</p>',
    editorProps: { attributes: { 'aria-label': 'Editor dokumentu' } },
  })

  useEffect(() => {
    if (!editor) return
    const update = () => {
      const { from } = editor.state.selection
      const dom = editor.view.domAtPos(Math.max(0, Math.min(from, editor.state.doc.content.size))).node.parentElement
      const block = dom?.closest('p,h1,h2,h3,blockquote,pre,li') as HTMLElement | null
      const canvas = editorRef.current
      if (!block || !canvas) return
      const br = block.getBoundingClientRect(); const cr = canvas.getBoundingClientRect()
      setGutter({ top: br.top - cr.top, height: br.height })
    }
    editor.on('selectionUpdate', update); editor.on('update', update); update()
    return () => { editor.off('selectionUpdate', update); editor.off('update', update) }
  }, [editor])

  useEffect(() => {
    if (!editor) return
    const onContext = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.ProseMirror')) return
      event.preventDefault()
      const pos = editor.view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
      if (typeof pos === 'number') editor.commands.setTextSelection(pos)
      setMenu(clampMenu({ x: event.clientX, y: event.clientY }))
    }
    document.addEventListener('contextmenu', onContext)
    return () => document.removeEventListener('contextmenu', onContext)
  }, [editor])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setMenu(null); setSearchOpen(true)
      }
      if (event.key === 'Escape') { setMenu(null); setSearchOpen(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const search = async () => {
    const q = query.trim(); if (!q) return
    setLoading(true); setError(''); setResults([]); setSelected(0)
    try {
      const response = await fetch(`/api/web-search?q=${encodeURIComponent(q)}`)
      const data = await response.json() as { results?: Result[]; error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Vyhledávání se nepodařilo načíst.')
      setResults(data.results ?? [])
    } catch (e) { setError(e instanceof Error ? e.message : 'Vyhledávání se nepodařilo načíst.') }
    finally { setLoading(false) }
  }

  const insertResult = (result: Result) => {
    const pos = editor?.state.selection.to ?? 1
    editor?.chain().focus().insertContentAt(pos, { type: 'paragraph', content: [{ type: 'text', text: result.title }, { type: 'text', text: ` — ${result.url}` }] }).run()
    setSearchOpen(false)
  }

  return (
    <main className="app">
      <div className="editor-shell">
        <div className="editor-title">NOTION EDITOR CZ</div>
        <div className="editor-canvas" ref={editorRef}>
          <div className="gutter" aria-hidden="true">
            {gutter && (
              <div className="gutter-control" data-active="true" style={{ top: gutter.top + Math.max(0, (gutter.height - 40) / 2) }}>
                <button type="button" title="Přidat blok" onClick={() => editor?.chain().focus().insertContentAt(editor.state.selection.to + 1, { type: 'paragraph' }).run()}><Plus size={16}/></button>
                <button type="button" title="Přesunout blok"><GripVertical size={16}/></button>
              </div>
            )}
          </div>
          <EditorContent editor={editor} />
        </div>
      </div>

      {menu && editor && (
        <div className="context-menu" style={{ left: menu.x, top: menu.y }} role="menu">
          <button type="button" onClick={() => { editor.chain().focus().insertContentAt(editor.state.selection.to + 1, { type: 'paragraph' }).run(); setMenu(null) }}><Plus size={16}/>Přidat pod blok</button>
          <button type="button" onClick={() => { setSearchOpen(true); setMenu(null) }}><Search size={16}/>Hledat na webu</button>
          <div className="context-divider" />
          <button type="button" onClick={() => { editor.chain().focus().deleteSelection().run(); setMenu(null) }}>Smazat výběr</button>
          <button type="button" onClick={() => setMenu(null)}><X size={16}/>Zavřít</button>
        </div>
      )}

      {searchOpen && (
        <div className="search-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSearchOpen(false) }}>
          <section className="search-panel" role="dialog" aria-modal="true" aria-label="Hledat na webu">
            <div className="search-header"><Search size={18}/><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void search(); if (e.key === 'ArrowDown') setSelected((v) => Math.min(v + 1, Math.max(results.length - 1, 0))); if (e.key === 'ArrowUp') setSelected((v) => Math.max(v - 1, 0)) }} placeholder="Hledat na webu…"/><button type="button" onClick={() => setSearchOpen(false)} aria-label="Zavřít"><X size={17}/></button></div>
            <div className="search-body">
              <div className="search-list" aria-live="polite">
                {loading && <div className="search-state">Vyhledávání…</div>}
                {error && <div className="search-state">{error}</div>}
                {!loading && !error && results.map((result, index) => <button type="button" role="option" aria-selected={selected === index} className={`search-item ${selected === index ? 'is-selected' : ''}`} key={`${result.url}-${index}`} onMouseEnter={() => setSelected(index)} onClick={() => insertResult(result)}><strong>{result.title}</strong><small>{result.source}</small><span>{result.snippet}</span></button>)}
                {!loading && !error && !results.length && <div className="search-state">Zadejte dotaz a stiskněte Enter.</div>}
              </div>
              <aside className="search-preview">
                {results[selected] ? <><small>{results[selected].source}</small><h2>{results[selected].title}</h2><p>{results[selected].snippet}</p><div className="search-actions"><button type="button" onClick={() => window.open(results[selected].url, '_blank', 'noopener,noreferrer')}>Otevřít</button><button type="button" onClick={() => insertResult(results[selected])}>Vložit</button></div></> : <div className="search-state">Náhled výsledku</div>}
              </aside>
            </div>
            <footer className="search-footer"><span>↑↓ navigovat</span><span>Enter hledat / otevřít</span><span>Ctrl/Cmd + Enter vložit</span><span>Esc zavřít</span></footer>
          </section>
        </div>
      )}
    </main>
  )
}
