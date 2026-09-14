import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useTheme from '../useTheme';
import { normalize, splitTermsSimple, highlightToNodes } from '../searchUtils';
import './Reader.css';

export default function Suktas() {
  const [theme, toggleTheme] = useTheme();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null); // null = loading, [] = loaded empty
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarFilter, setSidebarFilter] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [zoom, setZoom] = useState(1);
  const [currentTi, setCurrentTi] = useState(-1);
  const [showJumpTop, setShowJumpTop] = useState(false);

  const contentRef = useRef(null);
  const searchInputRef = useRef(null);
  const timerRef = useRef(null);
  const initedFromQuery = useRef(false);

  useEffect(() => {
    fetch('/data/suktas.json', { cache: 'no-cache' })
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(json => setData(json.texts || []))
      .catch(err => setError(err.message));
  }, []);

  useEffect(() => {
    if (data && !initedFromQuery.current) {
      initedFromQuery.current = true;
      const q = searchParams.get('q');
      if (q) { setQuery(q); setDebouncedQuery(q); }
    }
  }, [data, searchParams]);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(query), 160);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  useEffect(() => {
    if (window.innerWidth <= 720) setSidebarOpen(false);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--zoom', zoom.toFixed(2));
  }, [zoom]);

  const q = debouncedQuery.trim();
  const terms = q ? splitTermsSimple(q) : [];

  const scored = useMemo(() => {
    if (!data || !terms.length) return null;
    const out = [];
    data.forEach((text, ti) => {
      const titleNorm = normalize(text.title).toLowerCase();
      text.verses.forEach((v, vi) => {
        const norm = normalize(v).toLowerCase();
        let score = 0, ok = true;
        for (const t of terms) {
          if (norm.includes(t)) score += 1;
          else if (titleNorm.includes(t)) score += 0.5;
          else { ok = false; break; }
        }
        if (ok) out.push({ ti, vi, score, text, verse: v });
      });
    });
    out.sort((a, b) => b.score - a.score || a.ti - b.ti || a.vi - b.vi);
    return out;
  }, [data, terms]);

  const scrollToText = (ti) => {
    if (query.trim()) setQuery('');
    const el = document.getElementById('t-' + ti);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setCurrentTi(ti);
    if (window.innerWidth <= 720) setSidebarOpen(false);
  };

  const onContentScroll = () => {
    const el = contentRef.current;
    if (!el) return;
    setShowJumpTop(el.scrollTop > 500);
    if (query.trim()) return;
    const headings = el.querySelectorAll('.text-heading');
    let current = -1;
    headings.forEach(h => {
      if (h.getBoundingClientRect().top <= 140) current = +h.dataset.ti;
    });
    if (current >= 0) setCurrentTi(current);
  };

  if (error) {
    return (
      <div className="reader-body">
        <div className="app">
          <main className="main">
            <div className="content"><div className="content-inner">
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <p><b>Could not load suktas.json.</b><br />{error}<br /><br />
                  Make sure <code>data/suktas.json</code> is available and this page is served over http(s).{' '}
                  <Link to="/">← Back to home</Link>
                </p>
              </div>
            </div></div>
          </main>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="reader-body">
        <div className="app">
          <main className="main">
            <div className="content"><div className="content-inner">
              <div className="empty-state"><p>Loading सूक्ततानि …</p></div>
            </div></div>
          </main>
        </div>
      </div>
    );
  }

  const totalVerses = data.reduce((a, t) => a + t.verses.length, 0);
  const filterNorm = normalize(sidebarFilter).toLowerCase();

  return (
    <div className="reader-body">
      <div className="app">
        {!sidebarOpen && window.innerWidth <= 720 ? null : null}
        <div className={`sidebar-overlay${sidebarOpen && window.innerWidth <= 720 ? ' show' : ''}`} onClick={() => setSidebarOpen(false)} />
        <aside className={`sidebar${sidebarOpen ? '' : ' collapsed'}`}>
          <div className="sidebar-head">
            <Link className="brand" to="/" title="Back to home">
              <div className="brand-mark">सू</div>
              <div className="brand-text">
                <h1>सूक्ततानि</h1>
                <p>Standalone hymns · Sāmaveda</p>
              </div>
            </Link>
            <div className="sidebar-search">
              <svg className="icn" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.6" y2="16.6" /></svg>
              <input type="text" placeholder="Filter sūktas…" value={sidebarFilter} onChange={e => setSidebarFilter(e.target.value)} />
            </div>
          </div>
          <nav className="sidebar-tree">
            {data.map((text, ti) => {
              const visible = !filterNorm || normalize(text.title).toLowerCase().includes(filterNorm);
              if (!visible) return null;
              return (
                <button key={ti} className={`sukta-link${currentTi === ti ? ' current' : ''}`} onClick={() => scrollToText(ti)}>
                  <span className="n">{text.verses.length} ऋचः</span>{text.title}
                </button>
              );
            })}
          </nav>
          <div className="sidebar-foot"><b>{data.length}</b>&nbsp;sūktas · <b>{totalVerses}</b>&nbsp;ऋचः</div>
        </aside>

        <main className="main">
          <div className="topbar">
            <button className="icon-btn" title="Toggle sidebar" onClick={() => setSidebarOpen(o => !o)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="9" y1="4" x2="9" y2="20" /></svg>
            </button>
            <div className="global-search">
              <svg className="icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.6" y2="16.6" /></svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search sūktas & verses…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              <button className={`clear-btn${query ? ' show' : ''}`} title="Clear" onClick={() => { setQuery(''); searchInputRef.current?.focus(); }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="crumb">
              {q ? <>Search: "<b>{q}</b>" · {scored ? scored.length : 0} result{scored && scored.length === 1 ? '' : 's'}</>
                : (currentTi >= 0 ? <b>{data[currentTi].title}</b> : null)}
            </div>
            <div className="zoom-group" title="Text size">
              <button onClick={() => setZoom(z => Math.max(0.6, z - 0.1))}>−</button>
              <span className="zoom-val">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(2, z + 0.1))}>+</button>
            </div>
            <button className="icon-btn" id="themeToggle" title="Toggle dark mode" onClick={toggleTheme}>
              <svg className="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" /><line x1="4.93" y1="4.93" x2="6.34" y2="6.34" /><line x1="17.66" y1="17.66" x2="19.07" y2="19.07" /><line x1="2" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22" y2="12" /><line x1="4.93" y1="19.07" x2="6.34" y2="17.66" /><line x1="17.66" y1="6.34" x2="19.07" y2="4.93" /></svg>
              <svg className="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
            </button>
          </div>

          <div className="content" ref={contentRef} onScroll={onContentScroll}>
            <div className="content-inner">
              {q && terms.length ? (
                <>
                  <div className="search-results-note">Found <b>{scored.length}</b> matching verse{scored.length === 1 ? '' : 's'} for "<b>{q}</b>"</div>
                  {scored.length === 0 ? (
                    <div className="empty-state">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.6" y2="16.6" /></svg>
                      <p>No verses match your search.</p>
                    </div>
                  ) : (
                    (() => {
                      let lastTi = -1;
                      return scored.slice(0, 400).map(({ ti, vi, text, verse }) => {
                        const heading = ti !== lastTi;
                        lastTi = ti;
                        return (
                          <div key={ti + '-' + vi}>
                            {heading && (
                              <div className="section-heading"><h3>{text.title}</h3><div className="rule"></div></div>
                            )}
                            <div className="verse-card" id={`v-${ti}-${vi}`}>
                              <span className="verse-no-badge">ऋक् {vi + 1}</span>
                              <div className="verse-text">{highlightToNodes(verse, terms)}</div>
                            </div>
                          </div>
                        );
                      });
                    })()
                  )}
                </>
              ) : (
                data.length === 0 ? (
                  <div className="empty-state"><p>No sūktas found.</p></div>
                ) : data.map((text, ti) => (
                  <div key={ti}>
                    <div className="text-heading" data-ti={ti} id={`t-${ti}`}>
                      <h2>{text.title}</h2>
                      <div className="stats">{text.verses.length} ऋचः</div>
                      <div className="rule"></div>
                    </div>
                    {text.verses.map((v, vi) => (
                      <div className="verse-card" key={vi} id={`v-${ti}-${vi}`}>
                        <span className="verse-no-badge">ऋक् {vi + 1}</span>
                        <div className="verse-text">{v}</div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
      <button className={`jump-top${showJumpTop ? ' show' : ''}`} title="Back to top" onClick={() => contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>
      </button>
    </div>
  );
}
