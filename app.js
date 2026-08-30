// ============ DATA ============
// materials: [old, new, p30_text, de_text, en_text, status(g/b/'')]
// equip:     [eqnum, description, floc_suffix(no "KA-B235-"), legacy, source]
// tploc:     [oldLabel, description, newFlocSuffix(no "KA-B235-"), source]
let MATERIALS = [];
let EQUIP = [];
let TPLOC = [];
const EQUIP_PREFIX = "KA-B235-";
const LIST_LIMIT = 150;   // when a single category is active
const PREVIEW_LIMIT = 6;  // per-section preview when category = "all"

let category = 'all';       // 'all' | 'materials' | 'equip' | 'tploc'
let activeAreaChip = null;  // equipment area sub-filter, e.g. "MP"
let EQ_BY_FLOC = {};        // floc suffix -> [equipment numbers], built after EQUIP loads

// ============ BOOT ============
const bootLineEl = document.getElementById('bootline');
const bootBarEl = document.getElementById('bootbar');
function setBoot(msg, pct){
  bootLineEl.textContent = msg;
  bootBarEl.style.width = pct + '%';
}
async function fetchJson(url){
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' bei ' + url);
  return res.json();
}

(async function boot(){
  setBoot('Lade Materialzuordnungen…', 12);
  try{ MATERIALS = await fetchJson('materials.json'); }
  catch(err){ setBoot('Fehler beim Laden von materials.json: ' + err.message, 100); console.error(err); return; }
  setBoot(MATERIALS.length.toLocaleString('de-CH') + ' Materialzuordnungen geladen', 45);

  setBoot('Lade Equipment-Daten…', 55);
  try{ EQUIP = await fetchJson('equipment.json'); }
  catch(err){ setBoot('Fehler beim Laden von equipment.json: ' + err.message, 100); console.error(err); return; }
  setBoot(EQUIP.length.toLocaleString('de-CH') + ' Equipment-Datensätze geladen', 75);

  setBoot('Lade Technische Plätze…', 82);
  try{ TPLOC = await fetchJson('tplocations.json'); }
  catch(err){ setBoot('Fehler beim Laden von tplocations.json: ' + err.message, 100); console.error(err); return; }
  setBoot(TPLOC.length.toLocaleString('de-CH') + ' Technische Plätze geladen', 94);

  setTimeout(initApp, 180);
})();

function initApp(){
  try{
    document.getElementById('ref-mat').textContent = MATERIALS.length.toLocaleString('de-CH');
    document.getElementById('ref-eq').textContent = EQUIP.length.toLocaleString('de-CH');
    document.getElementById('ref-tp').textContent = TPLOC.length.toLocaleString('de-CH');
    document.getElementById('hdr-status').textContent = (MATERIALS.length + EQUIP.length + TPLOC.length).toLocaleString('de-CH') + ' Einträge bereit';
    buildAreaChips();
    runSearch();
    setBoot('Bereit.', 100);
    setTimeout(()=>{ document.getElementById('boot').classList.add('hidden'); }, 260);
  } catch(err){
    setBoot('Fehler beim Start: ' + err.message, 100);
    console.error(err);
  }
}

// ============ TOAST / COPY ============
let toastTimer;
function showToast(msg){
  const t = document.getElementById('toast');
  t.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>' + msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> t.classList.remove('show'), 1400);
}
function copyText(txt, label){
  navigator.clipboard.writeText(txt).then(()=> showToast((label||'Kopiert') + ': ' + txt)).catch(()=>{
    const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    showToast((label||'Kopiert') + ': ' + txt);
  });
}

// ============ CATEGORY / AREA CHIPS ============
function setCategory(cat){
  category = cat;
  document.querySelectorAll('.cat-chip').forEach(c => c.classList.toggle('active', c.dataset.cat === cat));
  document.getElementById('eq-chipbar').style.display = (cat === 'equip') ? 'flex' : 'none';
  runSearch();
}

function buildAreaChips(){
  const areaCounts = {};
  EQ_BY_FLOC = {};
  EQUIP.forEach(r=>{
    const seg = r[2].split('-')[0];
    areaCounts[seg] = (areaCounts[seg]||0)+1;
    (EQ_BY_FLOC[r[2]] = EQ_BY_FLOC[r[2]] || []).push(r[0]);
  });
  const chipbar = document.getElementById('eq-chipbar');
  const areaOrder = Object.keys(areaCounts).sort((a,b)=>areaCounts[b]-areaCounts[a]);
  chipbar.innerHTML = areaOrder.map(a=>
    `<div class="chip" data-area="${a}" onclick="toggleAreaChip('${a}')">${a} <span class="n">${areaCounts[a]}</span></div>`
  ).join('');
}
function toggleAreaChip(area){
  activeAreaChip = (activeAreaChip === area) ? null : area;
  document.querySelectorAll('.chip[data-area]').forEach(c=>{
    c.classList.toggle('active', c.dataset.area === activeAreaChip);
  });
  runSearch();
}

// ============ MATCHING ============
function matchMaterials(q){
  if(!q) return MATERIALS;
  const isNumeric = /^[0-9]+$/.test(q);
  const out = [];
  for(let i=0;i<MATERIALS.length;i++){
    const r = MATERIALS[i];
    let hit;
    if(isNumeric){ hit = (r[0] && r[0].indexOf(q) !== -1) || (r[1] && r[1].indexOf(q) !== -1); }
    else{ hit = (r[2] && r[2].toLowerCase().indexOf(q) !== -1) || (r[3] && r[3].toLowerCase().indexOf(q) !== -1) || (r[4] && r[4].toLowerCase().indexOf(q) !== -1); }
    if(hit) out.push(r);
  }
  out.sort((a,b)=>{
    const ae = (a[0]===q || a[1]===q) ? 0 : 1;
    const be = (b[0]===q || b[1]===q) ? 0 : 1;
    return ae - be;
  });
  return out;
}
function matchEquip(q){
  let pool = activeAreaChip ? EQUIP.filter(r => r[2].split('-')[0] === activeAreaChip) : EQUIP;
  if(!q) return pool;
  return pool.filter(r =>
    (r[0] && r[0].toLowerCase().indexOf(q) !== -1) ||
    (r[1] && r[1].toLowerCase().indexOf(q) !== -1) ||
    (r[2] && r[2].toLowerCase().indexOf(q) !== -1) ||
    (r[3] && r[3].toLowerCase().indexOf(q) !== -1)
  );
}
function matchTploc(q){
  if(!q) return TPLOC;
  return TPLOC.filter(r => {
    if(r[0] && r[0].toLowerCase().indexOf(q) !== -1) return true;
    if(r[1] && r[1].toLowerCase().indexOf(q) !== -1) return true;
    if(r[2] && r[2].toLowerCase().indexOf(q) !== -1) return true;
    const linkedEq = EQ_BY_FLOC[r[2]];
    if(linkedEq && linkedEq.some(eq => eq.indexOf(q) !== -1)) return true;
    return false;
  });
}

// ============ RENDERING ============
function statusBadge(code){
  if(code === 'g') return '<span class="badge generiert">generiert</span>';
  if(code === 'b') return '<span class="badge beibehalten">beibehalten</span>';
  return '';
}
function renderMatRow(r){
  const [oldNum, newNum, p30, de, en, status] = r;
  return `<div class="mrow">
    <div class="num-pair">
      <div class="num-block old">
        <span class="lbl">P30 (ALT)</span>
        <span class="val" onclick="copyText('${oldNum}','P30-Nr.')">${oldNum || '—'}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </span>
      </div>
      <span class="arrow">→</span>
      <div class="num-block new">
        <span class="lbl">P1S ASPIRE (NEU)</span>
        <span class="val" onclick="copyText('${newNum}','P1S-Nr.')">${newNum || '—'}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </span>
      </div>
    </div>
    <div class="desc">
      <div class="de">${de || en || '(keine Bezeichnung)'}</div>
      ${en && en !== de ? `<div class="en">${en}</div>` : ''}
      ${p30 ? `<div class="p30">P30: ${p30}</div>` : ''}
    </div>
    ${statusBadge(status)}
  </div>`;
}
function renderFlocSegments(suffix){
  if(!suffix) return '<span class="seg">KA-B235</span>';
  const segs = suffix.split('-');
  return '<span class="seg" onclick="copyText(\'' + EQUIP_PREFIX + suffix + '\',\'Funktionsort\')" title="Ganzen Funktionsort kopieren">' +
    'KA-B235</span>' + segs.map(s=>'<span class="sep">/</span><span class="seg">'+s+'</span>').join('');
}
function renderEqRow(r){
  const [eqnum, desc, floc] = r;
  return `<div class="erow">
    <div>
      <div class="desc">${desc || '(keine Bezeichnung)'}</div>
      <div class="floc">${renderFlocSegments(floc)}</div>
    </div>
    <div class="right">
      <span class="eqlbl">EQUIPMENT-NR.</span>
      <span class="eqnum" onclick="copyText('${eqnum}','Equipment-Nr.')">${eqnum}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      </span>
    </div>
  </div>`;
}
function renderTplocRow(r){
  const [oldLabel, desc, newSuffix, source] = r;
  const linkedEq = EQ_BY_FLOC[newSuffix] || [];
  const eqHtml = linkedEq.length
    ? linkedEq.slice(0,3).map(eqnum =>
        `<span class="eqnum" onclick="copyText('${eqnum}','Equipment-Nr.')">${eqnum}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </span>`).join('')
    : '<span class="eqnum-none">kein Equipment verknüpft</span>';
  const moreEq = linkedEq.length > 3 ? `<span class="eqnum-more">+${linkedEq.length-3} weitere</span>` : '';
  return `<div class="erow tp">
    <div>
      <div class="desc">${desc || '(keine Bezeichnung)'}</div>
      <div class="floc">${renderFlocSegments(newSuffix)}</div>
      ${oldLabel ? `<div class="p30" style="margin-top:7px;">Alter Techn. Platz: ${oldLabel}</div>` : ''}
    </div>
    <div class="right">
      <span class="eqlbl">${linkedEq.length ? 'EQUIPMENT-NR.' : source || 'QUELLE'}</span>
      <div class="eqnum-stack">${eqHtml}${moreEq}</div>
    </div>
  </div>`;
}

function emptyState(big, small){
  return `<div class="empty"><div class="big">${big}</div>${small ? `<div class="small">${small}</div>` : ''}</div>`;
}

function sectionHtml(key, title, swatchClass, matches, renderFn, q){
  const total = matches.length;
  if(total === 0) return '';
  const shown = matches.slice(0, PREVIEW_LIMIT);
  const expandBtn = total > PREVIEW_LIMIT
    ? `<button class="expand" onclick="setCategory('${key}')">alle ${total.toLocaleString('de-CH')} anzeigen →</button>`
    : '';
  return `<div class="section">
    <div class="section-head">
      <span class="swatch ${swatchClass}"></span>
      <h3>${title}</h3>
      <span class="count">${total.toLocaleString('de-CH')} Treffer</span>
      ${expandBtn}
    </div>
    <div class="results">${shown.map(renderFn).join('')}</div>
  </div>`;
}

function runSearch(){
  const raw = document.getElementById('uni-input').value;
  const q = raw.trim().toLowerCase();
  document.getElementById('uni-clear').style.display = q ? 'block' : 'none';

  const matMatches = matchMaterials(q);
  const eqMatches = matchEquip(q);
  const tpMatches = matchTploc(q);

  document.getElementById('cat-n-all').textContent = (matMatches.length + eqMatches.length + tpMatches.length).toLocaleString('de-CH');
  document.getElementById('cat-n-materials').textContent = matMatches.length.toLocaleString('de-CH');
  document.getElementById('cat-n-equip').textContent = eqMatches.length.toLocaleString('de-CH');
  document.getElementById('cat-n-tploc').textContent = tpMatches.length.toLocaleString('de-CH');

  const root = document.getElementById('results-root');

  if(category === 'all'){
    if(!q){
      root.innerHTML = emptyState(
        'Alle drei Listen bereit — ' + (MATERIALS.length + EQUIP.length + TPLOC.length).toLocaleString('de-CH') + ' Einträge',
        'Tippe oben eine Nummer oder Bezeichnung ein, oder wähle eine Kategorie.'
      );
      return;
    }
    const sections = [
      sectionHtml('materials', 'Material', 'swatch-mat', matMatches, renderMatRow, q),
      sectionHtml('equip', 'Equipment', 'swatch-eq', eqMatches, renderEqRow, q),
      sectionHtml('tploc', 'Technischer Platz', 'swatch-tp', tpMatches, renderTplocRow, q),
    ].join('');
    root.innerHTML = sections || emptyState('Keine Treffer in allen drei Listen', 'Prüfe die Nummer oder versuche einen Teil der Bezeichnung.');
    return;
  }

  // single category — flat list
  let matches, renderFn, label;
  if(category === 'materials'){ matches = matMatches; renderFn = renderMatRow; label = 'Material'; }
  else if(category === 'equip'){ matches = eqMatches; renderFn = renderEqRow; label = 'Equipment'; }
  else { matches = tpMatches; renderFn = renderTplocRow; label = 'Technischer Platz'; }

  if(matches.length === 0){
    root.innerHTML = emptyState('Keine Treffer', 'Prüfe die Nummer, den Funktionsort oder einen Teil der Bezeichnung.');
    return;
  }
  const shown = matches.slice(0, LIST_LIMIT);
  let html = `<div class="results">${shown.map(renderFn).join('')}</div>`;
  if(matches.length > LIST_LIMIT){
    html += `<div class="more-hint">+ ${(matches.length - LIST_LIMIT).toLocaleString('de-CH')} weitere Treffer in ${label} — Suche eingrenzen für vollständige Liste</div>`;
  }
  root.innerHTML = html;
}

let uniDebounce;
document.getElementById('uni-input').addEventListener('input', ()=>{
  clearTimeout(uniDebounce);
  uniDebounce = setTimeout(runSearch, 90);
});
function clearUni(){
  document.getElementById('uni-input').value = '';
  runSearch();
  document.getElementById('uni-input').focus();
}
