/**
 * Calculadora y Visualizador de Curvas Elípticas sobre Fp
 * Filosofía: Vanilla JS sin dependencias, alto rendimiento y precisión matemática.
 */

// Utilidad módulo positivo
function mod(n, m) {
  return ((n % m) + m) % m;
}

// Inverso modular usando Algoritmo Extendido de Euclides
function modInverse(a, m) {
  a = mod(a, m);
  if (a === 0) return null;
  let m0 = m, y = 0, x = 1;
  if (m === 1) return 0;
  while (a > 1) {
    if (m0 === 0) return null;
    let q = Math.floor(a / m0);
    let t = m0;
    m0 = a % m0;
    a = t;
    t = y;
    y = x - q * y;
    x = t;
  }
  if (x < 0) x += m;
  return x;
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
  hoveredPoint: null,
  pointP: null, // { x, y } o 'INF'
  pointQ: null, // { x, y } o 'INF'
  pointR: null, // { x, y } o 'INF'
  lastOp: null,
  nextSelectTarget: 'P' // 'P' o 'Q' para alternar clics
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
  presetPills: document.querySelectorAll('.pill-btn'),

  // Aritmética de grupo
  selectP: document.getElementById('select-point-p'),
  selectQ: document.getElementById('select-point-q'),
  displayR: document.getElementById('display-point-r'),
  btnOpAdd: document.getElementById('btn-op-add'),
  btnOpDoubleP: document.getElementById('btn-op-double-p'),
  btnOpDoubleQ: document.getElementById('btn-op-double-q'),
  btnOpInvP: document.getElementById('btn-op-inv-p'),
  btnOpInvQ: document.getElementById('btn-op-inv-q'),
  opBreakdown: document.getElementById('op-result-breakdown')
};

const ctx = dom.canvas.getContext('2d');

// Cálculo principal de la curva
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

  // 6. Poblar selectores de suma y doblado
  populatePointSelectors();

  // 7. Ejecutar operación inicial si hay puntos
  executeCurrentOperation();

  // 8. Dibujar Canvas
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

  // Clic en insignias de la tabla para seleccionar puntos P o Q
  dom.pointsTableBody.querySelectorAll('.badge-point').forEach(badge => {
    badge.addEventListener('click', (e) => {
      const [x, y] = badge.dataset.pt.split(',').map(Number);
      selectPointInteractive({ x, y });
    });
  });
}

// Poblar selectores de P y Q
function populatePointSelectors() {
  let options = '<option value="INF">𝒪 (Punto al Infinito)</option>';
  state.points.forEach((pt, idx) => {
    options += `<option value="${pt.x},${pt.y}">(${pt.x}, ${pt.y})</option>`;
  });

  dom.selectP.innerHTML = options;
  dom.selectQ.innerHTML = options;

  if (state.points.length > 0) {
    // P = primer punto
    dom.selectP.selectedIndex = 1;
    state.pointP = { x: state.points[0].x, y: state.points[0].y };

    // Q = segundo punto (o primero si solo hay 1)
    if (state.points.length > 1) {
      dom.selectQ.selectedIndex = 2;
      state.pointQ = { x: state.points[1].x, y: state.points[1].y };
    } else {
      dom.selectQ.selectedIndex = 1;
      state.pointQ = { x: state.points[0].x, y: state.points[0].y };
    }
  } else {
    dom.selectP.selectedIndex = 0;
    dom.selectQ.selectedIndex = 0;
    state.pointP = 'INF';
    state.pointQ = 'INF';
  }
}

// Parsear punto desde selector
function parsePoint(val) {
  if (val === 'INF') return 'INF';
  const parts = val.split(',').map(Number);
  return { x: parts[0], y: parts[1] };
}

// Formatear punto como texto
function formatPoint(pt) {
  if (!pt || pt === 'INF') return '𝒪';
  return `(${pt.x}, ${pt.y})`;
}

// Selección interactiva al hacer clic en tabla o canvas
function selectPointInteractive(pt) {
  const ptStr = `${pt.x},${pt.y}`;
  if (state.nextSelectTarget === 'P') {
    dom.selectP.value = ptStr;
    state.pointP = pt;
    state.nextSelectTarget = 'Q';
  } else {
    dom.selectQ.value = ptStr;
    state.pointQ = pt;
    state.nextSelectTarget = 'P';
  }
  executeCurrentOperation();
  renderCanvas();
}

// Operación aritmética central: Suma y doblado de puntos
function addPoints(P, Q, a, p) {
  // Caso 1: P es infinito
  if (P === 'INF') {
    return {
      R: Q,
      type: 'IDENTITY_P',
      title: 'Elemento Neutro: 𝒪 + Q = Q',
      steps: [
        'P es el punto en el infinito 𝒪 (elemento neutro del grupo).',
        `Resultado directo: R = Q = ${formatPoint(Q)}.`
      ]
    };
  }

  // Caso 2: Q es infinito
  if (Q === 'INF') {
    return {
      R: P,
      type: 'IDENTITY_Q',
      title: 'Elemento Neutro: P + 𝒪 = P',
      steps: [
        'Q es el punto en el infinito 𝒪 (elemento neutro del grupo).',
        `Resultado directo: R = P = ${formatPoint(P)}.`
      ]
    };
  }

  // Caso 3: Puntos opuestos (x1 = x2 e y1 ≡ -y2 mod p)
  if (P.x === Q.x && mod(P.y + Q.y, p) === 0) {
    return {
      R: 'INF',
      type: 'INVERSE',
      title: 'Puntos Opuestos: P + (&minus;P) = 𝒪',
      steps: [
        `x₁ = x₂ = ${P.x} y las ordenadas son opuestas: y₁ = ${P.y}, y₂ = ${Q.y} (y₁ + y₂ ≡ 0 mod ${p}).`,
        'La recta que los une es estrictamente vertical.',
        'En geometría proyectiva, toda recta vertical interseca a la curva en el punto del infinito 𝒪.',
        'Resultado: R = 𝒪.'
      ]
    };
  }

  // Caso 4: Doblado de Punto (P == Q)
  if (P.x === Q.x && P.y === Q.y) {
    if (P.y === 0) {
      return {
        R: 'INF',
        type: 'VERTICAL_TANGENT',
        title: 'Tangente Vertical en y = 0: 2P = 𝒪',
        steps: [
          `Punto con ordenada y = 0: (${P.x}, 0).`,
          'La recta tangente a la curva en este punto es vertical.',
          'Resultado: 2P = 𝒪.'
        ]
      };
    }

    const num = mod(3 * P.x * P.x + a, p);
    const den = mod(2 * P.y, p);
    const invDen = modInverse(den, p);

    if (invDen === null) {
      return {
        R: 'INF',
        type: 'ERROR_INV',
        title: 'Error: Denominador no invertible',
        steps: [`El denominador ${den} no es coprimo con ${p}.`]
      };
    }

    const lambda = mod(num * invDen, p);
    const x3 = mod(lambda * lambda - 2 * P.x, p);
    const y3 = mod(lambda * (P.x - x3) - P.y, p);

    return {
      R: { x: x3, y: y3 },
      lambda,
      intersect: { x: x3, y: mod(-y3, p) },
      type: 'DOUBLING',
      title: 'Doblado de Punto: 2P = R (Recta Tangente)',
      steps: [
        `Fórmula de pendiente tangente: λ ≡ (3x₁² + a) &bull; (2y₁)⁻¹ (mod ${p})`,
        `Numerador: 3(${P.x})² + (${a}) = 3(${P.x * P.x}) + ${a} = ${3 * P.x * P.x + a} ≡ ${num} (mod ${p})`,
        `Denominador: 2y₁ = 2(${P.y}) = ${2 * P.y} ≡ ${den} (mod ${p})`,
        `Inverso modular: (${den})⁻¹ mod ${p} = ${invDen}  (porque ${den} &times; ${invDen} ≡ ${mod(den * invDen, p)} mod ${p})`,
        `Pendiente λ = ${num} &times; ${invDen} = ${num * invDen} ≡ ${lambda} (mod ${p})`,
        `Coordenada x₃ ≡ λ² &minus; 2x₁ = (${lambda})² &minus; 2(${P.x}) = ${lambda * lambda} &minus; ${2 * P.x} = ${lambda * lambda - 2 * P.x} ≡ ${x3} (mod ${p})`,
        `Coordenada y₃ ≡ λ(x₁ &minus; x₃) &minus; y₁ = ${lambda}(${P.x} &minus; ${x3}) &minus; ${P.y} = ${lambda * (P.x - x3) - P.y} ≡ ${y3} (mod ${p})`,
        `Resultado final: 2(${P.x}, ${P.y}) = (${x3}, ${y3})`
      ]
    };
  }

  // Caso 5: Suma ordinaria (P ≠ Q y x1 ≠ x2)
  const num = mod(Q.y - P.y, p);
  const den = mod(Q.x - P.x, p);
  const invDen = modInverse(den, p);

  if (invDen === null) {
    return {
      R: 'INF',
      type: 'INVERSE_FALLBACK',
      title: 'Secante Vertical: P + Q = 𝒪',
      steps: [`Denominador (${Q.x} - ${P.x}) mod ${p} = 0. Recta vertical intersecta en 𝒪.`]
    };
  }

  const lambda = mod(num * invDen, p);
  const x3 = mod(lambda * lambda - P.x - Q.x, p);
  const y3 = mod(lambda * (P.x - x3) - P.y, p);

  return {
    R: { x: x3, y: y3 },
    lambda,
    intersect: { x: x3, y: mod(-y3, p) },
    type: 'ADDITION',
    title: 'Suma de Puntos Diferentes: P + Q = R (Recta Secante)',
    steps: [
      `Fórmula de pendiente secante: λ ≡ (y₂ &minus; y₁) &bull; (x₂ &minus; x₁)⁻¹ (mod ${p})`,
      `Numerador: y₂ &minus; y₁ = ${Q.y} &minus; ${P.y} = ${Q.y - P.y} ≡ ${num} (mod ${p})`,
      `Denominador: x₂ &minus; x₁ = ${Q.x} &minus; ${P.x} = ${Q.x - P.x} = ${den} (mod ${p})`,
      `Inverso modular: (${den})⁻¹ mod ${p} = ${invDen}  (porque ${den} &times; ${invDen} ≡ ${mod(den * invDen, p)} mod ${p})`,
      `Pendiente λ = ${num} &times; ${invDen} = ${num * invDen} ≡ ${lambda} (mod ${p})`,
      `Coordenada x₃ ≡ λ² &minus; x₁ &minus; x₂ = (${lambda})² &minus; ${P.x} &minus; ${Q.x} = ${lambda * lambda - P.x - Q.x} ≡ ${x3} (mod ${p})`,
      `Coordenada y₃ ≡ λ(x₁ &minus; x₃) &minus; y₁ = ${lambda}(${P.x} &minus; ${x3}) &minus; ${P.y} = ${lambda * (P.x - x3) - P.y} ≡ ${y3} (mod ${p})`,
      `Intersección secante: (${x3}, ${mod(-y3, p)}), reflejada respecto a y = p/2 da el resultado (${x3}, ${y3}).`,
      `Resultado final: (${P.x}, ${P.y}) + (${Q.x}, ${Q.y}) = (${x3}, ${y3})`
    ]
  };
}

// Ejecutar operación actual y actualizar DOM
function executeCurrentOperation() {
  const P = parsePoint(dom.selectP.value);
  const Q = parsePoint(dom.selectQ.value);

  state.pointP = P;
  state.pointQ = Q;

  const result = addPoints(P, Q, state.a, state.p);
  state.pointR = result.R;
  state.lastOp = result;

  // Actualizar indicador R
  dom.displayR.textContent = formatPoint(result.R);

  // Renderizar desglose paso a paso
  let breakdownHtml = `
    <div class="op-step-title">
      <span class="op-tag-badge">${result.type}</span>
      <span>${result.title}</span>
    </div>
    <div class="op-step-calc">
  `;

  result.steps.forEach(step => {
    breakdownHtml += `<div>&bull; ${step}</div>`;
  });

  breakdownHtml += `
    </div>
    <div class="op-step-result">
      Resultado R = ${formatPoint(result.R)}
    </div>
  `;

  dom.opBreakdown.innerHTML = breakdownHtml;

  // Actualizar resaltado de tabla
  updateTableSelectionBadges();

  // Re-renderizar canvas para mostrar P, Q, R y la recta
  renderCanvas();
}

// Resaltar badges de puntos en la tabla
function updateTableSelectionBadges() {
  document.querySelectorAll('.badge-point').forEach(badge => {
    badge.classList.remove('selected-p', 'selected-q', 'selected-r');
    const pt = badge.dataset.pt;

    if (state.pointP && state.pointP !== 'INF' && pt === `${state.pointP.x},${state.pointP.y}`) {
      badge.classList.add('selected-p');
    }
    if (state.pointQ && state.pointQ !== 'INF' && pt === `${state.pointQ.x},${state.pointQ.y}`) {
      badge.classList.add('selected-q');
    }
    if (state.pointR && state.pointR !== 'INF' && pt === `${state.pointR.x},${state.pointR.y}`) {
      badge.classList.add('selected-r');
    }
  });
}

// Canvas & Gráfico 𝔽ₚ × 𝔽ₚ con Ley de Grupo
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
    return height - padding - (y / (p - 1)) * plotHeight;
  }

  // Cuadrícula sutil
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;

  const step = p > 35 ? Math.ceil(p / 10) : (p > 15 ? 5 : 1);

  for (let i = 0; i < p; i += step) {
    const cx = toCanvasX(i);
    const cy = toCanvasY(i);

    ctx.beginPath();
    ctx.moveTo(cx, padding);
    ctx.lineTo(cx, height - padding);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(padding, cy);
    ctx.lineTo(width - padding, cy);
    ctx.stroke();

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

  // Recta secante / tangente si hay operación finita
  if (state.lastOp && state.pointP !== 'INF' && state.pointQ !== 'INF' && state.lastOp.lambda !== undefined) {
    const P = state.pointP;
    const Q = state.pointQ;
    const R = state.pointR;

    ctx.save();
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);

    // Línea conectando P y Q
    ctx.beginPath();
    ctx.moveTo(toCanvasX(P.x), toCanvasY(P.y));
    ctx.lineTo(toCanvasX(Q.x), toCanvasY(Q.y));
    ctx.stroke();

    // Si hay punto intermedio reflejado (-R)
    if (state.lastOp.intersect && R !== 'INF') {
      const intPt = state.lastOp.intersect;
      ctx.beginPath();
      ctx.moveTo(toCanvasX(Q.x), toCanvasY(Q.y));
      ctx.lineTo(toCanvasX(intPt.x), toCanvasY(intPt.y));
      ctx.stroke();

      // Línea vertical punteada de reflexión entre (x3, -y3) y (x3, y3)
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.beginPath();
      ctx.moveTo(toCanvasX(intPt.x), toCanvasY(intPt.y));
      ctx.lineTo(toCanvasX(R.x), toCanvasY(R.y));
      ctx.stroke();

      // Pequeño marcador en el punto de intersección no reflejado
      ctx.fillStyle = 'rgba(244, 63, 94, 0.7)';
      ctx.beginPath();
      ctx.arc(toCanvasX(intPt.x), toCanvasY(intPt.y), 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // Dibujar puntos afines
  for (const pt of state.points) {
    const cx = toCanvasX(pt.x);
    const cy = toCanvasY(pt.y);

    const isP = state.pointP && state.pointP !== 'INF' && state.pointP.x === pt.x && state.pointP.y === pt.y;
    const isQ = state.pointQ && state.pointQ !== 'INF' && state.pointQ.x === pt.x && state.pointQ.y === pt.y;
    const isR = state.pointR && state.pointR !== 'INF' && state.pointR.x === pt.x && state.pointR.y === pt.y;
    const isHovered = state.hoveredPoint && state.hoveredPoint.x === pt.x && state.hoveredPoint.y === pt.y;

    ctx.save();
    let fillColor = '#06b6d4';
    let strokeColor = '#ffffff';
    let baseRadius = p > 50 ? 3 : (p > 25 ? 4.5 : 6);

    if (isR) {
      fillColor = '#10b981';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 18;
      baseRadius += 3;
    } else if (isP) {
      fillColor = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 16;
      baseRadius += 2.5;
    } else if (isQ) {
      fillColor = '#a855f7';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 16;
      baseRadius += 2.5;
    } else if (isHovered) {
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 14;
      baseRadius += 2;
    } else {
      ctx.shadowColor = '#6366f1';
      ctx.shadowBlur = 7;
    }

    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = (isP || isQ || isR) ? 2 : 1;
    ctx.stroke();

    // Etiquetas sobre P, Q, R
    if (isP || isQ || isR) {
      ctx.font = 'bold 11px "Fira Code", monospace';
      let tagText = '';
      if (isP && isQ) tagText = 'P=Q';
      else if (isP) tagText = 'P';
      else if (isQ) tagText = 'Q';
      if (isR) tagText += (tagText ? ' | R' : 'R');

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(tagText, cx, cy - baseRadius - 5);
    }

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

// Detección de hover y clic en Canvas
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

  function toCanvasX(x) { return padding + (x / (p - 1)) * plotWidth; }
  function toCanvasY(y) { return dom.canvas.height - padding - (y / (p - 1)) * plotHeight; }

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
      ${found.x}³ + ${state.a}(${found.x}) + ${state.b} ≡ ${mod(found.x**3 + state.a*found.x + state.b, p)} (mod ${p})<br>
      <span style="color:#a5b4fc; font-size:0.75rem;">Clic para asignar a ${state.nextSelectTarget}</span>
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

// Clic en Canvas para seleccionar punto
dom.canvas.addEventListener('click', () => {
  if (state.hoveredPoint) {
    selectPointInteractive(state.hoveredPoint);
  }
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

// Eventos de operaciones aritméticas
dom.selectP.addEventListener('change', () => {
  state.pointP = parsePoint(dom.selectP.value);
  executeCurrentOperation();
});

dom.selectQ.addEventListener('change', () => {
  state.pointQ = parsePoint(dom.selectQ.value);
  executeCurrentOperation();
});

dom.btnOpAdd.addEventListener('click', () => {
  executeCurrentOperation();
});

dom.btnOpDoubleP.addEventListener('click', () => {
  dom.selectQ.value = dom.selectP.value;
  state.pointQ = parsePoint(dom.selectQ.value);
  executeCurrentOperation();
});

dom.btnOpDoubleQ.addEventListener('click', () => {
  dom.selectP.value = dom.selectQ.value;
  state.pointP = parsePoint(dom.selectP.value);
  executeCurrentOperation();
});

dom.btnOpInvP.addEventListener('click', () => {
  const P = parsePoint(dom.selectP.value);
  if (P === 'INF') {
    dom.selectQ.value = 'INF';
  } else {
    const invY = mod(-P.y, state.p);
    dom.selectQ.value = `${P.x},${invY}`;
  }
  state.pointQ = parsePoint(dom.selectQ.value);
  executeCurrentOperation();
});

dom.btnOpInvQ.addEventListener('click', () => {
  const Q = parsePoint(dom.selectQ.value);
  if (Q === 'INF') {
    dom.selectP.value = 'INF';
  } else {
    const invY = mod(-Q.y, state.p);
    dom.selectP.value = `${Q.x},${invY}`;
  }
  state.pointP = parsePoint(dom.selectP.value);
  executeCurrentOperation();
});

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
