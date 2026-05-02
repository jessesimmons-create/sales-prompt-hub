// ── Storage keys ──────────────────────────────────────

const SK = {
  used:         'sph_used_v1',
  added:        'sph_added_v1',
  removed:      'sph_removed_v1',
  stepsUsed:    'sph_steps_used_v1',
  stepsAdded:   'sph_steps_added_v1',
  stepsRemoved: 'sph_steps_removed_v1',
};

// ── State ─────────────────────────────────────────────

const state = {
  // Prompts
  used:    new Set(JSON.parse(localStorage.getItem(SK.used)    || '[]')),
  added:       JSON.parse(localStorage.getItem(SK.added)   || '[]'),
  removed: new Set(JSON.parse(localStorage.getItem(SK.removed) || '[]')),
  // Steps
  stepsUsed:    new Set(JSON.parse(localStorage.getItem(SK.stepsUsed)    || '[]')),
  stepsAdded:       JSON.parse(localStorage.getItem(SK.stepsAdded)   || '[]'),
  stepsRemoved: new Set(JSON.parse(localStorage.getItem(SK.stepsRemoved) || '[]')),
  // Navigation
  activeStageId: STAGES[0].id,
  activeCondId:  STAGES[0].conditions[0].id, // '__steps__' when Steps tab active
};

function save() {
  localStorage.setItem(SK.used,         JSON.stringify([...state.used]));
  localStorage.setItem(SK.added,        JSON.stringify(state.added));
  localStorage.setItem(SK.removed,      JSON.stringify([...state.removed]));
  localStorage.setItem(SK.stepsUsed,    JSON.stringify([...state.stepsUsed]));
  localStorage.setItem(SK.stepsAdded,   JSON.stringify(state.stepsAdded));
  localStorage.setItem(SK.stepsRemoved, JSON.stringify([...state.stepsRemoved]));
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
  return {
    total: prompts.length,
    used:  prompts.filter(p => state.used.has(p.id)).length,
  };
}

function condStats(cond) {
  const prompts = effectivePrompts(cond);
  return {
    total: prompts.length,
    used:  prompts.filter(p => state.used.has(p.id)).length,
  };
}

function stepStats(stage) {
  const steps = effectiveSteps(stage);
  return {
    total: steps.length,
    used:  steps.filter(s => state.stepsUsed.has(s.id)).length,
  };
}

// ── Render: Sidebar ───────────────────────────────────

function renderSidebar() {
  document.getElementById('stage-list').innerHTML = STAGES.map(s => {
    const { total, used } = stageStats(s);
    return `
      <div class="stage-item ${s.id === state.activeStageId ? 'active' : ''} ${used > 0 ? 'has-used' : ''}"
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
  const pct = sTotal ? Math.round((sUsed / sTotal) * 100) : 0;
  const stepState = pct === 100 ? 'complete' : pct > 0 ? 'in-progress' : '';
  const stepsActive = state.activeCondId === '__steps__';

  const stepsTab = `
    <div class="steps-tab-divider"></div>
    <div class="cond-tab steps-tab ${stepsActive ? 'active' : ''} ${stepState}"
         style="--active-color:${stage.color}" data-cond="__steps__">
      Steps
      <span class="steps-tab-pct">${pct}%</span>
    </div>`;

  document.getElementById('condition-tabs').innerHTML = condTabs + stepsTab;
}

// ── Render: Prompts ───────────────────────────────────

function renderPrompts(stage) {
  document.getElementById('condition-banner').style.display = '';
  document.getElementById('prompts-grid').style.display = '';
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
        <button class="prompt-delete-btn" data-delete-prompt="${p.id}" title="Remove prompt">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.8"
                  stroke-linecap="round"/>
          </svg>
        </button>
      </div>`;
  }).join('');

  const addBtn = `
    <button class="add-prompt-btn" data-add-prompt="${cond.id}" style="--add-color:${stage.color}">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      Add Prompt
    </button>`;

  document.getElementById('prompts-grid').innerHTML = cards + addBtn;
}

// ── Render: Steps ─────────────────────────────────────

function renderSteps(stage) {
  document.getElementById('condition-banner').style.display = 'none';
  document.getElementById('prompts-grid').style.display = 'none';
  document.getElementById('steps-view').classList.remove('hidden');

  const steps = effectiveSteps(stage);
  const used  = steps.filter(s => state.stepsUsed.has(s.id)).length;
  const total = steps.length;
  const pct   = total ? Math.round((used / total) * 100) : 0;

  document.getElementById('steps-count-label').textContent = `${used} of ${total} steps completed`;
  document.getElementById('steps-pct-label').textContent   = `${pct}%`;
  document.getElementById('steps-pct-label').style.color   = stage.color;
  document.getElementById('steps-progress-fill').style.cssText =
    `width:${pct}%; background:${stage.color}`;

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
        <button class="prompt-delete-btn" data-delete-step="${s.id}" title="Remove step">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.8"
                  stroke-linecap="round"/>
          </svg>
        </button>
      </div>`;
  }).join('');

  const addBtn = `
    <button class="add-prompt-btn" data-add-step="${stage.id}" style="--add-color:${stage.color}">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      Add Step
    </button>`;

  document.getElementById('steps-grid').innerHTML = cards + addBtn;
}

// ── Full render ───────────────────────────────────────

function render() {
  const stage = STAGES.find(s => s.id === state.activeStageId);
  renderSidebar();
  renderHeader(stage);
  renderTabs(stage);
  if (state.activeCondId === '__steps__') {
    renderSteps(stage);
  } else {
    renderPrompts(stage);
  }
}

// ── Modal state ───────────────────────────────────────

// type: 'prompt' | 'step'
let modal = { type: null, targetId: null };
let pendingDeleteId   = null;
let pendingDeleteType = null; // 'prompt' | 'step'

function openModal(type, targetId) {
  const stage = type === 'step'
    ? STAGES.find(s => s.id === targetId)
    : STAGES.find(s => s.conditions.some(c => c.id === targetId));

  modal = { type, targetId };

  const accent = stage?.color || '#6366f1';
  const isStep = type === 'step';

  document.getElementById('modal-title').textContent      = isStep ? 'Add Step' : 'Add Prompt';
  document.getElementById('modal-save').textContent       = isStep ? 'Add Step' : 'Add Prompt';
  document.getElementById('modal-body-label').textContent = isStep ? 'Description' : 'Prompt Text';
  document.getElementById('modal-input-body').placeholder = isStep
    ? 'Optional details or instructions…'
    : 'Paste your LLM prompt here…';

  document.getElementById('modal-input-title').value = '';
  document.getElementById('modal-input-body').value  = '';
  document.getElementById('modal-input-title').classList.remove('error');
  document.querySelector('.modal-error-msg')?.classList.remove('visible');

  const accentProps = ['--modal-accent'];
  [document.getElementById('modal-save'),
   document.getElementById('modal-input-title'),
   document.getElementById('modal-input-body')].forEach(el =>
     accentProps.forEach(p => el.style.setProperty(p, accent)));

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

  const body = document.getElementById('modal-input-body').value.trim();
  const id   = (modal.type === 'step' ? 'step_' : 'prompt_') +
               Date.now() + '_' + Math.random().toString(36).slice(2, 7);

  if (modal.type === 'step') {
    state.stepsAdded.push({ id, stageId: modal.targetId, title, body });
  } else {
    state.added.push({ id, condId: modal.targetId, title, body });
  }

  save();
  closeModal();
  render();
}

function openDeleteModal(type, itemId) {
  pendingDeleteId   = itemId;
  pendingDeleteType = type;

  let title = itemId;
  if (type === 'step') {
    for (const stage of STAGES) {
      const s = effectiveSteps(stage).find(s => s.id === itemId);
      if (s) { title = s.title; break; }
    }
    document.getElementById('delete-title').textContent = 'Remove step?';
    document.getElementById('delete-desc').textContent  =
      `"${title}" will be permanently removed from this stage.`;
  } else {
    for (const stage of STAGES) {
      for (const cond of stage.conditions) {
        const p = effectivePrompts(cond).find(p => p.id === itemId);
        if (p) { title = p.title; break; }
      }
    }
    document.getElementById('delete-title').textContent = 'Remove prompt?';
    document.getElementById('delete-desc').textContent  =
      `"${title}" will be permanently removed from this condition.`;
  }

  document.getElementById('delete-overlay').classList.remove('hidden');
}

function closeDeleteModal() {
  document.getElementById('delete-overlay').classList.add('hidden');
  pendingDeleteId   = null;
  pendingDeleteType = null;
}

function confirmDelete() {
  if (!pendingDeleteId) return;

  if (pendingDeleteType === 'step') {
    state.stepsRemoved.add(pendingDeleteId);
    state.stepsUsed.delete(pendingDeleteId);
    state.stepsAdded = state.stepsAdded.filter(s => s.id !== pendingDeleteId);
  } else {
    state.removed.add(pendingDeleteId);
    state.used.delete(pendingDeleteId);
    state.added = state.added.filter(p => p.id !== pendingDeleteId);
  }

  save();
  closeDeleteModal();
  render();
}

// ── Event delegation ──────────────────────────────────

document.getElementById('stage-list').addEventListener('click', e => {
  const item = e.target.closest('.stage-item');
  if (!item) return;
  const stage = STAGES.find(s => s.id === item.dataset.stage);
  state.activeStageId = stage.id;
  state.activeCondId  = stage.conditions[0].id;
  render();
});

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
  if (state.used.has(id)) state.used.delete(id);
  else state.used.add(id);
  save();
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
  if (state.stepsUsed.has(id)) state.stepsUsed.delete(id);
  else state.stepsUsed.add(id);
  save();
  render();
});

document.getElementById('reset-stage-btn').addEventListener('click', () => {
  const stage = STAGES.find(s => s.id === state.activeStageId);
  stage.conditions.forEach(c => effectivePrompts(c).forEach(p => state.used.delete(p.id)));
  effectiveSteps(stage).forEach(s => state.stepsUsed.delete(s.id));
  save();
  render();
});

document.getElementById('reset-all-btn').addEventListener('click', () => {
  if (!confirm('Reset all used prompts and steps across every stage?')) return;
  state.used.clear();
  state.stepsUsed.clear();
  save();
  render();
});

// Modal controls
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-cancel').addEventListener('click', closeModal);
document.getElementById('modal-save').addEventListener('click', saveItem);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// Error message element
const errorEl = document.createElement('span');
errorEl.className = 'modal-error-msg';
errorEl.textContent = 'Please enter a title.';
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
