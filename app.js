const STORAGE_USED    = 'sph_used_v1';
const STORAGE_ADDED   = 'sph_added_v1';
const STORAGE_REMOVED = 'sph_removed_v1';

// ── State ─────────────────────────────────────────────

const state = {
  used:    new Set(JSON.parse(localStorage.getItem(STORAGE_USED)    || '[]')),
  added:       JSON.parse(localStorage.getItem(STORAGE_ADDED)   || '[]'),
  removed: new Set(JSON.parse(localStorage.getItem(STORAGE_REMOVED) || '[]')),
  activeStageId: STAGES[0].id,
  activeCondId:  STAGES[0].conditions[0].id,
};

function save() {
  localStorage.setItem(STORAGE_USED,    JSON.stringify([...state.used]));
  localStorage.setItem(STORAGE_ADDED,   JSON.stringify(state.added));
  localStorage.setItem(STORAGE_REMOVED, JSON.stringify([...state.removed]));
}

// Returns the effective prompt list for a condition (defaults minus removed, plus custom)
function effectivePrompts(cond) {
  const base   = cond.prompts.filter(p => !state.removed.has(p.id));
  const custom = state.added.filter(p => p.condId === cond.id);
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

// ── Render ────────────────────────────────────────────

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

function renderHeader(stage) {
  const { total, used } = stageStats(stage);
  document.getElementById('stage-header-icon').textContent  = stage.icon;
  document.getElementById('stage-header-title').textContent = stage.name;
  document.getElementById('stage-stats').textContent = `${used} of ${total} prompts used`;
  document.getElementById('reset-stage-btn').dataset.stage  = stage.id;
}

function renderTabs(stage) {
  document.getElementById('condition-tabs').innerHTML = stage.conditions.map(c => {
    const { total, used } = condStats(c);
    const allDone = total > 0 && used === total;
    return `
      <div class="cond-tab ${c.id === state.activeCondId ? 'active' : ''} ${allDone ? 'all-done' : ''}"
           style="--active-color:${stage.color}" data-cond="${c.id}">
        ${c.name}
        <span class="cond-tab-count">${used}/${total}</span>
      </div>`;
  }).join('');
}

function renderPrompts(stage) {
  const cond = stage.conditions.find(c => c.id === state.activeCondId);
  if (!cond) return;

  const banner = document.getElementById('condition-banner');
  banner.textContent = cond.description;
  banner.style.setProperty('--banner-color', stage.color);

  const prompts = effectivePrompts(cond);

  const cards = prompts.map(p => {
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
        <button class="prompt-delete-btn" data-delete="${p.id}" title="Remove prompt"
                aria-label="Remove prompt">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.8"
                  stroke-linecap="round"/>
          </svg>
        </button>
      </div>`;
  }).join('');

  const addBtn = `
    <button class="add-prompt-btn" data-add-cond="${cond.id}"
            style="--add-color:${stage.color}">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2"
              stroke-linecap="round"/>
      </svg>
      Add Prompt
    </button>`;

  document.getElementById('prompts-grid').innerHTML = cards + addBtn;
}

function render() {
  const stage = STAGES.find(s => s.id === state.activeStageId);
  renderSidebar();
  renderHeader(stage);
  renderTabs(stage);
  renderPrompts(stage);
}

// ── Modals ────────────────────────────────────────────

let pendingCondId   = null;
let pendingDeleteId = null;

function openAddModal(condId) {
  const stage = STAGES.find(s => s.conditions.some(c => c.id === condId));
  pendingCondId = condId;

  document.getElementById('modal-input-title').value = '';
  document.getElementById('modal-input-body').value  = '';
  document.getElementById('modal-input-title').classList.remove('error');
  document.querySelector('.modal-error-msg')?.classList.remove('visible');
  document.getElementById('modal-save').style.setProperty('--modal-accent', stage?.color || '#6366f1');
  document.getElementById('modal-input-title').style.setProperty('--modal-accent', stage?.color || '#6366f1');
  document.getElementById('modal-input-body').style.setProperty('--modal-accent', stage?.color || '#6366f1');

  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('modal-input-title').focus();
}

function closeAddModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  pendingCondId = null;
}

function savePrompt() {
  const title = document.getElementById('modal-input-title').value.trim();
  const errorMsg = document.querySelector('.modal-error-msg');

  if (!title) {
    document.getElementById('modal-input-title').classList.add('error');
    if (errorMsg) errorMsg.classList.add('visible');
    document.getElementById('modal-input-title').focus();
    return;
  }

  const body = document.getElementById('modal-input-body').value.trim();
  const id   = 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

  state.added.push({ id, condId: pendingCondId, title, body });
  save();
  closeAddModal();
  render();
}

function openDeleteModal(promptId) {
  pendingDeleteId = promptId;

  // Find the prompt title across all stages
  let title = promptId;
  for (const stage of STAGES) {
    for (const cond of stage.conditions) {
      const p = effectivePrompts(cond).find(p => p.id === promptId);
      if (p) { title = p.title; break; }
    }
  }

  document.getElementById('delete-desc').textContent =
    `"${title}" will be permanently removed from this condition.`;
  document.getElementById('delete-overlay').classList.remove('hidden');
}

function closeDeleteModal() {
  document.getElementById('delete-overlay').classList.add('hidden');
  pendingDeleteId = null;
}

function confirmDelete() {
  if (!pendingDeleteId) return;
  state.removed.add(pendingDeleteId);
  state.used.delete(pendingDeleteId);
  // Also remove from added if it was a custom prompt
  state.added = state.added.filter(p => p.id !== pendingDeleteId);
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

document.getElementById('prompts-grid').addEventListener('click', e => {
  // Delete button takes priority
  const delBtn = e.target.closest('[data-delete]');
  if (delBtn) {
    e.stopPropagation();
    openDeleteModal(delBtn.dataset.delete);
    return;
  }

  // Add prompt button
  const addBtn = e.target.closest('[data-add-cond]');
  if (addBtn) {
    openAddModal(addBtn.dataset.addCond);
    return;
  }

  // Toggle used on card
  const card = e.target.closest('.prompt-card');
  if (!card) return;
  const id = card.dataset.prompt;
  if (state.used.has(id)) state.used.delete(id);
  else state.used.add(id);
  save();
  render();
});

document.getElementById('reset-stage-btn').addEventListener('click', () => {
  const stage = STAGES.find(s => s.id === state.activeStageId);
  stage.conditions.forEach(c => effectivePrompts(c).forEach(p => state.used.delete(p.id)));
  save();
  render();
});

document.getElementById('reset-all-btn').addEventListener('click', () => {
  if (!confirm('Reset all used prompts across every stage?')) return;
  state.used.clear();
  save();
  render();
});

// Add modal controls
document.getElementById('modal-close').addEventListener('click', closeAddModal);
document.getElementById('modal-cancel').addEventListener('click', closeAddModal);
document.getElementById('modal-save').addEventListener('click', savePrompt);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeAddModal();
});

// Add error message element after title input
const errorEl = document.createElement('span');
errorEl.className = 'modal-error-msg';
errorEl.textContent = 'Please enter a prompt title.';
document.getElementById('modal-input-title').insertAdjacentElement('afterend', errorEl);

// Clear error on type
document.getElementById('modal-input-title').addEventListener('input', () => {
  document.getElementById('modal-input-title').classList.remove('error');
  document.querySelector('.modal-error-msg')?.classList.remove('visible');
});

// Save on Enter in title field
document.getElementById('modal-input-title').addEventListener('keydown', e => {
  if (e.key === 'Enter') savePrompt();
});

// Delete modal controls
document.getElementById('delete-cancel').addEventListener('click', closeDeleteModal);
document.getElementById('delete-confirm').addEventListener('click', confirmDelete);
document.getElementById('delete-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('delete-overlay')) closeDeleteModal();
});

// ESC closes whichever modal is open
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!document.getElementById('modal-overlay').classList.contains('hidden'))  closeAddModal();
  if (!document.getElementById('delete-overlay').classList.contains('hidden')) closeDeleteModal();
});

// ── Helpers ───────────────────────────────────────────

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── Init ──────────────────────────────────────────────

render();
