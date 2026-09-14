import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import useTheme from '../useTheme';
import { normalize, splitTermsSimple, highlightToNodes, snippet } from '../searchUtils';
import './Landing.css';

const TEXT_META = {
  agneyam: 'Āgnēyam', aindram: 'Aindram', pavamanam: 'Pavamānam',
  aranyaka: 'Āraṇyaka Gānam', mahamnaya: 'Mahānāmnyarcikam',
};

function matchGana(GANA, terms) {
  const hits = [];
  GANA.forEach((text) => {
    const meta = TEXT_META[text.key] || text.title;
    text.sections.forEach((sec) => {
      sec.riks.forEach((r) => {
        const hay = normalize([r.samhita, r.pada, r.rishi, r.devata, r.chandas, r.notes].filter(Boolean).join(' ')).toLowerCase();
        if (terms.every(t => hay.includes(t))) {
          hits.push({ label: meta, text: r.samhita || r.pada || '' });
          return;
        }
        (r.samaganas || []).some(sg => {
          const sgHay = normalize([sg.text, sg.rishi, sg.devata, sg.chandas, sg.notes].filter(Boolean).join(' ')).toLowerCase();
          if (terms.every(t => sgHay.includes(t))) {
            hits.push({ label: meta, text: sg.text || '' });
            return true;
          }
          return false;
        });
      });
    });
  });
  return hits;
}

function matchSuktas(SUKTAS, terms) {
  const hits = [];
  SUKTAS.forEach((text) => {
    text.verses.forEach((v) => {
      const hay = normalize(v + ' ' + text.title).toLowerCase();
      if (terms.every(t => hay.includes(t))) {
        hits.push({ label: text.title, text: v });
      }
    });
  });
  return hits;
}

export default function Landing() {
  const [theme, toggleTheme] = useTheme();
  const [gana, setGana] = useState([]);
  const [suktas, setSuktas] = useState([]);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    fetch('/data/prakritiaranyakagana.json', { cache: 'no-cache' })
      .then(res => (res.ok ? res.json() : []))
      .then(setGana)
      .catch(() => {});
    fetch('/data/suktas.json', { cache: 'no-cache' })
      .then(res => (res.ok ? res.json() : { texts: [] }))
      .then(j => setSuktas(j.texts || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(query), 160);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  const ganaStats = useMemo(() => {
    if (!Array.isArray(gana) || !gana.length) return null;
    const nRiks = gana.reduce((a, t) => a + t.sections.reduce((b, s) => b + s.riks.length, 0), 0);
    const nSaman = gana.reduce((a, t) => a + t.sections.reduce((b, s) => b + s.riks.reduce((c, r) => c + r.samaganas.length, 0), 0), 0);
    return { texts: gana.length, riks: nRiks, samans: nSaman };
  }, [gana]);

  const suktaStats = useMemo(() => {
    if (!suktas.length) return null;
    const nVerses = suktas.reduce((a, t) => a + t.verses.length, 0);
    return { suktas: suktas.length, verses: nVerses };
  }, [suktas]);

  const q = debouncedQuery.trim();
  const terms = splitTermsSimple(q);
  const ganaHits = q && terms.length ? matchGana(gana, terms).slice(0, 8) : [];
  const suktaHits = q && terms.length ? matchSuktas(suktas, terms).slice(0, 8) : [];
  const total = ganaHits.length + suktaHits.length;

  return (
    <div className="landing-body">
      <div className="page">
        <div className="topbar">
          <div className="brand">
            <div className="brand-mark">साम</div>
            <div className="brand-text">
              <h1>Sāmaveda</h1>
              <p>A digital archive of gāna &amp; sūkta texts</p>
            </div>
          </div>
          <button className="icon-btn" onClick={toggleTheme} title="Toggle dark mode">
            <svg className="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" /><line x1="4.93" y1="4.93" x2="6.34" y2="6.34" /><line x1="17.66" y1="17.66" x2="19.07" y2="19.07" /><line x1="2" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22" y2="12" /><line x1="4.93" y1="19.07" x2="6.34" y2="17.66" /><line x1="17.66" y1="6.34" x2="19.07" y2="4.93" /></svg>
            <svg className="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
          </button>
        </div>

        <div className="hero">
          <h2>सामवेदः</h2>
          <p>प्रकृति-आरण्यकगान एवं सूक्तपाठयोः समेकितः पाठकः — गीयमानान् ऋचः, तत्सम्बद्धान् साम्नः, एवं स्वतन्त्रसूक्तानि च अन्विष्य पठत।</p>
        </div>

        <div className="search-wrap">
          <div className="search-box">
            <svg className="icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.6" y2="16.6" /></svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="सर्वत्र अन्वेषणम् करें… search all texts, verses & sūktas"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button
              className={`clear-btn${query ? ' show' : ''}`}
              title="Clear"
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          {!q && <div className="search-hint">Searching across ग्रामेगेयगानम् and सूक्ततानि both.</div>}

          {q && terms.length > 0 && (
            <div className="search-results">
              <div className="sr-note">Found <b>{total}</b> match{total === 1 ? '' : 'es'} for "<b>{q}</b>" across both corpora</div>
              {total === 0 ? (
                <div className="sr-empty">No verses match. Try fewer or different terms — accent marks are ignored automatically.</div>
              ) : (
                <>
                  {ganaHits.length > 0 && (
                    <>
                      <div className="sr-group-label">ग्रामेगेय(वेय, प्रकृति)गानात्मकः</div>
                      {ganaHits.map((h, i) => (
                        <Link key={'g' + i} className="sr-item" to={`/gana?q=${encodeURIComponent(q)}`}>
                          <div className="sr-title"><b>{h.label}</b> · gāna</div>
                          <div className="sr-text">{highlightToNodes(snippet(h.text, terms), terms)}</div>
                        </Link>
                      ))}
                    </>
                  )}
                  {suktaHits.length > 0 && (
                    <>
                      <div className="sr-group-label">सूक्ततानि</div>
                      {suktaHits.map((h, i) => (
                        <Link key={'s' + i} className="sr-item" to={`/suktas?q=${encodeURIComponent(q)}`}>
                          <div className="sr-title"><b>{h.label}</b> · sūkta</div>
                          <div className="sr-text">{highlightToNodes(snippet(h.text, terms), terms)}</div>
                        </Link>
                      ))}
                    </>
                  )}
                  <Link className="sr-more" to={`/gana?q=${encodeURIComponent(q)}`}>See all matches in गानम् →</Link>
                  <Link className="sr-more" to={`/suktas?q=${encodeURIComponent(q)}`}>See all matches in सूक्ततानि →</Link>
                </>
              )}
            </div>
          )}
        </div>

        <div className="cards">
          <Link className="card" to="/gana">
            <div className="card-mark">गा</div>
            <h3>ग्रामेगेय(वेय, प्रकृति)गानात्मकः</h3>
            <p className="subtitle">Prakr̥ti-Āraṇyaka Gāna Corpus</p>
            <p className="desc">सामवेदस्य ऋक्, तत्संलग्नानि साम-गानानि च — प्रपाठक, अर्ध, खण्ड, ऋषि, छन्दस्, देवता क्रमेण संरचितानि। पूर्णं वृक्षनौचालनं, सर्वव्यापि अन्वेषणं, तथा पाठ-आकार नियन्त्रणं सह।</p>
            <div className="stats">
              {ganaStats ? (
                <>
                  <span><b>{ganaStats.texts}</b> texts</span>
                  <span><b>{ganaStats.riks}</b> r̥ks</span>
                  <span><b>{ganaStats.samans}</b> sāma-gānas</span>
                </>
              ) : <span>Open to browse</span>}
            </div>
            <div className="enter">Explore गानम्
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </div>
          </Link>

          <Link className="card" to="/suktas">
            <div className="card-mark">सू</div>
            <h3>सूक्ततानि</h3>
            <p className="subtitle">Standalone Sūkta Hymns</p>
            <p className="desc">पुरुषसूक्तम्, श्रीसूक्तम्, लक्ष्मीसूक्तम् इत्यादीनि स्वतन्त्राणि सूक्तानि — प्रत्येकं सूक्तस्य समग्रः पाठः ऋक्-क्रमेण, अन्वेषण-सहितः।</p>
            <div className="stats">
              {suktaStats ? (
                <>
                  <span><b>{suktaStats.suktas}</b> sūktas</span>
                  <span><b>{suktaStats.verses}</b> ऋचः</span>
                </>
              ) : <span>Open to browse</span>}
            </div>
            <div className="enter">Explore सूक्तानि
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </div>
          </Link>
        </div>

        <footer className="site-footer">Sāmaveda Reader · गानम् &amp; सूक्ततानि</footer>
      </div>
    </div>
  );
}
