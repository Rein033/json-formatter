/* Gedeelde hulpjes van de uselesssite.nl-tools */
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toast(t) {
  const d = Object.assign(document.createElement('div'), { className: 'toast', textContent: t });
  document.body.append(d); setTimeout(() => d.remove(), 2000);
}

async function kopieer(tekst, melding = 'Gekopieerd') {
  try { await navigator.clipboard.writeText(tekst); toast(melding); return true; }
  catch (e) {
    const t = Object.assign(document.createElement('textarea'), { value: tekst });
    document.body.append(t); t.select();
    try { document.execCommand('copy'); toast(melding); return true; } catch (e2) { toast('Kopiëren lukt niet in deze browser'); return false; } finally { t.remove(); }
  }
}

function download(naam, inhoud, type = 'text/plain;charset=utf-8') {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([inhoud], { type })), download: naam });
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* Bewaren in de browser (mag mislukken: privévenster) */
const opslag = {
  lees(k, std) { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? std; } catch (e) { return std; } },
  schrijf(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* */ } },
};

/* Licht / donker: ?theme=, anders de keuze van deze browser, anders het systeem */
(() => {
  const p = new URLSearchParams(location.search).get('theme');
  let t = p; try { t = t || localStorage.getItem('uss.theme'); } catch (e) { /* */ }
  if (t) document.documentElement.dataset.theme = t;
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#theme')) return;
    const nu = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const nw = nu === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nw;
    try { localStorage.setItem('uss.theme', nw); } catch (e2) { /* */ }
  });
})();
