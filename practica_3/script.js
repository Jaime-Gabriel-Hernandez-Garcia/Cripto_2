(() => {
  'use strict';

  const names = ['alice', 'bob', 'candy'];
  const displayNames = { alice: 'Alice', bob: 'Bob', candy: 'Candy' };
  const participants = Object.fromEntries(names.map(name => [name, null]));
  const dom = {
    generateAll: document.getElementById('generate-all'),
    nextStep: document.getElementById('next-step'),
    reset: document.getElementById('reset-exchange'),
    message: document.getElementById('app-message'),
    resultSection: document.getElementById('result-section'),
    sharedSecret: document.getElementById('shared-secret'),
    participantResults: document.getElementById('participant-results')
  };
  let exchangeStage = 0;
  let partialPoints = null;

  function setMessage(text, type = '') {
    dom.message.textContent = text;
    dom.message.className = `notice${type ? ` ${type}` : ''}`;
  }

  function requireCryptoLibrary() {
    if (!window.elliptic || !window.crypto || !window.crypto.getRandomValues) {
      throw new Error('No se pudo cargar elliptic o la fuente segura de aleatoriedad del navegador. Revisa tu conexión y vuelve a cargar la página.');
    }
    return new window.elliptic.ec('p256');
  }

  function getPublicHex(keyPair) {
    return keyPair.getPublic().encode('hex', false);
  }

  function encodePoint(point) {
    return point.encode('hex', false);
  }

  function setParticipantKey(name, keyPair) {
    participants[name] = keyPair;
    document.getElementById(`${name}-public`).value = getPublicHex(keyPair);
    document.getElementById(`${name}-private`).value = keyPair.getPrivate('hex');
    document.getElementById(`${name}-private`).classList.remove('revealed');
    const revealButton = document.querySelector(`[data-reveal="${name}-private"]`);
    revealButton.textContent = 'Revelar';
    revealButton.setAttribute('aria-pressed', 'false');
    document.getElementById(`${name}-state`).textContent = 'Par generado';
    document.getElementById(`${name}-state`).classList.add('ready');
    document.querySelector(`[data-owner="${name}"]`).textContent = 'Regenerar par de claves';
  }

  function clearExchangeResults() {
    exchangeStage = 0;
    partialPoints = null;
    dom.resultSection.hidden = true;
    dom.sharedSecret.textContent = '';
    dom.participantResults.textContent = '';
    for (let round = 1; round <= 3; round++) {
      const element = document.getElementById(`round-${round}`);
      element.classList.remove('complete');
      if (round > 1) element.classList.add('pending');
      element.querySelector('.round-status').textContent = 'Pendiente';
    }
    document.getElementById('round-1-data').innerHTML = '<span>Esperando las tres claves públicas</span>';
    document.getElementById('round-2-data').innerHTML = '<span>Esperando la primera ronda</span>';
    document.getElementById('round-3-data').innerHTML = '<span>Esperando la segunda ronda</span>';
    dom.nextStep.textContent = 'Iniciar intercambio →';
    dom.nextStep.disabled = !names.every(name => participants[name]);
    setMessage(names.every(name => participants[name])
      ? 'Las tres identidades tienen claves. Inicia el intercambio para comenzar las rondas.'
      : 'Genera un par de claves para Alice, Bob y Candy para habilitar el intercambio.');
  }

  function completeRound(round, dataHtml) {
    const element = document.getElementById(`round-${round}`);
    element.classList.remove('pending');
    element.classList.add('complete');
    element.querySelector('.round-status').textContent = 'Completada';
    document.getElementById(`round-${round}-data`).innerHTML = dataHtml;
  }

  function roundOne() {
    completeRound(1, names.map(name => `<span class="data-chip"><strong>${displayNames[name]}:</strong> ${getPublicHex(participants[name]).slice(0, 20)}…</span>`).join(''));
    document.getElementById('round-2').classList.remove('pending');
    dom.nextStep.textContent = 'Calcular parciales →';
    setMessage('Ronda 1 lista: los tres puntos públicos están disponibles para el intercambio por USB.', 'success');
  }

  function roundTwo(ec) {
    const alicePoint = ec.keyFromPublic(getPublicHex(participants.alice), 'hex').getPublic();
    const bobPoint = ec.keyFromPublic(getPublicHex(participants.bob), 'hex').getPublic();
    const candyPoint = ec.keyFromPublic(getPublicHex(participants.candy), 'hex').getPublic();
    partialPoints = {
      alice: candyPoint.mul(participants.alice.getPrivate()),
      bob: alicePoint.mul(participants.bob.getPrivate()),
      candy: bobPoint.mul(participants.candy.getPrivate())
    };

    completeRound(2, names.map(name => `<span class="data-chip"><strong>${displayNames[name]}:</strong> ${encodePoint(partialPoints[name]).slice(0, 20)}…</span>`).join(''));
    document.getElementById('round-3').classList.remove('pending');
    dom.nextStep.textContent = 'Derivar y verificar →';
    setMessage('Ronda 2 lista: cada parcial viajó al siguiente participante. Los escalares privados permanecen locales.', 'success');
  }

  function roundThree() {
    const derived = {
      alice: partialPoints.candy.mul(participants.alice.getPrivate()),
      bob: partialPoints.alice.mul(participants.bob.getPrivate()),
      candy: partialPoints.bob.mul(participants.candy.getPrivate())
    };
    const sharedPoints = Object.values(derived).map(encodePoint);
    const matches = sharedPoints.every(value => value === sharedPoints[0]);

    completeRound(3, names.map(name => `<span class="data-chip"><strong>${displayNames[name]}:</strong> ${sharedPoints[names.indexOf(name)].slice(0, 20)}…</span>`).join(''));
    if (!matches) {
      setMessage('La verificación falló: los puntos calculados no coinciden. Reinicia el intercambio y prueba de nuevo.', 'error');
      dom.nextStep.disabled = true;
      return;
    }

    const sharedHex = derived.alice.getX().toString('hex', 64);
    dom.sharedSecret.innerHTML = `<span>Secreto compartido · coordenada X de abcG</span>${sharedHex}`;
    dom.participantResults.innerHTML = names.map(name => `
      <article class="result-person"><strong>${displayNames[name]} · verificado ✓</strong><code>${derived[name].getX().toString('hex', 64)}</code></article>
    `).join('');
    dom.resultSection.hidden = false;
    dom.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    dom.nextStep.textContent = 'Intercambio completado';
    dom.nextStep.disabled = true;
    setMessage('Verificación correcta: Alice, Bob y Candy derivaron exactamente el mismo punto compartido.', 'success');
  }

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

  dom.generateAll.addEventListener('click', () => {
    try {
      const ec = requireCryptoLibrary();
      names.forEach(name => setParticipantKey(name, ec.genKeyPair()));
      clearExchangeResults();
    } catch (error) {
      setMessage(error.message, 'error');
    }
  });

  document.querySelectorAll('.reveal-button').forEach(button => {
    button.addEventListener('click', () => {
      const field = document.getElementById(button.dataset.reveal);
      const reveal = button.getAttribute('aria-pressed') !== 'true';
      field.classList.toggle('revealed', reveal);
      button.setAttribute('aria-pressed', String(reveal));
      button.textContent = reveal ? 'Ocultar' : 'Revelar';
    });
  });

  document.querySelectorAll('.copy-button').forEach(button => {
    button.addEventListener('click', async () => {
      const field = document.getElementById(button.dataset.copy);
      if (!field.value) {
        setMessage('Genera primero las claves de esta identidad.', 'error');
        return;
      }
      try {
        await navigator.clipboard.writeText(field.value);
        button.textContent = 'Copiada';
        window.setTimeout(() => { button.textContent = 'Copiar'; }, 1400);
      } catch {
        setMessage('El navegador no permitió copiar al portapapeles. Selecciona y copia la clave manualmente.', 'error');
      }
    });
  });

  dom.nextStep.addEventListener('click', () => {
    try {
      const ec = requireCryptoLibrary();
      if (!names.every(name => participants[name])) {
        setMessage('Genera primero el par de claves de Alice, Bob y Candy.', 'error');
        return;
      }
      if (exchangeStage === 0) roundOne();
      else if (exchangeStage === 1) roundTwo(ec);
      else if (exchangeStage === 2) roundThree();
      exchangeStage += 1;
    } catch (error) {
      setMessage(`No se pudo completar el paso: ${error.message}`, 'error');
    }
  });

  dom.reset.addEventListener('click', clearExchangeResults);

  if (!window.elliptic) {
    setMessage('No se pudo cargar la librería criptográfica desde jsDelivr. Revisa tu conexión a internet y recarga la página.', 'error');
  }
})();