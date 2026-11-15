// Interactive architecture explorer (tabs, search, status filter, node details, request trace) and small page helpers.
(function () {
  const A = window.ARCH;
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const index = {};
  A.sections.forEach((sec) => sec.groups.forEach((g) => g.nodes.forEach((n) => { index[n.id] = { ...n, section: sec.id, group: g }; })));

  const tabs = $('#arch-tabs'), canvas = $('#arch-canvas'), panel = $('#arch-panel'), intro = $('#arch-intro');
  const search = $('#arch-search'), traceBar = $('#trace-bar'), extra = $('#arch-extra');
  let current = A.sections[0].id, selected = null, filter = 'all', traceStep = -1, timer = null;

  function renderTabs() {
    tabs.innerHTML = '';
    A.sections.forEach((s) => {
      const b = el('button', '', esc(s.label));
      b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(s.id === current));
      b.onclick = () => { stopTrace(); current = s.id; selected = null; render(); };
      tabs.appendChild(b);
    });
  }

  function nodeButton(n) {
    const b = el('button', `node k-${n.kind}`);
    b.dataset.id = n.id; b.dataset.status = n.status;
    b.innerHTML = `<span class="sd" title="${A.status[n.status]}"></span><span class="nt">${esc(n.t)}</span><span class="ns">${esc(n.s)}</span>`;
    b.setAttribute('aria-label', `${n.t}: ${A.status[n.status]}`);
    b.onclick = () => select(n.id);
    return b;
  }

  function render() {
    renderTabs();
    const sec = A.sections.find((s) => s.id === current);
    intro.innerHTML = `<h3>${esc(sec.title)}</h3><p>${esc(sec.intro)}</p>`;
    canvas.innerHTML = '';
    const grid = el('div', `arch-grid ${sec.layout}`);
    sec.groups.forEach((g) => {
      const box = el('div', 'group' + (g.nodes.length > 3 && g.area !== 'ui' ? ' wide' : ''));
      if (g.area) box.style.gridArea = g.area;
      box.appendChild(el('h4', '', `<b>${esc(g.n)}</b>${esc(g.title)}`));
      const list = el('div', 'nodes');
      g.nodes.forEach((n) => list.appendChild(nodeButton({ ...n })));
      box.appendChild(list); grid.appendChild(box);
    });
    canvas.appendChild(grid);
    traceBar.hidden = !sec.trace;
    renderExtra(sec);
    applyFilters(); renderPanel();
  }

  function renderExtra(sec) {
    extra.innerHTML = '';
    if (!sec.threats) { extra.hidden = true; return; }
    extra.hidden = false;
    const t = el('div', 'card');
    t.innerHTML = `<h3>C5 · Threat matrix</h3><div class="table-wrap"><table><thead><tr><th>Threat</th><th>Mitigation</th><th>Where</th></tr></thead><tbody>${
      sec.threats.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</tbody></table></div>`;
    const p = el('div', 'card');
    p.innerHTML = `<h3>C6 · Security by phase</h3><div class="phases">${sec.phases.map((r) => `<div class="phase"><b>${esc(r[0])}</b><span>${esc(r[1])}</span></div>`).join('')}</div>`;
    extra.append(t, p);
  }

  function applyFilters() {
    const q = search.value.trim().toLowerCase();
    canvas.querySelectorAll('.node').forEach((b) => {
      const n = index[b.dataset.id];
      const okQ = !q || `${n.t} ${n.s} ${n.d} ${n.p} ${n.v}`.toLowerCase().includes(q);
      const okS = filter === 'all' || n.status === filter;
      b.classList.toggle('dim', !(okQ && okS));
    });
  }

  function select(id, fromTrace) {
    if (!fromTrace) stopTrace();
    const n = index[id];
    if (!n) return;
    if (n.section !== current) { current = n.section; render(); }
    selected = id;
    canvas.querySelectorAll('.node').forEach((b) => {
      b.classList.toggle('selected', b.dataset.id === id);
      b.classList.toggle('linked', (n.to || []).includes(b.dataset.id));
    });
    renderPanel();
    if (!fromTrace && window.innerWidth <= 1100) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function renderPanel() {
    if (!selected || !index[selected]) {
      panel.innerHTML = `<div class="k">Explore</div><h3>Click any box</h3><p class="empty">Each box opens what it does, how the hackathon prototype implements it today, and where it goes in production. Use <b>Trace a request</b> to follow one question end to end.</p>
        <h5>Colour key</h5><p>${Object.entries(A.kinds).map(([k, v]) => `<span class="swatch" style="border-color:var(--${k});background:var(--${k}-bg)"></span>${esc(v)}`).join('<br>')}</p>
        <h5>Status</h5><p><span class="chip live">In the prototype</span> <span class="chip partial">Partly built</span> <span class="chip planned">Planned</span></p>`;
      return;
    }
    const n = index[selected];
    const links = (n.to || []).filter((x) => index[x]);
    const back = Object.values(index).filter((m) => (m.to || []).includes(n.id));
    const btns = (arr) => arr.map((m) => `<button data-go="${m.id || m}">${esc((index[m.id || m] || m).t)}</button>`).join('');
    panel.innerHTML = `<div class="k">${esc(n.group.n)} · ${esc(n.group.title)}</div><h3>${esc(n.t)}</h3><div class="sub">${esc(n.s)}</div>
      <div class="kind-row"><span class="kind-tag">${esc(A.kinds[n.kind])}</span><span class="chip ${n.status}">${esc(A.status[n.status])}</span></div>
      <h5>What it does</h5><p>${esc(n.d)}</p>
      <h5>In the prototype</h5><p>${esc(n.p)}</p>
      <h5>In production</h5><p>${esc(n.v)}</p>
      ${links.length ? `<h5>Leads to</h5><div class="links">${btns(links)}</div>` : ''}
      ${back.length ? `<h5>Comes from</h5><div class="links">${btns(back)}</div>` : ''}`;
    panel.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => select(b.dataset.go)));
  }

  // Request trace through the core flow.
  const coreTrace = A.sections.find((s) => s.trace).trace;
  const cap = $('#trace-cap'), prog = $('#trace-progress div'), playBtn = $('#trace-play');
  function showStep(i) {
    traceStep = Math.max(0, Math.min(coreTrace.length - 1, i));
    if (current !== 'core') { current = 'core'; render(); }
    const [id, text] = coreTrace[traceStep];
    canvas.querySelectorAll('.node').forEach((b) => {
      const pos = coreTrace.findIndex((s) => s[0] === b.dataset.id);
      b.classList.toggle('tracing', b.dataset.id === id);
      b.classList.toggle('visited', pos > -1 && pos < traceStep);
    });
    cap.innerHTML = `<small>Step ${traceStep + 1} / ${coreTrace.length}</small>${esc(text)}`;
    prog.style.width = `${((traceStep + 1) / coreTrace.length) * 100}%`;
    select(id, true);
  }
  function stopTrace() { clearInterval(timer); timer = null; playBtn.textContent = '▶ Trace a request'; }
  function clearTrace() { stopTrace(); traceStep = -1; canvas.querySelectorAll('.node').forEach((b) => b.classList.remove('tracing', 'visited')); cap.innerHTML = 'Follow one student question from the chat box to a verified, cited answer.'; prog.style.width = '0'; }
  playBtn.onclick = () => {
    if (timer) { stopTrace(); return; }
    if (traceStep >= coreTrace.length - 1) traceStep = -1;
    playBtn.textContent = '❚❚ Pause';
    showStep(traceStep + 1);
    timer = setInterval(() => { if (traceStep >= coreTrace.length - 1) { stopTrace(); return; } showStep(traceStep + 1); }, 2400);
  };
  $('#trace-prev').onclick = () => { stopTrace(); showStep(traceStep - 1); };
  $('#trace-next').onclick = () => { stopTrace(); showStep(traceStep + 1); };
  $('#trace-reset').onclick = () => { clearTrace(); selected = null; renderPanel(); canvas.querySelectorAll('.node').forEach((b) => b.classList.remove('selected', 'linked')); };

  search.addEventListener('input', applyFilters);
  document.querySelectorAll('#arch-filter button').forEach((b) => (b.onclick = () => {
    filter = b.dataset.f; document.querySelectorAll('#arch-filter button').forEach((x) => x.classList.toggle('on', x === b)); applyFilters();
  }));

  render(); clearTrace();

  // Page helpers: mobile menu, video chapters, year.
  const toggle = $('.menu-toggle'), links = $('.nav-links');
  if (toggle) toggle.onclick = () => links.classList.toggle('open');
  links.querySelectorAll('a').forEach((a) => (a.onclick = () => links.classList.remove('open')));
  const video = $('#demo-video');
  document.querySelectorAll('[data-seek]').forEach((b) => (b.onclick = () => { video.currentTime = Number(b.dataset.seek); video.play(); }));
})();
