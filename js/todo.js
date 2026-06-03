// ===== FILE VERSION: 2026-05-28.1 · todo.js =====
/* ===========================================================
   TO-DO — Sezione "Cose da fare"
   Modello todo: {
     id, testo, scadenza (YYYY-MM-DD|''), priorita, categoria,
     arniaId (opz), articoloId (opz), stato ('da_fare'|'fatto'),
     checklist: [{testo, fatto}], note, dataCreazione, dataCompletamento
   }
   =========================================================== */

const TODO_CATEGORIE = [
  { id: 'trattamento',    label: '💊 Trattamento',    color: '#8A2C2C' },
  { id: 'controllo',      label: '🔍 Controllo',      color: '#2C5F8A' },
  { id: 'manutenzione',   label: '🔧 Manutenzione',   color: '#5C3A10' },
  { id: 'amministrazione',label: '📄 Amministrazione', color: '#6B4A20' },
  { id: 'acquisto',       label: '🛒 Acquisto',       color: '#4A7C3F' },
  { id: 'altro',          label: '📋 Altro',          color: '#8B5E2A' },
];

const TODO_PRIORITA = {
  urgente: { label: '🔴 Urgente', color: '#8A2C2C', ord: 0 },
  alta:    { label: '🟠 Alta',    color: '#E8A020', ord: 1 },
  media:   { label: '🟡 Media',   color: '#C8860A', ord: 2 },
  bassa:   { label: '⚪ Bassa',   color: '#9CA3AF', ord: 3 },
};

let _todoFiltro = 'tutti';        // tutti | oggi | settimana | scaduti | completati
let _todoRaggruppa = 'scadenza';  // scadenza | categoria | arnia
let _todoChecklistTemp = [];      // checklist in costruzione nel modale

// ---------- Helper date ----------
function _todoOggiISO() { return new Date().toISOString().slice(0,10); }

function _todoStatoScadenza(scad) {
  // ritorna: 'scaduto' | 'oggi' | 'settimana' | 'futuro' | 'nessuna'
  if(!scad) return 'nessuna';
  const oggi = new Date(); oggi.setHours(0,0,0,0);
  const d = new Date(scad); d.setHours(0,0,0,0);
  if(isNaN(d.getTime())) return 'nessuna';
  const diff = Math.round((d - oggi) / (1000*60*60*24));
  if(diff < 0) return 'scaduto';
  if(diff === 0) return 'oggi';
  if(diff <= 7) return 'settimana';
  return 'futuro';
}

function getTodosAttivi() {
  return (todos || []).filter(t => t.stato !== 'fatto');
}

// Conteggio per il badge/widget home (attivi urgenti o scaduti/oggi)
function getTodosDaFareOggi() {
  return getTodosAttivi().filter(t => {
    const s = _todoStatoScadenza(t.scadenza);
    return s === 'scaduto' || s === 'oggi' || t.priorita === 'urgente';
  });
}

// ===========================================================
// RENDER SEZIONE
// ===========================================================
function renderTodo() {
  try {
    // Barra filtri
    const barFiltri = document.getElementById('todoFiltri');
    if(barFiltri) {
      const filtri = [
        { id: 'tutti', label: 'Tutti' },
        { id: 'oggi', label: '📅 Oggi' },
        { id: 'settimana', label: 'Questa settimana' },
        { id: 'scaduti', label: '🔴 Scaduti' },
        { id: 'completati', label: '✅ Completati' },
      ];
      barFiltri.innerHTML = filtri.map(f =>
        `<span class="todo-chip ${_todoFiltro===f.id?'on':''}" onclick="setTodoFiltro('${f.id}')">${f.label}</span>`
      ).join('');
    }

    const lista = document.getElementById('todoLista');
    if(!lista) return;

    // Applica filtro
    let items = (todos || []).slice();
    if(_todoFiltro === 'completati') {
      items = items.filter(t => t.stato === 'fatto');
    } else {
      items = items.filter(t => t.stato !== 'fatto');
      if(_todoFiltro === 'oggi') items = items.filter(t => ['oggi','scaduto'].includes(_todoStatoScadenza(t.scadenza)));
      else if(_todoFiltro === 'settimana') items = items.filter(t => ['oggi','settimana','scaduto'].includes(_todoStatoScadenza(t.scadenza)));
      else if(_todoFiltro === 'scaduti') items = items.filter(t => _todoStatoScadenza(t.scadenza) === 'scaduto');
    }

    if(items.length === 0) {
      lista.innerHTML = `<div class="empty-state"><span class="big">📋</span>${todos.length === 0 ? 'Nessun compito ancora. Aggiungine uno!' : 'Nessun compito per questo filtro.'}</div>`;
      return;
    }

    // Raggruppa
    const gruppi = _todoRaggruppa === 'scadenza' ? _raggruppaScadenza(items)
                 : _todoRaggruppa === 'categoria' ? _raggruppaCategoria(items)
                 : _raggruppaArnia(items);

    lista.innerHTML = gruppi.map(g => {
      if(g.items.length === 0) return '';
      return `<div class="todo-gruppo-tit">${g.label} <span class="cnt">(${g.items.length})</span></div>` +
        g.items.map(t => renderTodoCard(t)).join('');
    }).join('');
  } catch(err) {
    console.error('[Todo] Errore in renderTodo:', err.message);
  }
}

function _raggruppaScadenza(items) {
  const ordine = ['scaduto','oggi','settimana','futuro','nessuna'];
  const label = { scaduto:'🔴 Scaduti', oggi:'📅 Oggi', settimana:'🗓️ Questa settimana', futuro:'📆 Più avanti', nessuna:'📋 Senza scadenza' };
  const map = {};
  items.forEach(t => { const k = t.stato==='fatto' ? 'fatto' : _todoStatoScadenza(t.scadenza); (map[k]=map[k]||[]).push(t); });
  const gruppi = ordine.filter(k=>map[k]).map(k => ({ label: label[k], items: _ordina(map[k]) }));
  if(map.fatto) gruppi.push({ label: '✅ Completati', items: map.fatto });
  return gruppi;
}
function _raggruppaCategoria(items) {
  return TODO_CATEGORIE.map(c => ({
    label: c.label,
    items: _ordina(items.filter(t => (t.categoria||'altro') === c.id))
  })).filter(g => g.items.length > 0);
}
function _raggruppaArnia(items) {
  const conArnia = {};
  const senza = [];
  items.forEach(t => {
    if(t.arniaId) { (conArnia[t.arniaId] = conArnia[t.arniaId] || []).push(t); }
    else senza.push(t);
  });
  const gruppi = Object.keys(conArnia).map(aid => {
    const a = (arnie||[]).find(x => x.id === aid);
    return { label: a ? `🏠 #${a.num}${a.nome?' '+a.nome:''}` : '🏠 Arnia', items: _ordina(conArnia[aid]) };
  });
  if(senza.length) gruppi.push({ label: '— Senza arnia', items: _ordina(senza) });
  return gruppi;
}

// Ordina per priorità poi scadenza
function _ordina(arr) {
  return arr.slice().sort((a,b) => {
    const pa = TODO_PRIORITA[a.priorita]?.ord ?? 9;
    const pb = TODO_PRIORITA[b.priorita]?.ord ?? 9;
    if(pa !== pb) return pa - pb;
    const sa = a.scadenza || '9999';
    const sb = b.scadenza || '9999';
    return sa.localeCompare(sb);
  });
}

function renderTodoCard(t) {
  const cat = TODO_CATEGORIE.find(c => c.id === (t.categoria||'altro')) || TODO_CATEGORIE[5];
  const fatto = t.stato === 'fatto';
  const prioClass = t.priorita === 'urgente' ? 'urg' : (t.priorita === 'alta' ? 'alta' : '');

  // Scadenza
  const stato = _todoStatoScadenza(t.scadenza);
  let scadHtml = '';
  if(fatto && t.dataCompletamento) {
    scadHtml = `<span class="todo-tag scad">✅ Fatto il ${formatDateTodo(t.dataCompletamento)}</span>`;
  } else if(t.scadenza) {
    const cls = stato === 'scaduto' ? 'scaduto' : (stato === 'oggi' ? 'vicino' : '');
    const txt = stato === 'scaduto' ? `Scaduto il ${formatDateTodo(t.scadenza)}`
              : stato === 'oggi' ? 'Oggi'
              : formatDateTodo(t.scadenza);
    scadHtml = `<span class="todo-tag scad ${cls}">📅 ${txt}</span>`;
  }

  // Arnia
  let arniaHtml = '';
  if(t.arniaId) {
    const a = (arnie||[]).find(x => x.id === t.arniaId);
    if(a) arniaHtml = `<span class="todo-tag arnia" onclick="apriSchedaArniaDaTodo('${t.arniaId}')">🏠 #${a.num}</span>`;
  }

  // Magazzino
  const magHtml = t.articoloId ? `<span class="todo-tag" style="background:#EDE7F6;color:#5E35B1">📦 da magazzino</span>` : '';

  // Checklist
  let checklistHtml = '';
  if(Array.isArray(t.checklist) && t.checklist.length > 0) {
    const fatti = t.checklist.filter(c => c.fatto).length;
    checklistHtml = `<div class="todo-checklist">` +
      t.checklist.map((c, i) =>
        `<div class="todo-cl-item ${c.fatto?'done':''}" onclick="toggleTodoChecklistItem('${t.id}',${i})">
          <div class="todo-cl-box ${c.fatto?'done':''}">${c.fatto?'✓':''}</div>
          <span>${escapeTodo(c.testo)}</span>
        </div>`
      ).join('') + `</div>`;
    if(!fatto) checklistHtml = `<span class="todo-cl-progress">· ${fatti}/${t.checklist.length} fatti</span>` + checklistHtml;
  }

  return `
    <div class="todo-card ${prioClass} ${fatto?'fatto':''}">
      <div class="todo-check ${fatto?'done':''}" onclick="toggleTodoFatto('${t.id}')">${fatto?'✓':''}</div>
      <div class="todo-card-body">
        <div class="todo-card-testo">${escapeTodo(t.testo)}${checklistHtml.startsWith('<span')?'':''}</div>
        <div class="todo-card-meta">
          <span class="todo-tag cat" style="background:${cat.color}20;color:${cat.color}">${cat.label}</span>
          ${arniaHtml}${magHtml}${scadHtml}
        </div>
        ${checklistHtml}
      </div>
      <div class="todo-card-azioni">
        ${fatto ? `<button class="todo-ic" onclick="toggleTodoFatto('${t.id}')" title="Riapri">↩️</button>`
                : `<button class="todo-ic" onclick="openTodoModal('${t.id}')" title="Modifica">✏️</button>`}
        <button class="todo-ic" onclick="deleteTodo('${t.id}')" title="Elimina">🗑</button>
      </div>
    </div>`;
}

function escapeTodo(s) {
  if(s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatDateTodo(iso) {
  if(!iso) return '';
  const d = new Date(iso);
  if(isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit' });
}

// ===========================================================
// FILTRI / RAGGRUPPAMENTO
// ===========================================================
function setTodoFiltro(f) { _todoFiltro = f; renderTodo(); }
function setTodoRaggruppa(r) { _todoRaggruppa = r; renderTodo(); }

// ===========================================================
// AZIONI SU TODO
// ===========================================================
function toggleTodoFatto(id) {
  try {
    todos = todos.map(t => {
      if(t.id !== id) return t;
      const nuovoStato = t.stato === 'fatto' ? 'da_fare' : 'fatto';
      return { ...t, stato: nuovoStato, dataCompletamento: nuovoStato === 'fatto' ? new Date().toISOString() : null };
    });
    saveTodos();
    renderTodo();
    if(typeof renderHome === 'function') renderHome();
  } catch(err) {
    console.error('[Todo] Errore in toggleTodoFatto:', err.message);
  }
}

function toggleTodoChecklistItem(todoId, idx) {
  try {
    todos = todos.map(t => {
      if(t.id !== todoId || !Array.isArray(t.checklist)) return t;
      const cl = t.checklist.map((c, i) => i === idx ? { ...c, fatto: !c.fatto } : c);
      return { ...t, checklist: cl };
    });
    saveTodos();
    renderTodo();
  } catch(err) {
    console.error('[Todo] Errore in toggleTodoChecklistItem:', err.message);
  }
}

function deleteTodo(id) {
  if(!confirm('Eliminare questo compito?')) return;
  todos = todos.filter(t => t.id !== id);
  saveTodos();
  renderTodo();
  if(typeof renderHome === 'function') renderHome();
}

function apriSchedaArniaDaTodo(arniaId) {
  // Vai alla sezione arnie e apri la scheda
  if(typeof navigateTo === 'function') navigateTo('arnie');
  setTimeout(() => { if(typeof openSchedaDettagliata === 'function') openSchedaDettagliata(arniaId); }, 120);
}

// ===========================================================
// MODALE NUOVO / MODIFICA
// ===========================================================
function openTodoModal(id, preset) {
  try {
    const modal = document.getElementById('todoModal');
    if(!modal) { console.error('[Todo] todoModal non trovato'); return; }

    // Popola dropdown arnie
    const selArnia = document.getElementById('todoArnia');
    if(selArnia) {
      const arnieSorted = [...(arnie||[])].filter(a=>!a.annoDismissione).sort((a,b)=>(parseInt(a.num)||0)-(parseInt(b.num)||0));
      selArnia.innerHTML = '<option value="">— Nessuna —</option>' +
        arnieSorted.map(a => `<option value="${a.id}">🏠 #${a.num}${a.nome?' '+escapeTodo(a.nome):''}</option>`).join('');
    }
    // Popola categorie
    const selCat = document.getElementById('todoCategoria');
    if(selCat) selCat.innerHTML = TODO_CATEGORIE.map(c => `<option value="${c.id}">${c.label}</option>`).join('');

    _todoChecklistTemp = [];

    if(id) {
      const t = todos.find(x => x.id === id);
      if(!t) { console.warn('[Todo] Todo non trovato:', id); return; }
      document.getElementById('todoModalTitle').textContent = '✏️ Modifica compito';
      document.getElementById('editTodoId').value = id;
      document.getElementById('todoTesto').value = t.testo || '';
      if(selCat) selCat.value = t.categoria || 'altro';
      document.getElementById('todoPriorita').value = t.priorita || 'media';
      document.getElementById('todoScadenza').value = t.scadenza || '';
      if(selArnia) selArnia.value = t.arniaId || '';
      document.getElementById('todoNote').value = t.note || '';
      _todoChecklistTemp = Array.isArray(t.checklist) ? t.checklist.map(c => ({ ...c })) : [];
    } else {
      document.getElementById('todoModalTitle').textContent = '📋 Nuovo compito';
      document.getElementById('editTodoId').value = '';
      document.getElementById('todoTesto').value = (preset && preset.testo) || '';
      if(selCat) selCat.value = (preset && preset.categoria) || 'altro';
      document.getElementById('todoPriorita').value = (preset && preset.priorita) || 'media';
      document.getElementById('todoScadenza').value = (preset && preset.scadenza) || '';
      if(selArnia) selArnia.value = (preset && preset.arniaId) || '';
      document.getElementById('todoNote').value = (preset && preset.note) || '';
      // articoloId nascosto (collegamento magazzino)
      document.getElementById('todoArticoloId').value = (preset && preset.articoloId) || '';
    }
    if(id) {
      const t = todos.find(x => x.id === id);
      document.getElementById('todoArticoloId').value = (t && t.articoloId) || '';
    }

    renderTodoChecklistEditor();
    document.getElementById('todoChecklistInput').value = '';
    modal.classList.add('open');
  } catch(err) {
    console.error('[Todo] Errore in openTodoModal:', err.message);
  }
}

function closeTodoModal() {
  const m = document.getElementById('todoModal');
  if(m) m.classList.remove('open');
}

function renderTodoChecklistEditor() {
  const cont = document.getElementById('todoChecklistEditor');
  if(!cont) return;
  if(_todoChecklistTemp.length === 0) { cont.innerHTML = ''; return; }
  cont.innerHTML = _todoChecklistTemp.map((c, i) =>
    `<div class="todo-cl-edit">
      <div class="todo-cl-box ${c.fatto?'done':''}" onclick="toggleTempChecklist(${i})">${c.fatto?'✓':''}</div>
      <span style="flex:1${c.fatto?';text-decoration:line-through;opacity:0.6':''}">${escapeTodo(c.testo)}</span>
      <button class="todo-ic" onclick="rimuoviTempChecklist(${i})" title="Rimuovi">✕</button>
    </div>`
  ).join('');
}

function aggiungiTempChecklist() {
  const inp = document.getElementById('todoChecklistInput');
  if(!inp) return;
  const testo = inp.value.trim();
  if(!testo) return;
  _todoChecklistTemp.push({ testo, fatto: false });
  inp.value = '';
  renderTodoChecklistEditor();
  inp.focus();
}
function rimuoviTempChecklist(i) { _todoChecklistTemp.splice(i,1); renderTodoChecklistEditor(); }
function toggleTempChecklist(i) { if(_todoChecklistTemp[i]) { _todoChecklistTemp[i].fatto = !_todoChecklistTemp[i].fatto; renderTodoChecklistEditor(); } }

function saveTodoEntry() {
  try {
    const editId = document.getElementById('editTodoId').value;
    const testo = document.getElementById('todoTesto').value.trim();
    if(!testo) { alert('Scrivi cosa fare'); return; }
    const categoria = document.getElementById('todoCategoria').value;
    const priorita = document.getElementById('todoPriorita').value;
    const scadenza = document.getElementById('todoScadenza').value;
    const arniaId = document.getElementById('todoArnia').value || null;
    const articoloId = document.getElementById('todoArticoloId').value || null;
    const note = document.getElementById('todoNote').value.trim();
    const checklist = _todoChecklistTemp.map(c => ({ testo: c.testo, fatto: !!c.fatto }));

    if(editId) {
      const ex = todos.find(t => t.id === editId);
      todos = todos.map(t => t.id === editId ? {
        ...t, testo, categoria, priorita, scadenza, arniaId, articoloId, note, checklist
      } : t);
    } else {
      todos.push({
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        testo, categoria, priorita, scadenza, arniaId, articoloId, note, checklist,
        stato: 'da_fare',
        dataCreazione: new Date().toISOString(),
        dataCompletamento: null,
      });
    }
    saveTodos();
    closeTodoModal();
    renderTodo();
    if(typeof renderHome === 'function') renderHome();
  } catch(err) {
    console.error('[Todo] Errore in saveTodoEntry:', err.message);
    alert('Errore nel salvataggio del compito.');
  }
}

// ===========================================================
// HELPER RIUTILIZZABILE: crea un To-Do da altre sezioni
// (es. magazzino → "ordinare X")
// ===========================================================
function creaTodoRapido(preset) {
  // Apre il modale già precompilato; l'utente conferma con Salva
  openTodoModal(null, preset || {});
}

// ===========================================================
// WIDGET HOME
// ===========================================================
function renderTodoWidgetHome() {
  try {
    const box = document.getElementById('homeTodoWidget');
    if(!box) return;
    const daFare = _ordina(getTodosDaFareOggi()).slice(0, 5);
    if(daFare.length === 0) {
      box.innerHTML = '';
      box.style.display = 'none';
      return;
    }
    box.style.display = 'block';
    const righe = daFare.map(t => {
      const stato = _todoStatoScadenza(t.scadenza);
      const dotColor = t.priorita === 'urgente' ? '#8A2C2C' : (stato === 'scaduto' ? '#8A2C2C' : (stato === 'oggi' ? '#E8A020' : '#6B4A20'));
      const a = t.arniaId ? (arnie||[]).find(x => x.id === t.arniaId) : null;
      const arniaTxt = a ? ` · 🏠#${a.num}` : '';
      const quando = stato === 'scaduto' ? 'scaduto' : (stato === 'oggi' ? 'oggi' : (t.scadenza ? formatDateTodo(t.scadenza) : ''));
      const quandoColor = stato === 'scaduto' ? '#8A2C2C' : (stato === 'oggi' ? '#9A6B00' : '#6B4A20');
      return `<div class="home-todo-row">
        <div class="home-todo-dot" style="background:${dotColor}"></div>
        <span style="flex:1">${escapeTodo(t.testo)}${arniaTxt}</span>
        ${quando ? `<span style="font-size:0.78rem;color:${quandoColor}">${quando}</span>` : ''}
      </div>`;
    }).join('');
    box.innerHTML = `
      <div class="home-todo-head">
        <h4>📋 Da fare</h4>
        <a href="#" onclick="navigateTo('todo');return false">Vedi tutti ↗</a>
      </div>
      ${righe}`;
  } catch(err) {
    console.error('[Todo] Errore in renderTodoWidgetHome:', err.message);
  }
}
