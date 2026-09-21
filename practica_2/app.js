/**
 * Calculadora y Visualizador de Curvas Elípticas sobre Fp
 * Filosofía: Vanilla JS sin dependencias, alto rendimiento y precisión matemática.
 */

// Utilidad módulo positivo
function mod(n, m) {
  return ((n % m) + m) % m;
}

// Test de primalidad básico determinista
function isPrime(n) {
  if (n <= 1) return false;
  if (n <= 3) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

// Estado de la aplicación
const state = {
  a: 4,
  b: 4,
  p: 11,
  points: [],
  discriminant: 0,
  isSingular: false,
  hoveredPoint: null
};

// Elementos DOM
const dom = {
  form: document.getElementById('curve-form'),
  inputA: document.getElementById('input-a'),
  inputB: document.getElementById('input-b'),
  inputP: document.getElementById('input-p'),
  btnReset: document.getElementById('btn-reset'),
  btnCopy: document.getElementById('btn-copy-points'),
  pWarning: document.getElementById('p-warning'),
  discBreakdown: document.getElementById('disc-breakdown'),
  discStatus: document.getElementById('disc-status'),
  metricAffine: document.getElementById('metric-affine-count'),
  metricOrder: document.getElementById('metric-group-order'),
  metricHasse: document.getElementById('metric-hasse'),
  metricHasseStatus: document.getElementById('metric-hasse-status'),
  pointsTableBody: document.getElementById('points-tbody'),
  canvas: document.getElementById('curve-canvas'),
  tooltip: document.getElementById('canvas-tooltip'),
  presetPills: document.querySelectorAll('.pill-btn')
};

const ctx = dom.canvas.getContext('2d');

// Cálculo principal
function calculateCurve() {
  const a = parseInt(dom.inputA.value, 10);
  const b = parseInt(dom.inputB.value, 10);
  const p = parseInt(dom.inputP.value, 10);

  if (isNaN(a) || isNaN(b) || isNaN(p) || p < 2) {
    alert('Ingresa valores numéricos válidos (p ≥ 2).');
    return;
  }

  state.a = a;
  state.b = b;
  state.p = p;

  // Verificación primalidad de p
  const primeCheck = isPrime(p);
  if (!primeCheck) {
    dom.pWarning.textContent = `Atención: ${p} no es un número primo. Las curvas elípticas estándar requieren un campo finito 𝔽ₚ con p primo.`;
    dom.pWarning.classList.remove('hidden');
  } else if (p <= 3) {
    dom.pWarning.textContent = `Aviso: Para la forma corta de Weierstrass y² = x³ + ax + b, se asume la característica del campo p > 3.`;
    dom.pWarning.classList.remove('hidden');
  } else {
    dom.pWarning.classList.add('hidden');
  }

  // 1. Verificación de singularidad: 4a³ + 27b² mod p
  const a3 = a * a * a;
  const term1 = 4 * a3;
  const b2 = b * b;
  const term2 = 27 * b2;
  const discRaw = term1 + term2;
  const discMod = mod(discRaw, p);

  state.discriminant = discMod;
  state.isSingular = discMod === 0;

  // Renderizar desglose del discriminante
  dom.discBreakdown.innerHTML = `
    <div>4a³ = 4(${a})³ = 4(${a3}) = ${term1}</div>
    <div>27b² = 27(${b})² = 27(${b2}) = ${term2}</div>
    <div>Suma: 4a³ + 27b² = ${term1} + ${term2} = ${discRaw}</div>
    <div><strong>4a³ + 27b² mod ${p} = ${discMod}</strong></div>
  `;

  if (state.isSingular) {
    dom.discStatus.className = 'status-banner invalid';
    dom.discStatus.innerHTML = `
      <span>⚠ <strong>Curva Singular (4a³ + 27b² ≡ 0 mod p)</strong>. La curva tiene puntos dobles/cúspides y no forma un grupo elíptico liso.</span>
    `;
  } else {
    dom.discStatus.className = 'status-banner valid';
    dom.discStatus.innerHTML = `
      <span>✓ <strong>Curva Válida y No Singular (4a³ + 27b² ≢ 0 mod p)</strong>. Forma un grupo abeliano bien definido.</span>
    `;
  }

  // 2. Precalcular residuos cuadráticos en Fp
  // residues[val] = array de valores y tal que y^2 mod p == val
  const residues = {};
  for (let y = 0; y < p; y++) {
    const sq = mod(y * y, p);
    if (!residues[sq]) residues[sq] = [];
    residues[sq].push(y);
  }

  // 3. Buscar todos los puntos (x, y)
  const rowsData = [];
  const points = [];

  for (let x = 0; x < p; x++) {
    const x3 = x * x * x;
    const ax = a * x;
    const rhsRaw = x3 + ax + b;
    const rhsMod = mod(rhsRaw, p);

    const validY = residues[rhsMod] ? [...residues[rhsMod]] : [];
    const isResidue = validY.length > 0;

    const rowPoints = validY.map(y => ({ x, y }));
    points.push(...rowPoints);

    rowsData.push({
      x,
      rhsRaw,
      rhsMod,
      isResidue,
      validY,
      rowPoints
    });
  }

  state.points = points;

  // 4. Métricas y Cota de Hasse
  const affineCount = points.length;
  const groupOrder = affineCount + 1; // +1 por el punto al infinito O
  const sqrtP = Math.sqrt(p);
  const lowerHasse = Math.ceil(p + 1 - 2 * sqrtP);
  const upperHasse = Math.floor(p + 1 + 2 * sqrtP);
  const withinHasse = groupOrder >= lowerHasse && groupOrder <= upperHasse;

  dom.metricAffine.textContent = affineCount;
  dom.metricOrder.textContent = `${groupOrder} (con 𝒪)`;
  dom.metricHasse.textContent = `[${lowerHasse}, ${upperHasse}]`;
  dom.metricHasseStatus.textContent = withinHasse 
    ? `Cumple cota de Hasse (|${p + 1} - ${groupOrder}| ≤ ${Math.floor(2 * sqrtP * 100) / 100})`
    : `Fuera de cota estándar (posible curva singular o no primo)`;

  // 5. Renderizar Tabla Paso a Paso
  renderTable(rowsData);

  // 6. Dibujar Canvas
  renderCanvas();
}

// Renderizar tabla
function renderTable(rows) {
  let html = '';
  for (const row of rows) {
    const residueBadge = row.isResidue 
      ? '<span class="pill-yes">Sí</span>' 
      : '<span class="pill-no">No</span>';

    const yVals = row.validY.length > 0 
      ? row.validY.join(', ') 
      : '<span class="pill-no">Ninguna</span>';

    const pointsBadges = row.rowPoints.length > 0
      ? row.rowPoints.map(pt => `<span class="badge-point" data-pt="${pt.x},${pt.y}">(${pt.x}, ${pt.y})</span>`).join(' ')
      : '<span class="pill-no">∅</span>';

    html += `
      <tr data-x="${row.x}">
        <td><strong>${row.x}</strong></td>
        <td>${row.rhsRaw}</td>
        <td><strong>${row.rhsMod}</strong></td>
        <td>${residueBadge}</td>
        <td>${yVals}</td>
        <td>${pointsBadges}</td>
      </tr>
    `;
  }
  dom.pointsTableBody.innerHTML = html;
}

// Canvas & Gráfico 𝔽ₚ × 𝔽ₚ
function renderCanvas() {
  const canvas = dom.canvas;
  const width = canvas.width;
  const height = canvas.height;
  const p = state.p;

  ctx.clearRect(0, 0, width, height);

  const padding = 50;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  // Funciones de mapeo de coordenadas
  function toCanvasX(x) {
    if (p <= 1) return padding;
    return padding + (x / (p - 1)) * plotWidth;
  }

  function toCanvasY(y) {
    if (p <= 1) return height - padding;
    // Invertir Y para que (0,0) esté abajo a la izquierda
    return height - padding - (y / (p - 1)) * plotHeight;
  }

  // Cuadrícula sutil
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;

  // Ticks adaptativos
  const step = p > 35 ? Math.ceil(p / 10) : (p > 15 ? 5 : 1);

  for (let i = 0; i < p; i += step) {
    const cx = toCanvasX(i);
    const cy = toCanvasY(i);

    // Líneas verticales
    ctx.beginPath();
    ctx.moveTo(cx, padding);
    ctx.lineTo(cx, height - padding);
    ctx.stroke();

    // Líneas horizontales
    ctx.beginPath();
    ctx.moveTo(padding, cy);
    ctx.lineTo(width - padding, cy);
    ctx.stroke();

    // Etiquetas ejes
    ctx.fillStyle = '#64748b';
    ctx.font = '10px "Fira Code", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(i.toString(), cx, height - padding + 16);

    ctx.textAlign = 'right';
    ctx.fillText(i.toString(), padding - 8, cy + 3);
  }

  // Eje de simetría y = p / 2
  const symY = toCanvasY(p / 2);
  ctx.save();
  ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(padding, symY);
  ctx.lineTo(width - padding, symY);
  ctx.stroke();
  ctx.restore();

  // Dibujar puntos afines
  for (const pt of state.points) {
    const cx = toCanvasX(pt.x);
    const cy = toCanvasY(pt.y);
    const isHovered = state.hoveredPoint && state.hoveredPoint.x === pt.x && state.hoveredPoint.y === pt.y;

    // Resplandor
    ctx.save();
    if (isHovered) {
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#38bdf8';
    } else {
      ctx.shadowColor = '#6366f1';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#06b6d4';
    }

    ctx.beginPath();
    const radius = p > 50 ? 3 : (p > 25 ? 4.5 : 6);
    ctx.arc(cx, cy, isHovered ? radius + 2.5 : radius, 0, Math.PI * 2);
    ctx.fill();

    // Borde blanco fino
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // Títulos de ejes
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('x ∈ 𝔽ₚ', width / 2, height - 10);

  ctx.save();
  ctx.translate(14, height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('y ∈ 𝔽ₚ', 0, 0);
  ctx.restore();
}

// Detección de hover en Canvas
dom.canvas.addEventListener('mousemove', (e) => {
  const rect = dom.canvas.getBoundingClientRect();
  const scaleX = dom.canvas.width / rect.width;
  const scaleY = dom.canvas.height / rect.height;

  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;

  const p = state.p;
  const padding = 50;
  const plotWidth = dom.canvas.width - padding * 2;
  const plotHeight = dom.canvas.height - padding * 2;

  function toCanvasX(x) {
    return padding + (x / (p - 1)) * plotWidth;
  }
  function toCanvasY(y) {
    return dom.canvas.height - padding - (y / (p - 1)) * plotHeight;
  }

  let found = null;
  const hitDist = p > 50 ? 8 : 14;

  for (const pt of state.points) {
    const cx = toCanvasX(pt.x);
    const cy = toCanvasY(pt.y);
    const dist = Math.hypot(mouseX - cx, mouseY - cy);
    if (dist <= hitDist) {
      found = { ...pt, cx, cy };
      break;
    }
  }

  if (found) {
    state.hoveredPoint = { x: found.x, y: found.y };
    dom.tooltip.classList.remove('hidden');
    dom.tooltip.style.left = `${(found.cx / scaleX)}px`;
    dom.tooltip.style.top = `${(found.cy / scaleY)}px`;
    dom.tooltip.innerHTML = `
      <strong>Punto (${found.x}, ${found.y})</strong><br>
      ${found.y}² ≡ ${mod(found.y * found.y, p)} (mod ${p})<br>
      ${found.x}³ + ${state.a}(${found.x}) + ${state.b} ≡ ${mod(found.x**3 + state.a*found.x + state.b, p)} (mod ${p})
    `;
    highlightTableRow(found.x);
  } else {
    state.hoveredPoint = null;
    dom.tooltip.classList.add('hidden');
    clearTableHighlight();
  }

  renderCanvas();
});

dom.canvas.addEventListener('mouseleave', () => {
  state.hoveredPoint = null;
  dom.tooltip.classList.add('hidden');
  clearTableHighlight();
  renderCanvas();
});

function highlightTableRow(x) {
  clearTableHighlight();
  const tr = dom.pointsTableBody.querySelector(`tr[data-x="${x}"]`);
  if (tr) {
    tr.classList.add('highlighted');
  }
}

function clearTableHighlight() {
  const rows = dom.pointsTableBody.querySelectorAll('tr.highlighted');
  rows.forEach(r => r.classList.remove('highlighted'));
}

// Eventos de formulario
dom.form.addEventListener('submit', (e) => {
  e.preventDefault();
  calculateCurve();
});

dom.btnReset.addEventListener('click', () => {
  dom.inputA.value = '4';
  dom.inputB.value = '4';
  dom.inputP.value = '11';
  calculateCurve();
});

// Presets
dom.presetPills.forEach(btn => {
  btn.addEventListener('click', () => {
    dom.presetPills.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    dom.inputA.value = btn.dataset.a;
    dom.inputB.value = btn.dataset.b;
    dom.inputP.value = btn.dataset.p;

    calculateCurve();
  });
});

// Copiar puntos
dom.btnCopy.addEventListener('click', () => {
  if (state.points.length === 0) {
    navigator.clipboard.writeText(`Curva E(F_${state.p}): solo punto al infinito O`);
    alert('Conjunto copiado: solo punto en el infinito O');
    return;
  }

  const list = state.points.map(pt => `(${pt.x}, ${pt.y})`).join(', ');
  const fullText = `E(𝔽_${state.p}): y² ≡ x³ + ${state.a}x + ${state.b} (mod ${state.p})\nPuntos (${state.points.length + 1} con 𝒪): { 𝒪, ${list} }`;
  navigator.clipboard.writeText(fullText).then(() => {
    const originalText = dom.btnCopy.textContent;
    dom.btnCopy.textContent = '¡Copiado!';
    setTimeout(() => {
      dom.btnCopy.textContent = originalText;
    }, 1800);
  });
});

// Inicialización
calculateCurve();
