// ===== FILE VERSION: 2026-05-28.4 · nav.js =====
// ===== NAVIGAZIONE =====
function navigateTo(id) {
  try {
    const btn = [...document.querySelectorAll('nav button')].find(b => b.getAttribute('onclick')?.includes(`'${id}'`));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    const target = document.getElementById(id);
    if(!target) {
      console.warn('[Nav] Sezione non trovata:', id);
      return;
    }
    target.classList.add('active');
    if(btn) btn.classList.add('active');
    if(id === 'home') renderHome();
    if(id === 'utility') { sciCalc(); }
    if(id === 'registro') { updateArniSelects(); renderLog(); renderStats(); }
    if(id === 'todo') { renderTodo(); }
    if(id === 'arnie') renderArnie();
    if(id === 'magazzino') { renderMagArticoli(); updateMovArticoloSelect(); }
    if(id === 'contabilita') { renderContRiepilogo(); populateContAnnoFilter(); }
    if(id === 'obiettivi') { renderObiettivi(); }
  } catch(err) {
    console.error('[Nav] Errore in navigateTo:', err.message);
  }
}

function showSection(id) { navigateTo(id); }

// ===== UTILITY TABS (Calendario / Sciroppo / Trattamenti / Etichette) =====
function showUtilTab(tab, btn) {
  try {
    const ids = ['utilTabCalendario','utilTabSciroppo','utilTabCandito','utilTabPropoli','utilTabTrattamenti','utilTabEtichette','utilTabAnalisi'];
    const mapping = { calendario: 'utilTabCalendario', sciroppo: 'utilTabSciroppo', candito: 'utilTabCandito', propoli: 'utilTabPropoli', trattamenti: 'utilTabTrattamenti', etichette: 'utilTabEtichette', analisi: 'utilTabAnalisi' };
    ids.forEach(id => {
      const el = document.getElementById(id);
      if(el) el.style.display = (mapping[tab] === id) ? 'block' : 'none';
    });
    document.querySelectorAll('#utility > .mag-tabs .mag-tab').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    if(tab === 'sciroppo') sciCalc();
    if(tab === 'candito')  candCalc();
    if(tab === 'propoli')  propCalc();
    if(tab === 'analisi' && typeof renderAnalisi === 'function') renderAnalisi();
  } catch(err) {
    console.error('[Nav] Errore in showUtilTab:', err.message);
  }
}

// Helper per scorciatoia dal form visite verso Utility → Trattamenti
function goToTrattamenti(event) {
  if(event) event.preventDefault();
  navigateTo('utility');
  setTimeout(() => {
    const btn = document.getElementById('utilTabBtnTrattamenti');
    showUtilTab('trattamenti', btn);
  }, 100);
}

// ===== ACCORDION CALENDARIO MENSILE =====
function toggleCard(header) {
  header.classList.toggle('open');
  const body = header.nextElementSibling;
  body.classList.toggle('open');
}
