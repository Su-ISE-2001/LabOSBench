const CHART_COLORS = {
  primary: 'rgba(37, 99, 235, 0.75)',
  secondary: 'rgba(8, 145, 178, 0.75)',
  human: 'rgba(124, 58, 237, 0.75)',
  success: 'rgba(22, 163, 74, 0.75)',
  warning: 'rgba(217, 119, 6, 0.75)',
  danger: 'rgba(220, 38, 38, 0.75)',
  grid: 'rgba(100, 116, 139, 0.15)',
  text: '#64748b',
};

const TYPE_LABELS = {
  human: 'human',
  closed: 'closed',
  open: 'open',
  framework: 'agent',
};

const FOUNDATION_TYPES = new Set(['closed', 'open']);
const AGENTIC_TYPES = new Set(['framework']);

/** Resolve asset paths for GitHub Pages (project site) and local http.server */
function asset(path) {
  return new URL(path, window.location.href).href;
}

function fmtPlain(val) {
  if (val === null || val === undefined) return '—';
  return Number(val).toFixed(1);
}

function fmtOrg(val) {
  if (val === null || val === undefined || val === '') {
    return '<span class="org-cell placeholder-field">TBD</span>';
  }
  return `<span class="org-cell" title="${val}">${val}</span>`;
}

async function loadData() {
  const resp = await fetch(asset('data/results.json'));
  if (!resp.ok) throw new Error(`Failed to load results.json: ${resp.status}`);
  return resp.json();
}

function renderHeader(data) {
  const p = data.paper;
  document.getElementById('paper-title').textContent = data.brand || p.title.split(':')[0].trim();
  document.getElementById('paper-subtitle').textContent = p.subtitle || p.title.split(':').slice(1).join(':').trim();
  document.getElementById('paper-abstract').textContent = p.abstract;

  const authorsEl = document.getElementById('paper-authors');
  if (p.authors_list && p.affiliations) {
    const authorHtml = p.authors_list.map(a => {
      const affIds = a.affiliations.join(',');
      const aff = a.corresponding
        ? `<sup><span class="corr-mark">†</span>,${affIds}</sup>`
        : `<sup>${affIds}</sup>`;
      const name = a.bold ? `<strong>${a.name}</strong>` : a.name;
      return `<span class="author-item">${name}${aff}</span>`;
    }).join(', ');

    const affHtml = p.affiliations.map(af =>
      `<div class="aff-item"><sup>${af.id}</sup> ${af.name}</div>`
    ).join('');

    const emailHtml = p.emails?.length
      ? `<div class="author-emails">${p.emails.map(e => `<a href="mailto:${e}">${e}</a>`).join(' · ')}</div>`
      : '';

    authorsEl.innerHTML = `
      <p class="authors-line">${authorHtml}</p>
      <div class="affiliations">${affHtml}</div>
      ${emailHtml}
    `;
  } else if (p.authors) {
    authorsEl.innerHTML = `<p class="authors-line">${p.authors}</p>`;
  }

  const links = document.getElementById('paper-links');
  links.innerHTML = '';
  if (p.paper_pdf) links.innerHTML += `<a href="${asset(p.paper_pdf)}" target="_blank" rel="noopener">📄 PDF</a>`;
  if (p.arxiv) links.innerHTML += `<a href="${p.arxiv}" target="_blank" rel="noopener">📄 arXiv</a>`;
  if (p.github) links.innerHTML += `<a href="${p.github}" target="_blank" rel="noopener">🔗 Code</a>`;
}

function renderStats(data) {
  const s = data.summary;
  const cards = [
    { label: 'Subtasks', value: s.total_tasks, suffix: '', cls: 'neutral' },
    { label: 'Instruments', value: s.total_instruments, suffix: '', cls: 'neutral' },
    { label: 'Human (Subtask)', value: s.human_success_rate, suffix: '%', cls: 'human' },
    { label: 'Best Foundation', value: s.best_foundation_rate, suffix: '%', cls: 'agent', sub: s.best_foundation_name },
    { label: 'Best Agentic', value: s.best_agentic_rate, suffix: '%', cls: 'warning', sub: s.best_agentic_name },
    { label: 'E2E GPT-5.5', value: s.end_to_end_gpt55, suffix: '%', cls: 'warning', sub: 'end-to-end avg.' },
  ];

  document.getElementById('stats-grid').innerHTML = cards.map(c => {
    const valHtml = c.value != null
      ? `<div class="value ${c.cls}">${c.value}${c.suffix}</div>`
      : `<div class="value placeholder">—</div>`;
    const subHtml = c.sub ? `<div class="sub">${c.sub}</div>` : '';
    return `<div class="stat-card"><div class="label">${c.label}</div>${valHtml}${subHtml}</div>`;
  }).join('');
}

function buildLeaderboardRow(row, rank, isTop) {
  const instCols = ['sem', 'spm', 'tem', 'xrd', 'lfm', 'fib', 'apt', 'eds'];
  const typeCls = TYPE_LABELS[row.type] || row.type;
  const typeTag = row.type ? `<span class="type-tag ${typeCls}">${row.type}</span>` : '';
  const avgCls = isTop ? 'best' : '';
  const rowCls = [row.highlight ? 'highlight' : '', isTop ? 'top-row' : ''].filter(Boolean).join(' ');

  const cells = instCols.map(k => {
    const v = row[k];
    return `<td>${v != null ? fmtPlain(v) : '<span class="na">—</span>'}</td>`;
  }).join('');

  return `<tr class="${rowCls}">
    <td class="rank">${rank}</td>
    <td class="agent-name">${row.agent}${typeTag}</td>
    <td>${fmtOrg(row.school)}</td>
    <td>${fmtOrg(row.organization)}</td>
    <td class="${avgCls}">${fmtPlain(row.overall)}</td>
    ${cells}
  </tr>`;
}

function sortAndRank(rows) {
  return [...rows]
    .sort((a, b) => b.overall - a.overall)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

function renderLeaderboardTable(tableId, rows) {
  const ranked = sortAndRank(rows);
  const tbody = document.querySelector(`#${tableId} tbody`);
  tbody.innerHTML = ranked.map((row, i) => buildLeaderboardRow(row, row.rank, i === 0)).join('');
}

function renderBaseline(data) {
  const human = data.leaderboard.find(r => r.type === 'human');
  if (!human) return;

  document.getElementById('baseline-strip').innerHTML = `
    <span>Reference baseline</span>
    <strong>${human.agent}</strong>
    <span class="baseline-score">${fmtPlain(human.overall)}%</span>
    <span>(excluded from ranking)</span>
  `;
}

function setupLeaderboardTabs() {
  const tabs = document.querySelectorAll('.lb-tab');
  const sections = {
    foundation: document.getElementById('lb-foundation'),
    agentic: document.getElementById('lb-agentic'),
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach(t => {
        t.classList.toggle('active', t === tab);
        t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      });
      Object.entries(sections).forEach(([key, el]) => {
        const active = key === target;
        el.classList.toggle('active', active);
        el.hidden = !active;
      });
    });
  });
}

function renderLeaderboards(data) {
  const foundation = data.leaderboard.filter(r => FOUNDATION_TYPES.has(r.type));
  const agentic = data.leaderboard.filter(r => AGENTIC_TYPES.has(r.type));

  renderLeaderboardTable('leaderboard-foundation', foundation);
  renderLeaderboardTable('leaderboard-agentic', agentic);
  renderBaseline(data);
  setupLeaderboardTabs();
}

function renderInstrumentGrid(data) {
  document.getElementById('instrument-grid').innerHTML = data.instruments.map(inst => `
    <div class="instrument-card">
      <div class="inst-header">
        <span class="inst-name">${inst.name}</span>
        <span class="inst-subtasks">${inst.subtasks} subtasks</span>
      </div>
      <div class="inst-full">${inst.full_name}</div>
      <div class="inst-goal">Goal: ${inst.goal}</div>
      <div class="inst-rates">
        <div><span class="lbl">Human</span><span class="val human">${fmtPlain(inst.human_rate)}%</span></div>
        <div><span class="lbl">Best Agent</span><span class="val agent">${fmtPlain(inst.best_agent_rate)}%</span></div>
      </div>
      <div class="inst-best">${inst.best_agent}</div>
    </div>
  `).join('');
}

function renderCategoryCards(data) {
  document.getElementById('category-cards').innerHTML = data.task_categories.map(cat => `
    <div class="category-card">
      <h3>${cat.name_en || cat.name}</h3>
      <p>${cat.description}</p>
      <div class="metrics">
        <div class="metric">
          <div class="num">${cat.avg_success != null ? cat.avg_success + '%' : '—'}</div>
          <div class="lbl">Best Rate</div>
        </div>
        <div class="metric">
          <div class="num inst-best-name">${cat.best_model ?? '—'}</div>
          <div class="lbl">Best Model</div>
        </div>
      </div>
    </div>
  `).join('');
}

function renderFindings(data) {
  const list = document.getElementById('findings-list');
  if (data.findings) {
    list.innerHTML = data.findings.map(f => `<li>${f}</li>`).join('');
  }

  document.getElementById('error-grid').innerHTML = data.error_analysis.map(err => `
    <div class="error-item">
      <h4>${err.category}</h4>
      <p>${err.description}</p>
    </div>
  `).join('');
}

function renderE2E(data) {
  const e2e = data.end_to_end;
  if (!e2e) return;

  document.getElementById('e2e-summary').innerHTML = `
    <div class="e2e-stat">
      <div class="e2e-val">${e2e.average_success}%</div>
      <div class="e2e-lbl">${e2e.model} · end-to-end average</div>
    </div>
    <div class="e2e-stat secondary">
      <div class="e2e-val">${e2e.runs_per_workflow}</div>
      <div class="e2e-lbl">runs per workflow</div>
    </div>
    <p class="e2e-note">${e2e.note}</p>
  `;

  const tbody = document.querySelector('#e2e-table tbody');
  tbody.innerHTML = e2e.by_instrument.map(i => {
    const ok = i.success_rate > 0;
    const status = ok ? 'Success' : 'All failed';
    const statusCls = ok ? 'status-ok' : 'status-fail';
    return `<tr>
      <td class="e2e-inst">${i.instrument}</td>
      <td class="e2e-rate ${ok ? 'rate-ok' : 'rate-fail'}">${fmtPlain(i.success_rate)}%</td>
      <td><span class="e2e-status ${statusCls}">${status}</span></td>
    </tr>`;
  }).join('');
}

function renderComparison(data) {
  const c = data.comparison_with_osworld;
  const container = document.getElementById('comparison-bars');

  const bars = [
    { label: 'OSWorld Human Baseline', value: c.osworld_rate, cls: 'osworld' },
    { label: 'LabOSBench Best Agent (Subtask)', value: c.labosbench_best_subtask, cls: 'labosbench' },
    { label: 'LabOSBench GPT-5.5 (End-to-End)', value: c.labosbench_end_to_end, cls: 'e2e' },
  ];

  container.innerHTML = bars.map(b => `
    <div class="comparison-bar">
      <label><span>${b.label}</span><span>${b.value}%</span></label>
      <div class="bar-track"><div class="bar-fill ${b.cls}" style="width:${b.value}%">${b.value}%</div></div>
    </div>
  `).join('') + (c.note ? `<p class="comparison-note">${c.note}</p>` : '');
}

function chartDefaults() {
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { labels: { color: CHART_COLORS.text, font: { family: 'Inter' } } },
    },
    scales: {
      x: { ticks: { color: CHART_COLORS.text, maxRotation: 45 }, grid: { color: CHART_COLORS.grid } },
      y: {
        ticks: { color: CHART_COLORS.text, callback: v => v + '%' },
        grid: { color: CHART_COLORS.grid },
        min: 0,
        max: 100,
      },
    },
  };
}

function renderCategoryChart(data) {
  const top = data.category_leaderboard.slice(0, 5);
  const cats = ['preparation', 'activation', 'configuration', 'execution', 'postprocessing'];
  const catLabels = ['Preparation', 'Activation', 'Configuration', 'Execution', 'Post-processing'];

  const datasets = top.map((row, i) => {
    const colors = [CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.human];
    return {
      label: row.model,
      data: cats.map(c => row[c]),
      backgroundColor: colors[i],
      borderRadius: 4,
    };
  });

  new Chart(document.getElementById('category-chart'), {
    type: 'bar',
    data: { labels: catLabels, datasets },
    options: { ...chartDefaults(), scales: { ...chartDefaults().scales, x: { stacked: false, ticks: { color: CHART_COLORS.text }, grid: { color: CHART_COLORS.grid } } } },
  });
}

function renderInstrumentChart(data) {
  new Chart(document.getElementById('instrument-chart'), {
    type: 'bar',
    data: {
      labels: data.instruments.map(i => i.name),
      datasets: [
        { label: 'Human Expert', data: data.instruments.map(i => i.human_rate), backgroundColor: CHART_COLORS.human, borderRadius: 6 },
        { label: 'Best Agent', data: data.instruments.map(i => i.best_agent_rate), backgroundColor: CHART_COLORS.secondary, borderRadius: 6 },
      ],
    },
    options: chartDefaults(),
  });
}

async function init() {
  try {
    const data = await loadData();
    renderHeader(data);
    renderStats(data);
    renderLeaderboards(data);
    renderInstrumentGrid(data);
    renderCategoryCards(data);
    renderFindings(data);
    renderE2E(data);
    renderComparison(data);
    renderCategoryChart(data);
    renderInstrumentChart(data);
  } catch (err) {
    document.querySelector('main').innerHTML = `
      <div class="panel" style="margin-top:40px;text-align:center;padding:48px;">
        <h2 style="margin-bottom:12px;color:var(--warning);">Failed to load data</h2>
        <p style="color:var(--text-muted);">${err.message}</p>
        <p style="color:var(--text-muted);margin-top:12px;font-size:0.85rem;">
          Serve over HTTP (local: <code style="background:var(--surface-2);padding:2px 8px;border-radius:4px;">cd web && python -m http.server 8765</code>;
          live: <a href="https://su-ise-2001.github.io/LABOSBENCH/" style="color:var(--primary);">GitHub Pages</a>)
        </p>
      </div>`;
  }
}

init();
