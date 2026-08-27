'use client'

import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { useEffect, useRef, useState } from 'react'
import { GripVertical, Plus, Search, Settings2, X } from 'lucide-react'

type Result = { title: string; url: string; snippet: string; source: string }
type Menu = { x: number; y: number; pos: number }
type GutterBlock = { pos: number; top: number; height: number }
type Settings = { fontSize: number; width: 'narrow' | 'standard' | 'wide'; density: 'compact' | 'comfortable' }

const DEFAULT_SETTINGS: Settings = { fontSize: 17, width: 'standard', density: 'comfortable' }

function clampMenu(x: number, y: number) {
  return { x: Math.max(8, Math.min(x, window.innerWidth - 236)), y: Math.max(8, Math.min(y, window.innerHeight - 230)) }
}

function blockFromPos(editor: ReturnType<typeof useEditor>, pos: number) {
  if (!editor) return null
  const $pos = editor.state.doc.resolve(Math.max(1, Math.min(pos, editor.state.doc.content.size)))
  if ($pos.depth < 1) return null
  const blockPos = $pos.before(1)
  const node = editor.state.doc.nodeAt(blockPos)
  return node ? { pos: blockPos, node } : null
}

export default function Home() {
  const [menu, setMenu] = useState<Menu | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [selected, setSelected] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [gutter, setGutter] = useState<GutterBlock | null>(null)
  const [gutterActive, setGutterActive] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Začněte psát…' }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: '<h1>Nový dokument</h1><p>Tohle je čistý český blokový editor. Levý prostor je ovládací zóna bloku.</p><p>Pravým kliknutím otevřete nabídku. Ctrl/Cmd + K otevře webové vyhledávání.</p>',
    editorProps: {
      attributes: {
        'aria-label': 'Editor dokumentu',
        'data-editor': 'notion-editor',
      },
    },
  })

  const updateGutter = () => {
    if (!editor || !editorRef.current) return
    const { from } = editor.state.selection
    const mapped = blockFromPos(editor, from)
    if (!mapped) return
    const dom = editor.view.domAtPos(Math.max(0, Math.min(from, editor.state.doc.content.size))).node
    const element = (dom instanceof Element ? dom : dom.parentElement)?.closest('p,h1,h2,h3,blockquote,pre,li') as HTMLElement | null
    if (!element) return
    const br = element.getBoundingClientRect()
    const cr = editorRef.current.getBoundingClientRect()
    setGutter({ pos: mapped.pos, top: br.top - cr.top, height: br.height })
  }

  useEffect(() => {
    if (!editor) return
    editor.on('selectionUpdate', updateGutter)
    editor.on('update', updateGutter)
    updateGutter()
    return () => {
      editor.off('selectionUpdate', updateGutter)
      editor.off('update', updateGutter)
    }
  }, [editor])

  const handleGutterPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!editor || !editorRef.current) return
    if ((event.target as HTMLElement).closest('button')) return
    const rect = editorRef.current.getBoundingClientRect()
    const element = Array.from(editor.view.dom.querySelectorAll<HTMLElement>('p,h1,h2,h3,blockquote,pre,li')).find((candidate) => {
      const r = candidate.getBoundingClientRect()
      return event.clientY >= r.top && event.clientY <= r.bottom
    })
    if (!element) return
    const pos = editor.view.posAtDOM(element, 0)
    const r = element.getBoundingClientRect()
    setGutter({ pos, top: r.top - rect.top, height: r.height })
    setGutterActive(true)
  }

  const addBelow = (pos: number) => {
    if (!editor) return
    const mapped = blockFromPos(editor, pos)
    if (!mapped) return
    const insertAt = mapped.pos + mapped.node.nodeSize
    editor.chain().focus().insertContentAt(insertAt, { type: 'paragraph' }).run()
    editor.commands.setTextSelection(Math.min(insertAt + 1, editor.state.doc.content.size))
  }

  const duplicate = (pos: number) => {
    if (!editor) return
    const mapped = blockFromPos(editor, pos)
    if (!mapped) return
    const insertAt = mapped.pos + mapped.node.nodeSize
    const copy = mapped.node.type.create(mapped.node.attrs, mapped.node.content, mapped.node.marks)
    editor.view.dispatch(editor.state.tr.insert(insertAt, copy))
    editor.commands.setTextSelection(Math.min(insertAt + 1, editor.state.doc.content.size))
  }

  const deleteBlock = (pos: number) => {
    if (!editor) return
    const mapped = blockFromPos(editor, pos)
    if (!mapped) return
    if (editor.state.doc.childCount <= 1) {
      editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph' }] })
      editor.commands.focus(1)
      return
    }
    editor.view.dispatch(editor.state.tr.delete(mapped.pos, mapped.pos + mapped.node.nodeSize))
  }

  const openMenuAt = (x: number, y: number, pos: number) => {
    const next = clampMenu(x, y)
    setMenu({ ...next, pos })
  }

  useEffect(() => {
    const onContext = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.ProseMirror')) return
      if (!editor) return
      event.preventDefault()
      const pos = editor.view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
      if (typeof pos === 'number') {
        editor.commands.setTextSelection(pos)
        openMenuAt(event.clientX, event.clientY, pos)
      }
    }
    document.addEventListener('contextmenu', onContext)
    return () => document.removeEventListener('contextmenu', onContext)
  }, [editor])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setMenu(null)
        setSearchOpen(true)
      }
      if (event.key === 'Escape') {
        setMenu(null)
        setSettingsOpen(false)
        setSearchOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const search = async () => {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setError('')
    setResults([])
    setSelected(0)
    try {
      const response = await fetch(`/api/web-search?q=${encodeURIComponent(q)}`)
      const data = await response.json() as { results?: Result[]; error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Vyhledávání se nepodařilo načíst.')
      setResults(data.results ?? [])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Vyhledávání se nepodařilo načíst.')
    } finally {
      setLoading(false)
    }
  }

  const insertResult = (result: Result) => {
    if (!editor) return
    const pos = editor.state.selection.to
    editor.chain().focus().insertContentAt(pos, { type: 'paragraph', content: [{ type: 'text', text: result.title }, { type: 'text', text: ` — ${result.url}` }] }).run()
    setSearchOpen(false)
  }

  const styleVars = {
    '--editor-font-size': `${settings.fontSize}px`,
    '--content-max': settings.width === 'narrow' ? '720px' : settings.width === 'wide' ? '1160px' : '980px',
    '--block-gap': settings.density === 'compact' ? '3px' : '8px',
  } as React.CSSProperties

  return (
    <main className="app" style={styleVars}>
      <div className="editor-shell">
        <header className="editor-toolbar">
          <span className="editor-title">NOTION EDITOR CZ</span>
          <button type="button" className="toolbar-button" aria-label="Nastavení editoru" title="Nastavení editoru" onClick={() => setSettingsOpen(true)}><Settings2 size={18} /></button>
        </header>
        <div className="editor-canvas" ref={editorRef} onPointerMove={handleGutterPointer} onPointerLeave={() => setGutterActive(false)}>
          <div className={`gutter ${gutterActive ? 'is-active' : ''}`} onPointerDown={handleGutterPointer}>
            {gutter && <div className="gutter-hit" style={{ top: gutter.top, height: Math.max(gutter.height, 44) }} />}
            {gutter && <div className="gutter-control" style={{ top: gutter.top + Math.max(0, (gutter.height - 42) / 2) }}>
              <button type="button" title="Přidat blok" aria-label="Přidat blok" onClick={() => addBelow(gutter.pos)}><Plus size={19} /></button>
              <button type="button" title="Nabídka bloku" aria-label="Nabídka bloku" onClick={(event) => { event.stopPropagation(); openMenuAt(event.clientX, event.clientY, gutter.pos) }}><GripVertical size={19} /></button>
            </div>}
          </div>
          <EditorContent editor={editor} />
        </div>
      </div>

      {menu && editor && <div className="context-menu" style={{ left: menu.x, top: menu.y }} role="menu" aria-label="Nabídka bloku" onContextMenu={(event) => event.preventDefault()}>
        <button type="button" role="menuitem" onClick={() => { addBelow(menu.pos); setMenu(null) }}><Plus size={16} />Přidat pod blok</button>
        <button type="button" role="menuitem" onClick={() => { setSearchOpen(true); setMenu(null) }}><Search size={16} />Hledat na webu</button>
        <button type="button" role="menuitem" onClick={() => { duplicate(menu.pos); setMenu(null) }}>Duplikovat</button>
        <div className="context-divider" />
        <button type="button" role="menuitem" className="danger" onClick={() => { deleteBlock(menu.pos); setMenu(null) }}>Smazat blok</button>
      </div>}

      {settingsOpen && <div className="settings-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false) }}>
        <aside className="settings-panel" role="dialog" aria-modal="true" aria-label="Nastavení editoru">
          <div className="settings-header"><strong>Nastavení editoru</strong><button type="button" className="toolbar-button" onClick={() => setSettingsOpen(false)} aria-label="Zavřít"><X size={18} /></button></div>
          <label>Velikost textu <strong>{settings.fontSize}px</strong><input type="range" min="15" max="21" step="1" value={settings.fontSize} onChange={(e) => setSettings((s) => ({ ...s, fontSize: Number(e.target.value) }))} /></label>
          <div className="settings-group"><span>Šířka editoru</span><div className="segmented">{(['narrow', 'standard', 'wide'] as const).map((value) => <button key={value} type="button" aria-pressed={settings.width === value} onClick={() => setSettings((s) => ({ ...s, width: value }))}>{value === 'narrow' ? 'Úzká' : value === 'standard' ? 'Standardní' : 'Široká'}</button>)}</div></div>
          <div className="settings-group"><span>Hustota</span><div className="segmented">{(['compact', 'comfortable'] as const).map((value) => <button key={value} type="button" aria-pressed={settings.density === value} onClick={() => setSettings((s) => ({ ...s, density: value }))}>{value === 'compact' ? 'Kompaktní' : 'Pohodlná'}</button>)}</div></div>
          <p className="settings-note">Jazyk: čeština · Vzhled: dark</p>
        </aside>
      </div>}

      {searchOpen && <div className="search-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSearchOpen(false) }}>
        <section className="search-panel" role="dialog" aria-modal="true" aria-label="Hledat na webu">
          <div className="search-header"><Search size={18}/><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && ((e.metaKey || e.ctrlKey) && results[selected])) { e.preventDefault(); insertResult(results[selected]); return }; if (e.key === 'Enter') void search(); if (e.key === 'ArrowDown') setSelected((v) => Math.min(v + 1, Math.max(results.length - 1, 0))); if (e.key === 'ArrowUp') setSelected((v) => Math.max(v - 1, 0)); }} placeholder="Hledat na webu…"/><button type="button" onClick={() => setSearchOpen(false)} aria-label="Zavřít"><X size={17}/></button></div>
          <div className="search-body">
            <div className="search-list" aria-live="polite">
              {loading && <div className="search-state">Vyhledávání…</div>}
              {error && <div className="search-state">{error}</div>}
              {!loading && !error && results.map((result, index) => <button type="button" role="option" aria-selected={selected === index} className={`search-item ${selected === index ? 'is-selected' : ''}`} key={`${result.url}-${index}`} onMouseEnter={() => setSelected(index)} onClick={() => insertResult(result)}><strong>{result.title}</strong><small>{result.source}</small><span>{result.snippet}</span></button>)}
              {!loading && !error && !results.length && <div className="search-state">Zadejte dotaz a stiskněte Enter.</div>}
            </div>
            <aside className="search-preview">{results[selected] ? <><small>{results[selected].source}</small><h2>{results[selected].title}</h2><p>{results[selected].snippet}</p><div className="search-actions"><button type="button" onClick={() => window.open(results[selected].url, '_blank', 'noopener,noreferrer')}>Otevřít</button><button type="button" onClick={() => insertResult(results[selected])}>Vložit</button></div></> : <div className="search-state">Náhled výsledku</div>}</aside>
          </div>
          <footer className="search-footer"><span>↑↓ navigovat</span><span>Enter hledat</span><span>Ctrl/Cmd + Enter vložit</span><span>Esc zavřít</span></footer>
        </section>
      </div>}
    </main>
  )
}
