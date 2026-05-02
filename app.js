const STORAGE_KEY = 'sph_used_v1';

const state = {
  used: new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')),
  activeStageId: STAGES[0].id,
  activeCondId: STAGES[0].conditions[0].id,
};

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.used]));
}

function stageStats(stage) {
  const total = stage.conditions.reduce((n, c) => n + c.prompts.length, 0);
  const used = stage.conditions.reduce((n, c) => n + c.prompts.filter(p => state.used.has(p.id)).length, 0);
  return { total, used };
}

function condStats(cond) {
  const total = cond.prompts.length;
  const used = cond.prompts.filter(p => state.used.has(p.id)).length;
  return { total, used };
}

// ── Sidebar ───────────────────────────────────────────

function renderSidebar() {
  const list = document.getElementById('stage-list');
  list.innerHTML = STAGES.map(s => {
    const { total, used } = stageStats(s);
    const pct = total ? (used / total) * 100 : 0;
    const isActive = s.id === state.activeStageId;
    const hasUsed = used > 0;
    return `
      <div class="stage-item ${isActive ? 'active' : ''} ${hasUsed ? 'has-used' : ''}"
           style="--stage-color: ${s.color}"
           data-stage="${s.id}">
        <div class="stage-item-row">
          <span class="stage-icon">${s.icon}</span>
          <span class="stage-name">${s.name}</span>
          <span class="stage-badge">${used}/${total}</span>
        </div>
        <div class="stage-progress-track">
          <div class="stage-progress-fill" style="width:${pct}%"></div>
        </div>
      </div>`;
  }).join('');
}

// ── Stage header ──────────────────────────────────────

function renderHeader(stage) {
  const { total, used } = stageStats(stage);
  document.getElementById('stage-header-icon').textContent = stage.icon;
  document.getElementById('stage-header-title').textContent = stage.name;
  document.getElementById('stage-stats').textContent = `${used} of ${total} prompts used`;
  document.getElementById('reset-stage-btn').dataset.stage = stage.id;
}

// ── Condition tabs ────────────────────────────────────

function renderTabs(stage) {
  const tabs = document.getElementById('condition-tabs');
  tabs.innerHTML = stage.conditions.map(c => {
    const { total, used } = condStats(c);
    const allDone = used === total && total > 0;
    const isActive = c.id === state.activeCondId;
    return `
      <div class="cond-tab ${isActive ? 'active' : ''} ${allDone ? 'all-done' : ''}"
           style="--active-color: ${stage.color}"
           data-cond="${c.id}">
        ${c.name}
        <span class="cond-tab-count">${used}/${total}</span>
      </div>`;
  }).join('');
}

// ── Prompts ───────────────────────────────────────────

function renderPrompts(stage) {
  const cond = stage.conditions.find(c => c.id === state.activeCondId);
  if (!cond) return;

  document.getElementById('condition-banner').textContent = cond.description;
  document.getElementById('condition-banner').style.setProperty('--banner-color', stage.color);

  const grid = document.getElementById('prompts-grid');
  grid.innerHTML = cond.prompts.map(p => {
    const used = state.used.has(p.id);
    const bodyText = p.body || 'No prompt added yet — click to add one here.';
    const bodyClass = p.body ? 'has-content' : '';
    return `
      <div class="prompt-card ${used ? 'used' : ''}" data-prompt="${p.id}">
        <div class="prompt-card-top">
          <div class="prompt-check">
            <svg class="check-icon" viewBox="0 0 11 11" fill="none">
              <path d="M1.5 5.5L4.5 8.5L9.5 2.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <span class="prompt-title">${p.title}</span>
        </div>
        <div class="prompt-body ${bodyClass}">${bodyText}</div>
        <span class="used-pill">✓ Used</span>
      </div>`;
  }).join('');
}

// ── Full render ───────────────────────────────────────

function render() {
  const stage = STAGES.find(s => s.id === state.activeStageId);
  renderSidebar();
  renderHeader(stage);
  renderTabs(stage);
  renderPrompts(stage);
}

// ── Event delegation ──────────────────────────────────

document.getElementById('stage-list').addEventListener('click', e => {
  const item = e.target.closest('.stage-item');
  if (!item) return;
  const stage = STAGES.find(s => s.id === item.dataset.stage);
  state.activeStageId = stage.id;
  state.activeCondId = stage.conditions[0].id;
  render();
});

document.getElementById('condition-tabs').addEventListener('click', e => {
  const tab = e.target.closest('.cond-tab');
  if (!tab) return;
  state.activeCondId = tab.dataset.cond;
  render();
});

document.getElementById('prompts-grid').addEventListener('click', e => {
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
  stage.conditions.forEach(c => c.prompts.forEach(p => state.used.delete(p.id)));
  save();
  render();
});

document.getElementById('reset-all-btn').addEventListener('click', () => {
  if (!confirm('Reset all used prompts across every stage?')) return;
  state.used.clear();
  save();
  render();
});

// ── Init ──────────────────────────────────────────────

render();
