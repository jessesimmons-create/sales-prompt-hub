// ── Storage ───────────────────────────────────────────

const SK = {
  opps:         'sph_opps',
  activeOpp:    'sph_active_opp',
  currentEmail: 'sph_current_email',
  users:        'sph_users',
  weights:      'sph_weights',
  promptEdits:  'sph_prompt_edits',
  stepEdits:    'sph_step_edits',
  opp: id => ({
    added:        `sph_${id}_added`,
    removed:      `sph_${id}_removed`,
    stepsUsed:    `sph_${id}_steps_used`,
    stepsAdded:   `sph_${id}_steps_added`,
    stepsRemoved: `sph_${id}_steps_removed`,
    comments:     `sph_${id}_comments`,
    cover:        `sph_${id}_cover`,
    attachments:  `sph_${id}_attachments`,
  }),
};

// Migrate data from the previous single-opportunity format
(function migrate() {
  if (localStorage.getItem(SK.opps)) return;
  const id = 'opp_default';
  const keyMap = {
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
    added:             JSON.parse(localStorage.getItem(k.added)        || '[]'),
    removed:      new Set(JSON.parse(localStorage.getItem(k.removed)      || '[]')),
    stepsUsed:    new Set(JSON.parse(localStorage.getItem(k.stepsUsed)    || '[]')),
    stepsAdded:        JSON.parse(localStorage.getItem(k.stepsAdded)   || '[]'),
    stepsRemoved: new Set(JSON.parse(localStorage.getItem(k.stepsRemoved) || '[]')),
    comments:          JSON.parse(localStorage.getItem(k.comments)     || '[]'),
    cover:             JSON.parse(localStorage.getItem(k.cover)        || '{}'),
    attachments:       JSON.parse(localStorage.getItem(k.attachments)  || '[]'),
  };
}

function saveCurrentOpp() {
  const k = SK.opp(state.activeOppId);
  localStorage.setItem(k.added,        JSON.stringify(state.added));
  localStorage.setItem(k.removed,      JSON.stringify([...state.removed]));
  localStorage.setItem(k.stepsUsed,    JSON.stringify([...state.stepsUsed]));
  localStorage.setItem(k.stepsAdded,   JSON.stringify(state.stepsAdded));
  localStorage.setItem(k.stepsRemoved, JSON.stringify([...state.stepsRemoved]));
  localStorage.setItem(k.comments,     JSON.stringify(state.comments));
  localStorage.setItem(k.cover,        JSON.stringify(state.cover));
  try {
    localStorage.setItem(k.attachments, JSON.stringify(state.attachments));
  } catch (e) {
    console.warn('Storage quota exceeded — attachment not saved.');
  }
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

const storedUsers   = JSON.parse(localStorage.getItem(SK.users)   || '[]');
const storedEmail   = localStorage.getItem(SK.currentEmail) || '';
const storedWeights      = JSON.parse(localStorage.getItem(SK.weights)      || '{}');
const storedPromptEdits  = JSON.parse(localStorage.getItem(SK.promptEdits)  || '{}');
const storedStepEdits    = JSON.parse(localStorage.getItem(SK.stepEdits)    || '{}');

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
  weights:         storedWeights,
  promptEdits:     storedPromptEdits,
  stepEdits:       storedStepEdits,
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
  state.added         = [];
  state.removed       = new Set();
  state.stepsUsed     = new Set();
  state.stepsAdded    = [];
  state.stepsRemoved  = new Set();
  state.comments      = [];
  state.cover         = { opportunityOwner: state.currentEmail };
  state.attachments   = [];
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

// ── Step weights ─────────────────────────────────────

function saveWeights() {
  localStorage.setItem(SK.weights, JSON.stringify(state.weights));
}

function getStepWeight(stepId) {
  const dealType = state.cover?.dealType;
  if (!dealType) return 1;
  return (state.weights[dealType]?.[stepId]) ?? 1;
}

function setStepWeight(dealType, stepId, weight) {
  if (!state.weights[dealType]) state.weights[dealType] = {};
  if (weight === 1) {
    delete state.weights[dealType][stepId];
    if (Object.keys(state.weights[dealType]).length === 0) delete state.weights[dealType];
  } else {
    state.weights[dealType][stepId] = weight;
  }
  saveWeights();
}

// ── Prompt edits (global) ─────────────────────────────

function savePromptEdits() {
  localStorage.setItem(SK.promptEdits, JSON.stringify(state.promptEdits));
}

// Merges a base prompt with any global admin edits
function getEffectivePrompt(p) {
  const edit = state.promptEdits[p.id] || {};
  return {
    id:          p.id,
    title:       edit.title       !== undefined ? edit.title       : p.title,
    explanation: edit.explanation !== undefined ? edit.explanation : '',
    body:        edit.body        !== undefined ? edit.body        : (p.body || ''),
  };
}

// Finds and returns the effective prompt for a given ID across all stages/conditions
function getEffectivePromptById(id) {
  for (const s of STAGES) {
    for (const c of s.conditions) {
      const all = [...c.prompts, ...state.added.filter(p => p.condId === c.id)];
      const found = all.find(p => p.id === id);
      if (found) return getEffectivePrompt(found);
    }
  }
  return { id, title: '', explanation: '', body: '' };
}

// ── Step edits (global) ───────────────────────────────

function saveStepEdits() {
  localStorage.setItem(SK.stepEdits, JSON.stringify(state.stepEdits));
}

function getEffectiveStep(s) {
  const edit = state.stepEdits[s.id] || {};
  return {
    id:    s.id,
    title: edit.title !== undefined ? edit.title : s.title,
    body:  edit.body  !== undefined ? edit.body  : (s.body || ''),
  };
}

function getEffectiveStepById(id) {
  for (const s of STAGES) {
    const found = effectiveSteps(s).find(x => x.id === id);
    if (found) return getEffectiveStep(found);
  }
  return { id, title: '', body: '' };
}

// ── Prompt edit modal (admin) ─────────────────────────

let editingPromptId = null;

function openPromptEditModal(id) {
  editingPromptId = id;
  const ep = getEffectivePromptById(id);
  document.getElementById('prompt-edit-name').value = ep.title;
  if (ep.explanation) promptEditDescQuill.clipboard.dangerouslyPasteHTML(ep.explanation);
  else promptEditDescQuill.setContents([]);
  document.getElementById('prompt-edit-text').value = ep.body;
  document.getElementById('prompt-edit-name').classList.remove('error');
  document.getElementById('prompt-edit-overlay').classList.remove('hidden');
  document.getElementById('prompt-edit-name').focus();
}

function closePromptEditModal() {
  document.getElementById('prompt-edit-overlay').classList.add('hidden');
  editingPromptId = null;
  promptEditDescQuill.setContents([]);
}

function savePromptEdit() {
  if (!editingPromptId) return;
  const nameEl = document.getElementById('prompt-edit-name');
  const title  = nameEl.value.trim();
  if (!title) { nameEl.classList.add('error'); nameEl.focus(); return; }
  nameEl.classList.remove('error');
  state.promptEdits[editingPromptId] = {
    title,
    explanation: quillToHtml(promptEditDescQuill),
    body:        document.getElementById('prompt-edit-text').value,
  };
  savePromptEdits();
  closePromptEditModal();
  render();
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
  const stepTitle = getEffectiveStepById(stepId).title || stepId;
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

// ── Attachments ───────────────────────────────────────

let attachmentsStepId   = null;
let attachmentsPending  = null; // { name, url, fileType, size } for staged file upload
let attachmentsTab      = 'link';

let pendingWeightChange = null; // { stepId, stepTitle, dealType, newWeight }

function addAttachmentLink(stepId, name, url) {
  const id = 'att_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  state.attachments.push({ id, stepId, type: 'link', name: name.trim() || url, url, createdAt: Date.now() });
  saveCurrentOpp();
}

function addAttachmentFile(stepId, name, url, fileType, size) {
  const id = 'att_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  state.attachments.push({ id, stepId, type: 'file', name, url, fileType, size, createdAt: Date.now() });
  saveCurrentOpp();
}

function removeAttachment(id) {
  state.attachments = state.attachments.filter(a => a.id !== id);
  saveCurrentOpp();
}

function openAttachmentsModal(stepId) {
  attachmentsStepId  = stepId;
  attachmentsPending = null;
  const stepTitle = getEffectiveStepById(stepId).title || stepId;
  document.getElementById('attachments-modal-step-name').textContent = stepTitle;
  setAttachmentsTab('link');
  document.getElementById('attachments-link-url').value  = '';
  document.getElementById('attachments-link-name').value = '';
  document.getElementById('attachments-link-error').classList.add('hidden');
  document.getElementById('attachments-file-input').value = '';
  document.getElementById('attachments-file-label').textContent = 'No file chosen';
  document.getElementById('attachments-file-error').classList.add('hidden');
  renderAttachmentsModal();
  document.getElementById('attachments-overlay').classList.remove('hidden');
}

function closeAttachmentsModal() {
  document.getElementById('attachments-overlay').classList.add('hidden');
  attachmentsStepId  = null;
  attachmentsPending = null;
}

function setAttachmentsTab(tab) {
  attachmentsTab = tab;
  document.querySelectorAll('.attachments-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('attachments-link-form').classList.toggle('hidden', tab !== 'link');
  document.getElementById('attachments-file-form').classList.toggle('hidden', tab !== 'file');
}

function getAttachmentIcon(a) {
  if (a.type === 'link') {
    return `<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M8 10a4 4 0 005.66 0l2-2a4 4 0 00-5.66-5.66l-1 1" stroke="#6366f1" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M10 8a4 4 0 00-5.66 0l-2 2a4 4 0 005.66 5.66l1-1" stroke="#6366f1" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`;
  }
  const ext    = (a.name || '').split('.').pop().toLowerCase();
  const colors = { pdf:'#ef4444', doc:'#3b82f6', docx:'#3b82f6', xls:'#22c55e', xlsx:'#22c55e', ppt:'#f97316', pptx:'#f97316', png:'#8b5cf6', jpg:'#8b5cf6', jpeg:'#8b5cf6', gif:'#8b5cf6' };
  const color  = colors[ext] || '#64748b';
  const label  = ext.toUpperCase().slice(0, 4);
  return `<div class="attachment-file-badge" style="background:${color}">${label}</div>`;
}

function formatFileSize(bytes) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderAttachmentsModal() {
  const list = document.getElementById('attachments-list');
  const mine = state.attachments.filter(a => a.stepId === attachmentsStepId);
  if (mine.length === 0) {
    list.innerHTML = '<p id="attachments-empty">No attachments yet.</p>';
    return;
  }
  list.innerHTML = mine.map(a => {
    const isFile   = a.type === 'file';
    const sizeStr  = isFile && a.size ? ` · ${formatFileSize(a.size)}` : '';
    const typeStr  = isFile ? 'File' : 'Link';
    const dlAttr   = isFile ? ` download="${escHtml(a.name)}"` : '';
    return `
      <div class="attachment-card">
        <div class="attachment-icon">${getAttachmentIcon(a)}</div>
        <div class="attachment-info">
          <a class="attachment-name" href="${escHtml(a.url)}" target="_blank" rel="noopener"${dlAttr}>${escHtml(a.name)}</a>
          <span class="attachment-meta">${typeStr}${sizeStr}</span>
        </div>
        <button class="attachment-delete-btn" data-delete-attachment="${a.id}" title="Remove">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>`;
  }).join('');
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

function stepStats(stage) {
  const steps        = effectiveSteps(stage);
  const used         = steps.filter(s => state.stepsUsed.has(s.id)).length;
  const total        = steps.length;
  const weightedTotal = steps.reduce((sum, s) => sum + getStepWeight(s.id), 0);
  const weightedUsed  = steps
    .filter(s => state.stepsUsed.has(s.id))
    .reduce((sum, s) => sum + getStepWeight(s.id), 0);
  return { total, used, weightedTotal, weightedUsed };
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
    state.added         = [];
    state.removed       = new Set();
    state.stepsUsed     = new Set();
    state.stepsAdded    = [];
    state.stepsRemoved  = new Set();
    state.comments      = [];
    state.cover         = { opportunityOwner: state.currentEmail };
    state.attachments   = [];
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
    const { total: sTotal, used: sUsed, weightedTotal, weightedUsed } = stepStats(s);
    const stepsComplete = sTotal > 0 && sUsed === sTotal;
    const pct = weightedTotal ? Math.round((weightedUsed / weightedTotal) * 100) : 0;
    return `
      <div class="stage-item ${s.id === state.activeStageId ? 'active' : ''} ${stepsComplete ? 'has-used' : ''}"
           style="--stage-color:${s.color}" data-stage="${s.id}">
        <div class="stage-item-row">
          <span class="stage-icon">${s.icon}</span>
          <span class="stage-name">${s.name}</span>
          <span class="stage-badge" style="color:${pctColor(pct)}">${pct > 0 ? pct + '%' : ''}</span>
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
    const { total, used, weightedTotal, weightedUsed } = stepStats(stage);
    const isWeighted = !!(state.cover?.dealType) && weightedTotal !== total;
    document.getElementById('stage-stats').textContent = isWeighted
      ? `${weightedUsed} of ${weightedTotal} points`
      : `${used} of ${total} steps completed`;
  } else {
    document.getElementById('stage-stats').textContent = '';
  }
}

// ── Render: Tabs ──────────────────────────────────────

function renderTabs(stage) {
  const condTabs = stage.conditions.map(c => {
    return `
      <div class="cond-tab ${c.id === state.activeCondId ? 'active' : ''}"
           style="--active-color:${stage.color}" data-cond="${c.id}">
        ${c.name} Prompts
      </div>`;
  }).join('');

  const { total: sTotal, used: sUsed, weightedTotal, weightedUsed } = stepStats(stage);
  const pct       = weightedTotal ? Math.round((weightedUsed / weightedTotal) * 100) : 0;
  const stepState = pct === 100 ? 'complete' : pct > 0 ? 'in-progress' : '';

  document.getElementById('condition-tabs').innerHTML = `
    <div class="cond-tab steps-tab ${state.activeCondId === '__steps__' ? 'active' : ''} ${stepState}"
         style="--active-color:${stage.color}" data-cond="__steps__">
      Steps
      <span class="steps-tab-pct" style="color:${pct > 0 ? pctColor(pct) : ''}">${pct}%</span>
    </div>
    <div class="steps-tab-divider"></div>` + condTabs;
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

  const isAdmin = state.role === 'admin';
  const cards = effectivePrompts(cond).map(p => {
    const ep      = getEffectivePrompt(p);
    const hasCopy = !isAdmin && !!ep.body;
    const cardCls = isAdmin ? 'prompt-editable' : hasCopy ? 'prompt-copyable' : '';
    const bodyEl  = ep.explanation
      ? `<div class="prompt-body has-content ql-content">${ep.explanation}</div>`
      : isAdmin
        ? `<div class="prompt-body prompt-no-desc">No description yet — click to edit.</div>`
        : '';
    return `
      <div class="prompt-card ${cardCls}" data-prompt="${p.id}">
        <div class="prompt-card-top">
          <span class="prompt-title">${escHtml(ep.title)}</span>
          ${hasCopy ? `
          <span class="prompt-copy-badge" title="Click to copy prompt to clipboard">
            <svg width="11" height="11" viewBox="0 0 13 13" fill="none">
              <rect x="4.5" y="1" width="7.5" height="9" rx="1.2" stroke="currentColor" stroke-width="1.3"/>
              <path d="M2.5 3.5H2A.75.75 0 001.25 4.25v7A.75.75 0 002 12h6.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            Copy
          </span>` : ''}
          ${isAdmin ? `
          <span class="prompt-edit-badge" title="Click to edit this prompt">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M8.5 1.5L10.5 3.5L3.5 10.5H1.5V8.5L8.5 1.5Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
            </svg>
            Edit
          </span>` : ''}
        </div>
        ${bodyEl}
        ${isAdmin ? `
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

  const steps    = effectiveSteps(stage);
  const dealType = state.cover?.dealType;
  const { used, total, weightedUsed, weightedTotal } = stepStats(stage);
  const isWeighted = !!dealType && weightedTotal !== total;
  const pct = weightedTotal ? Math.round((weightedUsed / weightedTotal) * 100) : 0;

  document.getElementById('steps-count-label').textContent     = isWeighted
    ? `${weightedUsed} of ${weightedTotal} points`
    : `${used} of ${total} steps completed`;
  document.getElementById('steps-pct-label').textContent       = `${pct}%`;
  document.getElementById('steps-pct-label').style.color       = pct > 0 ? pctColor(pct) : stage.color;
  document.getElementById('steps-progress-fill').style.cssText = `width:${pct}%;background:${stage.color}`;

  // Confirmation banner for pending weight change
  const wBanner = document.getElementById('steps-weight-banner');
  if (pendingWeightChange) {
    const dtName    = pendingWeightChange.dealType === 'new-logo' ? 'New Logo' : 'Expansion / Upsell / Renewal';
    const wLabel    = pendingWeightChange.newWeight === 1 ? '×1 (default)' : `×${pendingWeightChange.newWeight}`;
    wBanner.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style="flex-shrink:0">
        <path d="M7.5 1.5L13.5 12.5H1.5L7.5 1.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
        <path d="M7.5 5.5v3M7.5 10.5v.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
      <span>Set <strong>"${escHtml(pendingWeightChange.stepTitle)}"</strong> to <strong>${wLabel}</strong> for all <strong>${escHtml(dtName)}</strong> deals?</span>
      <div class="steps-weight-confirm-actions">
        <button id="steps-weight-cancel">Cancel</button>
        <button id="steps-weight-confirm">Apply to All</button>
      </div>`;
    wBanner.classList.remove('hidden');
  } else {
    wBanner.innerHTML = '';
    wBanner.classList.add('hidden');
  }

  // No-deal-type nudge (spans full grid width)
  const nudge = !dealType ? `
    <div class="steps-deal-type-nudge">
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style="flex-shrink:0">
        <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.4"/>
        <path d="M7 4v3.5M7 9.5v.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
      <span>Set a <strong>Deal Type</strong> on the Deal Overview to enable weighted step progress.</span>
      <button class="steps-goto-cover-btn">Deal Overview →</button>
    </div>` : '';

  const cards = steps.map(s => {
    const es           = getEffectiveStep(s);
    const done         = state.stepsUsed.has(s.id);
    const commentCount = state.comments.filter(c => c.stepId === s.id).length;
    const attachCount  = state.attachments.filter(a => a.stepId === s.id).length;
    const weight        = getStepWeight(s.id);
    const isPending     = pendingWeightChange?.stepId === s.id;
    const displayWeight = isPending ? pendingWeightChange.newWeight : weight;
    const showWeight    = !!dealType && (state.role === 'admin' || weight > 1 || isPending);
    const weightClass   = isPending ? 'is-pending' : (weight > 1 ? 'is-weighted' : '');
    return `
      <div class="prompt-card step-card ${done ? 'used' : ''}" data-step="${s.id}">
        <div class="prompt-card-top">
          <div class="prompt-check">
            <svg class="check-icon" viewBox="0 0 11 11" fill="none">
              <path d="M1.5 5.5L4.5 8.5L9.5 2.5" stroke="white" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <span class="prompt-title">${escHtml(es.title)}</span>
          ${commentCount > 0 ? `
          <span class="step-mini-badge" data-comments-step="${s.id}" title="${commentCount} comment${commentCount !== 1 ? 's' : ''}">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M10 1H2a1 1 0 00-1 1v6a1 1 0 001 1h2l2 2 2-2h2a1 1 0 001-1V2a1 1 0 00-1-1z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
            </svg>${commentCount}
          </span>` : ''}
          ${attachCount > 0 ? `
          <span class="step-mini-badge atch-badge" data-attachments-step="${s.id}" title="${attachCount} file${attachCount !== 1 ? 's' : ''}">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M10.5 5.5L5.5 10.5a3 3 0 01-4.24-4.25L7.09 .42a1.75 1.75 0 012.47 2.47L3.72 8.73a.5.5 0 01-.71-.7L8.84 2.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>${attachCount}
          </span>` : ''}
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
          <button class="step-attachments-btn ${attachCount > 0 ? 'has-attachments' : ''}" data-attachments-step="${s.id}">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M10.5 5.5L5.5 10.5a3 3 0 01-4.24-4.25L7.09 .42a1.75 1.75 0 012.47 2.47L3.72 8.73a.5.5 0 01-.71-.7L8.84 2.2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            ${attachCount > 0 ? `${attachCount} file${attachCount !== 1 ? 's' : ''}` : 'Attach'}
          </button>
          ${showWeight ? `
          <button class="step-weight-btn ${weightClass} ${state.role !== 'admin' ? 'read-only' : ''}"
                  ${state.role === 'admin' ? `data-weight-step="${s.id}"` : ''}
                  title="${state.role === 'admin' ? `Weight: ×${displayWeight} — click to change` : `Weight: ×${displayWeight}`}">
            ×${displayWeight}
          </button>` : ''}
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
  document.getElementById('steps-grid').innerHTML = nudge + cards + addBtn;
}

// ── Cover user-select (Sales Engineer / Additional Resource) ──

let openCoverSelect = null; // field name of currently open picker

function renderCoverUserSelect(containerId, field, users, currentValue) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const isOpen    = openCoverSelect === field;
  const current   = users.find(u => u === currentValue);
  const label     = current || '— None —';
  const isDefault = !current;

  const items = [
    { value: '', label: '— None —' },
    ...users.map(u => ({ value: u, label: u })),
  ];

  el.innerHTML = `
    <button class="cus-trigger ${isOpen ? 'open' : ''}" type="button" data-cus-toggle="${field}">
      <span class="cus-label ${isDefault ? 'cus-placeholder' : ''}">${escHtml(label)}</span>
      <svg class="cus-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5"
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <div class="cus-dropdown ${isOpen ? '' : 'hidden'}">
      <div class="cus-search-wrap">
        <svg class="cus-search-icon" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="5" cy="5" r="3.5" stroke="currentColor" stroke-width="1.4"/>
          <path d="M8 8l2.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
        <input class="cus-search-input" type="text" placeholder="Search…" autocomplete="off" />
      </div>
      <div class="cus-list">
        ${items.map(item => `
          <div class="cus-item ${item.value === currentValue ? 'active' : ''}"
               data-cus-value="${escHtml(item.value)}" data-cus-field="${field}">
            <svg class="cus-check-icon" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6L5 9L10 3" stroke="#6366f1" stroke-width="1.8"
                    stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>${escHtml(item.label)}</span>
          </div>`).join('')}
      </div>
    </div>`;

  if (isOpen) {
    const input = el.querySelector('.cus-search-input');
    setTimeout(() => input?.focus(), 0);
  }
}

// ── Render: Cover page ────────────────────────────────

function renderCover() {
  document.getElementById('stage-header').style.display  = 'none';
  document.getElementById('prompts-area').style.display  = 'none';
  document.getElementById('cover-view').style.display    = '';

  const opp = state.opps.find(o => o.id === state.activeOppId);
  document.getElementById('cover-opp-name').textContent = opp?.name || '—';
  document.getElementById('cover-delete-btn').classList.toggle('hidden', visibleOpps().length <= 1);

  const c = state.cover;
  document.getElementById('cover-opp-owner').value  = c.opportunityOwner || '';
  document.getElementById('cover-deal-type').value  = c.dealType         || '';
  document.getElementById('cover-company').value    = c.company          || '';
  document.getElementById('cover-contact').value    = c.contact          || '';
  document.getElementById('cover-deal-value').value = c.dealValue        || '';
  document.getElementById('cover-close-date').value = c.closeDate        || '';
  document.getElementById('cover-notes').value      = c.notes            || '';
  document.getElementById('cover-prep-doc').value   = c.prepDoc          || '';
  const prepDocLink = document.getElementById('cover-prep-doc-link');
  const prepDocVal  = c.prepDoc?.trim();
  if (prepDocVal) {
    prepDocLink.href = prepDocVal.startsWith('http') ? prepDocVal : 'https://' + prepDocVal;
    prepDocLink.classList.remove('hidden');
  } else {
    prepDocLink.classList.add('hidden');
  }

  const userEmails = state.users.map(u => u.email);
  renderCoverUserSelect('cover-sales-engineer',      'salesEngineer',      userEmails, c.salesEngineer      || '');
  renderCoverUserSelect('cover-additional-resource', 'additionalResource', userEmails, c.additionalResource || '');

  document.getElementById('cover-stages-grid').innerHTML = STAGES.map(s => {
    const { total: sTotal, used: sUsed, weightedTotal, weightedUsed } = stepStats(s);
    const pct = weightedTotal ? Math.round((weightedUsed / weightedTotal) * 100) : 0;
    return `
      <div class="cover-stage-card" data-nav-stage="${s.id}" style="--stage-color:${s.color}">
        <div class="cover-stage-header">
          <span class="cover-stage-icon">${s.icon}</span>
          <span class="cover-stage-name">${escHtml(s.name)}</span>
        </div>
        <div class="cover-stage-stats">${sUsed}/${sTotal} steps</div>
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

  const isOpp      = type === 'opportunity';
  const isStep     = type === 'step';
  const isStepEdit = type === 'step-edit';
  const stage  = (isStep || isStepEdit)
    ? STAGES.find(s => s.id === targetId) ||
      STAGES.find(s => effectiveSteps(s).some(x => x.id === targetId))
    : isOpp ? null
    : STAGES.find(s => s.conditions.some(c => c.id === targetId));
  const accent = stage?.color || '#6366f1';

  document.getElementById('modal-title').textContent       = isOpp ? 'New Opportunity' : isStepEdit ? 'Edit Step' : isStep ? 'Add Step' : 'Add Prompt';
  document.getElementById('modal-save').textContent        = isOpp ? 'Create' : isStepEdit ? 'Save Changes' : isStep ? 'Add Step' : 'Add Prompt';
  document.getElementById('modal-title-label').textContent = isOpp ? 'Name' : 'Title';
  document.getElementById('modal-body-label').textContent  = (isStep || isStepEdit) ? 'Description' : 'Prompt Text';
  document.getElementById('modal-input-title').placeholder = isOpp
    ? 'e.g. Acme Corp — Q3 2026'
    : (isStep || isStepEdit) ? 'e.g. Confirm attendees and roles' : 'e.g. ICP Fit Analysis';
  document.getElementById('modal-input-body').placeholder  = (isStep || isStepEdit)
    ? 'Optional details or instructions…'
    : 'Paste your LLM prompt here…';

  document.getElementById('modal-body-section').classList.toggle('hidden', isOpp);

  const isStepLike = isStep || isStepEdit;
  document.getElementById('modal-input-body').classList.toggle('hidden', isStepLike);
  document.getElementById('modal-step-body-editor').classList.toggle('hidden', !isStepLike);

  if (isStepEdit) {
    const es = getEffectiveStepById(targetId);
    document.getElementById('modal-input-title').value = es.title;
    if (es.body) stepBodyQuill.clipboard.dangerouslyPasteHTML(es.body);
    else stepBodyQuill.setContents([]);
  } else {
    document.getElementById('modal-input-title').value = '';
    if (isStepLike) stepBodyQuill.setContents([]);
    else document.getElementById('modal-input-body').value = '';
  }
  document.getElementById('modal-input-title').classList.remove('error');
  document.querySelector('.modal-error-msg')?.classList.remove('visible');

  [document.getElementById('modal-save'),
   document.getElementById('modal-input-title'),
   document.getElementById('modal-input-body')].forEach(el =>
     el.style.setProperty('--modal-accent', accent));

  document.getElementById('modal-step-warning').classList.toggle('hidden', type !== 'step-edit');
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('modal-input-title').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-step-warning').classList.add('hidden');
  modal = { type: null, targetId: null };
  stepBodyQuill.setContents([]);
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

  const isStepLike = modal.type === 'step' || modal.type === 'step-edit';
  const body = isStepLike
    ? quillToHtml(stepBodyQuill)
    : document.getElementById('modal-input-body').value.trim();

  if (modal.type === 'step-edit') {
    state.stepEdits[modal.targetId] = { title, body };
    saveStepEdits();
    closeModal();
    render();
    return;
  }
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
      if (found) { title = getEffectiveStep(found).title; break; }
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
    state.added = state.added.filter(p => p.id !== id);
  }

  saveCurrentOpp();
  closeDeleteModal();
  render();
}

// ── Card Detail Modal ─────────────────────────────────

let cardDetail = { type: null, id: null };

function openCardDetail(type, id) {
  cardDetail = { type, id };
  renderCardDetail();
  document.getElementById('card-detail-overlay').classList.remove('hidden');
}

function closeCardDetail() {
  document.getElementById('card-detail-overlay').classList.add('hidden');
  cardDetail = { type: null, id: null };
}

function renderCardDetail() {
  const { type, id } = cardDetail;
  if (!id) return;
  const isAdmin = state.role === 'admin';

  if (type === 'prompt') {
    const ep = getEffectivePromptById(id);

    // Header
    document.getElementById('card-detail-header').innerHTML =
      `<h2 class="cd-title">${escHtml(ep.title)}</h2>`;

    // Body
    let bodyHtml = '';
    if (ep.explanation) {
      bodyHtml += `<div class="cd-section">
        <div class="cd-section-label">Description</div>
        <div class="cd-desc ql-snow"><div class="ql-editor cd-ql-render">${ep.explanation}</div></div>
      </div>`;
    }
    if (ep.body) {
      bodyHtml += `<div class="cd-section">
        <div class="cd-section-label">Prompt Text</div>
        <div class="cd-prompt-text">${escHtml(ep.body)}</div>
      </div>`;
    }
    if (!ep.explanation && !ep.body) {
      bodyHtml = isAdmin
        ? `<p class="cd-empty">No description or prompt text yet — click <strong>Edit</strong> to add.</p>`
        : `<p class="cd-empty">No content added yet.</p>`;
    }
    document.getElementById('card-detail-body').innerHTML = bodyHtml;

    // Footer
    let footerHtml = '';
    if (ep.body) {
      footerHtml += `<button class="cd-btn primary" id="cd-copy-btn">
        <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
          <rect x="4.5" y="1" width="7.5" height="9" rx="1.2" stroke="currentColor" stroke-width="1.3"/>
          <path d="M2.5 3.5H2A.75.75 0 001.25 4.25v7A.75.75 0 002 12h6.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>Copy Prompt
      </button>`;
    }
    if (isAdmin) {
      footerHtml += `<span class="cd-spacer"></span>
        <button class="cd-btn" id="cd-edit-btn">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M8.5 1.5L10.5 3.5L3.5 10.5H1.5V8.5L8.5 1.5Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
          </svg>Edit
        </button>
        <button class="cd-btn danger" id="cd-delete-btn">Delete</button>`;
    }
    document.getElementById('card-detail-footer').innerHTML = footerHtml;

    document.getElementById('cd-copy-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(ep.body).catch(() => {});
      const btn = document.getElementById('cd-copy-btn');
      if (btn) {
        const orig = btn.innerHTML;
        btn.textContent = '✓ Copied!';
        setTimeout(() => { btn.innerHTML = orig; }, 1500);
      }
    });
    document.getElementById('cd-edit-btn')?.addEventListener('click', () => {
      closeCardDetail(); openPromptEditModal(id);
    });
    document.getElementById('cd-delete-btn')?.addEventListener('click', () => {
      closeCardDetail(); openDeleteModal('prompt', id);
    });

  } else if (type === 'step') {
    const es           = getEffectiveStepById(id);
    const done         = state.stepsUsed.has(id);
    const commentCount = state.comments.filter(c => c.stepId === id).length;
    const attachCount  = state.attachments.filter(a => a.stepId === id).length;
    const dealType     = state.cover?.dealType;
    const weight       = getStepWeight(id);
    const showWeight   = !!dealType && (isAdmin || weight > 1);

    // Header
    document.getElementById('card-detail-header').innerHTML = `
      <div class="cd-step-title-row">
        <div class="cd-check ${done ? 'done' : ''}" id="cd-step-check">
          <svg viewBox="0 0 11 11" fill="none" style="width:11px;height:11px">
            <path d="M1.5 5.5L4.5 8.5L9.5 2.5" stroke="white" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h2 class="cd-title">${escHtml(es.title)}</h2>
        ${done ? '<span class="cd-done-pill">✓ Done</span>' : ''}
      </div>`;

    // Body
    let bodyHtml = '';
    if (es.body) {
      bodyHtml += `<div class="cd-section">
        <div class="cd-section-label">Description</div>
        <div class="cd-desc ql-snow"><div class="ql-editor cd-ql-render">${es.body}</div></div>
      </div>`;
    }
    if (!es.body) {
      bodyHtml = isAdmin
        ? `<p class="cd-empty">No description yet — click <strong>Edit</strong> to add one.</p>`
        : `<p class="cd-empty">No description added.</p>`;
    }
    document.getElementById('card-detail-body').innerHTML = bodyHtml;

    // Footer
    const doneBtn = done
      ? `<button class="cd-btn muted-success" id="cd-done-btn">↩ Mark Undone</button>`
      : `<button class="cd-btn success" id="cd-done-btn">✓ Mark Done</button>`;
    const cmtCls  = commentCount > 0 ? 'active' : '';
    const attCls  = attachCount  > 0 ? 'active' : '';
    let footerHtml = doneBtn + `
      <button class="cd-btn ${cmtCls}" id="cd-comments-btn">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M10 1H2a1 1 0 00-1 1v6a1 1 0 001 1h2l2 2 2-2h2a1 1 0 001-1V2a1 1 0 00-1-1z"
                stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
        </svg>${commentCount > 0 ? `${commentCount} Comment${commentCount !== 1 ? 's' : ''}` : 'Comments'}
      </button>
      <button class="cd-btn ${attCls}" id="cd-attach-btn">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M10.5 5.5L5.5 10.5a3 3 0 01-4.24-4.25L7.09 .42a1.75 1.75 0 012.47 2.47L3.72 8.73a.5.5 0 01-.71-.7L8.84 2.2"
                stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>${attachCount > 0 ? `${attachCount} File${attachCount !== 1 ? 's' : ''}` : 'Attachments'}
      </button>
      ${showWeight ? `<span class="cd-weight-badge ${weight > 1 ? 'weighted' : ''}" title="Step weight">×${weight}</span>` : ''}`;
    if (isAdmin) {
      footerHtml += `<span class="cd-spacer"></span>
        <button class="cd-btn" id="cd-edit-btn">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M8.5 1.5L10.5 3.5L3.5 10.5H1.5V8.5L8.5 1.5Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
          </svg>Edit
        </button>
        <button class="cd-btn danger" id="cd-delete-btn">Delete</button>`;
    }
    document.getElementById('card-detail-footer').innerHTML = footerHtml;

    document.getElementById('cd-step-check').addEventListener('click', () => {
      if (state.stepsUsed.has(id)) state.stepsUsed.delete(id); else state.stepsUsed.add(id);
      saveCurrentOpp(); render(); renderCardDetail();
    });
    document.getElementById('cd-done-btn').addEventListener('click', () => {
      if (state.stepsUsed.has(id)) state.stepsUsed.delete(id); else state.stepsUsed.add(id);
      saveCurrentOpp(); render(); renderCardDetail();
    });
    document.getElementById('cd-comments-btn').addEventListener('click', () => {
      closeCardDetail(); openCommentsModal(id);
    });
    document.getElementById('cd-attach-btn').addEventListener('click', () => {
      closeCardDetail(); openAttachmentsModal(id);
    });
    document.getElementById('cd-edit-btn')?.addEventListener('click', () => {
      closeCardDetail(); openModal('step-edit', id);
    });
    document.getElementById('cd-delete-btn')?.addEventListener('click', () => {
      closeCardDetail(); openDeleteModal('step', id);
    });
  }
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
  pendingWeightChange = null;
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
  pendingWeightChange = null;
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

  if (state.role === 'admin') {
    openPromptEditModal(id);
    return;
  }

  // Standard user: copy body to clipboard, flash "Copied!"
  const ep = getEffectivePromptById(id);
  if (ep.body) {
    navigator.clipboard.writeText(ep.body).catch(() => {});
    const freshCard = document.querySelector(`[data-prompt="${id}"]`);
    if (freshCard) {
      freshCard.classList.add('prompt-copied');
      setTimeout(() => freshCard.classList.remove('prompt-copied'), 1300);
    }
  }
});

// Steps grid
document.getElementById('steps-grid').addEventListener('click', e => {
  // "Deal Overview →" nudge button
  if (e.target.closest('.steps-goto-cover-btn')) {
    state.activeStageId = '__cover__';
    render();
    return;
  }

  // Weight badge (admin only) — stage a pending change for confirmation
  const weightBtn = e.target.closest('[data-weight-step]');
  if (weightBtn && state.role === 'admin') {
    e.stopPropagation();
    const dealType = state.cover?.dealType;
    if (!dealType) return;
    const stepId  = weightBtn.dataset.weightStep;
    // If clicking the already-pending step, cycle the proposed weight further
    const base      = pendingWeightChange?.stepId === stepId
      ? pendingWeightChange.newWeight
      : getStepWeight(stepId);
    const newWeight = base >= 5 ? 1 : base + 1;
    // Find step title for the banner
    let stepTitle = stepId;
    const stage = STAGES.find(s => s.id === state.activeStageId);
    if (stage) {
      const found = effectiveSteps(stage).find(x => x.id === stepId);
      if (found) stepTitle = found.title;
    }
    pendingWeightChange = { stepId, stepTitle, dealType, newWeight };
    render();
    return;
  }

  const attachBtn = e.target.closest('[data-attachments-step]');
  if (attachBtn) { openAttachmentsModal(attachBtn.dataset.attachmentsStep); return; }

  const commentBtn = e.target.closest('[data-comments-step]');
  if (commentBtn) { openCommentsModal(commentBtn.dataset.commentsStep); return; }

  const editBtn = e.target.closest('[data-edit-step]');
  if (editBtn) { e.stopPropagation(); openModal('step-edit', editBtn.dataset.editStep); return; }

  const delBtn = e.target.closest('[data-delete-step]');
  if (delBtn) { e.stopPropagation(); openDeleteModal('step', delBtn.dataset.deleteStep); return; }

  const addBtn = e.target.closest('[data-add-step]');
  if (addBtn) { openModal('step', addBtn.dataset.addStep); return; }

  const card = e.target.closest('.prompt-card');
  if (!card || e.target.closest('.step-card-footer')) return;
  const id = card.dataset.step;
  if (e.target.closest('.prompt-check')) {
    if (state.stepsUsed.has(id)) state.stepsUsed.delete(id); else state.stepsUsed.add(id);
    saveCurrentOpp();
    render();
    return;
  }
  openCardDetail('step', id);
});

// Reset buttons
document.getElementById('reset-stage-btn').addEventListener('click', () => {
  const stage = STAGES.find(s => s.id === state.activeStageId);
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
  if (!confirm('Reset all step progress for this opportunity?')) return;
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
    // Keep the Prep Doc "Open" link in sync as user types
    if (field === 'prepDoc') {
      const prepDocLink = document.getElementById('cover-prep-doc-link');
      const val = e.target.value.trim();
      if (val) {
        prepDocLink.href = val.startsWith('http') ? val : 'https://' + val;
        prepDocLink.classList.remove('hidden');
      } else {
        prepDocLink.classList.add('hidden');
      }
    }
  });
});


// Cover user-select events (trigger, search, option selection)
document.getElementById('cover-view').addEventListener('click', e => {
  // Option click → save and close
  const item = e.target.closest('[data-cus-value]');
  if (item) {
    if (!state.cover) state.cover = {};
    state.cover[item.dataset.cusField] = item.dataset.cusValue;
    saveCurrentOpp();
    openCoverSelect = null;
    renderCover();
    return;
  }
  // Trigger click → toggle dropdown
  const trigger = e.target.closest('[data-cus-toggle]');
  if (trigger) {
    const field = trigger.dataset.cusToggle;
    openCoverSelect = openCoverSelect === field ? null : field;
    renderCover();
    return;
  }
  // Click outside → close
  if (openCoverSelect && !e.target.closest('.cover-user-select')) {
    openCoverSelect = null;
    renderCover();
  }
});

// Search input filters the list in-place
document.getElementById('cover-view').addEventListener('input', e => {
  if (!e.target.classList.contains('cus-search-input')) return;
  const q = e.target.value.toLowerCase();
  e.target.closest('.cus-dropdown')?.querySelectorAll('.cus-item').forEach(item => {
    item.style.display = item.textContent.trim().toLowerCase().includes(q) ? '' : 'none';
  });
});

document.getElementById('cover-delete-btn').addEventListener('click', () => {
  const opp = state.opps.find(o => o.id === state.activeOppId);
  if (!confirm(`Delete "${opp?.name || 'this deal'}"? This cannot be undone.`)) return;
  deleteOpp(state.activeOppId);
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

// Prompt edit modal
document.getElementById('prompt-edit-close').addEventListener('click', closePromptEditModal);
document.getElementById('prompt-edit-cancel').addEventListener('click', closePromptEditModal);
document.getElementById('prompt-edit-save').addEventListener('click', savePromptEdit);
document.getElementById('prompt-edit-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('prompt-edit-overlay')) closePromptEditModal();
});
document.getElementById('prompt-edit-name').addEventListener('input', () => {
  document.getElementById('prompt-edit-name').classList.remove('error');
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
  if (openCoverSelect) { openCoverSelect = null; renderCover(); return; }
  if (state.oppDropdownOpen) { state.oppDropdownOpen = false; renderOppSelector(); return; }
  if (!document.getElementById('card-detail-overlay').classList.contains('hidden')) { closeCardDetail(); return; }
  if (!document.getElementById('prompt-edit-overlay').classList.contains('hidden'))  { closePromptEditModal(); return; }
  if (!document.getElementById('attachments-overlay').classList.contains('hidden')) { closeAttachmentsModal(); return; }
  if (!document.getElementById('comments-overlay').classList.contains('hidden'))    { closeCommentsModal(); return; }
  if (!document.getElementById('users-overlay').classList.contains('hidden'))       { closeUsersModal(); return; }
  if (!document.getElementById('modal-overlay').classList.contains('hidden'))       closeModal();
  if (!document.getElementById('delete-overlay').classList.contains('hidden'))      closeDeleteModal();
});

// Card detail modal
document.getElementById('card-detail-close').addEventListener('click', closeCardDetail);
document.getElementById('card-detail-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('card-detail-overlay')) closeCardDetail();
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

// Weight confirmation banner
document.getElementById('steps-weight-banner').addEventListener('click', e => {
  if (e.target.closest('#steps-weight-confirm')) {
    if (pendingWeightChange) {
      setStepWeight(pendingWeightChange.dealType, pendingWeightChange.stepId, pendingWeightChange.newWeight);
      pendingWeightChange = null;
      render();
    }
    return;
  }
  if (e.target.closest('#steps-weight-cancel')) {
    pendingWeightChange = null;
    render();
  }
});

// ── Attachments modal events ──────────────────────────

document.getElementById('attachments-modal-close').addEventListener('click', closeAttachmentsModal);
document.getElementById('attachments-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('attachments-overlay')) closeAttachmentsModal();
});

document.getElementById('attachments-add-tabs').addEventListener('click', e => {
  const tab = e.target.closest('.attachments-tab');
  if (tab) setAttachmentsTab(tab.dataset.tab);
});

document.getElementById('attachments-list').addEventListener('click', e => {
  const btn = e.target.closest('[data-delete-attachment]');
  if (!btn) return;
  removeAttachment(btn.dataset.deleteAttachment);
  renderAttachmentsModal();
  render();
});

document.getElementById('attachments-link-add').addEventListener('click', () => {
  const urlEl  = document.getElementById('attachments-link-url');
  const nameEl = document.getElementById('attachments-link-name');
  const errEl  = document.getElementById('attachments-link-error');
  const url    = urlEl.value.trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    errEl.classList.remove('hidden');
    urlEl.focus();
    return;
  }
  errEl.classList.add('hidden');
  addAttachmentLink(attachmentsStepId, nameEl.value, url);
  urlEl.value = '';
  nameEl.value = '';
  renderAttachmentsModal();
  render();
});

document.getElementById('attachments-link-url').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('attachments-link-add').click();
});

document.getElementById('attachments-file-pick').addEventListener('click', () => {
  document.getElementById('attachments-file-input').click();
});

document.getElementById('attachments-file-input').addEventListener('change', e => {
  const file   = e.target.files[0];
  const errEl  = document.getElementById('attachments-file-error');
  const label  = document.getElementById('attachments-file-label');
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    errEl.textContent = 'File exceeds 2 MB. Use a link instead for larger files.';
    errEl.classList.remove('hidden');
    e.target.value = '';
    return;
  }
  errEl.classList.add('hidden');
  label.textContent = file.name;
  const reader = new FileReader();
  reader.onload = ev => {
    attachmentsPending = {
      name:     file.name,
      url:      ev.target.result,
      fileType: file.name.split('.').pop().toLowerCase(),
      size:     file.size,
    };
  };
  reader.readAsDataURL(file);
});

document.getElementById('attachments-file-add').addEventListener('click', () => {
  if (!attachmentsPending) return;
  addAttachmentFile(attachmentsStepId, attachmentsPending.name, attachmentsPending.url, attachmentsPending.fileType, attachmentsPending.size);
  attachmentsPending = null;
  document.getElementById('attachments-file-label').textContent = 'No file chosen';
  document.getElementById('attachments-file-input').value = '';
  renderAttachmentsModal();
  render();
});

// ── Quill rich text editor ────────────────────────────

const QUILL_TOOLBAR = [
  ['bold', 'italic', 'underline'],
  ['link'],
  [{ list: 'bullet' }, { list: 'ordered' }],
  ['clean'],
];

const stepBodyQuill = new Quill('#modal-step-body-editor', {
  theme: 'snow',
  placeholder: 'Optional description or instructions…',
  modules: { toolbar: QUILL_TOOLBAR },
});

const promptEditDescQuill = new Quill('#prompt-edit-desc-editor', {
  theme: 'snow',
  placeholder: 'Briefly explain the goal of this prompt so users know when to use it…',
  modules: { toolbar: QUILL_TOOLBAR },
});

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

function quillToHtml(q) {
  return q.getText().trim() ? q.root.innerHTML : '';
}

function pctColor(pct) {
  if (pct >= 81) return '#22c55e';
  if (pct >= 41) return '#f59e0b';
  return '#ef4444';
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── Init ──────────────────────────────────────────────

render();
if (!state.currentEmail) showEmailGate();
