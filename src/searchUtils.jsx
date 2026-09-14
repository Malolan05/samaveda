// Strip Vedic accent/svara marks so search matches on plain consonant/vowel
// text regardless of which svara marks are present in the source.
export function normalize(s) {
  return String(s || '').normalize('NFC').replace(/[꣡꣢꣣꣥꣯᳐᳒]/g, '').replace(/\s+/g, ' ').trim();
}

export function splitTermsSimple(q) {
  return normalize(q).toLowerCase().split(/\s+/).filter(Boolean);
}

// Splits a raw search query into individual terms, honoring
// "double-quoted phrases" as a single term (used by the gāna reader).
export function splitTermsQuoted(q) {
  const terms = [];
  const re = /"([^"]+)"|(\S+)/g;
  let m;
  while ((m = re.exec(q))) {
    const t = (m[1] || m[2] || '').trim();
    if (t) terms.push(t);
  }
  return terms;
}

function escapeRegexChar(ch) {
  return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Builds a regex that matches `term` even if Unicode combining marks are
// interleaved between its characters in the source text, so a plain,
// unaccented search term still matches accented Sanskrit text.
export function buildFuzzyRegex(term) {
  const chars = Array.from(term);
  const pattern = chars.map(escapeRegexChar).join('\\p{M}*');
  try {
    return new RegExp(pattern, 'giu');
  } catch (e) {
    return new RegExp(chars.map(escapeRegexChar).join(''), 'gi');
  }
}

// Wraps every substring of `str` matching any of `terms` in <mark>,
// merging overlapping/adjacent ranges so nested <mark>s never occur.
// Returns an array of React nodes (strings and <mark> elements).
export function highlightToNodes(str, terms) {
  const text = String(str || '');
  if (!terms || !terms.length) return [text];
  const ranges = [];
  terms.forEach(term => {
    if (!term) return;
    const re = buildFuzzyRegex(term);
    let m;
    while ((m = re.exec(text))) {
      if (m[0].length === 0) { re.lastIndex++; continue; }
      ranges.push([m.index, m.index + m[0].length]);
      if (re.lastIndex > text.length) break;
    }
  });
  if (!ranges.length) return [text];
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [ranges[0]];
  for (let i = 1; i < ranges.length; i++) {
    const last = merged[merged.length - 1];
    if (ranges[i][0] <= last[1]) last[1] = Math.max(last[1], ranges[i][1]);
    else merged.push(ranges[i]);
  }
  const nodes = [];
  let cursor = 0;
  merged.forEach(([s, e], i) => {
    if (s > cursor) nodes.push(text.slice(cursor, s));
    nodes.push(<mark key={i}>{text.slice(s, e)}</mark>);
    cursor = e;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

export function snippet(text, terms, radius = 60) {
  const t = String(text || '');
  const norm = normalize(t).toLowerCase();
  let idx = -1;
  for (const term of terms) {
    const i = norm.indexOf(term);
    if (i >= 0) { idx = i; break; }
  }
  if (idx < 0) return t.length > radius * 2 ? t.slice(0, radius * 2) + '…' : t;
  const start = Math.max(0, idx - radius);
  const end = Math.min(t.length, idx + radius);
  return (start > 0 ? '…' : '') + t.slice(start, end) + (end < t.length ? '…' : '');
}
