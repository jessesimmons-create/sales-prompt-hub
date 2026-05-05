// ── Storage ───────────────────────────────────────────

const SK = {
  opps:      'sph_opps',
  activeOpp: 'sph_active_opp',
  role:      'sph_role',
  opp: id => ({
    used:         `sph_${id}_used`,
    added:        `sph_${id}_added`,
    removed:      `sph_${id}_removed`,
    stepsUsed:    `sph_${id}_steps_used`,
    stepsAdded:   `sph_${id}_steps_added`,
    stepsRemoved: `sph_${id}_steps_removed`,
  }),
};

// Migrate data from the previous single-opportunity format
(function migrate() {
  if (localStorage.getItem(SK.opps)) return;
  const id = 'opp_default';
  const keyMap = {
    'sph_used_v1':         SK.opp(id).used,
    'sph_added_v1':        SK.opp(id).added,
    'sph_removed_v1':      SK.opp(id).removed,
    'sph_steps_used_v1':   SK.opp(id).stepsUsed,
    'sph_steps_added_v1':  SK.opp(id).stepsAdded,
    'sph_steps_removed_v1':SK.opp(id).stepsRemoved,
  };
  Object.entries(keyMap).forEach(([oldKey, newKey]) => {
    const v = localStorage.getItem(oldKey);
    if (v) { localStorage.setItem(newKey, v); localStorage.removeItem(oldKey); }
  });
  const opp = { id, name: 'Default', createdAt: Date.now() };
  localStorage.setItem(SK.opps, JSON.stringify([opp]));
  localStorage.setItem(SK.activeOpp, id);
})();

// ── Opportunity helpers ───────────────────────────────

function loadOppState(id) {
  const k = SK.opp(id);
  return {
    used:         new Set(JSON.parse(localStorage.getItem(k.used)         || '[]')),
    added:             JSON.parse(localStorage.getItem(k.added)        || '[]'),
    removed:      new Set(JSON.parse(localStorage.getItem(k.removed)      || '[]')),
    stepsUsed:    new Set(JSON.parse(localStorage.getItem(k.stepsUsed)    || '[]')),
    stepsAdded:        JSON.parse(localStorage.getItem(k.stepsAdded)   || '[]'),
    stepsRemoved: new Set(JSON.parse(localStorage.getItem(k.stepsRemoved) || '[]')),
  };
}

function saveCurrentOpp() {
  const k = SK.opp(state.activeOppId);
  localStorage.setItem(k.used,         JSON.stringify([...state.used]));
  localStorage.setItem(k.added,        JSON.stringify(state.added));
  localStorage.setItem(k.removed,      JSON.stringify([...state.removed]));
  localStorage.setItem(k.stepsUsed,    JSON.stringify([...state.stepsUsed]));
  localStorage.setItem(k.stepsAdded,   JSON.stringify(state.stepsAdded));
  localStorage.setItem(k.stepsRemoved, JSON.stringify([...state.stepsRemoved]));
}

// ── State init ────────────────────────────────────────

let opps = JSON.parse(localStorage.getItem(SK.opps) || '[]');
if (opps.length === 0) {
  const id = 'opp_' + Date.now();
  opps = [{ id, name: 'My First Deal', createdAt: Date.now() }];
  localStorage.setItem(SK.opps, JSON.stringify(opps));
  localStorage.setItem(SK.activeOpp, id);
}

const savedActiveId = localStorage.getItem(SK.activeOpp);
const initialOppId  = opps.find(o => o.id === savedActiveId) ? savedActiveId : opps[0].id;

const state = {
  opps,
  activeOppId: initialOppId,
  ...loadOppState(initialOppId),
  activeStageId:   STAGES[0].id,
  activeCondId:    STAGES[0].conditions[0].id,
  oppDropdownOpen: false,
  role:            localStorage.getItem(SK.role) || 'admin',
};

// ── Opportunity actions ───────────────────────────────

function switchOpp(id) {
  saveCurrentOpp();
  state.activeOppId = id;
  Object.assign(state, loadOppState(id));
  localStorage.setItem(SK.activeOpp, id);
  state.oppDropdownOpen = false;
  render();
}

function createOpp(name) {
  saveCurrentOpp();
  const id  = 'opp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);
  const opp = { id, name: name.trim(), createdAt: Date.now() };
  state.opps.push(opp);
  localStorage.setItem(SK.opps, JSON.stringify(state.opps));
  state.activeOppId   = id;
  state.used          = new Set();
  state.added         = [];
  state.removed       = new Set();
  state.stepsUsed     = new Set();
  state.stepsAdded    = [];
  state.stepsRemoved  = new Set();
  localStorage.setItem(SK.activeOpp, id);
  saveCurrentOpp();
  state.oppDropdownOpen = false;
  render();
}

function deleteOpp(id) {
  if (state.opps.length <= 1) return;
  const k = SK.opp(id);
  Object.values(k).forEach(key => localStorage.removeItem(key));
  state.opps = state.opps.filter(o => o.id !== id);
  localStorage.setItem(SK.opps, JSON.stringify(state.opps));
  if (state.activeOppId === id) {
    const next = state.opps[0];
    state.activeOppId = next.id;
    Object.assign(state, loadOppState(next.id));
    localStorage.setItem(SK.activeOpp, next.id);
  }
  render();
}

// ── Data helpers ──────────────────────────────────────

function effectivePrompts(cond) {
  const base   = cond.prompts.filter(p => !state.removed.has(p.id));
  const custom = state.added.filter(p => p.condId === cond.id);
  return [...base, ...custom];
}

function effectiveSteps(stage) {
  const base   = stage.steps.filter(s => !state.stepsRemoved.has(s.id));
  const custom = state.stepsAdded.filter(s => s.stageId === stage.id);
  return [...base, ...custom];
}

function stageStats(stage) {
  const prompts = stage.conditions.flatMap(c => effectivePrompts(c));
  return { total: prompts.length, used: prompts.filter(p => state.used.has(p.id)).length };
}

function condStats(cond) {
  const prompts = effectivePrompts(cond);
  return { total: prompts.length, used: prompts.filter(p => state.used.has(p.id)).length };
}

function stepStats(stage) {
  const steps = effectiveSteps(stage);
  return { total: steps.length, used: steps.filter(s => state.stepsUsed.has(s.id)).length };
}

// ── Render: Opportunity selector ──────────────────────

function renderOppSelector() {
  const activeOpp = state.opps.find(o => o.id === state.activeOppId);
  document.getElementById('opp-name-display').textContent = activeOpp?.name || '—';

  const selector = document.getElementById('opp-selector');
  const dropdown = document.getElementById('opp-dropdown');

  if (state.oppDropdownOpen) {
    selector.classList.add('open');
    dropdown.classList.remove('hidden');
    const canDelete = state.opps.length > 1;
    dropdown.innerHTML =
      state.opps.map(o => `
        <div class="opp-item ${o.id === state.activeOppId ? 'active' : ''}" data-opp-id="${o.id}">
          <svg class="opp-check-icon" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6L5 9L10 3" stroke="#22c55e" stroke-width="1.8"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="opp-item-name">${escHtml(o.name)}</span>
          ${canDelete ? `
            <button class="opp-delete-btn" data-delete-opp="${o.id}" title="Delete">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor"
                      stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>` : ''}
        </div>`).join('') +
      `<div class="opp-dropdown-divider"></div>
       <button class="opp-new-btn" id="opp-new-trigger">
         <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
           <path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.8"
                 stroke-linecap="round"/>
         </svg>
         New Opportunity
       </button>`;
  } else {
    selector.classList.remove('open');
    dropdown.classList.add('hidden');
  }
}

// ── Render: Role toggle ───────────────────────────────

function renderRoleToggle() {
  const isAdmin = state.role === 'admin';
  document.getElementById('role-icon').textContent  = isAdmin ? '🔓' : '🔒';
  document.getElementById('role-label').textContent = isAdmin ? 'Admin' : 'Standard User';
  document.getElementById('role-toggle').classList.toggle('is-admin', isAdmin);
}

// ── Render: Sidebar ───────────────────────────────────

function renderSidebar() {
  document.getElementById('stage-list').innerHTML = STAGES.map(s => {
    const { total, used } = stageStats(s);
    const { total: sTotal, used: sUsed } = stepStats(s);
    const stepsComplete = sTotal > 0 && sUsed === sTotal;
    return `
      <div class="stage-item ${s.id === state.activeStageId ? 'active' : ''} ${stepsComplete ? 'has-used' : ''}"
           style="--stage-color:${s.color}" data-stage="${s.id}">
        <div class="stage-item-row">
          <span class="stage-icon">${s.icon}</span>
          <span class="stage-name">${s.name}</span>
          <span class="stage-badge">${used}/${total}</span>
          <span class="stage-check">
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" stroke-width="1.6"
                    stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </div>
      </div>`;
  }).join('');
}

// ── Render: Header ────────────────────────────────────

function renderHeader(stage) {
  document.getElementById('stage-header-icon').textContent  = stage.icon;
  document.getElementById('stage-header-title').textContent = stage.name;
  document.getElementById('reset-stage-btn').dataset.stage  = stage.id;
  if (state.activeCondId === '__steps__') {
    const { total, used } = stepStats(stage);
    document.getElementById('stage-stats').textContent = `${used} of ${total} steps completed`;
  } else {
    const { total, used } = stageStats(stage);
    document.getElementById('stage-stats').textContent = `${used} of ${total} prompts used`;
  }
}

// ── Render: Tabs ──────────────────────────────────────

function renderTabs(stage) {
  const condTabs = stage.conditions.map(c => {
    const { total, used } = condStats(c);
    const allDone = total > 0 && used === total;
    return `
      <div class="cond-tab ${c.id === state.activeCondId ? 'active' : ''} ${allDone ? 'all-done' : ''}"
           style="--active-color:${stage.color}" data-cond="${c.id}">
        ${c.name}
        <span class="cond-tab-count">${used}/${total}</span>
      </div>`;
  }).join('');

  const { total: sTotal, used: sUsed } = stepStats(stage);
  const pct       = sTotal ? Math.round((sUsed / sTotal) * 100) : 0;
  const stepState = pct === 100 ? 'complete' : pct > 0 ? 'in-progress' : '';

  document.getElementById('condition-tabs').innerHTML = condTabs + `
    <div class="steps-tab-divider"></div>
    <div class="cond-tab steps-tab ${state.activeCondId === '__steps__' ? 'active' : ''} ${stepState}"
         style="--active-color:${stage.color}" data-cond="__steps__">
      Steps
      <span class="steps-tab-pct">${pct}%</span>
    </div>`;
}

// ── Render: Prompts ───────────────────────────────────

function renderPrompts(stage) {
  document.getElementById('condition-banner').style.display = '';
  document.getElementById('prompts-grid').style.display     = '';
  document.getElementById('steps-view').classList.add('hidden');

  const cond = stage.conditions.find(c => c.id === state.activeCondId);
  if (!cond) return;

  const banner = document.getElementById('condition-banner');
  banner.textContent = cond.description;
  banner.style.setProperty('--banner-color', stage.color);

  const cards = effectivePrompts(cond).map(p => {
    const used = state.used.has(p.id);
    const bodyText  = p.body || 'No prompt added yet — click to add one here.';
    const bodyClass = p.body ? 'has-content' : '';
    return `
      <div class="prompt-card ${used ? 'used' : ''}" data-prompt="${p.id}">
        <div class="prompt-card-top">
          <div class="prompt-check">
            <svg class="check-icon" viewBox="0 0 11 11" fill="none">
              <path d="M1.5 5.5L4.5 8.5L9.5 2.5" stroke="white" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <span class="prompt-title">${escHtml(p.title)}</span>
        </div>
        <div class="prompt-body ${bodyClass}">${escHtml(bodyText)}</div>
        <span class="used-pill">✓ Used</span>
        ${state.role === 'admin' ? `
        <button class="prompt-delete-btn" data-delete-prompt="${p.id}" title="Remove prompt">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.8"
                  stroke-linecap="round"/>
          </svg>
        </button>` : ''}
      </div>`;
  }).join('');

  const addBtn = state.role === 'admin' ? `
    <button class="add-prompt-btn" data-add-prompt="${cond.id}" style="--add-color:${stage.color}">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      Add Prompt
    </button>` : '';
  document.getElementById('prompts-grid').innerHTML = cards + addBtn;
}

// ── Render: Steps ─────────────────────────────────────

function renderSteps(stage) {
  document.getElementById('condition-banner').style.display = 'none';
  document.getElementById('prompts-grid').style.display     = 'none';
  document.getElementById('steps-view').classList.remove('hidden');

  const steps = effectiveSteps(stage);
  const used  = steps.filter(s => state.stepsUsed.has(s.id)).length;
  const total = steps.length;
  const pct   = total ? Math.round((used / total) * 100) : 0;

  document.getElementById('steps-count-label').textContent       = `${used} of ${total} steps completed`;
  document.getElementById('steps-pct-label').textContent         = `${pct}%`;
  document.getElementById('steps-pct-label').style.color         = stage.color;
  document.getElementById('steps-progress-fill').style.cssText   =
    `width:${pct}%;background:${stage.color}`;

  const cards = steps.map(s => {
    const done = state.stepsUsed.has(s.id);
    return `
      <div class="prompt-card ${done ? 'used' : ''}" data-step="${s.id}">
        <div class="prompt-card-top">
          <div class="prompt-check">
            <svg class="check-icon" viewBox="0 0 11 11" fill="none">
              <path d="M1.5 5.5L4.5 8.5L9.5 2.5" stroke="white" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <span class="prompt-title">${escHtml(s.title)}</span>
        </div>
        <span class="used-pill">✓ Done</span>
        ${state.role === 'admin' ? `
        <button class="prompt-delete-btn" data-delete-step="${s.id}" title="Remove step">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.8"
                  stroke-linecap="round"/>
          </svg>
        </button>` : ''}
      </div>`;
  }).join('');

  const addBtn = state.role === 'admin' ? `
    <button class="add-prompt-btn" data-add-step="${stage.id}" style="--add-color:${stage.color}">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      Add Step
    </button>` : '';
  document.getElementById('steps-grid').innerHTML = cards + addBtn;
}

// ── Full render ───────────────────────────────────────

function render() {
  const stage = STAGES.find(s => s.id === state.activeStageId);
  renderOppSelector();
  renderRoleToggle();
  renderSidebar();
  renderHeader(stage);
  renderTabs(stage);
  if (state.activeCondId === '__steps__') renderSteps(stage);
  else renderPrompts(stage);
}

// ── Modal ─────────────────────────────────────────────

let modal = { type: null, targetId: null };

function openModal(type, targetId) {
  modal = { type, targetId };

  const isOpp  = type === 'opportunity';
  const isStep = type === 'step';
  const stage  = isStep
    ? STAGES.find(s => s.id === targetId)
    : isOpp ? null
    : STAGES.find(s => s.conditions.some(c => c.id === targetId));
  const accent = stage?.color || '#6366f1';

  document.getElementById('modal-title').textContent       = isOpp  ? 'New Opportunity' : isStep ? 'Add Step'   : 'Add Prompt';
  document.getElementById('modal-save').textContent        = isOpp  ? 'Create'           : isStep ? 'Add Step'   : 'Add Prompt';
  document.getElementById('modal-title-label').textContent = isOpp  ? 'Name'             : 'Title';
  document.getElementById('modal-body-label').textContent  = isStep ? 'Description'      : 'Prompt Text';
  document.getElementById('modal-input-title').placeholder = isOpp
    ? 'e.g. Acme Corp — Q3 2026'
    : isStep ? 'e.g. Confirm attendees and roles' : 'e.g. ICP Fit Analysis';
  document.getElementById('modal-input-body').placeholder  = isStep
    ? 'Optional details or instructions…'
    : 'Paste your LLM prompt here…';

  document.getElementById('modal-body-section').classList.toggle('hidden', isOpp);

  document.getElementById('modal-input-title').value = '';
  document.getElementById('modal-input-body').value  = '';
  document.getElementById('modal-input-title').classList.remove('error');
  document.querySelector('.modal-error-msg')?.classList.remove('visible');

  [document.getElementById('modal-save'),
   document.getElementById('modal-input-title'),
   document.getElementById('modal-input-body')].forEach(el =>
     el.style.setProperty('--modal-accent', accent));

  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('modal-input-title').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  modal = { type: null, targetId: null };
}

function saveItem() {
  const title = document.getElementById('modal-input-title').value.trim();
  const errorMsg = document.querySelector('.modal-error-msg');

  if (!title) {
    document.getElementById('modal-input-title').classList.add('error');
    errorMsg?.classList.add('visible');
    document.getElementById('modal-input-title').focus();
    return;
  }

  if (modal.type === 'opportunity') {
    closeModal();
    createOpp(title);
    return;
  }

  const body = document.getElementById('modal-input-body').value.trim();
  const id   = (modal.type === 'step' ? 'step_' : 'prompt_') +
               Date.now() + '_' + Math.random().toString(36).slice(2, 7);

  if (modal.type === 'step') {
    state.stepsAdded.push({ id, stageId: modal.targetId, title, body });
  } else {
    state.added.push({ id, condId: modal.targetId, title, body });
  }

  saveCurrentOpp();
  closeModal();
  render();
}

// ── Delete modal ──────────────────────────────────────

let pendingDelete = { id: null, type: null };

function openDeleteModal(type, id) {
  pendingDelete = { id, type };
  let title = id;

  if (type === 'step') {
    for (const s of STAGES) {
      const found = effectiveSteps(s).find(x => x.id === id);
      if (found) { title = found.title; break; }
    }
    document.getElementById('delete-title').textContent = 'Remove step?';
    document.getElementById('delete-desc').textContent  =
      `"${title}" will be permanently removed from this stage.`;
  } else {
    for (const s of STAGES) for (const c of s.conditions) {
      const found = effectivePrompts(c).find(x => x.id === id);
      if (found) { title = found.title; break; }
    }
    document.getElementById('delete-title').textContent = 'Remove prompt?';
    document.getElementById('delete-desc').textContent  =
      `"${title}" will be permanently removed from this condition.`;
  }

  document.getElementById('delete-overlay').classList.remove('hidden');
}

function closeDeleteModal() {
  document.getElementById('delete-overlay').classList.add('hidden');
  pendingDelete = { id: null, type: null };
}

function confirmDelete() {
  const { id, type } = pendingDelete;
  if (!id) return;

  if (type === 'step') {
    state.stepsRemoved.add(id);
    state.stepsUsed.delete(id);
    state.stepsAdded = state.stepsAdded.filter(s => s.id !== id);
  } else {
    state.removed.add(id);
    state.used.delete(id);
    state.added = state.added.filter(p => p.id !== id);
  }

  saveCurrentOpp();
  closeDeleteModal();
  render();
}

// ── Event delegation ──────────────────────────────────

// Opportunity selector
document.getElementById('opp-selector').addEventListener('click', e => {
  if (e.target.closest('#opp-new-trigger')) {
    state.oppDropdownOpen = false;
    renderOppSelector();
    openModal('opportunity', null);
    return;
  }
  const delBtn = e.target.closest('[data-delete-opp]');
  if (delBtn) {
    e.stopPropagation();
    const id   = delBtn.dataset.deleteOpp;
    const name = state.opps.find(o => o.id === id)?.name || 'this opportunity';
    if (confirm(`Delete "${name}"? This cannot be undone.`)) deleteOpp(id);
    return;
  }
  const item = e.target.closest('.opp-item');
  if (item && item.dataset.oppId) { switchOpp(item.dataset.oppId); return; }

  if (e.target.closest('#opp-trigger')) {
    state.oppDropdownOpen = !state.oppDropdownOpen;
    renderOppSelector();
  }
});

document.addEventListener('click', e => {
  if (state.oppDropdownOpen && !e.target.closest('#opp-selector')) {
    state.oppDropdownOpen = false;
    renderOppSelector();
  }
});

// Stage list
document.getElementById('stage-list').addEventListener('click', e => {
  const item = e.target.closest('.stage-item');
  if (!item) return;
  const stage = STAGES.find(s => s.id === item.dataset.stage);
  state.activeStageId = stage.id;
  state.activeCondId  = stage.conditions[0].id;
  render();
});

// Condition tabs
document.getElementById('condition-tabs').addEventListener('click', e => {
  const tab = e.target.closest('.cond-tab');
  if (!tab) return;
  state.activeCondId = tab.dataset.cond;
  render();
});

// Prompts grid
document.getElementById('prompts-grid').addEventListener('click', e => {
  const delBtn = e.target.closest('[data-delete-prompt]');
  if (delBtn) { e.stopPropagation(); openDeleteModal('prompt', delBtn.dataset.deletePrompt); return; }

  const addBtn = e.target.closest('[data-add-prompt]');
  if (addBtn) { openModal('prompt', addBtn.dataset.addPrompt); return; }

  const card = e.target.closest('.prompt-card');
  if (!card) return;
  const id = card.dataset.prompt;
  if (state.used.has(id)) state.used.delete(id); else state.used.add(id);
  saveCurrentOpp();
  render();
});

// Steps grid
document.getElementById('steps-grid').addEventListener('click', e => {
  const delBtn = e.target.closest('[data-delete-step]');
  if (delBtn) { e.stopPropagation(); openDeleteModal('step', delBtn.dataset.deleteStep); return; }

  const addBtn = e.target.closest('[data-add-step]');
  if (addBtn) { openModal('step', addBtn.dataset.addStep); return; }

  const card = e.target.closest('.prompt-card');
  if (!card) return;
  const id = card.dataset.step;
  if (state.stepsUsed.has(id)) state.stepsUsed.delete(id); else state.stepsUsed.add(id);
  saveCurrentOpp();
  render();
});

// Reset buttons
document.getElementById('reset-stage-btn').addEventListener('click', () => {
  const stage = STAGES.find(s => s.id === state.activeStageId);
  stage.conditions.forEach(c => effectivePrompts(c).forEach(p => state.used.delete(p.id)));
  effectiveSteps(stage).forEach(s => state.stepsUsed.delete(s.id));
  saveCurrentOpp();
  render();
});

document.getElementById('role-toggle').addEventListener('click', () => {
  state.role = state.role === 'admin' ? 'standard' : 'admin';
  localStorage.setItem(SK.role, state.role);
  render();
});

document.getElementById('reset-all-btn').addEventListener('click', () => {
  if (!confirm('Reset all used prompts and steps for this opportunity?')) return;
  state.used.clear();
  state.stepsUsed.clear();
  saveCurrentOpp();
  render();
});

// Modal controls
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-cancel').addEventListener('click', closeModal);
document.getElementById('modal-save').addEventListener('click', saveItem);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

const errorEl = document.createElement('span');
errorEl.className = 'modal-error-msg';
errorEl.textContent = 'Please enter a name.';
document.getElementById('modal-input-title').insertAdjacentElement('afterend', errorEl);

document.getElementById('modal-input-title').addEventListener('input', () => {
  document.getElementById('modal-input-title').classList.remove('error');
  document.querySelector('.modal-error-msg')?.classList.remove('visible');
});

document.getElementById('modal-input-title').addEventListener('keydown', e => {
  if (e.key === 'Enter') saveItem();
});

// Delete modal controls
document.getElementById('delete-cancel').addEventListener('click', closeDeleteModal);
document.getElementById('delete-confirm').addEventListener('click', confirmDelete);
document.getElementById('delete-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('delete-overlay')) closeDeleteModal();
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (state.oppDropdownOpen) { state.oppDropdownOpen = false; renderOppSelector(); return; }
  if (!document.getElementById('modal-overlay').classList.contains('hidden'))  closeModal();
  if (!document.getElementById('delete-overlay').classList.contains('hidden')) closeDeleteModal();
});

// ── Helpers ───────────────────────────────────────────

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── Init ──────────────────────────────────────────────

render();
