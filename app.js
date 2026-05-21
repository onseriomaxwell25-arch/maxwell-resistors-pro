/* =============================================
   ResCalc Pro — app.js
   Unlimited resistors · Series · Parallel · Mixed
   ============================================= */
'use strict';

// ── State ────────────────────────────────────────────────────────────────────
let networkMode = 'series';   // 'series' | 'parallel' | 'mixed'
let simpleCount = 0;          // counter for simple mode IDs
let groupCounter = 0;         // counter for group IDs
let groups = [];              // mixed mode: [{id, resistors:[{id,val}]}]
let zoomScale = 1;

// ── Init ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  simpleAdd(100);
  simpleAdd(220);
  simpleAdd(470);
  calculate();
});

// ── Network Mode ─────────────────────────────────────────────────────────────
function setNetworkMode(m) {
  networkMode = m;
  ['series','parallel','mixed'].forEach(x => {
    document.getElementById('btn-' + x).classList.toggle('active', x === m);
  });
  document.getElementById('simple-builder').style.display = (m !== 'mixed') ? '' : 'none';
  document.getElementById('mixed-builder').style.display  = (m === 'mixed') ? '' : 'none';

  if (m === 'mixed' && groups.length === 0) {
    addGroup(); addGroup();
  }
  calculate();
}

// ══════════════════════════════════════════════════════════════════════════════
// SIMPLE MODE  (series / parallel — flat list, unlimited)
// ══════════════════════════════════════════════════════════════════════════════
function simpleAdd(value = 100) {
  simpleCount++;
  const id = 's' + simpleCount;
  const row = document.createElement('div');
  row.className = 'r-row';
  row.id = 'row-' + id;
  row.innerHTML = `
    <span class="r-label">R${simpleCount}</span>
    <div class="input-unit">
      <input type="number" id="${id}" value="${value}" min="0.001" step="1" oninput="calculate()"/>
      <span class="unit">Ω</span>
    </div>
    <button class="icon-btn danger" onclick="simpleRemoveById('${id}')" title="Remove">✕</button>`;
  document.getElementById('simple-list').appendChild(row);
  relabelSimple();
  calculate();
}

function simpleRemoveById(id) {
  const row = document.getElementById('row-' + id);
  if (row) row.remove();
  relabelSimple();
  calculate();
}

function simpleRemove() {
  const list = document.getElementById('simple-list');
  const rows = list.querySelectorAll('.r-row');
  if (rows.length <= 1) return;
  rows[rows.length - 1].remove();
  relabelSimple();
  calculate();
}

function relabelSimple() {
  const rows = document.querySelectorAll('#simple-list .r-row');
  rows.forEach((row, i) => row.querySelector('.r-label').textContent = 'R' + (i + 1));
}

function getSimpleResistors() {
  const vals = [];
  document.querySelectorAll('#simple-list .r-row').forEach((row, i) => {
    const inp = row.querySelector('input[type=number]');
    const v = parseFloat(inp.value);
    vals.push({ label: 'R' + (i + 1), val: (isNaN(v) || v <= 0) ? 1 : v });
  });
  return vals;
}

// ══════════════════════════════════════════════════════════════════════════════
// MIXED MODE  (groups in parallel, each group's resistors in series)
// ══════════════════════════════════════════════════════════════════════════════
function addGroup(defaultVals = [100, 220]) {
  groupCounter++;
  const gid = 'g' + groupCounter;
  const group = { id: gid, rCount: 0, rIds: [] };
  groups.push(group);
  renderGroups();
  defaultVals.forEach(v => addGroupResistor(gid, v));
}

function removeGroup(gid) {
  if (groups.length <= 1) return;
  groups = groups.filter(g => g.id !== gid);
  renderGroups();
  calculate();
}

function addGroupResistor(gid, value = 100) {
  const g = groups.find(x => x.id === gid);
  if (!g) return;
  g.rCount++;
  const rid = gid + '_r' + g.rCount;
  g.rIds.push(rid);

  const row = document.createElement('div');
  row.className = 'r-row';
  row.id = 'row-' + rid;
  row.innerHTML = `
    <span class="r-label" id="lbl-${rid}"></span>
    <div class="input-unit">
      <input type="number" id="${rid}" value="${value}" min="0.001" step="1" oninput="calculate()"/>
      <span class="unit">Ω</span>
    </div>
    <button class="icon-btn danger" onclick="removeGroupResistor('${gid}','${rid}')" title="Remove">✕</button>`;
  const list = document.getElementById('glist-' + gid);
  if (list) list.appendChild(row);
  relabelGroup(gid);
  calculate();
}

function removeGroupResistor(gid, rid) {
  const g = groups.find(x => x.id === gid);
  if (!g || g.rIds.length <= 1) return;
  g.rIds = g.rIds.filter(id => id !== rid);
  const row = document.getElementById('row-' + rid);
  if (row) row.remove();
  relabelGroup(gid);
  calculate();
}

function relabelGroup(gid) {
  const g = groups.find(x => x.id === gid);
  if (!g) return;
  const gi = groups.indexOf(g);
  g.rIds.forEach((rid, ri) => {
    const lbl = document.getElementById('lbl-' + rid);
    if (lbl) lbl.textContent = 'G' + (gi + 1) + 'R' + (ri + 1);
  });
}

function renderGroups() {
  const container = document.getElementById('groups-container');
  // remove cards for deleted groups
  container.querySelectorAll('.group-card').forEach(card => {
    if (!groups.find(g => g.id === card.dataset.gid)) card.remove();
  });
  groups.forEach((g, gi) => {
    let card = container.querySelector('[data-gid="' + g.id + '"]');
    if (!card) {
      card = document.createElement('div');
      card.className = 'group-card';
      card.dataset.gid = g.id;
      card.innerHTML = `
        <div class="group-header">
          <span class="group-title">GROUP ${gi + 1} — Series branch</span>
          <div class="group-actions">
            <button class="icon-btn" onclick="addGroupResistor('${g.id}')" title="Add resistor to group">＋</button>
            <button class="icon-btn danger" onclick="removeGroup('${g.id}')" title="Remove group">✕</button>
          </div>
        </div>
        <div class="group-list" id="glist-${g.id}"></div>`;
      container.appendChild(card);
    } else {
      // update title in case index changed
      card.querySelector('.group-title').textContent = 'GROUP ' + (gi + 1) + ' — Series branch';
    }
  });
}

function getMixedNetwork() {
  // Returns array of groups; each group is array of {label, val}
  return groups.map((g, gi) => {
    return g.rIds.map((rid, ri) => {
      const inp = document.getElementById(rid);
      const v = inp ? parseFloat(inp.value) : 100;
      return { label: 'G' + (gi + 1) + 'R' + (ri + 1), val: (isNaN(v) || v <= 0) ? 1 : v };
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// CALCULATION ENGINE
// ══════════════════════════════════════════════════════════════════════════════
function calculate() {
  const voltage = parseFloat(document.getElementById('voltage').value) || 9;

  let totalR, rows = [];   // rows = [{label, val, vDrop, current, power}]

  if (networkMode === 'series') {
    const rs = getSimpleResistors();
    if (!rs.length) return;
    totalR = rs.reduce((a, r) => a + r.val, 0);
    const I = voltage / totalR;
    rows = rs.map(r => ({ label: r.label, val: r.val, vDrop: I * r.val, current: I, power: I * I * r.val }));
  }
  else if (networkMode === 'parallel') {
    const rs = getSimpleResistors();
    if (!rs.length) return;
    totalR = 1 / rs.reduce((a, r) => a + 1 / r.val, 0);
    rows = rs.map(r => {
      const I = voltage / r.val;
      return { label: r.label, val: r.val, vDrop: voltage, current: I, power: voltage * I };
    });
  }
  else {
    // Mixed: groups in parallel; each group is series
    const net = getMixedNetwork();
    if (!net.length) return;
    const groupRs = net.map(g => g.reduce((a, r) => a + r.val, 0));
    totalR = 1 / groupRs.reduce((a, r) => a + 1 / r, 0);
    net.forEach((g, gi) => {
      const gR = groupRs[gi];
      const gI = voltage / gR;
      g.forEach(r => {
        rows.push({ label: r.label, val: r.val, vDrop: gI * r.val, current: gI, power: gI * gI * r.val, group: gi });
      });
    });
  }

  const totalI = voltage / totalR;
  const totalP = voltage * totalI;

  // ── Cards ─────────────────────────────────────────────────────────────────
  setResult('val-total-r', fmt(totalR), 'card-total-r');
  setResult('val-current',  fmt(totalI), 'card-current');
  setResult('val-power',    fmt(totalP), 'card-power');

  // ── Table ─────────────────────────────────────────────────────────────────
  const tbody = document.getElementById('individual-body');
  tbody.innerHTML = '';
  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.label}</td><td>${fmt(r.val)}</td><td>${fmt(r.vDrop)}</td><td>${fmt(r.current)}</td><td>${fmt(r.power)}</td>`;
    tbody.appendChild(tr);
  });
  document.getElementById('individual-table-wrap').style.display = 'block';

  // ── Bulb ──────────────────────────────────────────────────────────────────
  const minR = rows.length ? Math.min(...rows.map(r => r.val)) : 1;
  const maxP  = (voltage * voltage) / minR;
  updateBulb(Math.min(totalP / maxP, 1), totalP);

  // ── Diagram ───────────────────────────────────────────────────────────────
  drawCircuit(rows, voltage, totalR, totalI, totalP);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n) {
  if (n === undefined || n === null || isNaN(n)) return '?';
  const a = Math.abs(n);
  if (a >= 1e6)  return (n / 1e6).toFixed(3).replace(/\.?0+$/, '') + 'M';
  if (a >= 1e3)  return (n / 1e3).toFixed(3).replace(/\.?0+$/, '') + 'k';
  if (a >= 1)    return parseFloat(n.toFixed(4)).toString();
  if (a >= 1e-3) return parseFloat((n * 1e3).toFixed(4)) + 'm';
  return parseFloat((n * 1e6).toFixed(4)) + 'µ';
}

function setResult(valId, value, cardId) {
  document.getElementById(valId).textContent = value;
  document.getElementById(cardId).classList.add('lit');
}

// ══════════════════════════════════════════════════════════════════════════════
// BULB
// ══════════════════════════════════════════════════════════════════════════════
function updateBulb(brightness, power) {
  const pct = Math.round(brightness * 100);
  document.getElementById('brightness-fill').style.width = pct + '%';
  document.getElementById('brightness-pct').textContent  = pct + '%';
  document.getElementById('power-badge').textContent     = fmt(power) + ' W';

  const rr = Math.round(180 + 75 * brightness);
  const rg = Math.round(60  + 160 * brightness);
  const rb = Math.round(10  + 40  * brightness);
  const glassColor    = `rgba(${rr},${rg},${rb},${0.15 + 0.65 * brightness})`;
  const filamentColor = `rgb(${rr},${rg},${rb})`;
  const glowAlpha     = brightness * 0.85;

  document.getElementById('bulb-glass').style.fill  = glassColor;
  document.getElementById('filament').style.stroke  = filamentColor;
  document.getElementById('filament').style.filter  = brightness > 0.1
    ? `drop-shadow(0 0 ${4 * brightness}px ${filamentColor})` : 'none';
  document.getElementById('bulb-glow').setAttribute('fill', `rgba(${rr},${rg},${rb},${glowAlpha * 0.3})`);
  document.getElementById('bulb-shine').style.stroke = `rgba(255,255,255,${0.1 + 0.25 * brightness})`;

  const ring = document.getElementById('glow-ring');
  if (brightness > 0.05) {
    const gs = Math.round(40 * brightness);
    ring.style.boxShadow = `0 0 ${gs}px ${gs/2}px rgba(${rr},${rg},${rb},${glowAlpha * 0.6})`;
    ring.style.background = `radial-gradient(circle, rgba(${rr},${rg},${rb},${glowAlpha * 0.35}) 0%, transparent 70%)`;
  } else {
    ring.style.boxShadow = 'none';
    ring.style.background = 'transparent';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SVG HELPERS
// ══════════════════════════════════════════════════════════════════════════════
function svgEl(tag, attrs, parent) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (parent) parent.appendChild(el);
  return el;
}

function svgLine(svg, x1, y1, x2, y2, stroke = '#4dc3ff', sw = 2) {
  svgEl('line', { x1, y1, x2, y2, stroke, 'stroke-width': sw, 'stroke-linecap': 'round' }, svg);
}

function svgText(svg, x, y, content, fill = '#d4d8e8', size = 10, anchor = 'middle') {
  const el = svgEl('text', { x, y, fill, 'font-size': size, 'text-anchor': anchor,
    'font-family': "'Share Tech Mono', monospace" }, svg);
  el.textContent = content;
}

function svgArrowDefs(svg, color = '#3dffa0') {
  if (svg.querySelector('#arr')) return;
  const defs = svgEl('defs', {}, svg);
  defs.innerHTML = `<marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
    <path d="M0,0 L0,6 L8,3 z" fill="${color}"/></marker>`;
  svg.insertBefore(defs, svg.firstChild);
}

function svgArrow(svg, x1, y1, x2, y2, color = '#3dffa0') {
  svgArrowDefs(svg, color);
  svgEl('line', { x1, y1, x2, y2, stroke: color, 'stroke-width': 2, 'marker-end': 'url(#arr)' }, svg);
}

// Draw one horizontal resistor body centred at (cx, cy)
function drawResistorH(svg, cx, cy, label, sublabel1, sublabel2) {
  const rw = 42, rh = 18;
  svgLine(svg, cx - rw/2 - 14, cy, cx - rw/2, cy);
  svgLine(svg, cx + rw/2, cy, cx + rw/2 + 14, cy);
  svgEl('rect', { x: cx - rw/2, y: cy - rh/2, width: rw, height: rh,
    fill: '#1e2233', stroke: '#f5c842', 'stroke-width': 1.5, rx: 4 }, svg);
  // zigzag
  const zx = cx - rw/2 + 5, step = (rw - 10) / 5;
  let pts = `${zx},${cy}`;
  for (let i = 0; i < 5; i++) {
    pts += ` ${zx + (i + 0.5) * step},${cy + (i % 2 === 0 ? -5 : 5)}`;
  }
  pts += ` ${zx + 5 * step},${cy}`;
  svgEl('polyline', { points: pts, fill: 'none', stroke: '#f5c842',
    'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
  svgText(svg, cx, cy - rh/2 - 7, label, '#f5c842', 10, 'middle');
  if (sublabel1) svgText(svg, cx, cy + rh/2 + 11, sublabel1, '#6b7290', 9, 'middle');
  if (sublabel2) svgText(svg, cx, cy + rh/2 + 21, sublabel2, '#3dffa0', 9, 'middle');
}

// Draw one vertical resistor body centred at (cx, cy)
function drawResistorV(svg, cx, cy, label, sublabel1, sublabel2) {
  const rw = 18, rh = 44;
  svgLine(svg, cx, cy - rh/2 - 14, cx, cy - rh/2);
  svgLine(svg, cx, cy + rh/2, cx, cy + rh/2 + 14);
  svgEl('rect', { x: cx - rw/2, y: cy - rh/2, width: rw, height: rh,
    fill: '#1e2233', stroke: '#f5c842', 'stroke-width': 1.5, rx: 4 }, svg);
  const zy = cy - rh/2 + 5, step = (rh - 10) / 5;
  let pts = `${cx},${zy}`;
  for (let i = 0; i < 5; i++) {
    pts += ` ${cx + (i % 2 === 0 ? -5 : 5)},${zy + (i + 0.5) * step}`;
  }
  pts += ` ${cx},${zy + 5 * step}`;
  svgEl('polyline', { points: pts, fill: 'none', stroke: '#f5c842',
    'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
  svgText(svg, cx + rw/2 + 5, cy - 8, label, '#f5c842', 9, 'start');
  if (sublabel1) svgText(svg, cx + rw/2 + 5, cy + 3, sublabel1, '#6b7290', 8, 'start');
  if (sublabel2) svgText(svg, cx + rw/2 + 5, cy + 13, sublabel2, '#3dffa0', 8, 'start');
}

function drawBattery(svg, cx, cy, voltage) {
  const plates = [{ hw: 13, sw: 3 }, { hw: 8, sw: 2 }, { hw: 13, sw: 3 }];
  plates.forEach((p, i) => {
    const y = cy - 14 + i * 14;
    svgLine(svg, cx - p.hw, y, cx + p.hw, y, '#3dffa0', p.sw);
  });
  svgLine(svg, cx, cy - 14, cx, cy - 30, '#3dffa0', 2);
  svgLine(svg, cx, cy + 14, cx, cy + 30, '#3dffa0', 2);
  svgText(svg, cx + 18, cy - 10, '+', '#3dffa0', 13, 'middle');
  svgText(svg, cx + 18, cy + 18, '−', '#3dffa0', 15, 'middle');
  svgText(svg, cx, cy + 44, `${voltage}V`, '#3dffa0', 10, 'middle');
}

// ══════════════════════════════════════════════════════════════════════════════
// CIRCUIT DIAGRAM  — dynamically sized SVG
// ══════════════════════════════════════════════════════════════════════════════
function drawCircuit(rows, voltage, totalR, totalI, totalP) {
  const svg = document.getElementById('circuit-svg');
  svg.innerHTML = '';

  if (networkMode === 'series')   drawSeries(svg, rows, voltage, totalR, totalI);
  else if (networkMode === 'parallel') drawParallel(svg, rows, voltage, totalR, totalI);
  else                            drawMixed(svg, rows, voltage, totalR, totalI);
}

// ── SERIES ────────────────────────────────────────────────────────────────────
function drawSeries(svg, rows, voltage, totalR, totalI) {
  const n = rows.length;
  // Each resistor needs ~90px; battery ~70px; margins ~60px each side
  const RSLOT = 90;
  const W = Math.max(700, 120 + n * RSLOT);
  const H = 200;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);

  const batX = 45, topY = 70, botY = 150, cy = (topY + botY) / 2;
  const startX = 90, endX = W - 30;

  // Battery
  svgLine(svg, batX, topY, batX, botY, '#3dffa0', 2);
  drawBattery(svg, batX, cy, voltage);

  // Bus wires
  svgLine(svg, batX, topY, endX, topY);
  svgLine(svg, batX, botY, endX, botY);
  svgLine(svg, endX, topY, endX, botY);

  // Resistors on top rail
  const slotW = (endX - startX) / n;
  rows.forEach((r, i) => {
    const cx = startX + slotW * i + slotW / 2;
    drawResistorH(svg, cx, topY, r.label,
      `${fmt(r.val)}Ω  ${fmt(r.vDrop)}V`,
      `${fmt(r.current)}A  ${fmt(r.power)}W`);
  });

  // Current arrow on bottom
  svgArrow(svg, W/2 - 25, botY, W/2 + 25, botY, '#3dffa0');
  svgText(svg, W/2, botY + 15, `I = ${fmt(totalI)}A`, '#3dffa0', 10);
  svgText(svg, W/2, H - 4, `Total R = ${fmt(totalR)}Ω  ·  SERIES`, '#6b7290', 9);
}

// ── PARALLEL ──────────────────────────────────────────────────────────────────
function drawParallel(svg, rows, voltage, totalR, totalI) {
  const n = rows.length;
  // Each branch needs ~70px wide
  const BSLOT = 75;
  const W = Math.max(600, 130 + n * BSLOT);
  const H = 220;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);

  const batX = 40, topY = 28, botY = H - 28, busL = 90, busR = W - 28;

  svgLine(svg, batX, topY, batX, botY, '#3dffa0', 2);
  drawBattery(svg, batX, (topY + botY)/2 - 10, voltage);

  svgLine(svg, batX, topY, busR, topY);
  svgLine(svg, batX, botY, busR, botY);
  svgLine(svg, busR, topY, busR, botY);

  const gap = (busR - busL) / (n + 1);
  rows.forEach((r, i) => {
    const bx = busL + gap * (i + 1);
    const midY = (topY + botY) / 2;
    svgLine(svg, bx, topY, bx, midY - 36);
    svgLine(svg, bx, midY + 36, bx, botY);
    drawResistorV(svg, bx, midY, r.label,
      `${fmt(r.val)}Ω`, `${fmt(r.current)}A`);
  });

  svgArrow(svg, busL - 20, topY, busL + 20, topY, '#3dffa0');
  svgText(svg, (busL + busR)/2, topY - 11, `I_total = ${fmt(totalI)}A`, '#3dffa0', 10);
  svgText(svg, W/2, H - 5, `Total R = ${fmt(totalR)}Ω  ·  PARALLEL`, '#6b7290', 9);
}

// ── MIXED ─────────────────────────────────────────────────────────────────────
function drawMixed(svg, rows, voltage, totalR, totalI) {
  // Build groups from rows
  const groupMap = {};
  rows.forEach(r => {
    const g = r.group !== undefined ? r.group : 0;
    if (!groupMap[g]) groupMap[g] = [];
    groupMap[g].push(r);
  });
  const groupKeys = Object.keys(groupMap).map(Number).sort((a,b) => a-b);
  const numGroups = groupKeys.length;

  // Width: each group is a parallel branch; each branch width = max(resistors in branch) * RSLOT
  const RSLOT  = 88;
  const RHEIGHT = 80;  // px per resistor vertically
  const maxPerGroup = Math.max(...groupKeys.map(k => groupMap[k].length));
  const BRANCHW = Math.max(110, RSLOT);
  const W = Math.max(700, 120 + numGroups * (BRANCHW + 30));
  const H = Math.max(280, 120 + maxPerGroup * RHEIGHT);

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);

  const batX = 42, topY = 30, botY = H - 30;
  const busL  = 90,  busR = W - 30;
  const branchGap = (busR - busL) / (numGroups + 1);

  // Battery & bus
  svgLine(svg, batX, topY, batX, botY, '#3dffa0', 2);
  drawBattery(svg, batX, (topY + botY)/2 - 10, voltage);
  svgLine(svg, batX, topY, busR, topY);
  svgLine(svg, batX, botY, busR, botY);
  svgLine(svg, busR, topY, busR, botY);

  // Current arrow
  svgArrow(svg, busL - 20, topY, busL + 20, topY, '#3dffa0');
  svgText(svg, (busL+busR)/2, topY - 12, `I_total = ${fmt(totalI)}A`, '#3dffa0', 10);

  groupKeys.forEach((gk, gi) => {
    const branch = groupMap[gk];
    const bx = busL + branchGap * (gi + 1);
    const branchH = botY - topY;
    const rSlotH  = branchH / (branch.length + 1);

    // Vertical wire for branch
    svgLine(svg, bx, topY, bx, botY);

    // Group bracket
    const bracketX = bx - 30;
    svgText(svg, bracketX - 2, (topY + botY)/2, `G${gk+1}`, '#4dc3ff', 9, 'end');

    branch.forEach((r, ri) => {
      const cy2 = topY + rSlotH * (ri + 1);
      // small horizontal tap wire
      svgLine(svg, bx - 14, cy2, bx + 14, cy2, '#4dc3ff', 1);
      // dot junction
      svgEl('circle', { cx: bx, cy: cy2, r: 3, fill: '#4dc3ff' }, svg);
      // resistor to the right
      drawResistorH(svg, bx + 14 + RSLOT/2 + 14, cy2, r.label,
        `${fmt(r.val)}Ω  ${fmt(r.vDrop)}V`,
        `${fmt(r.current)}A`);
    });
  });

  svgText(svg, W/2, H - 5, `Total R = ${fmt(totalR)}Ω  ·  MIXED (groups ∥, resistors in series per group)`, '#6b7290', 9);
}

// ══════════════════════════════════════════════════════════════════════════════
// ZOOM
// ══════════════════════════════════════════════════════════════════════════════
function applyZoom() {
  document.getElementById('circuit-svg').style.transform = `scale(${zoomScale})`;
  document.getElementById('circuit-svg').style.transformOrigin = 'top left';
}
function zoomIn()    { zoomScale = Math.min(zoomScale + 0.2, 4);    applyZoom(); }
function zoomOut()   { zoomScale = Math.max(zoomScale - 0.2, 0.3);  applyZoom(); }
function resetZoom() { zoomScale = 1; applyZoom(); }
