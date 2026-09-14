import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useTheme from '../useTheme';
import { normalize, splitTermsQuoted, buildFuzzyRegex, highlightToNodes } from '../searchUtils';
import './Reader.css';

const TEXT_META = {
  agneyam: { translit: 'Āgnēyam', idx: 'अ' },
  aindram: { translit: 'Aindram', idx: 'ऐ' },
  pavamanam: { translit: 'Pavamānam', idx: 'प' },
  aranyaka: { translit: 'Āraṇyaka Gānam', idx: 'आ' },
  mahamnaya: { translit: 'Mahānāmnyarcikam', idx: 'म' },
};

const FIELD_WEIGHT = {
  number: 200, rishi: 80, devata: 80, chandas: 70, ref: 60,
  samhita: 50, notes: 40, pada: 35, sg_text: 25, sg_notes: 20,
};

function buildSearchIndex(DATA) {
  const index = [];
  DATA.forEach((text, ti) => {
    text.sections.forEach((sec, si) => {
      sec.riks.forEach((r, ri) => {
        const fields = {
          number: [r.rik_no, r.global_no, r.ref].filter(Boolean).map(String).join(' '),
          rishi: r.rishi || '', chandas: r.chandas || '', devata: r.devata || '',
          ref: r.ref || '', samhita: r.samhita || '', pada: r.pada || '', notes: r.notes || '',
        };
        const sgFields = (r.samaganas || []).map(sg => ({
          sg,
          number: [sg.no, sg.global_no, sg.ref].filter(Boolean).map(String).join(' '),
          rishi: sg.rishi || '', chandas: sg.chandas || '', devata: sg.devata || '',
          sg_text: sg.text || '', sg_notes: sg.notes || '',
        }));
        index.push({ ti, si, ri, r, fields, sgFields, textTitle: text.title, secLabel: sec.label });
      });
    });
  });
  return index;
}

function scoreEntry(entry, terms) {
  let total = 0;
  const matchedSamaganaIdx = new Set();
  for (const term of terms) {
    const re = buildFuzzyRegex(term);
    let bestWeight = 0;
    for (const key of Object.keys(entry.fields)) {
      re.lastIndex = 0;
      if (entry.fields[key] && re.test(entry.fields[key])) {
        bestWeight = Math.max(bestWeight, FIELD_WEIGHT[key] || 10);
      }
    }
    entry.sgFields.forEach((sgf, idx) => {
      for (const key of ['number', 'rishi', 'chandas', 'devata', 'sg_text', 'sg_notes']) {
        re.lastIndex = 0;
        const val = sgf[key];
        if (val && re.test(val)) {
          const w = key === 'sg_text' ? FIELD_WEIGHT.sg_text
            : key === 'sg_notes' ? FIELD_WEIGHT.sg_notes
            : key === 'number' ? FIELD_WEIGHT.number
            : FIELD_WEIGHT[key] || 40;
          bestWeight = Math.max(bestWeight, w);
          matchedSamaganaIdx.add(idx);
        }
      }
    });
    if (bestWeight === 0) return null;
    total += bestWeight;
  }
  return { score: total, matchedSamaganaIdx };
}

function RikMeta({ r, terms }) {
  const hl = (s) => (terms ? highlightToNodes(s, terms) : s);
  const tags = [];
  if (r.prapathaka) tags.push(['Prapāṭhaka', r.prapathaka]);
  if (r.ardha) tags.push(['Ardha', r.ardha]);
  if (r.khanda) tags.push(['Khaṇḍa', r.khanda]);
  if (r.rishi) tags.push(['R̥ṣi', r.rishi]);
  if (r.chandas) tags.push(['Chandas', r.chandas]);
  if (r.devata) tags.push(['Devatā', r.devata]);
  return (
    <>
      {tags.map(([label, val], i) => (
        <span className="rik-tag" key={i}>{label}: <b>{hl(val)}</b></span>
      ))}
      {r.ref && <span className="rik-tag">{hl(r.ref)}</span>}
    </>
  );
}

function RikCard({ text, ti, si, r, ri, terms, matchedSamaganaIdx, totalRiks, totalSamans, flash }) {
  const hl = (s) => (terms ? highlightToNodes(s, terms) : s);
  const badge = r.rik_no ? `R̥k ${r.rik_no}` : '';
  return (
    <div className={`rik-card${flash ? ' match-highlight' : ''}`} id={`rik-${ti}-${si}-${ri}`} data-text={ti} data-sec={si} data-rik={ri}>
      <div className="rik-meta">
        {badge && <span className="rik-no-badge">{badge}</span>}
        {r.global_no && (
          <span className="global-badge" title={`R̥k #${r.global_no} of ${totalRiks} across all five texts`}>R̥k №{r.global_no}</span>
        )}
        <RikMeta r={r} terms={terms} />
      </div>
      {r.samhita && <div className="samhita-block">{hl(r.samhita)}</div>}
      {r.pada && <div className="pada-block">{hl(r.pada)}</div>}
      {r.notes && <div className="rik-notes">{hl(r.notes)}</div>}
      {r.samaganas && r.samaganas.length > 0 && (
        <div className="samagana-list">
          {r.samaganas.map((sg, idx) => {
            const isMatch = matchedSamaganaIdx ? matchedSamaganaIdx.has(idx) : false;
            const dim = matchedSamaganaIdx && matchedSamaganaIdx.size > 0 && !isMatch;
            const meta = [sg.rishi, sg.chandas, sg.devata].filter(Boolean);
            return (
              <div className={`samagana-item${isMatch ? ' sg-match' : ''}${dim ? ' sg-dim' : ''}`} key={idx}>
                <div className="samagana-item-head">
                  <span className="sg-no">{sg.no || ''}</span>
                  {sg.global_no && (
                    <span className="global-badge sg-global" title={`Sāman #${sg.global_no} of ${totalSamans} across all five texts`}>Sāman №{sg.global_no}</span>
                  )}
                  <span className="sg-meta">
                    {meta.map((v, i) => (
                      <span key={i}>{i > 0 && ' · '}{hl(v)}</span>
                    ))}
                    {sg.ref && <span>{meta.length > 0 && ' · '}{hl(sg.ref)}</span>}
                  </span>
                </div>
                <div className="samagana-text">{hl(sg.text)}</div>
                {sg.notes && <div className="samagana-notes">{hl(sg.notes)}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Gana() {
  const [theme, toggleTheme] = useTheme();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarFilter, setSidebarFilter] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [zoom, setZoom] = useState(1);
  const [openTexts, setOpenTexts] = useState(new Set());
  const [openSections, setOpenSections] = useState(new Set());
  const [currentRik, setCurrentRik] = useState(null); // {ti, si, ri}
  const [flashRik, setFlashRik] = useState(null);
  const [showJumpTop, setShowJumpTop] = useState(false);
  const [crumb, setCrumb] = useState(null);

  const contentRef = useRef(null);
  const searchInputRef = useRef(null);
  const timerRef = useRef(null);
  const initedFromQuery = useRef(false);

  useEffect(() => {
    fetch('/data/prakritiaranyakagana.json', { cache: 'no-cache' })
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(json => setData(json))
      .catch(err => setError(err.message));
  }, []);

  useEffect(() => {
    if (data && data.length && openTexts.size === 0) {
      setOpenTexts(new Set([0])); // open the first text by default
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

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

  const searchIndex = useMemo(() => (data ? buildSearchIndex(data) : []), [data]);

  const totalRiks = useMemo(() => (data ? data.reduce((a, t) => a + t.sections.reduce((b, s) => b + s.riks.length, 0), 0) : 0), [data]);
  const totalSamans = useMemo(() => (data ? data.reduce((a, t) => a + t.sections.reduce((b, s) => b + s.riks.reduce((c, r) => c + r.samaganas.length, 0), 0), 0) : 0), [data]);

  const q = debouncedQuery.trim();
  const terms = q ? splitTermsQuoted(q) : [];

  const scoredResults = useMemo(() => {
    if (!terms.length) return null;
    const scored = [];
    for (const entry of searchIndex) {
      const res = scoreEntry(entry, terms);
      if (res) scored.push({ entry, ...res });
    }
    scored.sort((a, b) => b.score - a.score || a.entry.ti - b.entry.ti || a.entry.si - b.entry.si || a.entry.ri - b.entry.ri);
    return scored;
  }, [searchIndex, terms]);

  const totalSamaganaMatches = scoredResults ? scoredResults.reduce((a, s) => a + (s.matchedSamaganaIdx.size || 0), 0) : 0;

  const scrollToText = (ti) => {
    const el = document.getElementById(`text-${ti}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const scrollToSection = (ti, si) => {
    const el = document.getElementById(`sec-${ti}-${si}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const scrollToRik = (ti, si, ri) => {
    const el = document.getElementById(`rik-${ti}-${si}-${ri}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setFlashRik(null);
      requestAnimationFrame(() => setFlashRik(`${ti}-${si}-${ri}`));
      highlightSidebarRik(ti, si, ri);
    }
  };

  // Mirrors the original's sidebar sync: opens the ancestor text/section,
  // collapses siblings, marks the rik link current.
  function highlightSidebarRik(ti, si, ri) {
    setCurrentRik({ ti, si, ri });
    setOpenTexts(new Set([ti]));
    setOpenSections(new Set([`${ti}-${si}`]));
  }

  const toggleTextGroup = (ti) => {
    setOpenTexts(prev => {
      const next = new Set(prev);
      const wasOpen = next.has(ti);
      if (wasOpen) next.delete(ti); else next.add(ti);
      if (!wasOpen) scrollToText(ti);
      return next;
    });
  };
  const toggleSection = (ti, si) => {
    const key = `${ti}-${si}`;
    setOpenSections(prev => {
      const next = new Set(prev);
      const wasOpen = next.has(key);
      if (wasOpen) next.delete(key); else next.add(key);
      if (!wasOpen) scrollToSection(ti, si);
      return next;
    });
  };

  const expandAll = () => {
    if (!data) return;
    setOpenTexts(new Set(data.map((_, ti) => ti)));
    const all = new Set();
    data.forEach((t, ti) => t.sections.forEach((_, si) => all.add(`${ti}-${si}`)));
    setOpenSections(all);
  };
  const collapseAll = () => { setOpenTexts(new Set()); setOpenSections(new Set()); };

  const onContentScroll = () => {
    const el = contentRef.current;
    if (!el) return;
    setShowJumpTop(el.scrollTop > 500);
    if (query.trim()) return;
    const cards = el.querySelectorAll('.rik-card');
    let cur = null;
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      if (rect.top <= 140) {
        cur = { ti: +card.dataset.text, si: +card.dataset.sec, ri: +card.dataset.rik };
      } else break;
    }
    if (cur) {
      const text = data[cur.ti];
      const meta = TEXT_META[text.key] || { translit: text.title };
      const sec = text.sections[cur.si];
      setCrumb({ kind: 'nav', translit: meta.translit, label: sec.label });
      highlightSidebarRik(cur.ti, cur.si, cur.ri);
    }
  };

  const filterNorm = normalize(sidebarFilter).toLowerCase();

  if (error) {
    return (
      <div className="reader-body"><div className="app"><main className="main"><div className="content"><div className="content-inner">
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          <p><b>Could not load data.json.</b><br />{error}<br /><br />
            Make sure <code>data/prakritiaranyakagana.json</code> is available and this page is served over http(s). <Link to="/">← Back to home</Link>
          </p>
        </div>
      </div></div></main></div></div>
    );
  }

  if (!data) {
    return (
      <div className="reader-body"><div className="app"><main className="main"><div className="content"><div className="content-inner">
        <div className="empty-state"><p>Loading Sāmaveda …</p></div>
      </div></div></main></div></div>
    );
  }

  return (
    <div className="reader-body">
      <div className="app">
        <div className={`sidebar-overlay${sidebarOpen && window.innerWidth <= 720 ? ' show' : ''}`} onClick={() => setSidebarOpen(false)} />
        <aside className={`sidebar${sidebarOpen ? '' : ' collapsed'}`}>
          <div className="sidebar-head">
            <Link className="brand" to="/" title="Back to home">
              <div className="brand-mark">साम</div>
              <div className="brand-text">
                <h1>Sāmaveda</h1>
                <p>Five saṁhitā sections · गानम्</p>
              </div>
            </Link>
            <div className="sidebar-search">
              <svg className="icn" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.6" y2="16.6" /></svg>
              <input type="text" placeholder="Filter sections & r̥ks…" value={sidebarFilter} onChange={e => setSidebarFilter(e.target.value)} />
              <button className={`sf-clear${sidebarFilter ? ' show' : ''}`} title="Clear filter" onClick={() => setSidebarFilter('')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="sidebar-actions">
              <button onClick={expandAll}>Expand all</button>
              <button onClick={collapseAll}>Collapse all</button>
            </div>
          </div>
          <nav className="sidebar-tree">
            {data.map((text, ti) => {
              const meta = TEXT_META[text.key] || { translit: text.title, idx: '?' };
              const nRiks = text.sections.reduce((a, s) => a + s.riks.length, 0);
              const groupLabelMatch = !filterNorm || meta.translit.toLowerCase().includes(filterNorm);

              // Determine which sections/riks match the filter
              const sectionsRendered = text.sections.map((sec, si) => {
                const secLabelMatch = !filterNorm || sec.label.toLowerCase().includes(filterNorm) || groupLabelMatch;
                const riksFiltered = sec.riks.map((r, ri) => {
                  const label = (r.rik_no ? `R̥k ${r.rik_no}` : (r.ref || `#${ri + 1}`)) + (r.devata ? ` — ${r.devata}` : '');
                  const match = !filterNorm || label.toLowerCase().includes(filterNorm);
                  return { r, ri, label, match };
                });
                const secHasMatch = riksFiltered.some(x => x.match);
                const secVisible = !filterNorm || secHasMatch || secLabelMatch;
                const secOpen = openSections.has(`${ti}-${si}`) || (filterNorm && secVisible);
                return { sec, si, riksFiltered, secHasMatch, secVisible, secOpen, secLabelMatch };
              });
              const groupHasMatch = sectionsRendered.some(s => s.secVisible);
              const groupVisible = !filterNorm || groupHasMatch;
              const groupOpen = openTexts.has(ti) || (filterNorm && groupVisible);

              if (!groupVisible) return null;

              return (
                <div className={`text-group${groupOpen ? ' open' : ''}`} key={ti}>
                  <button
                    className={`text-toggle${currentRik && currentRik.ti === ti ? ' active-text' : ''}`}
                    onClick={() => toggleTextGroup(ti)}
                  >
                    <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="9 6 15 12 9 18" /></svg>
                    <span className="idx">{meta.idx}</span>
                    <span className="label">{meta.translit}</span>
                    <span className="count">{nRiks}</span>
                  </button>
                  <div className="section-list">
                    {sectionsRendered.map(({ sec, si, riksFiltered, secVisible, secOpen }) => {
                      if (!secVisible) return null;
                      const isActiveSection = currentRik && currentRik.ti === ti && currentRik.si === si;
                      return (
                        <div className={`section-item${secOpen ? ' open' : ''}${isActiveSection ? ' active-section' : ''}`} key={si}>
                          <button className="section-toggle" title={sec.sub ? `${sec.label} (${sec.sub})` : sec.label}
                            onClick={(e) => { e.stopPropagation(); toggleSection(ti, si); }}>
                            <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="9 6 15 12 9 18" /></svg>
                            <span className="label">{sec.label}</span>
                            <span className="count">{sec.riks.length}</span>
                          </button>
                          <div className="rik-list">
                            {riksFiltered.map(({ ri, label, match }) => {
                              if (!match) return null;
                              const isCurrent = currentRik && currentRik.ti === ti && currentRik.si === si && currentRik.ri === ri;
                              return (
                                <button
                                  key={ri}
                                  className={`rik-link${isCurrent ? ' current' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    scrollToRik(ti, si, ri);
                                    if (window.innerWidth <= 720) setSidebarOpen(false);
                                  }}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
          <div className="sidebar-foot">
            <span><b>{data.length}</b> texts</span>
            <span><b>{totalRiks}</b> r̥ks</span>
            <span><b>{totalSamans}</b> sāma-gānas</span>
          </div>
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
                placeholder="Search verses, rishi, devatā, chandas, ref no…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              <button className={`clear-btn${query ? ' show' : ''}`} title="Clear" onClick={() => { setQuery(''); searchInputRef.current?.focus(); }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="crumb">
              {q ? <>Search: "<b>{q}</b>" · {scoredResults ? scoredResults.length : 0} result{scoredResults && scoredResults.length === 1 ? '' : 's'}</>
                : (crumb ? <><b>{crumb.translit}</b> / {crumb.label}</> : null)}
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
                  <div className="search-results-note">
                    Found <b>{scoredResults.length}</b> matching r̥k{scoredResults.length === 1 ? '' : 's'}
                    {totalSamaganaMatches > 0 && <> (<b>{totalSamaganaMatches}</b> sāma-gāna{totalSamaganaMatches === 1 ? '' : 's'} directly matched)</>}
                    {' '}for "<b>{q}</b>"
                  </div>
                  {scoredResults.length === 0 ? (
                    <div className="empty-state">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.6" y2="16.6" /></svg>
                      <p>No verses match your search. Try fewer or different terms — accents/svara marks are ignored automatically.</p>
                    </div>
                  ) : (
                    (() => {
                      let lastKey = '';
                      return scoredResults.slice(0, 400).map(({ entry, matchedSamaganaIdx }) => {
                        const meta = TEXT_META[data[entry.ti].key] || { translit: entry.textTitle };
                        const key = entry.ti + '-' + entry.si;
                        const heading = key !== lastKey;
                        lastKey = key;
                        return (
                          <div key={entry.ti + '-' + entry.si + '-' + entry.ri}>
                            {heading && (
                              <div className="section-heading" style={{ marginTop: 26 }}>
                                <h3 style={{ fontSize: 13 }}>{meta.translit} — {entry.secLabel}</h3>
                                <div className="rule"></div>
                              </div>
                            )}
                            <RikCard
                              text={data[entry.ti]} ti={entry.ti} si={entry.si} r={entry.r} ri={entry.ri}
                              terms={terms} matchedSamaganaIdx={matchedSamaganaIdx}
                              totalRiks={totalRiks} totalSamans={totalSamans}
                              flash={flashRik === `${entry.ti}-${entry.si}-${entry.ri}`}
                            />
                          </div>
                        );
                      });
                    })()
                  )}
                </>
              ) : (
                data.map((text, ti) => {
                  const meta = TEXT_META[text.key] || { translit: text.title, idx: '?' };
                  const nRiks = text.sections.reduce((a, s) => a + s.riks.length, 0);
                  const nSg = text.sections.reduce((a, s) => a + s.riks.reduce((b, r) => b + r.samaganas.length, 0), 0);
                  return (
                    <section className="text-section" id={`text-${ti}`} data-text={ti} key={ti}>
                      <div className="text-heading">
                        <div className="lbl">SĀMAVEDA · SECTION {ti + 1} OF {data.length}</div>
                        <h2>{text.title}</h2>
                        <p className="translit">{meta.translit}</p>
                        <p className="desc">{text.desc || ''}</p>
                        <div className="stats">
                          <span><b>{text.sections.length}</b> sections</span>
                          <span><b>{nRiks}</b> r̥ks</span>
                          <span><b>{nSg}</b> sāma-gānas</span>
                        </div>
                      </div>
                      {text.sections.map((sec, si) => (
                        <div key={si}>
                          <div className="section-heading" id={`sec-${ti}-${si}`} data-text={ti} data-sec={si}>
                            <h3>{sec.label}</h3>
                            {sec.sub && <span className="sub">{sec.sub}</span>}
                            <div className="rule"></div>
                          </div>
                          {sec.riks.map((r, ri) => (
                            <RikCard
                              key={ri}
                              text={text} ti={ti} si={si} r={r} ri={ri}
                              terms={null} matchedSamaganaIdx={null}
                              totalRiks={totalRiks} totalSamans={totalSamans}
                              flash={flashRik === `${ti}-${si}-${ri}`}
                            />
                          ))}
                        </div>
                      ))}
                    </section>
                  );
                })
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
