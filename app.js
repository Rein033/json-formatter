/* JSON Formatter */
const inp = $('#in'), out = $('#out');
let indent = opslag.lees('json.indent', '2'), laatste = '';
$$('#indent button').forEach((b) => b.classList.toggle('on', b.dataset.v === indent));
$('#sort').checked = opslag.lees('json.sort', false);
inp.value = opslag.lees('json.in', '');

const sorteer = (v) => Array.isArray(v) ? v.map(sorteer)
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort((a, b) => a.localeCompare(b)).map((k) => [k, sorteer(v[k])])) : v;

function kleur(json) {
  return esc(json).replace(/(&quot;(?:\\u[\da-fA-F]{4}|\\[^u]|(?!&quot;).)*?&quot;)(\s*:)?|\b(true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g, (m, str, dubbel, bool) => {
    if (str) return dubbel ? `<span class="k">${str}</span>${dubbel}` : `<span class="s">${str}</span>`;
    if (bool) return `<span class="b">${m}</span>`;
    if (m === 'null') return `<span class="z">${m}</span>`;
    return `<span class="n">${m}</span>`;
  });
}

/* Plek van de fout bepalen: Chrome geeft "position N", Firefox "line X column Y" */
function foutplek(tekst, msg) {
  let pos = null;
  const p = msg.match(/position (\d+)/i), lc = msg.match(/line (\d+) column (\d+)/i);
  if (p) pos = +p[1];
  else if (lc) { const regels = tekst.split('\n'); pos = regels.slice(0, +lc[1] - 1).reduce((s, r) => s + r.length + 1, 0) + (+lc[2] - 1); }
  else if (/end of (JSON|data)/i.test(msg)) pos = tekst.length;
  if (pos == null) return null;
  const voor = tekst.slice(0, pos), regel = voor.split('\n').length, kolom = pos - voor.lastIndexOf('\n');
  const regels = tekst.split('\n'), van = Math.max(0, regel - 3);
  const stuk = regels.slice(van, regel).map((r, i) => `${String(van + i + 1).padStart(4)} │ ${r}`).join('\n') + '\n' + ' '.repeat(6 + kolom) + '^';
  return { regel, kolom, stuk };
}

const NL = [[/Unexpected token/i, 'Onverwacht teken'], [/Unexpected end of JSON input|end of data/i, 'De JSON houdt plotseling op (mist er een } of ]?)'],
  [/Expected property name|property name/i, 'Hier wordt een sleutel tussen "dubbele aanhalingstekens" verwacht'], [/Bad control character|control character/i, 'Ongeldig teken in een tekst (bijv. een echte tab of nieuwe regel)'],
  [/Expected ',' or '}'|expected ',' or '}'/i, 'Hier wordt een komma of } verwacht'], [/Expected ',' or ']'|expected ',' or ']'/i, 'Hier wordt een komma of ] verwacht'],
  [/Unexpected non-whitespace|unexpected non-whitespace/i, 'Er staat nog iets na het einde van de JSON'], [/double-quoted|single quote/i, 'Gebruik "dubbele" aanhalingstekens, geen \'enkele\'']];

function stats(v, tekst) {
  let sleutels = 0, diepte = 0;
  (function loop(x, d) { diepte = Math.max(diepte, d); if (x && typeof x === 'object') { if (!Array.isArray(x)) sleutels += Object.keys(x).length; Object.values(x).forEach((y) => loop(y, d + 1)); } })(v, 0);
  const type = Array.isArray(v) ? `Lijst (${v.length})` : v === null ? 'null' : typeof v === 'object' ? 'Object' : typeof v;
  const kb = new Blob([tekst]).size;
  $('#stats').innerHTML = [[type, 'Type'], [sleutels, 'Sleutels'], [diepte, 'Diepte'], [kb > 2048 ? (kb / 1024).toFixed(1) + ' kB' : kb + ' B', 'Grootte invoer']]
    .map(([w, l]) => `<div class="stat"><b>${esc(w)}</b><small>${l}</small></div>`).join('');
  $('#stats').hidden = false;
}

function doe(modus) {
  const tekst = inp.value;
  $('#err').hidden = true; $('#stats').hidden = true;
  if (!tekst.trim()) { out.textContent = ''; laatste = ''; $('#outstat').textContent = 'Plak eerst wat JSON links'; return; }
  let v;
  try { v = JSON.parse(tekst); } catch (e) {
    const plek = foutplek(tekst, e.message), nl = NL.find(([r]) => r.test(e.message));
    $('#err').innerHTML = `<b><i class="mdi mdi-alert-circle"></i> Geen geldige JSON${plek ? ` · regel ${plek.regel}, kolom ${plek.kolom}` : ''}</b><div>${esc(nl ? nl[1] : e.message)}</div>${plek ? `<pre>${esc(plek.stuk)}</pre>` : ''}`;
    $('#err').hidden = false; out.textContent = ''; laatste = '';
    $('#outic').style.color = 'var(--bad)'; $('#outstat').textContent = 'Fout gevonden';
    if (plek) { const pos = tekst.split('\n').slice(0, plek.regel - 1).join('\n').length + plek.kolom; inp.focus(); inp.setSelectionRange(Math.max(0, pos - 1), pos); }
    return;
  }
  if ($('#sort').checked) v = sorteer(v);
  $('#outic').style.color = '';
  if (modus === 'val') { laatste = ''; out.innerHTML = `<span class="ok"><i class="mdi mdi-check-circle"></i> Geldige JSON</span>`; $('#outstat').textContent = 'Alles in orde'; }
  else {
    laatste = modus === 'min' ? JSON.stringify(v) : JSON.stringify(v, null, indent === 'tab' ? '\t' : +indent);
    out.innerHTML = kleur(laatste);
    $('#outstat').textContent = `${laatste.split('\n').length} regels · ${laatste.length} tekens`;
  }
  stats(v, tekst);
}

$('#fmt').onclick = () => doe('fmt');
$('#min').onclick = () => doe('min');
$('#val').onclick = () => doe('val');
$('#indent').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; indent = b.dataset.v; opslag.schrijf('json.indent', indent); $$('#indent button').forEach((x) => x.classList.toggle('on', x === b)); if (laatste) doe('fmt'); };
$('#sort').onchange = (e) => { opslag.schrijf('json.sort', e.target.checked); if (laatste) doe(laatste.includes('\n') ? 'fmt' : 'min'); };
$('#copy').onclick = () => (laatste ? kopieer(laatste) : toast('Nog niets om te kopiëren'));
$('#dl').onclick = () => (laatste ? download('data.json', laatste, 'application/json') : toast('Nog niets om te downloaden'));
$('#clear').onclick = () => { inp.value = ''; out.textContent = ''; laatste = ''; $('#err').hidden = true; $('#stats').hidden = true; opslag.schrijf('json.in', ''); inp.focus(); telIn(); };
$('#sample').onclick = () => {
  inp.value = JSON.stringify({ naam: 'Voorbeeld', versie: 2, actief: true, tags: ['json', 'tools'], eigenaar: { naam: 'Sanne', email: null }, projecten: [{ id: 1, status: 'klaar' }, { id: 2, status: 'bezig' }] });
  telIn(); doe('fmt');
};
const telIn = () => { $('#instat').textContent = inp.value ? `${inp.value.split('\n').length} regels · ${inp.value.length} tekens` : 'Plak, typ of sleep een bestand hierheen'; };
let t; inp.addEventListener('input', () => { telIn(); clearTimeout(t); t = setTimeout(() => { if (inp.value.length < 500000) opslag.schrijf('json.in', inp.value); }, 400); });
inp.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); doe('fmt'); } });
$('#open').onclick = () => $('#file').click();
const lees = async (f) => { if (!f) return; inp.value = await f.text(); telIn(); doe('fmt'); };
$('#file').onchange = (e) => { lees(e.target.files[0]); e.target.value = ''; };
inp.addEventListener('dragover', (e) => { e.preventDefault(); inp.classList.add('drop'); });
inp.addEventListener('dragleave', () => inp.classList.remove('drop'));
inp.addEventListener('drop', (e) => { e.preventDefault(); inp.classList.remove('drop'); lees(e.dataTransfer.files[0]); });
telIn(); if (inp.value.trim()) doe('fmt');
