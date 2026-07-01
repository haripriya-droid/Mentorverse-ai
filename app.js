/* MentorVerse AI · app.js
   Calls Gemini via our secure backend proxy (server.js on Render).
   No API key needed from users — key is stored privately on the server.
   All 8 agent features + chat + localStorage persistence.
*/

// ─────────────────────────────────────────
// BACKEND PROXY URL
// Change this to your Render deployment URL after deploying server.js
// ─────────────────────────────────────────
const BACKEND_URL = 'https://mentorverse-ai-backend.onrender.com';

// ─────────────────────────────────────────
// STATE
// ─────────────────────────────────────────
const state = {
  personality: 'Professional',
  outputs: {
    career_rec: '',
    skill_gap: '',
    roadmap: '',
    study_plan: '',
    project_rec: '',
    project_analysis: '',
    internship: '',
  },
  chatHistory: []
};

// ─────────────────────────────────────────
// PERSONALITY CONFIG
// ─────────────────────────────────────────
const PERSONALITY_DESCS = {
  'Professional': 'Clear, structured, and formal guidance tailored for direct learning.',
  'Motivational': 'Highly supportive and encouraging, focusing on progress and consistency.',
  'Gen Z': 'Relatable and modern style using gaming terminology and tech culture.',
  'Roast': 'Playful accountability and lighthearted teasing to keep you honest.'
};

const PERSONALITY_BADGES = {
  'Professional': '🎩 Professional Mentor',
  'Motivational': '💪 Motivational Mentor',
  'Gen Z': '🔥 Gen Z Mentor',
  'Roast': '😈 Roast Mentor'
};

const PERSONALITY_SUFFIX = {
  'Professional': `
You are a Professional Career Mentor. Communicate clearly, structured, and formally.
Avoid slang. Provide direct, actionable advice.
Example style: "Based on your goal, Data Structures should be your next learning priority."`,

  'Motivational': `
You are a Motivational Career Mentor. Be supportive, encouraging, and inspiring.
Focus on consistency, daily routines, and confidence building.
Example style: "You've completed the fundamentals. Consistency now will create long-term results."`,

  'Gen Z': `
You are a Gen Z Career Mentor. Use relatable, modern, casual language.
Use Gen Z slang, abbreviations, emojis, and gaming terms (XP boost, leveling up, slay, fr fr, no cap, W, L, cooking).
Example style: "Finished Python basics? That's a HUGE XP boost for your tech journey! 🎮"`,

  'Roast': `
You are a Roast Career Mentor. Use playful accountability and gentle humorous roasting.
You MUST remain respectful — no offensive language, no personal attacks.
Tease lightheartedly about common student failures (procrastination, watching tutorials without coding) while delivering high-value guidance.
Example style: "Three hours watching productivity videos. Ten minutes actually studying. Fascinating strategy."`
};

// ─────────────────────────────────────────
// AGENT SYSTEM INSTRUCTIONS
// ─────────────────────────────────────────
const INSTRUCTIONS = {
  career_rec: `You are the Career Recommendation Agent. Recommend a career path based on the user's interests, preferred technologies, learning background, and goals.
Your output MUST be in beautiful Markdown with:
### Recommended Career Path
### Career Overview
### Required Skills
### Career Opportunities`,

  skill_gap: `You are the Skill Gap Analysis Agent. Identify missing skills between the user's current knowledge and their target career.
Your output MUST be in beautiful Markdown with:
### Existing Skills
### Missing Skills
### Priority Learning Order`,

  roadmap: `You are the Master Roadmap Agent (highest priority). Generate a complete, structured, end-to-end learning roadmap.
For every learning stage include: Topic Name, Why It Matters, Learning Objectives, Recommended Resources, Practice Tasks, Mini Project, Estimated Duration.
Output in beautiful Markdown with clear stage headings (Stage 1, Stage 2, etc.).`,

  study_planner: `You are the Study Planner Agent. Convert a roadmap into a practical study plan.
Output in beautiful Markdown with:
### Monthly Plan
### Weekly Plan
### Daily Learning Tasks`,

  project_rec: `You are the Project Recommendation Agent. Suggest at least 3 portfolio-worthy projects of increasing difficulty.
For each project include: Project Name, Description, Difficulty Level, Required Skills & Tech Stack, Key Learning Outcomes, Portfolio Value.
Output in beautiful Markdown.`,

  project_analyzer: `You are the Project Analyzer Agent. Review the user's project idea and give constructive technical feedback.
Output in beautiful Markdown with:
### Strengths
### Weaknesses & Pitfalls
### Missing Features
### Suggested Improvements & Tech Stack
### Resume Impact`,

  internship: `You are the Internship Recommendation Agent. Assess the student's readiness and guide them toward their first internship.
Output in beautiful Markdown with:
### Internship Readiness Score (0–100%)
### Missing Requirements
### Recommended Improvements
### Suggested Internship Types`,

  chat: `You are a Career Coach Mentor. Have a friendly, interactive, and helpful career guidance conversation with the student.
Keep responses concise but insightful. Follow up with questions when appropriate.`
};

// ─────────────────────────────────────────
// LOCALSTORAGE — PERSISTENCE
// ─────────────────────────────────────────
const LS_KEY = 'mentorverse_v1';

function saveToStorage() {
  const i = getInputsRaw();
  const data = {
    personality: state.personality,
    outputs: state.outputs,
    profile: i
  };
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch (e) { /* quota exceeded — silently ignore */ }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);

    // Restore personality
    if (data.personality && PERSONALITY_DESCS[data.personality]) {
      state.personality = data.personality;
      document.querySelectorAll('.mpick').forEach(b => b.classList.remove('active'));
      const activeBtn = document.querySelector(`.mpick[data-personality="${data.personality}"]`);
      if (activeBtn) activeBtn.classList.add('active');
      document.getElementById('mentor-desc').textContent = PERSONALITY_DESCS[data.personality];
      document.getElementById('active-badge').textContent = PERSONALITY_BADGES[data.personality];
    }

    // Restore profile inputs
    if (data.profile) {
      const fields = ['career-goal', 'career-interests', 'pref-tech', 'background', 'current-skills', 'hours', 'exp-level'];
      const keys = ['goal', 'interests', 'tech', 'background', 'skills', 'hours', 'exp'];
      fields.forEach((id, idx) => {
        const el = document.getElementById(id);
        if (el && data.profile[keys[idx]] !== undefined) el.value = data.profile[keys[idx]];
      });
    }

    // Restore outputs
    if (data.outputs) {
      Object.assign(state.outputs, data.outputs);
      restoreOutputs();
    }
  } catch (e) { /* corrupt data — silently ignore */ }
}

function restoreOutputs() {
  const map = {
    career_rec: 'career-rec-out',
    skill_gap: 'skill-gap-out',
    roadmap: 'roadmap-out',
    study_plan: 'study-plan-out',
    project_rec: 'project-rec-out',
    project_analysis: 'project-analysis-out',
    internship: 'internship-out',
  };
  let hasCareer = false;
  let hasRoadmap = false;

  Object.entries(map).forEach(([key, elId]) => {
    const text = state.outputs[key];
    const el = document.getElementById(elId);
    if (text && el) {
      el.innerHTML = renderMarkdown(text);
      if (key === 'career_rec' || key === 'skill_gap') hasCareer = true;
      if (key === 'roadmap' || key === 'study_plan') hasRoadmap = true;
    }
  });

  if (hasCareer) {
    document.getElementById('career-output').style.display = 'grid';
    document.getElementById('career-empty').style.display = 'none';
  }
  if (hasRoadmap) {
    document.getElementById('roadmap-output').style.display = 'grid';
    document.getElementById('roadmap-empty').style.display = 'none';
  }

  updateReportStatus();
}

// Auto-save profile inputs on change
function bindAutoSave() {
  const ids = ['career-goal', 'career-interests', 'pref-tech', 'background', 'current-skills', 'hours', 'exp-level'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        saveToStorage();
        updateProfileBanners();
      });
      el.addEventListener('change', () => {
        saveToStorage();
        updateProfileBanners();
      });
    }
  });
}

// ─────────────────────────────────────────
// INPUT VALIDATION — PROFILE BANNERS
// ─────────────────────────────────────────
function isProfileSet() {
  const goal = document.getElementById('career-goal').value.trim();
  return goal.length > 0;
}

function updateProfileBanners() {
  const incomplete = !isProfileSet();
  document.querySelectorAll('.profile-banner').forEach(el => {
    el.style.display = incomplete ? 'flex' : 'none';
  });
  // Highlight the setup nav if incomplete
  const setupBtn = document.getElementById('snav-setup');
  if (setupBtn) {
    setupBtn.classList.toggle('snav-warn', incomplete && !document.getElementById('tab-setup').classList.contains('active'));
  }
}

function requireProfile() {
  if (isProfileSet()) return true;
  showToast('⚠️ Please fill in your Career Goal in Profile Setup first.', 'error');
  // Flash the setup nav button
  const btn = document.getElementById('snav-setup');
  if (btn) {
    btn.classList.add('snav-flash');
    setTimeout(() => btn.classList.remove('snav-flash'), 1000);
  }
  return false;
}

// ─────────────────────────────────────────
// GEMINI API CALL (via secure backend proxy)
// ─────────────────────────────────────────
async function callGemini(systemInstruction, userMessage) {
  const personalitySuffix = PERSONALITY_SUFFIX[state.personality];
  const fullInstruction = systemInstruction + '\n\n' + personalitySuffix;

  try {
    const res = await fetch(`${BACKEND_URL}/api/gemini`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction: fullInstruction, userMessage })
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(`❌ ${data?.error || 'Server error'}`, 'error');
      return null;
    }

    return data.text || '';
  } catch (e) {
    showToast(`❌ Cannot reach server. Please try again.`, 'error');
    return null;
  }
}

// ─────────────────────────────────────────
// GEMINI CHAT (multi-turn, via backend proxy)
// ─────────────────────────────────────────
async function callGeminiChat(conversationHistory) {
  const goal   = document.getElementById('career-goal').value.trim();
  const skills = document.getElementById('current-skills').value.trim();
  const tech   = document.getElementById('pref-tech').value.trim();

  const systemInstruction = INSTRUCTIONS.chat +
    (goal   ? `\nStudent's career goal: ${goal}.`   : '') +
    (skills ? `\nCurrent skills: ${skills}.`         : '') +
    (tech   ? `\nPreferred tech: ${tech}.`           : '') +
    '\n\n' + PERSONALITY_SUFFIX[state.personality];

  try {
    const res = await fetch(`${BACKEND_URL}/api/gemini/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction, conversationHistory })
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(`❌ ${data?.error || 'Server error'}`, 'error');
      return null;
    }

    return data.text || '';
  } catch (e) {
    showToast(`❌ Cannot reach server. Please try again.`, 'error');
    return null;
  }
}

// ─────────────────────────────────────────
// HELPERS: Get Inputs
// ─────────────────────────────────────────
function getInputsRaw() {
  return {
    goal: document.getElementById('career-goal').value.trim(),
    interests: document.getElementById('career-interests').value.trim(),
    tech: document.getElementById('pref-tech').value.trim(),
    background: document.getElementById('background').value.trim(),
    skills: document.getElementById('current-skills').value.trim(),
    hours: document.getElementById('hours').value,
    exp: document.getElementById('exp-level').value
  };
}
// Alias for backward compat
const getInputs = getInputsRaw;

// ─────────────────────────────────────────
// MARKDOWN RENDERER — Fixed & Robust
// ─────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return '';

  // 1. Extract and protect code blocks
  const codeBlocks = [];
  text = text.replace(/```[\s\S]*?```/g, m => {
    const inner = m.replace(/^```\w*\n?/, '').replace(/```$/, '');
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre><code>${escapeHtml(inner)}</code></pre>`);
    return `\x00CODE${idx}\x00`;
  });

  // 2. Process line by line
  const lines = text.split('\n');
  const output = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block placeholder
    if (/^\x00CODE\d+\x00$/.test(line.trim())) {
      const idx = parseInt(line.match(/\x00CODE(\d+)\x00/)[1]);
      output.push(codeBlocks[idx]);
      i++;
      continue;
    }

    // Headings
    if (/^#{1,4} /.test(line)) {
      const m = line.match(/^(#{1,4}) (.+)/);
      const lvl = m[1].length;
      output.push(`<h${lvl}>${inlineMarkdown(m[2])}</h${lvl}>`);
      i++;
      continue;
    }

    // HR
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      output.push('<hr>');
      i++;
      continue;
    }

    // Blockquote
    if (/^> /.test(line)) {
      let bqLines = [];
      while (i < lines.length && /^> /.test(lines[i])) {
        bqLines.push(lines[i].replace(/^> /, ''));
        i++;
      }
      output.push(`<blockquote>${inlineMarkdown(bqLines.join('<br>'))}</blockquote>`);
      continue;
    }

    // Unordered list
    if (/^(\s*)([-*+]) /.test(line)) {
      const listItems = [];
      while (i < lines.length && /^(\s*)([-*+]) /.test(lines[i])) {
        const m = lines[i].match(/^(\s*)([-*+]) (.+)/);
        const indent = m ? m[1].length : 0;
        listItems.push({ indent, text: m ? m[3] : '' });
        i++;
      }
      output.push(buildList(listItems, false));
      continue;
    }

    // Ordered list
    if (/^\d+\. /.test(line)) {
      const listItems = [];
      while (i < lines.length && /^(\s*)\d+\. /.test(lines[i])) {
        const m = lines[i].match(/^(\s*)\d+\. (.+)/);
        const indent = m ? m[1].length : 0;
        listItems.push({ indent, text: m ? m[2] : '' });
        i++;
      }
      output.push(buildList(listItems, true));
      continue;
    }

    // Empty line — paragraph break
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Regular paragraph — collect consecutive non-empty, non-special lines
    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,4} /.test(lines[i]) &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim()) &&
      !/^> /.test(lines[i]) &&
      !/^(\s*)([-*+]) /.test(lines[i]) &&
      !/^\d+\. /.test(lines[i]) &&
      !/^\x00CODE\d+\x00$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      output.push(`<p>${inlineMarkdown(paraLines.join('<br>'))}</p>`);
    }
  }

  return output.join('\n');
}

function buildList(items, ordered) {
  const tag = ordered ? 'ol' : 'ul';
  let html = `<${tag}>`;
  for (const item of items) {
    html += `<li>${inlineMarkdown(item.text)}</li>`;
  }
  html += `</${tag}>`;
  return html;
}

function inlineMarkdown(text) {
  return text
    // Inline code (before other replacements)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold + Italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

// ─────────────────────────────────────────
// SPINNER
// ─────────────────────────────────────────
function showSpinner(msg = 'Generating…') {
  document.getElementById('spinner-msg').textContent = msg;
  document.getElementById('spinner-overlay').style.display = 'flex';
}
function hideSpinner() {
  document.getElementById('spinner-overlay').style.display = 'none';
}

// ─────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────
function showToast(message, type = 'info') {
  let toast = document.getElementById('__toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = '__toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast toast-${type}`;
  requestAnimationFrame(() => toast.classList.add('show'));
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ─────────────────────────────────────────
// UPDATE REPORT DOWNLOAD STATUS
// ─────────────────────────────────────────
function updateReportStatus() {
  const has = Object.values(state.outputs).some(v => v);
  const btn = document.getElementById('download-btn');
  const statusDiv = document.getElementById('report-status');
  if (has) {
    btn.disabled = false;
    const count = Object.values(state.outputs).filter(v => v).length;
    statusDiv.innerHTML = `<span class="report-has-data">✅ ${count} section(s) ready to download.</span>`;
  } else {
    btn.disabled = true;
    statusDiv.innerHTML = `<span class="report-hint">⚠️ Generate content in other tabs first.</span>`;
  }
}

// ─────────────────────────────────────────
// AGENT RUNNERS
// ─────────────────────────────────────────

// 1 & 2: Career Rec + Skill Gap
async function runCareerAnalysis() {
  if (!requireProfile()) return;
  const i = getInputs();

  showSpinner('Analyzing your career path…');
  document.getElementById('career-output').style.display = 'none';
  document.getElementById('career-empty').style.display = 'none';

  const careerPrompt = `Recommend a career path for: Career Goal: ${i.goal}. Interests: ${i.interests}. Preferred Tech: ${i.tech}. Background: ${i.background}. Experience: ${i.exp}.`;
  const careerResult = await callGemini(INSTRUCTIONS.career_rec, careerPrompt);

  showSpinner('Calculating your skill gaps…');

  const gapPrompt = `Compare current skills: "${i.skills}" with target career goal: "${i.goal}". Experience level: ${i.exp}. Analyze gaps and recommend priority learning order.`;
  const gapResult = await callGemini(INSTRUCTIONS.skill_gap, gapPrompt);

  hideSpinner();

  if (careerResult || gapResult) {
    state.outputs.career_rec = careerResult || '';
    state.outputs.skill_gap = gapResult || '';
    document.getElementById('career-rec-out').innerHTML = renderMarkdown(careerResult || 'No result returned.');
    document.getElementById('skill-gap-out').innerHTML = renderMarkdown(gapResult || 'No result returned.');
    document.getElementById('career-output').style.display = 'grid';
    updateReportStatus();
    saveToStorage();
    showToast('✅ Career analysis complete!', 'success');
  } else {
    document.getElementById('career-empty').style.display = 'block';
    document.getElementById('career-empty').innerHTML = '<span>❌ Failed to generate. Check your API key and try again.</span>';
  }
}

// 3 & 4: Roadmap + Study Plan
async function runRoadmap() {
  if (!requireProfile()) return;
  const i = getInputs();

  showSpinner('Drafting your Master Roadmap…');
  document.getElementById('roadmap-output').style.display = 'none';
  document.getElementById('roadmap-empty').style.display = 'none';

  const roadmapPrompt = `Create a complete end-to-end roadmap for career goal: "${i.goal}". Current experience: ${i.exp}. Current skills: "${i.skills}". Include all stages with: Topic, Why It Matters, Learning Objectives, Resources, Practice Tasks, Mini Project, Duration.`;
  const roadmapResult = await callGemini(INSTRUCTIONS.roadmap, roadmapPrompt);

  showSpinner('Building your Study Plan…');

  const planPrompt = `Create a monthly, weekly, and daily study plan for career goal: "${i.goal}". Student can study ${i.hours} hours/day. Experience level: ${i.exp}. Current skills: "${i.skills}".`;
  const planResult = await callGemini(INSTRUCTIONS.study_planner, planPrompt);

  hideSpinner();

  if (roadmapResult || planResult) {
    state.outputs.roadmap = roadmapResult || '';
    state.outputs.study_plan = planResult || '';
    document.getElementById('roadmap-out').innerHTML = renderMarkdown(roadmapResult || 'No result.');
    document.getElementById('study-plan-out').innerHTML = renderMarkdown(planResult || 'No result.');
    document.getElementById('roadmap-output').style.display = 'grid';
    updateReportStatus();
    saveToStorage();
    showToast('✅ Roadmap & Study Plan ready!', 'success');
  } else {
    document.getElementById('roadmap-empty').style.display = 'block';
    document.getElementById('roadmap-empty').innerHTML = '<span>❌ Failed. Check your API key.</span>';
  }
}

// 5: Project Recommendations
async function runProjects() {
  if (!requireProfile()) return;
  const i = getInputs();

  showSpinner('Finding the perfect projects for you…');
  const prompt = `Recommend at least 3 projects for career: "${i.goal}". Current skills: "${i.skills}". Experience: ${i.exp}. Make them portfolio-worthy with increasing difficulty.`;
  const result = await callGemini(INSTRUCTIONS.project_rec, prompt);
  hideSpinner();

  if (result) {
    state.outputs.project_rec = result;
    document.getElementById('project-rec-out').innerHTML = renderMarkdown(result);
    updateReportStatus();
    saveToStorage();
    showToast('✅ Project ideas generated!', 'success');
  } else {
    document.getElementById('project-rec-out').innerHTML = '<p style="color:var(--red)">❌ Failed. Check your API key.</p>';
  }
}

// 6: Project Analyzer
async function runProjectAnalyzer() {
  const desc = document.getElementById('proj-desc').value.trim();
  const goal = document.getElementById('proj-goal').value.trim();
  if (!desc) { showToast('⚠️ Please describe your project idea.', 'error'); return; }

  showSpinner('Analyzing your project idea…');
  const prompt = `Analyze this project: Description: "${desc}". Goals/Tech Stack: "${goal}". Give detailed constructive feedback.`;
  const result = await callGemini(INSTRUCTIONS.project_analyzer, prompt);
  hideSpinner();

  if (result) {
    state.outputs.project_analysis = result;
    document.getElementById('project-analysis-out').innerHTML = renderMarkdown(result);
    updateReportStatus();
    saveToStorage();
    showToast('✅ Project analysis complete!', 'success');
  } else {
    document.getElementById('project-analysis-out').innerHTML = '<p style="color:var(--red)">❌ Failed. Check your API key.</p>';
  }
}

// 7: Internship
async function runInternship() {
  if (!requireProfile()) return;
  const i = getInputs();
  const projects = document.getElementById('projects-completed').value.trim();

  showSpinner('Evaluating your internship readiness…');
  const prompt = `Evaluate internship readiness for career goal: "${i.goal}". Current skills: "${i.skills}". Completed/planned projects: "${projects}". Experience level: ${i.exp}.`;
  const result = await callGemini(INSTRUCTIONS.internship, prompt);
  hideSpinner();

  if (result) {
    state.outputs.internship = result;
    document.getElementById('internship-out').innerHTML = renderMarkdown(result);
    updateReportStatus();
    saveToStorage();
    showToast('✅ Internship readiness evaluated!', 'success');
  } else {
    document.getElementById('internship-out').innerHTML = '<p style="color:var(--red)">❌ Failed. Check your API key.</p>';
  }
}

// 8: Chat
async function sendChat() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  // Disable input while waiting
  input.value = '';
  input.disabled = true;
  const sendBtn = document.getElementById('chat-send');
  if (sendBtn) sendBtn.disabled = true;

  const messagesEl = document.getElementById('chat-messages');

  // Clear welcome message on first message
  const welcome = messagesEl.querySelector('.chat-welcome');
  if (welcome) welcome.remove();

  // Add user message
  state.chatHistory.push({ role: 'user', parts: [{ text }] });
  const userDiv = document.createElement('div');
  userDiv.className = 'chat-msg chat-msg--user';
  userDiv.innerHTML = `<div class="chat-bubble">${escapeHtml(text)}</div>`;
  messagesEl.appendChild(userDiv);

  // Typing indicator
  const typingDiv = document.createElement('div');
  typingDiv.className = 'chat-msg chat-msg--bot';
  typingDiv.id = 'typing-indicator';
  typingDiv.innerHTML = `
    <div class="chat-bot-name">${PERSONALITY_BADGES[state.personality]}</div>
    <div class="chat-bubble">
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>`;
  messagesEl.appendChild(typingDiv);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  const result = await callGeminiChat(state.chatHistory);

  // Remove typing indicator
  document.getElementById('typing-indicator')?.remove();

  if (result) {
    state.chatHistory.push({ role: 'model', parts: [{ text: result }] });
    const botDiv = document.createElement('div');
    botDiv.className = 'chat-msg chat-msg--bot';
    botDiv.innerHTML = `
      <div class="chat-bot-name">${PERSONALITY_BADGES[state.personality]}</div>
      <div class="chat-bubble">${renderMarkdown(result)}</div>`;
    messagesEl.appendChild(botDiv);
  } else {
    const errDiv = document.createElement('div');
    errDiv.className = 'chat-msg chat-msg--bot';
    errDiv.innerHTML = `<div class="chat-bubble" style="color:var(--red)">❌ Failed to get response. Check your API key.</div>`;
    messagesEl.appendChild(errDiv);
  }

  messagesEl.scrollTop = messagesEl.scrollHeight;

  // Re-enable input
  input.disabled = false;
  if (sendBtn) sendBtn.disabled = false;
  input.focus();
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────
// DOWNLOAD REPORT
// ─────────────────────────────────────────
function downloadReport() {
  const i = getInputs();
  const lines = [];
  lines.push('# MentorVerse AI — Career Mentorship Report');
  lines.push('');
  lines.push(`**Mentor Personality:** ${state.personality} Mentor`);
  lines.push(`**Target Career Goal:** ${i.goal}`);
  lines.push('');
  lines.push('---');

  const sections = [
    ['career_rec', '## 1. Career Recommendation'],
    ['skill_gap', '## 2. Skill Gap Analysis'],
    ['roadmap', '## 3. Master Learning Roadmap'],
    ['study_plan', '## 4. Detailed Study Plan'],
    ['project_rec', '## 5. Recommended Projects'],
    ['project_analysis', '## 6. Custom Project Feedback'],
    ['internship', '## 7. Internship Readiness Analysis'],
  ];

  sections.forEach(([key, heading]) => {
    if (state.outputs[key]) {
      lines.push('');
      lines.push(heading);
      lines.push('');
      lines.push(state.outputs[key]);
      lines.push('');
      lines.push('---');
    }
  });

  lines.push('');
  lines.push('*Generated by MentorVerse AI — "Learn smarter. Build faster. Grow with a mentor that speaks your language."*');

  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'MentorVerse_AI_Career_Plan.md';
  a.click();
  URL.revokeObjectURL(url);
  showToast('📥 Report downloaded!', 'success');

  // Show preview
  const preview = document.getElementById('report-preview');
  preview.textContent = content.slice(0, 600) + '\n\n...[truncated]';
  preview.style.display = 'block';
}

// ─────────────────────────────────────────
// TAB SWITCHING
// ─────────────────────────────────────────
function switchTab(tabName) {
  document.querySelectorAll('.tab-panel').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.snav').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${tabName}`)?.classList.add('active');
  document.getElementById(`snav-${tabName}`)?.classList.add('active');
  // Close mobile sidebar if open
  closeMobileSidebar();
  updateProfileBanners();
}

document.querySelectorAll('.snav').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ─────────────────────────────────────────
// MENTOR PERSONALITY
// ─────────────────────────────────────────
document.querySelectorAll('.mpick').forEach(btn => {
  btn.addEventListener('click', () => {
    const p = btn.dataset.personality;
    state.personality = p;
    state.chatHistory = []; // Reset chat on personality change

    document.querySelectorAll('.mpick').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.getElementById('mentor-desc').textContent = PERSONALITY_DESCS[p];
    document.getElementById('active-badge').textContent = PERSONALITY_BADGES[p];

    saveToStorage();
    showToast(`Switched to ${PERSONALITY_BADGES[p]}`, 'info');
  });
});

// ─────────────────────────────────────────
// MOBILE SIDEBAR
// ─────────────────────────────────────────
function openMobileSidebar() {
  document.getElementById('sidebar').classList.add('sidebar--open');
  document.getElementById('sidebar-backdrop').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('sidebar--open');
  document.getElementById('sidebar-backdrop').classList.remove('active');
  document.body.style.overflow = '';
}

const menuToggle = document.getElementById('menu-toggle');
if (menuToggle) {
  menuToggle.addEventListener('click', () => {
    const isOpen = document.getElementById('sidebar').classList.contains('sidebar--open');
    isOpen ? closeMobileSidebar() : openMobileSidebar();
  });
}

const backdrop = document.getElementById('sidebar-backdrop');
if (backdrop) {
  backdrop.addEventListener('click', closeMobileSidebar);
}

// ─────────────────────────────────────────
// RESET
// ─────────────────────────────────────────
document.getElementById('reset-btn').addEventListener('click', () => {
  if (!confirm('Reset all generated content? This cannot be undone.')) return;

  Object.keys(state.outputs).forEach(k => state.outputs[k] = '');
  state.chatHistory = [];

  // Clear outputs
  ['career-rec-out', 'skill-gap-out', 'roadmap-out', 'study-plan-out',
    'project-rec-out', 'project-analysis-out', 'internship-out', 'chat-messages'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = id === 'chat-messages' ? `
      <div class="chat-welcome">
        <div class="welcome-icon">💬</div>
        <h3>Your mentor is ready!</h3>
        <p>Ask anything about your career path, skills, projects, or internships.</p>
      </div>` : '';
    });

  document.getElementById('career-output').style.display = 'none';
  document.getElementById('career-empty').style.display = 'block';
  document.getElementById('career-empty').innerHTML = '<span>⚡ Click the button above to generate your career analysis.</span>';

  document.getElementById('roadmap-output').style.display = 'none';
  document.getElementById('roadmap-empty').style.display = 'block';
  document.getElementById('roadmap-empty').innerHTML = '<span>⚡ Click the button above to generate your roadmap.</span>';

  document.getElementById('report-preview').style.display = 'none';
  updateReportStatus();

  // Also clear localStorage outputs (keep profile)
  saveToStorage();

  showToast('🔄 Reset complete.', 'info');
});

// ─────────────────────────────────────────
// CHAT: Enter key to send
// ─────────────────────────────────────────
document.getElementById('chat-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
});

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
bindAutoSave();
loadFromStorage();
updateProfileBanners();
updateReportStatus();

// Entry animation
document.body.classList.add('app-ready');

console.log('%c MentorVerse AI 🚀', 'color: #8b5cf6; font-size: 20px; font-weight: 900;');
console.log('%c All 8 agents active. Persistence enabled.', 'color: #22d3ee; font-size: 13px;');
