// ── Storage ───────────────────────────────────────────

const SK = {
  opps:         'sph_opps',
  activeOpp:    'sph_active_opp',
  currentEmail: 'sph_current_email',
  users:        'sph_users',
  opp: id => ({
    used:         `sph_${id}_used`,
    added:        `sph_${id}_added`,
    removed:      `sph_${id}_removed`,
    stepsUsed:    `sph_${id}_steps_used`,
    stepsAdded:   `sph_${id}_steps_added`,
    stepsRemoved: `sph_${id}_steps_removed`,
    comments:     `sph_${id}_comments`,
    cover:        `sph_${id}_cover`,
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
    comments:          JSON.parse(localStorage.getItem(k.comments)     || '[]'),
    cover:             JSON.parse(localStorage.getItem(k.cover)        || '{}'),
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
  localStorage.setItem(k.comments,     JSON.stringify(state.comments));
  localStorage.setItem(k.cover,        JSON.stringify(state.cover));
}

// ── Role helpers ──────────────────────────────────────

function determineRole(email, users) {
  if (!email) return 'standard';
  if (email.toLowerCase() === 'ccadmin') return 'admin';
  if (users.length === 0) return 'admin';
  const u = users.find(u => u.email === email.toLowerCase());
  return u ? u.role : 'standard';
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

const storedUsers = JSON.parse(localStorage.getItem(SK.users) || '[]');
const storedEmail = localStorage.getItem(SK.currentEmail) || '';

const state = {
  opps,
  activeOppId:     initialOppId,
  ...loadOppState(initialOppId),
  activeStageId:   STAGES[0].id,
  activeCondId:    STAGES[0].conditions[0].id,
  oppDropdownOpen: false,
  users:           storedUsers,
  currentEmail:    storedEmail,
  role:            determineRole(storedEmail, storedUsers),
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
  const opp = { id, name: name.trim(), createdAt: Date.now(), createdBy: state.currentEmail };
  state.opps.push(opp);
  localStorage.setItem(SK.opps, JSON.stringify(state.opps));
  state.activeOppId   = id;
  state.used          = new Set();
  state.added         = [];
  state.removed       = new Set();
  state.stepsUsed     = new Set();
  state.stepsAdded    = [];
  state.stepsRemoved  = new Set();
  state.comments      = [];
  state.cover         = { opportunityOwner: state.currentEmail };
  state.activeStageId = '__cover__';
  localStorage.setItem(SK.activeOpp, id);
  saveCurrentOpp();
  state.oppDropdownOpen = false;
  render();
}

function deleteOpp(id) {
  if (visibleOpps().length <= 1) return;
  const k = SK.opp(id);
  Object.values(k).forEach(key => localStorage.removeItem(key));
  state.opps = state.opps.filter(o => o.id !== id);
  localStorage.setItem(SK.opps, JSON.stringify(state.opps));
  if (state.activeOppId === id) {
    const next = visibleOpps()[0];
    if (next) {
      state.activeOppId = next.id;
      Object.assign(state, loadOppState(next.id));
      localStorage.setItem(SK.activeOpp, next.id);
    }
  }
  render();
}

// ── User management ───────────────────────────────────

function saveUsers() {
  localStorage.setItem(SK.users, JSON.stringify(state.users));
}

function addUser(email, role) {
  if (state.users.find(u => u.email.toLowerCase() === email.toLowerCase())) return false;
  state.users.push({ email: email.trim().toLowerCase(), role });
  saveUsers();
  return true;
}

function removeUser(email) {
  state.users = state.users.filter(u => u.email !== email);
  saveUsers();
  if (state.currentEmail === email) signOut();
}

function toggleUserRole(email) {
  const user = state.users.find(u => u.email === email);
  if (!user) return;
  user.role = user.role === 'admin' ? 'standard' : 'admin';
  saveUsers();
  if (state.currentEmail === email) {
    state.role = user.role;
    render();
  }
}

// ── Email gate ────────────────────────────────────────

function showEmailGate() {
  document.getElementById('email-gate').classList.remove('hidden');
  document.getElementById('email-gate-input').focus();
}

function hideEmailGate() {
  document.getElementById('email-gate').classList.add('hidden');
}

function submitEmailGate() {
  const raw   = document.getElementById('email-gate-input').value.trim();
  const errEl = document.getElementById('email-gate-error');

  if (raw.toLowerCase() === 'ccadmin') {
    state.currentEmail = 'CCAdmin';
    state.role = 'admin';
    localStorage.setItem(SK.currentEmail, 'CCAdmin');
    hideEmailGate();
    render();
    return;
  }

  const email = raw.toLowerCase();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!valid) { errEl.classList.remove('hidden'); document.getElementById('email-gate-input').focus(); return; }
  errEl.classList.add('hidden');

  if (!state.users.find(u => u.email === email)) {
    const role = state.users.length === 0 ? 'admin' : 'standard';
    state.users.push({ email, role });
    saveUsers();
  }

  state.currentEmail = email;
  state.role = determineRole(email, state.users);
  localStorage.setItem(SK.currentEmail, email);
  hideEmailGate();
  render();
}

function signOut() {
  state.currentEmail = '';
  state.role = 'standard';
  localStorage.removeItem(SK.currentEmail);
  document.getElementById('email-gate-input').value = '';
  document.getElementById('email-gate-error').classList.add('hidden');
  render();
  showEmailGate();
}

function openUsersModal() {
  renderUsersModal();
  document.getElementById('users-overlay').classList.remove('hidden');
  document.getElementById('users-add-email').focus();
}

function closeUsersModal() {
  document.getElementById('users-overlay').classList.add('hidden');
  document.getElementById('users-add-email').value = '';
  document.getElementById('users-add-role-btn').dataset.role = 'standard';
  document.getElementById('users-add-role-btn').textContent = 'Standard';
  document.getElementById('users-add-error').classList.add('hidden');
}

function renderUsersModal() {
  const list = document.getElementById('users-list');
  if (state.users.length === 0) {
    list.innerHTML = '<p id="users-empty">No users added yet.</p>';
    return;
  }
  const appUrl = window.location.origin + window.location.pathname;
  list.innerHTML = state.users.map(u => {
    const subj = encodeURIComponent('You\'ve been invited to Sales Prompt Hub');
    const body = encodeURIComponent(
      `Hi,\n\nYou've been invited to use Sales Prompt Hub.\n\nVisit: ${appUrl}\n\nWhen prompted, enter your email address (${u.email}) to access the app.\n\nYour access level: ${u.role === 'admin' ? 'Admin' : 'Standard User'}\n\nThanks!`
    );
    const isSelf = state.currentEmail === u.email;
    return `
    <div class="user-row ${isSelf ? 'is-self' : ''}">
      <span class="user-email">${escHtml(u.email)}${isSelf ? ' <span class="you-badge">you</span>' : ''}</span>
      <button class="user-role-btn ${u.role}" data-toggle-role="${escHtml(u.email)}">
        ${u.role === 'admin' ? 'Admin' : 'Standard'}
      </button>
      <a class="user-invite-btn" href="mailto:${escHtml(u.email)}?subject=${subj}&body=${body}" title="Send invite email">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect x="1" y="2.5" width="10" height="7" rx="1" stroke="currentColor" stroke-width="1.3"/>
          <path d="M1 4l5 3.5L11 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
      </a>
      <button class="user-remove-btn" data-remove-user="${escHtml(u.email)}" title="Remove user">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>`; }).join('');
}

// ── Comments ──────────────────────────────────────────

let commentsStepId = null;

function addComment(stepId, html) {
  const id = 'cmt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  state.comments.push({ id, stepId, html, createdAt: Date.now() });
  saveCurrentOpp();
}

function removeComment(id) {
  state.comments = state.comments.filter(c => c.id !== id);
  saveCurrentOpp();
}

function formatCommentDate(ts) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function openCommentsModal(stepId) {
  commentsStepId = stepId;
  let stepTitle = stepId;
  for (const s of STAGES) {
    const found = effectiveSteps(s).find(x => x.id === stepId);
    if (found) { stepTitle = found.title; break; }
  }
  document.getElementById('comments-modal-step-name').textContent = stepTitle;
  renderCommentsModal();
  document.getElementById('comments-overlay').classList.remove('hidden');
  commentsQuill.focus();
}

function closeCommentsModal() {
  document.getElementById('comments-overlay').classList.add('hidden');
  commentsStepId = null;
  commentsQuill.setContents([]);
}

function renderCommentsModal() {
  const list = document.getElementById('comments-list');
  const mine = state.comments.filter(c => c.stepId === commentsStepId);
  if (mine.length === 0) {
    list.innerHTML = '<p id="comments-empty">No comments yet.</p>';
    return;
  }
  list.innerHTML = mine.map(c => `
    <div class="comment-card" data-comment-id="${c.id}">
      <div class="comment-body">${c.html}</div>
      <div class="comment-footer">
        <span class="comment-date">${formatCommentDate(c.createdAt)}</span>
        <button class="comment-delete-btn" data-delete-comment="${c.id}" title="Delete comment">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>`).join('');
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

// ── Visibility helpers ────────────────────────────────

function visibleOpps() {
  if (state.role === 'admin') return state.opps;
  return state.opps.filter(o => o.createdBy === state.currentEmail);
}

function ensureValidActiveOpp() {
  const visible = visibleOpps();
  if (visible.find(o => o.id === state.activeOppId)) return;

  if (visible.length > 0) {
    saveCurrentOpp();
    const next = visible[0];
    state.activeOppId = next.id;
    Object.assign(state, loadOppState(next.id));
    localStorage.setItem(SK.activeOpp, next.id);
  } else {
    // No visible opps for this user — create one automatically
    saveCurrentOpp();
    const id  = 'opp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);
    const opp = { id, name: 'My First Deal', createdAt: Date.now(), createdBy: state.currentEmail };
    state.opps.push(opp);
    localStorage.setItem(SK.opps, JSON.stringify(state.opps));
    state.activeOppId   = id;
    state.used          = new Set();
    state.added         = [];
    state.removed       = new Set();
    state.stepsUsed     = new Set();
    state.stepsAdded    = [];
    state.stepsRemoved  = new Set();
    state.comments      = [];
    state.cover         = { opportunityOwner: state.currentEmail };
    state.activeStageId = '__cover__';
    localStorage.setItem(SK.activeOpp, id);
    saveCurrentOpp();
  }
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
    const myOpps    = visibleOpps();
    const canDelete = myOpps.length > 1;
    dropdown.innerHTML =
      `<div class="opp-search-wrap">
         <svg class="opp-search-icon" width="12" height="12" viewBox="0 0 12 12" fill="none">
           <circle cx="5" cy="5" r="3.5" stroke="currentColor" stroke-width="1.4"/>
           <path d="M8 8l2.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
         </svg>
         <input class="opp-search-input" type="text" placeholder="Search deals…" autocomplete="off" />
       </div>` +
      myOpps.map(o => `
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

    const searchInput = dropdown.querySelector('.opp-search-input');
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase();
      dropdown.querySelectorAll('.opp-item').forEach(item => {
        const name = item.querySelector('.opp-item-name').textContent.toLowerCase();
        item.style.display = name.includes(q) ? '' : 'none';
      });
    });
    searchInput.addEventListener('click', e => e.stopPropagation());
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') { state.oppDropdownOpen = false; renderOppSelector(); }
      e.stopPropagation();
    });
    searchInput.focus();
  } else {
    selector.classList.remove('open');
    dropdown.classList.add('hidden');
  }
}

// ── Render: Current user ──────────────────────────────

function renderCurrentUser() {
  const isAdmin = state.role === 'admin';
  document.getElementById('current-user-email').textContent = state.currentEmail || '—';
  const badge = document.getElementById('current-user-role-badge');
  badge.textContent  = isAdmin ? 'Admin' : 'Standard';
  badge.className    = 'role-badge ' + (isAdmin ? 'is-admin' : '');
  document.getElementById('manage-users-btn').classList.toggle('hidden', !isAdmin);
}

// ── Render: Sidebar ───────────────────────────────────

function renderSidebar() {
  const coverActive = state.activeStageId === '__cover__';
  const coverItem = `
    <div class="stage-item ${coverActive ? 'active' : ''}" style="--stage-color:#6366f1" data-stage="__cover__">
      <div class="stage-item-row">
        <span class="stage-icon">📄</span>
        <span class="stage-name">Deal Overview</span>
      </div>
    </div>`;
  document.getElementById('stage-list').innerHTML = coverItem + STAGES.map(s => {
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
    const commentCount = state.comments.filter(c => c.stepId === s.id).length;
    return `
      <div class="prompt-card step-card ${done ? 'used' : ''}" data-step="${s.id}">
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
        <div class="step-card-footer">
          <button class="step-comments-btn ${commentCount > 0 ? 'has-comments' : ''}" data-comments-step="${s.id}">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M10 1H2a1 1 0 00-1 1v6a1 1 0 001 1h2l2 2 2-2h2a1 1 0 001-1V2a1 1 0 00-1-1z"
                    stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
            </svg>
            ${commentCount > 0 ? `${commentCount} comment${commentCount !== 1 ? 's' : ''}` : 'Add comment'}
          </button>
        </div>
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

// ── Render: Cover page ────────────────────────────────

function renderCover() {
  document.getElementById('stage-header').style.display  = 'none';
  document.getElementById('prompts-area').style.display  = 'none';
  document.getElementById('cover-view').style.display    = '';

  const opp = state.opps.find(o => o.id === state.activeOppId);
  document.getElementById('cover-opp-name').textContent = opp?.name || '—';

  const c = state.cover;
  document.getElementById('cover-opp-owner').value  = c.opportunityOwner || '';
  document.getElementById('cover-company').value    = c.company          || '';
  document.getElementById('cover-contact').value    = c.contact          || '';
  document.getElementById('cover-deal-value').value = c.dealValue        || '';
  document.getElementById('cover-close-date').value = c.closeDate        || '';
  document.getElementById('cover-notes').value      = c.notes            || '';

  const userOpts = '<option value="">— None —</option>' +
    state.users.map(u =>
      `<option value="${escHtml(u.email)}">${escHtml(u.email)}</option>`
    ).join('');
  document.getElementById('cover-sales-engineer').innerHTML      = userOpts;
  document.getElementById('cover-additional-resource').innerHTML = userOpts;
  document.getElementById('cover-sales-engineer').value      = c.salesEngineer      || '';
  document.getElementById('cover-additional-resource').value = c.additionalResource || '';

  document.getElementById('cover-stages-grid').innerHTML = STAGES.map(s => {
    const { total: sTotal, used: sUsed } = stepStats(s);
    const { total: pTotal, used: pUsed } = stageStats(s);
    const pct = sTotal ? Math.round((sUsed / sTotal) * 100) : 0;
    return `
      <div class="cover-stage-card" data-nav-stage="${s.id}" style="--stage-color:${s.color}">
        <div class="cover-stage-header">
          <span class="cover-stage-icon">${s.icon}</span>
          <span class="cover-stage-name">${escHtml(s.name)}</span>
        </div>
        <div class="cover-stage-stats">${sUsed}/${sTotal} steps &middot; ${pUsed}/${pTotal} prompts</div>
        <div class="cover-stage-bar-track">
          <div class="cover-stage-bar-fill" style="width:${pct}%;background:${s.color}"></div>
        </div>
      </div>`;
  }).join('');
}

// ── Full render ───────────────────────────────────────

function render() {
  ensureValidActiveOpp();
  renderOppSelector();
  renderCurrentUser();
  renderSidebar();
  if (state.activeStageId === '__cover__') {
    renderCover();
    return;
  }
  document.getElementById('stage-header').style.display = '';
  document.getElementById('prompts-area').style.display = '';
  document.getElementById('cover-view').style.display   = 'none';
  const stage = STAGES.find(s => s.id === state.activeStageId);
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
    document.getElementById('delete-desc').innerHTML  =
      `"${escHtml(title)}" will be permanently removed from this stage for <strong>all users</strong>.`;
  } else {
    for (const s of STAGES) for (const c of s.conditions) {
      const found = effectivePrompts(c).find(x => x.id === id);
      if (found) { title = found.title; break; }
    }
    document.getElementById('delete-title').textContent = 'Remove prompt?';
    document.getElementById('delete-desc').innerHTML  =
      `"${escHtml(title)}" will be permanently removed from this condition for <strong>all users</strong>.`;
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
  const stageId = item.dataset.stage;
  if (stageId === '__cover__') {
    state.activeStageId = '__cover__';
    render();
    return;
  }
  const stage = STAGES.find(s => s.id === stageId);
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
  const commentBtn = e.target.closest('[data-comments-step]');
  if (commentBtn) { openCommentsModal(commentBtn.dataset.commentsStep); return; }

  const delBtn = e.target.closest('[data-delete-step]');
  if (delBtn) { e.stopPropagation(); openDeleteModal('step', delBtn.dataset.deleteStep); return; }

  const addBtn = e.target.closest('[data-add-step]');
  if (addBtn) { openModal('step', addBtn.dataset.addStep); return; }

  const card = e.target.closest('.prompt-card');
  if (!card || e.target.closest('.step-card-footer')) return;
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

document.getElementById('sign-out-btn').addEventListener('click', signOut);

document.getElementById('email-gate-btn').addEventListener('click', submitEmailGate);
document.getElementById('email-gate-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') submitEmailGate();
  else document.getElementById('email-gate-error').classList.add('hidden');
});

document.getElementById('reset-all-btn').addEventListener('click', () => {
  if (!confirm('Reset all used prompts and steps for this opportunity?')) return;
  state.used.clear();
  state.stepsUsed.clear();
  saveCurrentOpp();
  render();
});

// Cover view — save fields on input/change, navigate stage cards on click
['input', 'change'].forEach(evt => {
  document.getElementById('cover-view').addEventListener(evt, e => {
    const field = e.target.dataset.coverField;
    if (!field) return;
    if (!state.cover) state.cover = {};
    state.cover[field] = e.target.value;
    saveCurrentOpp();
  });
});

document.getElementById('cover-stages-grid').addEventListener('click', e => {
  const card = e.target.closest('[data-nav-stage]');
  if (!card) return;
  const stage = STAGES.find(s => s.id === card.dataset.navStage);
  if (!stage) return;
  state.activeStageId = stage.id;
  state.activeCondId  = stage.conditions[0].id;
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

// Users modal
document.getElementById('manage-users-btn').addEventListener('click', openUsersModal);
document.getElementById('users-modal-close').addEventListener('click', closeUsersModal);
document.getElementById('users-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('users-overlay')) closeUsersModal();
});

document.getElementById('users-add-role-btn').addEventListener('click', () => {
  const btn = document.getElementById('users-add-role-btn');
  const next = btn.dataset.role === 'standard' ? 'admin' : 'standard';
  btn.dataset.role = next;
  btn.textContent  = next === 'admin' ? 'Admin' : 'Standard';
});

document.getElementById('users-add-btn').addEventListener('click', () => {
  const emailEl = document.getElementById('users-add-email');
  const errorEl = document.getElementById('users-add-error');
  const email   = emailEl.value.trim();
  const role    = document.getElementById('users-add-role-btn').dataset.role;
  const valid   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!valid) { errorEl.classList.remove('hidden'); emailEl.focus(); return; }
  errorEl.classList.add('hidden');

  if (!addUser(email, role)) {
    errorEl.textContent = 'That email is already in the list.';
    errorEl.classList.remove('hidden');
    emailEl.focus();
    return;
  }
  errorEl.textContent = 'Please enter a valid email address.';
  emailEl.value = '';
  document.getElementById('users-add-role-btn').dataset.role = 'standard';
  document.getElementById('users-add-role-btn').textContent  = 'Standard';
  renderUsersModal();
  emailEl.focus();
});

document.getElementById('users-add-email').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('users-add-btn').click();
});

document.getElementById('users-list').addEventListener('click', e => {
  const toggleBtn = e.target.closest('[data-toggle-role]');
  if (toggleBtn) { toggleUserRole(toggleBtn.dataset.toggleRole); renderUsersModal(); return; }
  const removeBtn = e.target.closest('[data-remove-user]');
  if (removeBtn) { removeUser(removeBtn.dataset.removeUser); renderUsersModal(); return; }
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (state.oppDropdownOpen) { state.oppDropdownOpen = false; renderOppSelector(); return; }
  if (!document.getElementById('comments-overlay').classList.contains('hidden')) { closeCommentsModal(); return; }
  if (!document.getElementById('users-overlay').classList.contains('hidden'))   { closeUsersModal(); return; }
  if (!document.getElementById('modal-overlay').classList.contains('hidden'))   closeModal();
  if (!document.getElementById('delete-overlay').classList.contains('hidden'))  closeDeleteModal();
});

// Comments modal events
document.getElementById('comments-modal-close').addEventListener('click', closeCommentsModal);
document.getElementById('comments-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('comments-overlay')) closeCommentsModal();
});

document.getElementById('comments-list').addEventListener('click', e => {
  const btn = e.target.closest('[data-delete-comment]');
  if (!btn) return;
  removeComment(btn.dataset.deleteComment);
  renderCommentsModal();
  render();
});

document.getElementById('comments-add-btn').addEventListener('click', () => {
  if (!commentsStepId) return;
  const html = commentsQuill.root.innerHTML;
  if (commentsQuill.getText().trim() === '') return;
  addComment(commentsStepId, html);
  commentsQuill.setContents([]);
  renderCommentsModal();
  render();
});

// ── Quill rich text editor ────────────────────────────

const commentsQuill = new Quill('#comments-editor', {
  theme: 'snow',
  placeholder: 'Write a comment…',
  modules: {
    toolbar: [
      ['bold', 'italic', 'underline'],
      ['link'],
      [{ list: 'bullet' }, { list: 'ordered' }],
      ['clean'],
    ],
  },
});

// Auto-linkify URLs as the user types
commentsQuill.on('text-change', (delta) => {
  const inserted = delta.ops.some(op => op.insert && /\s/.test(op.insert));
  if (!inserted) return;
  const text = commentsQuill.getText();
  const urlRe = /https?:\/\/[^\s<>"']+/g;
  let m;
  while ((m = urlRe.exec(text)) !== null) {
    const fmt = commentsQuill.getFormat(m.index, m[0].length);
    if (!fmt.link) {
      commentsQuill.formatText(m.index, m[0].length, 'link', m[0], 'api');
    }
  }
});

// Submit on Ctrl/Cmd+Enter
commentsQuill.root.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    document.getElementById('comments-add-btn').click();
  }
});

// ── Helpers ───────────────────────────────────────────

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── Init ──────────────────────────────────────────────

render();
if (!state.currentEmail) showEmailGate();
