let DATA = [];
const DATA_URL = './data/samaveda.json';

const TEXT_META = {
  agneyam:   { translit: "Āgnēyam",           idx:"अ" },
  aindram:   { translit: "Aindram",           idx:"ऐ" },
  pavamanam: { translit: "Pavamānam",         idx:"प" },
  aranyaka:  { translit: "Āraṇyaka Gānam",    idx:"आ" },
  mahamnaya: { translit: "Mahānāmnyarcikam",  idx:"म" },
};

const TOTAL_RIKS = DATA.reduce((a,t)=>a+t.sections.reduce((b,s)=>b+s.riks.length,0),0);
const TOTAL_SAMANS = DATA.reduce((a,t)=>a+t.sections.reduce((b,s)=>b+s.riks.reduce((c,r)=>c+r.samaganas.length,0),0),0);

let zoom = 1;
let currentRikEl = null;

/* ---------------- sidebar tree build ---------------- */
const treeRoot = document.getElementById('sidebarTree');

function buildTree(){
  treeRoot.innerHTML = '';
  DATA.forEach((text, ti) => {
    const meta = TEXT_META[text.key] || {translit:text.title, idx:'?'};
    const nRiks = text.sections.reduce((a,s)=>a+s.riks.length,0);
    const group = document.createElement('div');
    group.className = 'text-group';
    group.dataset.textIdx = ti;

    const toggle = document.createElement('button');
    toggle.className = 'text-toggle';
    toggle.innerHTML = `<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="9 6 15 12 9 18"/></svg>
      <span class="idx">${meta.idx}</span>
      <span class="label">${meta.translit}</span>
      <span class="count">${nRiks}</span>`;
    toggle.addEventListener('click', () => {
      const wasOpen = group.classList.contains('open');
      group.classList.toggle('open');
      if(!wasOpen){ scrollToText(ti); }
    });
    group.appendChild(toggle);

    const sectionList = document.createElement('div');
    sectionList.className = 'section-list';

    text.sections.forEach((sec, si) => {
      const secItem = document.createElement('div');
      secItem.className = 'section-item';
      secItem.dataset.textIdx = ti;
      secItem.dataset.secIdx = si;

      const secToggle = document.createElement('button');
      secToggle.className = 'section-toggle';
      const secLabelFull = sec.sub ? `${sec.label} (${sec.sub})` : sec.label;
      secToggle.title = secLabelFull;
      secToggle.innerHTML = `<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="9 6 15 12 9 18"/></svg>
        <span class="label">${sec.label}</span>
        <span class="count">${sec.riks.length}</span>`;
      secToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasOpen = secItem.classList.contains('open');
        secItem.classList.toggle('open');
        if(!wasOpen){ scrollToSection(ti, si); }
      });
      secItem.appendChild(secToggle);

      const rikList = document.createElement('div');
      rikList.className = 'rik-list';
      sec.riks.forEach((r, ri) => {
        const rikBtn = document.createElement('button');
        rikBtn.className = 'rik-link';
        rikBtn.dataset.textIdx = ti;
        rikBtn.dataset.secIdx = si;
        rikBtn.dataset.rikIdx = ri;
        const label = r.rik_no ? `R̥k ${r.rik_no}` : (r.ref || `#${ri+1}`);
        rikBtn.textContent = label + (r.devata ? ` — ${r.devata}` : '');
        rikBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          scrollToRik(ti, si, ri);
          if(window.innerWidth <= 720) closeSidebarMobile();
        });
        rikList.appendChild(rikBtn);
      });
      secItem.appendChild(rikList);
      sectionList.appendChild(secItem);
    });

    group.appendChild(sectionList);
    treeRoot.appendChild(group);
  });
}

/* ---------------- content render (full library, sectioned) ---------------- */
const contentInner = document.getElementById('contentInner');

function escapeHtml(s){
  return (s||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

function renderRikMeta(r, terms){
  const hl = (s) => terms ? highlightMatches(s, terms) : escapeHtml(s);
  const tags = [];
  if(r.prapathaka) tags.push(`<span class="rik-tag">Prapāṭhaka: <b>${hl(r.prapathaka)}</b></span>`);
  if(r.ardha) tags.push(`<span class="rik-tag">Ardha: <b>${hl(r.ardha)}</b></span>`);
  if(r.khanda) tags.push(`<span class="rik-tag">Khaṇḍa: <b>${hl(r.khanda)}</b></span>`);
  if(r.rishi) tags.push(`<span class="rik-tag">R̥ṣi: <b>${hl(r.rishi)}</b></span>`);
  if(r.chandas) tags.push(`<span class="rik-tag">Chandas: <b>${hl(r.chandas)}</b></span>`);
  if(r.devata) tags.push(`<span class="rik-tag">Devatā: <b>${hl(r.devata)}</b></span>`);
  if(r.ref) tags.push(`<span class="rik-tag">${hl(r.ref)}</span>`);
  return tags.join('');
}

function renderRik(text, ti, si, r, ri, searchOpts){
  const terms = searchOpts && searchOpts.terms;
  const matchedIdx = (searchOpts && searchOpts.matchedSamaganaIdx) || null;
  const hl = (s) => terms ? highlightMatches(s, terms) : escapeHtml(s);
  const badge = r.rik_no ? `R̥k ${escapeHtml(String(r.rik_no))}` : '';
  let html = `<div class="rik-card" id="rik-${ti}-${si}-${ri}" data-text="${ti}" data-sec="${si}" data-rik="${ri}">`;
  html += `<div class="rik-meta">`;
  if(badge) html += `<span class="rik-no-badge">${badge}</span>`;
  if(r.global_no) html += `<span class="global-badge" title="R̥k #${r.global_no} of ${TOTAL_RIKS} across all five texts">R̥k №${r.global_no}</span>`;
  html += renderRikMeta(r, terms);
  html += `</div>`;
  if(r.samhita){
    html += `<div class="samhita-block">${hl(r.samhita)}</div>`;
  }
  if(r.pada){
    html += `<div class="pada-block">${hl(r.pada)}</div>`;
  }
  if(r.notes){
    html += `<div class="rik-notes">${hl(r.notes)}</div>`;
  }
  if(r.samaganas && r.samaganas.length){
    html += `<div class="samagana-list">`;
    r.samaganas.forEach((sg, idx) => {
      const isMatch = matchedIdx ? matchedIdx.has(idx) : false;
      const dim = matchedIdx && matchedIdx.size > 0 && !isMatch;
      const cls = 'samagana-item' + (isMatch ? ' sg-match' : '') + (dim ? ' sg-dim' : '');
      html += `<div class="${cls}">
        <div class="samagana-item-head">
          <span class="sg-no">${escapeHtml(String(sg.no||''))}</span>
          ${sg.global_no ? `<span class="global-badge sg-global" title="Sāman #${sg.global_no} of ${TOTAL_SAMANS} across all five texts">Sāman №${sg.global_no}</span>` : ''}
          <span class="sg-meta">${[sg.rishi,sg.chandas,sg.devata].filter(Boolean).map(v=>hl(v)).join(' · ')}${sg.ref?` · ${hl(sg.ref)}`:''}</span>
        </div>
        <div class="samagana-text">${hl(sg.text)}</div>
        ${sg.notes ? `<div class="samagana-notes">${hl(sg.notes)}</div>` : ''}
      </div>`;
    });
    html += `</div>`;
  }
  html += `</div>`;
  return html;
}

function renderAll(){
  let html = '';
  DATA.forEach((text, ti) => {
    const meta = TEXT_META[text.key] || {translit:text.title, idx:'?'};
    const nRiks = text.sections.reduce((a,s)=>a+s.riks.length,0);
    const nSg = text.sections.reduce((a,s)=>a+s.riks.reduce((b,r)=>b+r.samaganas.length,0),0);
    html += `<section class="text-section" id="text-${ti}" data-text="${ti}">`;
    html += `<div class="text-heading">
      <div class="lbl">SĀMAVEDA · SECTION ${ti+1} OF ${DATA.length}</div>
      <h2>${escapeHtml(text.title)}</h2>
      <p class="translit">${escapeHtml(meta.translit)}</p>
      <p class="desc">${escapeHtml(text.desc||'')}</p>
      <div class="stats"><span><b>${text.sections.length}</b> sections</span><span><b>${nRiks}</b> r̥ks</span><span><b>${nSg}</b> sāma-gānas</span></div>
    </div>`;

    text.sections.forEach((sec, si) => {
      html += `<div class="section-heading" id="sec-${ti}-${si}" data-text="${ti}" data-sec="${si}"><h3>${escapeHtml(sec.label)}</h3>${sec.sub?`<span class="sub">${escapeHtml(sec.sub)}</span>`:''}<div class="rule"></div></div>`;
      sec.riks.forEach((r, ri) => {
        html += renderRik(text, ti, si, r, ri);
      });
    });

    html += `</section>`;
  });
  contentInner.innerHTML = html;
}

/* ---------------- scroll navigation ---------------- */
const contentEl = document.getElementById('content');

function scrollToText(ti){
  const el = document.getElementById(`text-${ti}`);
  if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
}
function scrollToSection(ti, si){
  const el = document.getElementById(`sec-${ti}-${si}`);
  if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
}
function scrollToRik(ti, si, ri){
  const el = document.getElementById(`rik-${ti}-${si}-${ri}`);
  if(el){
    el.scrollIntoView({behavior:'smooth', block:'center'});
    el.classList.remove('match-highlight');
    void el.offsetWidth;
    el.classList.add('match-highlight');
    highlightSidebarRik(ti, si, ri);
  }
}

function highlightSidebarRik(ti, si, ri){
  document.querySelectorAll('.rik-link.current').forEach(el => el.classList.remove('current'));
  const btn = document.querySelector(`.rik-link[data-text-idx="${ti}"][data-sec-idx="${si}"][data-rik-idx="${ri}"]`);
  if(btn){
    btn.classList.add('current');
    const secItem = btn.closest('.section-item');
    const group = btn.closest('.text-group');
    if(secItem) secItem.classList.add('open');
    if(group) group.classList.add('open');
    btn.scrollIntoView({block:'nearest'});
  }
}

/* ---------------- sidebar collapse ---------------- */
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
document.getElementById('toggleSidebar').addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
  if(window.innerWidth <= 720){
    overlay.classList.toggle('show', !sidebar.classList.contains('collapsed'));
  }
});
overlay.addEventListener('click', closeSidebarMobile);
function closeSidebarMobile(){
  sidebar.classList.add('collapsed');
  overlay.classList.remove('show');
}
if(window.innerWidth <= 720){ sidebar.classList.add('collapsed'); }

/* ---------------- sidebar filter ---------------- */
document.getElementById('sidebarFilter').addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll('.text-group').forEach(group => {
    let groupHasMatch = false;
    group.querySelectorAll('.section-item').forEach(secItem => {
      let secHasMatch = false;
      secItem.querySelectorAll('.rik-link').forEach(link => {
        const match = !q || link.textContent.toLowerCase().includes(q);
        link.style.display = match ? '' : 'none';
        if(match) secHasMatch = true;
      });
      const secLabel = secItem.querySelector('.section-toggle .label').textContent.toLowerCase();
      const secMatch = secHasMatch || !q || secLabel.includes(q);
      secItem.style.display = secMatch ? '' : 'none';
      if(secMatch) groupHasMatch = true;
      if(q && secHasMatch) secItem.classList.add('open');
    });
    group.style.display = groupHasMatch || !q ? '' : 'none';
    if(q && groupHasMatch) group.classList.add('open');
  });
});

/* ---------------- global content search ---------------- */
const globalSearch = document.getElementById('globalSearch');
const clearSearch = document.getElementById('clearSearch');
let searchIndex = [];

// Escape one character for safe use inside a RegExp.
function escapeRegexChar(ch){
  return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
// Build a regex from a raw (possibly accented-Devanagari-free) query term that
// tolerates any Vedic accent / combining marks interleaved between characters
// of the source text, e.g. typing "अग्न" will match "अ꣢ग्न꣣" in the verse.
function buildFuzzyRegex(term){
  const chars = Array.from(term);
  const pattern = chars.map(escapeRegexChar).join('\\p{M}*');
  try{ return new RegExp(pattern, 'giu'); }
  catch(e){ return new RegExp(chars.map(escapeRegexChar).join(''), 'gi'); }
}
// Split a query into terms, honoring "quoted phrases" as a single term.
function splitTerms(q){
  const terms = [];
  const re = /"([^"]+)"|(\S+)/g;
  let m;
  while((m = re.exec(q))){
    const t = (m[1] || m[2] || '').trim();
    if(t) terms.push(t);
  }
  return terms;
}

const FIELD_WEIGHT = {
  number: 200, rishi: 80, devata: 80, chandas: 70, ref: 60,
  samhita: 50, notes: 40, pada: 35, sg_text: 25, sg_notes: 20
};

function buildSearchIndex(){
  searchIndex = [];
  DATA.forEach((text, ti) => {
    text.sections.forEach((sec, si) => {
      sec.riks.forEach((r, ri) => {
        const fields = {
          number: [r.rik_no, r.global_no, r.ref].filter(Boolean).map(String).join(' '),
          rishi: r.rishi || '',
          chandas: r.chandas || '',
          devata: r.devata || '',
          ref: r.ref || '',
          samhita: r.samhita || '',
          pada: r.pada || '',
          notes: r.notes || ''
        };
        const sgFields = (r.samaganas||[]).map(sg => ({
          sg,
          number: [sg.no, sg.global_no, sg.ref].filter(Boolean).map(String).join(' '),
          rishi: sg.rishi || '', chandas: sg.chandas || '', devata: sg.devata || '',
          sg_text: sg.text || '', sg_notes: sg.notes || ''
        }));
        searchIndex.push({ti, si, ri, r, fields, sgFields, textTitle: text.title, secLabel: sec.label});
      });
    });
  });
}

function scoreEntry(entry, terms){
  let total = 0;
  const matchedSamaganaIdx = new Set();
  for(const term of terms){
    const re = buildFuzzyRegex(term);
    let bestWeight = 0;
    for(const key of Object.keys(entry.fields)){
      re.lastIndex = 0;
      if(entry.fields[key] && re.test(entry.fields[key])){
        bestWeight = Math.max(bestWeight, FIELD_WEIGHT[key] || 10);
      }
    }
    entry.sgFields.forEach((sgf, idx) => {
      for(const key of ['number','rishi','chandas','devata','sg_text','sg_notes']){
        re.lastIndex = 0;
        const val = sgf[key];
        if(val && re.test(val)){
          const w = key === 'sg_text' ? FIELD_WEIGHT.sg_text
                  : key === 'sg_notes' ? FIELD_WEIGHT.sg_notes
                  : key === 'number' ? FIELD_WEIGHT.number
                  : FIELD_WEIGHT[key] || 40;
          bestWeight = Math.max(bestWeight, w);
          matchedSamaganaIdx.add(idx);
        }
      }
    });
    if(bestWeight === 0) return null; // this term matched nothing -> AND fails
    total += bestWeight;
  }
  return {score: total, matchedSamaganaIdx};
}

function highlightMatches(str, terms){
  if(!str || !terms.length) return escapeHtml(str);
  // Work on the escaped string but match against a temporary unescaped marker scheme:
  // simplest safe approach — run each fuzzy regex over the raw string to find ranges,
  // merge ranges, then build the escaped+marked output.
  const ranges = [];
  terms.forEach(term => {
    const re = buildFuzzyRegex(term);
    let m;
    while((m = re.exec(str))){
      if(m[0].length === 0){ re.lastIndex++; continue; }
      ranges.push([m.index, m.index + m[0].length]);
      if(re.lastIndex > str.length) break;
    }
  });
  if(!ranges.length) return escapeHtml(str);
  ranges.sort((a,b)=>a[0]-b[0]);
  const merged = [ranges[0]];
  for(let i=1;i<ranges.length;i++){
    const last = merged[merged.length-1];
    if(ranges[i][0] <= last[1]) last[1] = Math.max(last[1], ranges[i][1]);
    else merged.push(ranges[i]);
  }
  let out = '', cursor = 0;
  merged.forEach(([s,e]) => {
    out += escapeHtml(str.slice(cursor, s));
    out += '<mark>' + escapeHtml(str.slice(s, e)) + '</mark>';
    cursor = e;
  });
  out += escapeHtml(str.slice(cursor));
  return out;
}

function runGlobalSearch(qRaw){
  const q = qRaw.trim();
  clearSearch.classList.toggle('show', !!q);
  if(!q){
    renderAll();
    document.getElementById('crumb').textContent = '';
    return;
  }
  const terms = splitTerms(q);
  if(!terms.length){ renderAll(); return; }

  const scored = [];
  for(const entry of searchIndex){
    const res = scoreEntry(entry, terms);
    if(res) scored.push({entry, ...res});
  }
  scored.sort((a,b) => b.score - a.score || a.entry.ti-b.entry.ti || a.entry.si-b.entry.si || a.entry.ri-b.entry.ri);

  const totalSamaganaMatches = scored.reduce((a,s)=>a + (s.matchedSamaganaIdx.size || 0), 0);
  let html = `<div class="search-results-note">Found <b>${scored.length}</b> matching r̥k${scored.length===1?'':'s'}`
    + (totalSamaganaMatches ? ` (<b>${totalSamaganaMatches}</b> sāma-gāna${totalSamaganaMatches===1?'':'s'} directly matched)` : '')
    + ` for "<b>${escapeHtml(q)}</b>"</div>`;

  if(!scored.length){
    html += `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.6" y2="16.6"/></svg>
      <p>No verses match your search. Try fewer or different terms — accents/svara marks are ignored automatically.</p>
    </div>`;
  } else {
    let lastKey = '';
    scored.slice(0, 400).forEach(({entry, matchedSamaganaIdx}) => {
      const meta = TEXT_META[DATA[entry.ti].key] || {translit:entry.textTitle};
      const key = entry.ti+'-'+entry.si;
      if(key !== lastKey){
        html += `<div class="section-heading" style="margin-top:26px;"><h3 style="font-size:13px;">${escapeHtml(meta.translit)} — ${escapeHtml(entry.secLabel)}</h3><div class="rule"></div></div>`;
        lastKey = key;
      }
      let rikHtml = renderRik(DATA[entry.ti], entry.ti, entry.si, entry.r, entry.ri, {terms, matchedSamaganaIdx});
      html += rikHtml;
    });
  }
  contentInner.innerHTML = html;
  document.getElementById('crumb').innerHTML = `Search: "<b>${escapeHtml(q)}</b>" · ${scored.length} result${scored.length===1?'':'s'}`;
}

let searchTimer;
globalSearch.addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  const val = e.target.value;
  searchTimer = setTimeout(() => runGlobalSearch(val), 160);
});
clearSearch.addEventListener('click', () => {
  globalSearch.value = '';
  runGlobalSearch('');
  globalSearch.focus();
});

/* ---------------- zoom ---------------- */
function applyZoom(){
  document.documentElement.style.setProperty('--zoom', zoom.toFixed(2));
  document.getElementById('zoomVal').textContent = Math.round(zoom*100) + '%';
}
document.getElementById('zoomIn').addEventListener('click', () => { zoom = Math.min(2, zoom + 0.1); applyZoom(); });
document.getElementById('zoomOut').addEventListener('click', () => { zoom = Math.max(0.6, zoom - 0.1); applyZoom(); });

/* ---------------- scroll spy for crumb + jump-to-top ---------------- */
const jumpTop = document.getElementById('jumpTop');
contentEl.addEventListener('scroll', () => {
  jumpTop.classList.toggle('show', contentEl.scrollTop > 500);
  if(globalSearch.value.trim()) return;
  const cards = contentInner.querySelectorAll('.rik-card');
  let currentTextIdx = 0, currentSecIdx = 0, currentRikIdx = 0, found=false;
  for(const card of cards){
    const rect = card.getBoundingClientRect();
    if(rect.top <= 140){
      currentTextIdx = +card.dataset.text;
      currentSecIdx = +card.dataset.sec;
      currentRikIdx = +card.dataset.rik;
      found = true;
    } else break;
  }
  if(found){
    const text = DATA[currentTextIdx];
    const meta = TEXT_META[text.key] || {translit:text.title};
    const sec = text.sections[currentSecIdx];
    document.getElementById('crumb').innerHTML = `<b>${escapeHtml(meta.translit)}</b> / ${escapeHtml(sec.label)}`;
    highlightSidebarRik(currentTextIdx, currentSecIdx, currentRikIdx);
  }
});
jumpTop.addEventListener('click', () => contentEl.scrollTo({top:0, behavior:'smooth'}));

/* ---------------- theme toggle ---------------- */
const themeToggle = document.getElementById('themeToggle');
const iconMoon = document.getElementById('themeIconMoon');
const iconSun = document.getElementById('themeIconSun');
let theme = 'dark';
function applyTheme(){
  document.documentElement.setAttribute('data-theme', theme);
  iconMoon.style.display = theme === 'dark' ? '' : 'none';
  iconSun.style.display = theme === 'light' ? '' : 'none';
}
themeToggle.addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  applyTheme();
});

/* ---------------- init ---------------- */
async function initApp(){
  try{
    const response = await fetch(DATA_URL, { cache: 'no-store' });
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    DATA = await response.json();
    buildTree();
    buildSearchIndex();
    renderAll();
    applyZoom();
    applyTheme();
    document.querySelectorAll('.text-group')[0]?.classList.add('open');
  }catch(error){
    console.error('Unable to load Sāmaveda data:', error);
    contentInner.innerHTML = `<div class="empty-state">
      <p><strong>Unable to load the Sāmaveda corpus.</strong></p>
      <p>Make sure <code>data/samaveda.json</code> is present when this site is deployed.</p>
    </div>`;
  }
}
initApp();
