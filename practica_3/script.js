(() => {
  'use strict';

  const names = ['alice', 'bob', 'candy'];
  const displayNames = { alice: 'Alice', bob: 'Bob', candy: 'Candy' };
  const participants = Object.fromEntries(names.map(name => [name, null]));
  
  const dom = {
    generateAll: document.getElementById('generate-all'),
    quickGenerateAll: document.getElementById('btn-quick-generate-all'),
    quickRunFlow: document.getElementById('btn-quick-run-flow'),
    quickReset: document.getElementById('btn-quick-reset'),
    nextStep: document.getElementById('next-step'),
    reset: document.getElementById('reset-exchange'),
    message: document.getElementById('app-message'),
    resultSection: document.getElementById('result-section'),
    sharedSecret: document.getElementById('shared-secret'),
    kdfDerivedKey: document.getElementById('kdf-derived-key'),
    participantResults: document.getElementById('participant-results'),
    copySecretBtn: document.getElementById('copy-secret-btn'),
    copyKdfBtn: document.getElementById('copy-kdf-btn'),
    // Elementos del diagrama SVG
    pathAB: document.getElementById('path-a-b'),
    pathBC: document.getElementById('path-b-c'),
    pathCA: document.getElementById('path-c-a'),
    lblAB: document.getElementById('lbl-a-b'),
    lblBC: document.getElementById('lbl-b-c'),
    lblCA: document.getElementById('lbl-c-a'),
    svgAliceSub: document.getElementById('svg-alice-sub'),
    svgBobSub: document.getElementById('svg-bob-sub'),
    svgCandySub: document.getElementById('svg-candy-sub')
  };

  let exchangeStage = 0;
  let partialPoints = null;

  // Actualizar banner de mensajes
  function setMessage(text, type = 'info') {
    if (!dom.message) return;
    const textEl = dom.message.querySelector('.status-text') || dom.message;
    textEl.textContent = text;
    dom.message.className = `status-banner ${type}-status`;
  }

  // Inicializar o comprobar biblioteca elliptic
  function requireCryptoLibrary() {
    if (!window.elliptic || !window.crypto || !window.crypto.getRandomValues) {
      throw new Error('No se pudo cargar la librería criptográfica elliptic (P-256) o la fuente de aleatoriedad Web Crypto. Recarga la página.');
    }
    return new window.elliptic.ec('p256');
  }

  function getPublicHex(keyPair) {
    return keyPair.getPublic().encode('hex', false);
  }

  function encodePoint(point) {
    return point.encode('hex', false);
  }

  // Asignar claves generadas a un participante
  function setParticipantKey(name, keyPair) {
    participants[name] = keyPair;
    const pubHex = getPublicHex(keyPair);
    const privHex = keyPair.getPrivate('hex');

    const pubEl = document.getElementById(`${name}-public`);
    const privEl = document.getElementById(`${name}-private`);
    const stateEl = document.getElementById(`${name}-state`);
    const ownerBtn = document.querySelector(`[data-owner="${name}"]`);
    const revealBtn = document.querySelector(`[data-reveal="${name}-private"]`);

    if (pubEl) pubEl.value = pubHex;
    if (privEl) {
      privEl.value = privHex;
      privEl.classList.remove('revealed');
    }
    if (revealBtn) {
      revealBtn.textContent = 'Revelar';
      revealBtn.setAttribute('aria-pressed', 'false');
    }
    if (stateEl) {
      stateEl.textContent = 'P-256 Activa ✓';
      stateEl.classList.add('ready');
    }
    if (ownerBtn) {
      ownerBtn.textContent = `🔄 Regenerar Clave de ${displayNames[name]}`;
    }

    // Actualizar etiquetas en el SVG
    if (name === 'alice' && dom.svgAliceSub) dom.svgAliceSub.textContent = `A = ${pubHex.slice(0, 10)}…`;
    if (name === 'bob' && dom.svgBobSub) dom.svgBobSub.textContent = `B = ${pubHex.slice(0, 10)}…`;
    if (name === 'candy' && dom.svgCandySub) dom.svgCandySub.textContent = `C = ${pubHex.slice(0, 10)}…`;
  }

  // Reset del diagrama SVG
  function resetSvgDiagram() {
    [dom.pathAB, dom.pathBC, dom.pathCA].forEach(p => p && p.classList.remove('active'));
    [dom.lblAB, dom.lblBC, dom.lblCA].forEach(l => l && l.classList.remove('active'));
    if (dom.lblAB) dom.lblAB.textContent = 'USB 1: Punto A';
    if (dom.lblBC) dom.lblBC.textContent = 'USB 2: Punto B';
    if (dom.lblCA) dom.lblCA.textContent = 'USB 3: Punto C';
  }

  // Reiniciar estado de las rondas de intercambio
  function clearExchangeResults() {
    exchangeStage = 0;
    partialPoints = null;
    if (dom.resultSection) dom.resultSection.hidden = true;
    if (dom.sharedSecret) dom.sharedSecret.textContent = '';
    if (dom.kdfDerivedKey) dom.kdfDerivedKey.textContent = 'Calculando hash SHA-256...';
    if (dom.participantResults) dom.participantResults.innerHTML = '';

    for (let round = 1; round <= 3; round++) {
      const element = document.getElementById(`round-${round}`);
      if (element) {
        element.classList.remove('complete', 'active');
        if (round > 1) element.classList.add('pending');
        const st = element.querySelector('.round-status-pill');
        if (st) st.textContent = 'Pendiente';
      }
    }

    const r1 = document.getElementById('round-1-data');
    const r2 = document.getElementById('round-2-data');
    const r3 = document.getElementById('round-3-data');
    if (r1) r1.innerHTML = '<span class="placeholder-text">Esperando la generación de claves para iniciar la Ronda 1...</span>';
    if (r2) r2.innerHTML = '<span class="placeholder-text">Esperando la finalización de la Ronda 1...</span>';
    if (r3) r3.innerHTML = '<span class="placeholder-text">Esperando la finalización de la Ronda 2...</span>';

    resetSvgDiagram();

    const allGenerated = names.every(name => participants[name]);
    if (dom.nextStep) {
      dom.nextStep.textContent = 'Iniciar Intercambio →';
      dom.nextStep.disabled = !allGenerated;
    }

    if (allGenerated) {
      setMessage('Las 3 identidades tienen pares de claves listos. Presiona "Iniciar Intercambio" para comenzar la Ronda 1.', 'info');
    } else {
      setMessage('Genera un par de claves para Alice, Bob y Candy para comenzar la simulación del intercambio cíclico.', 'info');
    }
  }

  function completeRound(round, dataHtml) {
    const element = document.getElementById(`round-${round}`);
    if (element) {
      element.classList.remove('pending', 'active');
      element.classList.add('complete');
      const st = element.querySelector('.round-status-pill');
      if (st) st.textContent = 'Completada ✓';
    }
    const dataBox = document.getElementById(`round-${round}-data`);
    if (dataBox) dataBox.innerHTML = dataHtml;
  }

  // Ronda 1: Difusión de Puntos Públicos
  function roundOne() {
    const chipsHtml = names.map(name => {
      const pub = getPublicHex(participants[name]);
      return `<div class="data-chip"><strong>${displayNames[name]} (Público):</strong> ${pub.slice(0, 18)}…${pub.slice(-10)}</div>`;
    }).join('');

    completeRound(1, chipsHtml);

    // Preparar Ronda 2
    const r2 = document.getElementById('round-2');
    if (r2) {
      r2.classList.remove('pending');
      r2.classList.add('active');
    }

    // Actualizar SVG
    [dom.pathAB, dom.pathBC, dom.pathCA].forEach(p => p && p.classList.add('active'));
    [dom.lblAB, dom.lblBC, dom.lblCA].forEach(l => l && l.classList.add('active'));
    if (dom.lblAB) dom.lblAB.textContent = 'A → Bob';
    if (dom.lblBC) dom.lblBC.textContent = 'B → Candy';
    if (dom.lblCA) dom.lblCA.textContent = 'C → Alice';

    dom.nextStep.textContent = 'Calcular Puntos Parciales (Ronda 2) →';
    setMessage('Ronda 1 completada: Puntos públicos iniciales generados y colocados en los dispositivos USB.', 'success');
  }

  // Ronda 2: Multiplicación escalar parcial y segundo traspaso USB
  function roundTwo(ec) {
    const alicePoint = ec.keyFromPublic(getPublicHex(participants.alice), 'hex').getPublic();
    const bobPoint = ec.keyFromPublic(getPublicHex(participants.bob), 'hex').getPublic();
    const candyPoint = ec.keyFromPublic(getPublicHex(participants.candy), 'hex').getPublic();

    partialPoints = {
      alice: candyPoint.mul(participants.alice.getPrivate()), // a * C = acG
      bob: alicePoint.mul(participants.bob.getPrivate()),      // b * A = baG
      candy: bobPoint.mul(participants.candy.getPrivate())     // c * B = cbG
    };

    const chipsHtml = [
      `<div class="data-chip"><strong>Alice calculó a·C (ac·G):</strong> ${encodePoint(partialPoints.alice).slice(0, 20)}…</div>`,
      `<div class="data-chip"><strong>Bob calculó b·A (ba·G):</strong> ${encodePoint(partialPoints.bob).slice(0, 20)}…</div>`,
      `<div class="data-chip"><strong>Candy calculó c·B (cb·G):</strong> ${encodePoint(partialPoints.candy).slice(0, 20)}…</div>`
    ].join('');

    completeRound(2, chipsHtml);

    // Preparar Ronda 3
    const r3 = document.getElementById('round-3');
    if (r3) {
      r3.classList.remove('pending');
      r3.classList.add('active');
    }

    // Actualizar SVG: segundo traspaso de parciales
    if (dom.lblAB) dom.lblAB.textContent = 'ac·G → Bob';
    if (dom.lblBC) dom.lblBC.textContent = 'ba·G → Candy';
    if (dom.lblCA) dom.lblCA.textContent = 'cb·G → Alice';

    dom.nextStep.textContent = 'Derivar Secreto Compartido (Ronda 3) →';
    setMessage('Ronda 2 completada: Cada participante calculó su punto parcial e intercambió el USB para la fase final.', 'success');
  }

  // Función auxiliar para calcular SHA-256 de una cadena hexadecimal
  async function computeSha256Hex(hexString) {
    try {
      const match = hexString.match(/.{1,2}/g);
      if (!match) return 'Error';
      const bytes = new Uint8Array(match.map(byte => parseInt(byte, 16)));
      const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return 'No compatible con Web Crypto API';
    }
  }

  // Ronda 3: Derivación independiente y verificación
  async function roundThree() {
    const derived = {
      alice: partialPoints.candy.mul(participants.alice.getPrivate()), // a * (cb G) = abc G
      bob: partialPoints.alice.mul(participants.bob.getPrivate()),     // b * (ac G) = bac G = abc G
      candy: partialPoints.bob.mul(participants.candy.getPrivate())    // c * (ba G) = cba G = abc G
    };

    const sharedPoints = Object.values(derived).map(encodePoint);
    const matches = sharedPoints.every(value => value === sharedPoints[0]);

    const chipsHtml = names.map(name => {
      const pt = encodePoint(derived[name]);
      return `<div class="data-chip"><strong>${displayNames[name]} derivó abc·G:</strong> ${pt.slice(0, 18)}…${pt.slice(-10)}</div>`;
    }).join('');

    completeRound(3, chipsHtml);

    if (!matches) {
      setMessage('Error de derivación: Los puntos calculados no coinciden. Reinicia e intenta nuevamente.', 'error');
      dom.nextStep.disabled = true;
      return;
    }

    // Coordenada X (256 bits / 64 hex chars)
    const sharedHex = derived.alice.getX().toString('hex', 64);
    if (dom.sharedSecret) {
      dom.sharedSecret.textContent = sharedHex;
    }

    // Derivar Clave Simétrica (KDF SHA-256)
    const kdfKey = await computeSha256Hex(sharedHex);
    if (dom.kdfDerivedKey) {
      dom.kdfDerivedKey.textContent = kdfKey;
    }

    // Detalle de comprobación individual
    if (dom.participantResults) {
      dom.participantResults.innerHTML = names.map(name => `
        <article class="result-card-person ${name}">
          <div class="person-title">
            <span>${displayNames[name]}</span>
            <span class="result-check">✓ Coincide</span>
          </div>
          <code>${derived[name].getX().toString('hex', 64)}</code>
        </article>
      `).join('');
    }

    if (dom.resultSection) {
      dom.resultSection.hidden = false;
      dom.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    dom.nextStep.textContent = '✓ Intercambio Completado';
    dom.nextStep.disabled = true;

    // SVG: Todos verificados
    [dom.lblAB, dom.lblBC, dom.lblCA].forEach(l => {
      if (l) l.textContent = '✓ abc·G';
    });

    setMessage('¡Verificación unánime exitosa! Alice, Bob y Candy derivaron de forma autónoma exactamente el mismo secreto de grupo.', 'success');
  }

  // Copiado universal a portapapeles con fallback
  async function copyText(text, btnElement, successText = '¡Copiado!') {
    if (!text) return;
    const oldText = btnElement.textContent;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      btnElement.textContent = successText;
      setTimeout(() => { btnElement.textContent = oldText; }, 1400);
    } catch {
      btnElement.textContent = 'Error';
      setTimeout(() => { btnElement.textContent = oldText; }, 1400);
    }
  }

  // Generar par individual
  document.querySelectorAll('.generate-key').forEach(button => {
    button.addEventListener('click', () => {
      try {
        const ec = requireCryptoLibrary();
        setParticipantKey(button.dataset.owner, ec.genKeyPair());
        clearExchangeResults();
      } catch (error) {
        setMessage(error.message, 'error');
      }
    });
  });

  // Generar las 3 identidades
  function generateAllKeys() {
    try {
      const ec = requireCryptoLibrary();
      names.forEach(name => setParticipantKey(name, ec.genKeyPair()));
      clearExchangeResults();
    } catch (error) {
      setMessage(error.message, 'error');
    }
  }

  if (dom.generateAll) dom.generateAll.addEventListener('click', generateAllKeys);
  if (dom.quickGenerateAll) dom.quickGenerateAll.addEventListener('click', generateAllKeys);

  // Botón de revelado de clave privada
  document.querySelectorAll('.reveal-btn').forEach(button => {
    button.addEventListener('click', () => {
      const field = document.getElementById(button.dataset.reveal);
      if (!field) return;
      const isRevealed = button.getAttribute('aria-pressed') === 'true';
      const nextState = !isRevealed;
      field.classList.toggle('revealed', nextState);
      button.setAttribute('aria-pressed', String(nextState));
      button.textContent = nextState ? 'Ocultar' : 'Revelar';
    });
  });

  // Botón de copiado
  document.querySelectorAll('.copy-btn').forEach(button => {
    button.addEventListener('click', () => {
      const fieldId = button.dataset.copy;
      if (fieldId) {
        const field = document.getElementById(fieldId);
        if (field && field.value) {
          copyText(field.value, button);
        } else {
          setMessage('Genera primero las claves para copiar este valor.', 'error');
        }
      }
    });
  });

  // Copiado de secreto y KDF
  if (dom.copySecretBtn) {
    dom.copySecretBtn.addEventListener('click', () => {
      if (dom.sharedSecret && dom.sharedSecret.textContent) {
        copyText(dom.sharedSecret.textContent, dom.copySecretBtn);
      }
    });
  }

  if (dom.copyKdfBtn) {
    dom.copyKdfBtn.addEventListener('click', () => {
      if (dom.kdfDerivedKey && dom.kdfDerivedKey.textContent) {
        copyText(dom.kdfDerivedKey.textContent, dom.copyKdfBtn);
      }
    });
  }

  // Manejador del botón "Siguiente Paso / Ronda"
  if (dom.nextStep) {
    dom.nextStep.addEventListener('click', async () => {
      try {
        const ec = requireCryptoLibrary();
        if (!names.every(name => participants[name])) {
          setMessage('Genera primero el par de claves de Alice, Bob y Candy.', 'error');
          return;
        }
        if (exchangeStage === 0) {
          roundOne();
        } else if (exchangeStage === 1) {
          roundTwo(ec);
        } else if (exchangeStage === 2) {
          await roundThree();
        }
        exchangeStage += 1;
      } catch (error) {
        setMessage(`Error en el intercambio: ${error.message}`, 'error');
      }
    });
  }

  // Simular flujo completo automáticamente
  if (dom.quickRunFlow) {
    dom.quickRunFlow.addEventListener('click', async () => {
      try {
        const ec = requireCryptoLibrary();
        // 1. Generar si faltan
        if (!names.every(name => participants[name])) {
          generateAllKeys();
        } else {
          clearExchangeResults();
        }

        // 2. Ronda 1
        roundOne();
        exchangeStage = 1;

        // Pausa sutil para efecto visual
        await new Promise(r => setTimeout(r, 450));

        // 3. Ronda 2
        roundTwo(ec);
        exchangeStage = 2;

        await new Promise(r => setTimeout(r, 450));

        // 4. Ronda 3
        await roundThree();
        exchangeStage = 3;
      } catch (err) {
        setMessage(err.message, 'error');
      }
    });
  }

  // Botones de reinicio
  if (dom.reset) dom.reset.addEventListener('click', clearExchangeResults);
  if (dom.quickReset) {
    dom.quickReset.addEventListener('click', () => {
      names.forEach(name => {
        participants[name] = null;
        const pubEl = document.getElementById(`${name}-public`);
        const privEl = document.getElementById(`${name}-private`);
        const stateEl = document.getElementById(`${name}-state`);
        const ownerBtn = document.querySelector(`[data-owner="${name}"]`);
        if (pubEl) pubEl.value = '';
        if (privEl) {
          privEl.value = '';
          privEl.classList.remove('revealed');
        }
        if (stateEl) {
          stateEl.textContent = 'Sin claves';
          stateEl.classList.remove('ready');
        }
        if (ownerBtn) ownerBtn.textContent = `🔑 Generar Par de ${displayNames[name]}`;
      });
      clearExchangeResults();
    });
  }

  // Diagnóstico inicial de biblioteca
  if (!window.elliptic) {
    setMessage('Atención: La biblioteca elliptic no se pudo cargar. Revisa que el archivo elliptic.min.js esté presente.', 'error');
  }
})();