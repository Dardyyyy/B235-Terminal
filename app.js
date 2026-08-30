// ============ DATA ============
// materials: [old, new, p30_text, de_text, en_text, status(g/b/'')]
// equip:     [eqnum, description, floc_suffix(no KA-B235- prefix), legacy, source]
let MATERIALS = [];
let EQUIP = [];
const EQUIP_PREFIX = "KA-B235-";

const bootLineEl = document.getElementById('bootline');
const bootBarEl = document.getElementById('bootbar');
function setBoot(msg, pct){
  bootLineEl.textContent = msg;
  bootBarEl.style.width = pct + '%';
}

async function fetchJson(url){
  const res = await fetch(url, { cache: 'force-cache' });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' bei ' + url);
  return res.json();
}

function initApp(){
  try{
    document.getElementById('mat-total-count').textContent = MATERIALS.length.toLocaleString('de-CH');
    document.getElementById('eq-total-count').textContent = EQUIP.length.toLocaleString('de-CH');
    document.getElementById('mat-meta-total').textContent = MATERIALS.length.toLocaleString('de-CH');
    document.getElementById('eq-meta-total').textContent = EQUIP.length.toLocaleString('de-CH');
    document.getElementById('hdr-count').textContent = (MATERIALS.length + EQUIP.length).toLocaleString('de-CH') + ' EINTRÄGE';
    buildAreaChips();
    searchMaterials('');
    searchEquip('');
    setBoot('Bereit.', 100);
    setTimeout(()=>{ document.getElementById('boot').classList.add('hidden'); }, 280);
  } catch(err){
    setBoot('Fehler beim Start: ' + err.message, 100);
    console.error(err);
  }
}

(async function boot(){
  setBoot('Lade Materialzuordnungen…', 15);
  try{
    MATERIALS = await fetchJson('data/materials.json');
  } catch(err){
    setBoot('Fehler beim Laden von data/materials.json: ' + err.message, 100);
    console.error(err);
    return;
  }
  setBoot(MATERIALS.length.toLocaleString('de-CH') + ' Materialzuordnungen geladen', 55);

  setBoot('Lade Equipment-Daten…', 65);
  try{
    EQUIP = await fetchJson('data/equipment.json');
  } catch(err){
    setBoot('Fehler beim Laden von data/equipment.json: ' + err.message, 100);
    console.error(err);
    return;
  }
  setBoot(EQUIP.length.toLocaleString('de-CH') + ' Equipment-Datensätze KA-B235 geladen', 85);

  setTimeout(initApp, 180);
})();

// ============ MODE SWITCH ============
function setMode(mode){
  const isMat = mode === 'materials';
  document.getElementById('btn-materials').classList.toggle('active', isMat);
  document.getElementById('btn-equip').classList.toggle('active', !isMat);
  document.getElementById('panel-materials').classList.toggle('active', isMat);
  document.getElementById('panel-equip').classList.toggle('active', !isMat);
  if(isMat){ document.getElementById('mat-input').focus(); }
  else { document.getElementById('eq-input').focus(); }
}

// ============ TOAST ============
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

// ============ MATERIALS SEARCH ============
const matInput = document.getElementById('mat-input');
const matResults = document.getElementById('mat-results');
const matHint = document.getElementById('mat-hint');
const matMeta = document.getElementById('mat-meta');
const MAT_LIMIT = 150;

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

function searchMaterials(q){
  q = q.trim().toLowerCase();
  if(!q){
    matMeta.innerHTML = `Alle <b>${MATERIALS.length.toLocaleString('de-CH')}</b> Einträge — tippe, um zu filtern`;
    matResults.innerHTML = `<div class="empty"><div class="big">${MATERIALS.length.toLocaleString('de-CH')} Materialzuordnungen bereit</div><div class="small">Gib eine alte oder neue Materialnummer (oder einen Teil der Bezeichnung) ein.</div></div>`;
    matHint.style.display = 'none';
    return;
  }
  const isNumeric = /^[0-9]+$/.test(q);
  let matches = [];
  for(let i=0;i<MATERIALS.length;i++){
    const r = MATERIALS[i];
    const oldNum = r[0], newNum = r[1];
    let hit = false;
    if(isNumeric){
      hit = (oldNum && oldNum.indexOf(q) !== -1) || (newNum && newNum.indexOf(q) !== -1);
    } else {
      hit = (r[2] && r[2].toLowerCase().indexOf(q) !== -1) ||
            (r[3] && r[3].toLowerCase().indexOf(q) !== -1) ||
            (r[4] && r[4].toLowerCase().indexOf(q) !== -1);
    }
    if(hit){ matches.push(r); if(matches.length >= 5000) break; }
  }
  matches.sort((a,b)=>{
    const ae = (a[0]===q || a[1]===q) ? 0 : 1;
    const be = (b[0]===q || b[1]===q) ? 0 : 1;
    return ae - be;
  });
  matMeta.innerHTML = `<b>${matches.length.toLocaleString('de-CH')}</b> Treffer für „${q}"`;
  if(matches.length === 0){
    matResults.innerHTML = `<div class="empty"><div class="big">Keine Treffer</div><div class="small">Prüfe die Nummer oder versuche einen Teil der Bezeichnung.</div></div>`;
    matHint.style.display = 'none';
    return;
  }
  const shown = matches.slice(0, MAT_LIMIT);
  matResults.innerHTML = shown.map(renderMatRow).join('');
  if(matches.length > MAT_LIMIT){
    matHint.style.display = 'block';
    matHint.textContent = `+ ${(matches.length-MAT_LIMIT).toLocaleString('de-CH')} weitere Treffer — Suche eingrenzen für vollständige Liste`;
  } else {
    matHint.style.display = 'none';
  }
}

let matDebounce;
matInput.addEventListener('input', ()=>{
  clearTimeout(matDebounce);
  matDebounce = setTimeout(()=> searchMaterials(matInput.value), 90);
});
function clearMat(){ matInput.value=''; searchMaterials(''); matInput.focus(); }

// ============ EQUIPMENT SEARCH ============
const eqInput = document.getElementById('eq-input');
const eqResults = document.getElementById('eq-results');
const eqHint = document.getElementById('eq-hint');
const eqMeta = document.getElementById('eq-meta');
const EQ_LIMIT = 150;
let activeAreaChip = null;

function buildAreaChips(){
  const areaCounts = {};
  EQUIP.forEach(r=>{
    const seg = r[2].split('-')[0];
    areaCounts[seg] = (areaCounts[seg]||0)+1;
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
  searchEquip(eqInput.value);
}

function renderFloc(sufix){
  const segs = sufix.split('-');
  return '<span class="seg" onclick="copyText(\'' + EQUIP_PREFIX + sufix + '\',\'Funktionsort\')" title="Ganzen Funktionsort kopieren">' +
    'KA-B235</span>' + segs.map(s=>'<span class="sep">/</span><span class="seg">'+s+'</span>').join('');
}

function renderEqRow(r){
  const [eqnum, desc, floc, legacy, source] = r;
  return `<div class="erow">
    <div>
      <div class="desc">${desc || '(keine Bezeichnung)'}</div>
      <div class="floc">${renderFloc(floc)}</div>
    </div>
    <div class="right">
      <span class="eqlbl">EQUIPMENT-NR.</span>
      <span class="eqnum" onclick="copyText('${eqnum}','Equipment-Nr.')">${eqnum}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      </span>
    </div>
  </div>`;
}

function searchEquip(q){
  q = q.trim().toLowerCase();
  let pool = EQUIP;
  if(activeAreaChip){
    pool = pool.filter(r => r[2].split('-')[0] === activeAreaChip);
  }
  if(!q){
    eqMeta.innerHTML = activeAreaChip
      ? `<b>${pool.length.toLocaleString('de-CH')}</b> Einträge im Bereich ${activeAreaChip}`
      : `Alle <b>${EQUIP.length.toLocaleString('de-CH')}</b> Einträge in KA-B235`;
    const shown = pool.slice(0, EQ_LIMIT);
    eqResults.innerHTML = shown.length ? shown.map(renderEqRow).join('') :
      `<div class="empty"><div class="big">Keine Einträge</div></div>`;
    eqHint.style.display = pool.length > EQ_LIMIT ? 'block' : 'none';
    if(pool.length > EQ_LIMIT) eqHint.textContent = `+ ${(pool.length-EQ_LIMIT).toLocaleString('de-CH')} weitere — Suche eingrenzen`;
    return;
  }
  const matches = pool.filter(r=>{
    return (r[0] && r[0].toLowerCase().indexOf(q) !== -1) ||
           (r[1] && r[1].toLowerCase().indexOf(q) !== -1) ||
           (r[2] && r[2].toLowerCase().indexOf(q) !== -1) ||
           (r[3] && r[3].toLowerCase().indexOf(q) !== -1);
  });
  eqMeta.innerHTML = `<b>${matches.length.toLocaleString('de-CH')}</b> Treffer für „${q}"${activeAreaChip? ' in '+activeAreaChip:''}`;
  if(matches.length === 0){
    eqResults.innerHTML = `<div class="empty"><div class="big">Keine Treffer</div><div class="small">Prüfe Equipment-Nr., Funktionsort-Segment oder Bezeichnung.</div></div>`;
    eqHint.style.display = 'none';
    return;
  }
  const shown = matches.slice(0, EQ_LIMIT);
  eqResults.innerHTML = shown.map(renderEqRow).join('');
  if(matches.length > EQ_LIMIT){
    eqHint.style.display = 'block';
    eqHint.textContent = `+ ${(matches.length-EQ_LIMIT).toLocaleString('de-CH')} weitere Treffer — Suche eingrenzen`;
  } else {
    eqHint.style.display = 'none';
  }
}
let eqDebounce;
eqInput.addEventListener('input', ()=>{
  clearTimeout(eqDebounce);
  eqDebounce = setTimeout(()=> searchEquip(eqInput.value), 90);
});
function clearEq(){ eqInput.value=''; activeAreaChip=null; document.querySelectorAll('.chip[data-area]').forEach(c=>c.classList.remove('active')); searchEquip(''); eqInput.focus(); }
