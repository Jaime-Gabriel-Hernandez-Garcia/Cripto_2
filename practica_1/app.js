/**
 * App - Controlador principal de la Práctica de Criptografía Híbrida (ESCOM IPN)
 * Gestiona pestañas, acciones de Alicia, Candy, Betito, Nube (Drive) y Diagrama.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const engine = new CryptoEngine();
  const storage = new CloudStorage();

  // Inicializar llaves criptográficas de todos los roles
  await engine.initAllKeys();

  // --- Elementos de Navegación por Pestañas ---
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-content-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      if (!targetId) return;

      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

  // Botón "¿Guía de Práctica?" en el header
  const btnQuickGuide = document.getElementById('btn-quick-guide');
  if (btnQuickGuide) {
    btnQuickGuide.addEventListener('click', () => {
      const guideBtn = document.querySelector('[data-tab="view-guide"]');
      if (guideBtn) guideBtn.click();
    });
  }

  // Modal de Referencias Criptográficas (Requisito Pág. 3)
  const btnCryptoRefs = document.getElementById('btn-crypto-refs');
  const refsModal = document.getElementById('refs-modal');
  const refsModalClose = document.getElementById('refs-modal-close');
  const refsModalBtnClose = document.getElementById('refs-modal-btn-close');

  function openRefsModal() {
    if (refsModal) refsModal.classList.add('active');
  }
  function closeRefsModal() {
    if (refsModal) refsModal.classList.remove('active');
  }

  btnCryptoRefs?.addEventListener('click', openRefsModal);
  refsModalClose?.addEventListener('click', closeRefsModal);
  refsModalBtnClose?.addEventListener('click', closeRefsModal);
  refsModal?.addEventListener('click', (e) => {
    if (e.target === refsModal) closeRefsModal();
  });

  // --- Descarga de Llaves Públicas en formato PEM (Requisito de Práctica) ---
  async function downloadKeyPem(role, filename) {
    const pem = await engine.exportPublicKeyPem(role);
    const blob = new Blob([pem], { type: 'application/x-pem-file' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  document.getElementById('btn-download-alicia-key')?.addEventListener('click', () => {
    downloadKeyPem('alicia', 'alicia_public.pem');
  });

  document.getElementById('btn-download-candy-key')?.addEventListener('click', () => {
    downloadKeyPem('candy', 'candy_public.pem');
  });

  document.getElementById('btn-download-betito-key')?.addEventListener('click', () => {
    downloadKeyPem('betito', 'betito_public.pem');
  });

  document.getElementById('btn-export-keys')?.addEventListener('click', async () => {
    await downloadKeyPem('alicia', 'alicia_public.pem');
    setTimeout(() => downloadKeyPem('candy', 'candy_public.pem'), 200);
    setTimeout(() => downloadKeyPem('betito', 'betito_public.pem'), 400);
  });

  // --- Sincronización y Actualización de la Nube (Drive) ---
  const driveTableBody = document.getElementById('drive-table-body');
  const driveBadgeCount = document.getElementById('drive-badge-count');
  const selectBetitoFile = document.getElementById('select-betito-file');
  const selectTamperTarget = document.getElementById('select-tamper-target');
  const selectRepairTarget = document.getElementById('select-repair-target');

  function updateCloudUI() {
    const files = storage.getAllFiles();
    const filenames = Object.keys(files);

    // 1. Contador de la Nube
    if (driveBadgeCount) {
      driveBadgeCount.textContent = filenames.length;
    }

    // 2. Selectores desplegables
    // Para Betito: no revelamos el autor por adelantado (el Inciso D pide que Betito lo deduzca descifrando)
    if (selectBetitoFile) {
      selectBetitoFile.innerHTML = filenames.length === 0
        ? '<option value="">No hay archivos en la nube</option>'
        : '<option value="">-- Seleccionar archivo (' + filenames.length + ' disponibles) --</option>' +
          filenames.map(name => `<option value="${name}">Archivo: ${name}</option>`).join('');
    }

    // Para Candy: sí puede ver los detalles
    if (selectTamperTarget) {
      selectTamperTarget.innerHTML = filenames.length === 0
        ? '<option value="">No hay archivos en la nube</option>'
        : '<option value="">-- Seleccionar archivo para alterar --</option>' +
          filenames.map(name => {
            const f = files[name];
            const tag = f.isTampered ? ' [🚨 YA ALTERADO]' : '';
            return `<option value="${name}">${name} (Origen: ${f.author})${tag}</option>`;
          }).join('');
    }
    if (selectRepairTarget) {
      const tamperedFiles = filenames.filter(n => files[n].isTampered);
      selectRepairTarget.innerHTML = tamperedFiles.length === 0
        ? '<option value="">No hay archivos alterados actualmente</option>'
        : '<option value="">-- Seleccionar archivo a restaurar --</option>' +
          tamperedFiles.map(n => `<option value="${n}">${n} [Alterado]</option>`).join('');
    }

    // 3. Tabla en Pestaña Nube
    if (driveTableBody) {
      if (filenames.length === 0) {
        driveTableBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align:center; color:var(--text-muted); padding:2rem;">
              No hay archivos en la nube. Ve a la pestaña de Alicia o Candy para subir uno.
            </td>
          </tr>`;
      } else {
        driveTableBody.innerHTML = filenames.map(name => {
          const f = files[name];
          const meta = f.package.metadata || {};
          const statusBadge = f.isTampered
            ? '<span class="role-badge badge-red">🚨 INTEGRIDAD VIOLADA</span>'
            : '<span class="role-badge badge-green">INTACTO</span>';

          const authorBadge = f.author === 'alicia'
            ? '<span class="role-badge badge-pink">ALICIA</span>'
            : '<span class="role-badge badge-purple">CANDY</span>';

          return `
            <tr>
              <td><strong>${name}</strong></td>
              <td>${authorBadge}</td>
              <td>${meta.isEncrypted ? '<span class="role-badge badge-blue">AES-CBC</span>' : 'No'}</td>
              <td>${meta.isSigned ? '<span class="role-badge badge-green">RSA-SHA256</span>' : 'No'}</td>
              <td>${statusBadge}</td>
              <td style="font-size:0.8rem; color:#94a3b8;">${new Date(f.uploadedAt).toLocaleTimeString()}</td>
              <td>
                <button class="btn btn-secondary btn-action-download" data-file="${name}" style="padding:0.25rem 0.6rem; font-size:0.75rem;">📥 Descargar</button>
                <button class="btn btn-danger-outline btn-action-delete" data-file="${name}" style="padding:0.25rem 0.6rem; font-size:0.75rem; margin-left:4px;">🗑️</button>
              </td>
            </tr>`;
        }).join('');

        // Eventos en botones de tabla
        document.querySelectorAll('.btn-action-download').forEach(btn => {
          btn.addEventListener('click', () => {
            const fname = btn.getAttribute('data-file');
            if (fname) storage.downloadFileAsJson(fname);
          });
        });

        document.querySelectorAll('.btn-action-delete').forEach(btn => {
          btn.addEventListener('click', () => {
            const fname = btn.getAttribute('data-file');
            if (fname && confirm(`¿Eliminar ${fname} de la nube?`)) {
              storage.deleteFile(fname);
            }
          });
        });
      }
    }
  }

  // Escuchar sincronización en tiempo real
  storage.onSync(() => {
    updateCloudUI();
  });

  // Vaciar nube
  document.getElementById('btn-drive-clear')?.addEventListener('click', () => {
    if (confirm('¿Vaciar todos los archivos de la nube?')) {
      storage.clearDrive();
    }
  });

  // ========================================================
  // ACCIONES DE ALICIA (INCISO A)
  // ========================================================
  const aliciaMsgInput = document.getElementById('alicia-msg-input');
  const aliciaOptCipher = document.getElementById('alicia-opt-cipher');
  const aliciaOptSign = document.getElementById('alicia-opt-sign');
  const aliciaFilenameInput = document.getElementById('alicia-filename-input');
  const btnAliciaSend = document.getElementById('btn-alicia-send');
  const aliciaConsole = document.getElementById('alicia-console');

  if (btnAliciaSend) {
    btnAliciaSend.addEventListener('click', async () => {
      const msg = aliciaMsgInput.value.trim() || 'Mensaje de Alicia';
      const filename = aliciaFilenameInput.value.trim() || 'mensaje_alicia';
      const applyCipher = aliciaOptCipher.checked;
      const applySign = aliciaOptSign.checked;

      btnAliciaSend.disabled = true;
      btnAliciaSend.textContent = 'Procesando Criptografía...';

      try {
        const pkg = await engine.createHybridPackage({
          author: 'alicia',
          plaintext: msg,
          applyEncryption: applyCipher,
          applySignature: applySign
        });

        // Guardar en la nube (Drive)
        storage.uploadFile(filename, pkg);

        // Desglose en consola
        let logOutput = `=== [INCISO A] ALICIA: CIFRADO Y FIRMA DE MENSAJE ===\n`;
        logOutput += `Fecha: ${new Date().toLocaleTimeString()}\n`;
        logOutput += `Archivo en Nube: "${filename}"\n`;
        logOutput += `Servicios Seleccionados:\n`;
        logOutput += `  • Cifrado Simétrico: ${applyCipher ? 'ACTIVO (Confidencialidad)' : 'INACTIVO'}\n`;
        logOutput += `  • Firma Digital: ${applySign ? 'ACTIVO (Autenticación, Integridad, No Repudio)' : 'INACTIVO'}\n\n`;
        logOutput += `--- TRAZA PASO A PASO ---\n`;
        logOutput += pkg.debugDetails.log.join('\n') + '\n\n';

        if (applyCipher && pkg.dhPublicExchange) {
          logOutput += `--- INTERCAMBIO DIFFIE-HELLMAN (K e IV) ---\n`;
          logOutput += `• Secreto a de Alicia: 0x${pkg.debugDetails.dh.a ? pkg.debugDetails.dh.a.slice(0, 16) : 'N/A'}...\n`;
          logOutput += `• Llave pública Ka = g^a mod p: 0x${pkg.dhPublicExchange.Ka.slice(0, 24)}...\n`;
          logOutput += `• Clave compartida K = Kb^a mod p: 0x${pkg.debugDetails.dh.K ? pkg.debugDetails.dh.K.slice(0, 24) : 'N/A'}...\n`;
          logOutput += `• K_AES derivada (128 bits): 0x${pkg.debugDetails.aesKeyHex}\n`;
          logOutput += `• Vector IV derivado por DH: 0x${pkg.debugDetails.ivHex}\n`;
          logOutput += `• Criptograma AES-CBC: ${pkg.content.payload.slice(0, 48)}...\n\n`;
        }

        if (applySign) {
          logOutput += `--- INTEGRIDAD Y FIRMA ---\n`;
          logOutput += `• Digest SHA-256 (Embudo): 0x${pkg.debugDetails.hashHex}\n`;
          logOutput += `• Bits iniciales: ${pkg.debugDetails.hashBinary}\n`;
          logOutput += `• Firma Digital RSA (con A_Privada): ${pkg.content.signature.slice(0, 48)}...\n`;
        }

        logOutput += `\n[✔] Archivo "${filename}" almacenado con éxito en la Nube (Drive). Listo para que Betito lo descargue.\n`;

        aliciaConsole.textContent = logOutput;
        aliciaConsole.scrollTop = aliciaConsole.scrollHeight;

        // Cambiar texto de botón
        btnAliciaSend.textContent = '✔ Guardado en Nube (Inciso A)';
        setTimeout(() => {
          btnAliciaSend.disabled = false;
          btnAliciaSend.textContent = '🚀 Cifrar, Firmar y Guardar en la Nube (Inciso A)';
        }, 2500);

      } catch (err) {
        aliciaConsole.textContent = `[!] Error en Alicia: ${err.message}`;
        btnAliciaSend.disabled = false;
        btnAliciaSend.textContent = '🚀 Cifrar, Firmar y Guardar en la Nube (Inciso A)';
      }
    });
  }

  // ========================================================
  // ACCIONES DE CANDY (INCISOS B, C, E, F)
  // ========================================================
  const candyMsgInput = document.getElementById('candy-msg-input');
  const candyOptCipher = document.getElementById('candy-opt-cipher');
  const candyOptSign = document.getElementById('candy-opt-sign');
  const candyFilenameInput = document.getElementById('candy-filename-input');
  const btnCandySend = document.getElementById('btn-candy-send');
  const candyConsole = document.getElementById('candy-console');

  // Switch de pestañas internas de Candy (Envío vs Ataque)
  const btnTabCandySend = document.getElementById('btn-tab-candy-send');
  const btnTabCandyAttack = document.getElementById('btn-tab-candy-attack');
  const candyPanelSend = document.getElementById('candy-panel-send');
  const candyPanelAttack = document.getElementById('candy-panel-attack');

  if (btnTabCandySend && btnTabCandyAttack) {
    btnTabCandySend.addEventListener('click', () => {
      btnTabCandySend.classList.add('active');
      btnTabCandyAttack.classList.remove('active');
      if (candyPanelSend) candyPanelSend.style.display = 'flex';
      if (candyPanelAttack) candyPanelAttack.style.display = 'none';
    });

    btnTabCandyAttack.addEventListener('click', () => {
      btnTabCandyAttack.classList.add('active');
      btnTabCandySend.classList.remove('active');
      if (candyPanelSend) candyPanelSend.style.display = 'none';
      if (candyPanelAttack) candyPanelAttack.style.display = 'flex';
    });
  }

  // Inciso B: Candy cifra y firma
  if (btnCandySend) {
    btnCandySend.addEventListener('click', async () => {
      const msg = candyMsgInput.value.trim() || 'Mensaje de Candy';
      const filename = candyFilenameInput.value.trim() || 'mensaje_candy';
      const applyCipher = candyOptCipher.checked;
      const applySign = candyOptSign.checked;

      btnCandySend.disabled = true;
      btnCandySend.textContent = 'Procesando...';

      try {
        const pkg = await engine.createHybridPackage({
          author: 'candy',
          plaintext: msg,
          applyEncryption: applyCipher,
          applySignature: applySign
        });

        storage.uploadFile(filename, pkg);

        let logOutput = `=== [INCISO B] CANDY: CIFRADO Y FIRMA DE MENSAJE ===\n`;
        logOutput += `Archivo en Nube: "${filename}"\n`;
        logOutput += `Autor: Candy (Clave Privada de Candy)\n`;
        logOutput += pkg.debugDetails.log.join('\n') + '\n';
        logOutput += `\n[✔] Archivo "${filename}" almacenado en la Nube.\n`;

        candyConsole.textContent = logOutput;
        candyConsole.scrollTop = candyConsole.scrollHeight;

        btnCandySend.textContent = '✔ Guardado en Nube (Inciso B)';
        setTimeout(() => {
          btnCandySend.disabled = false;
          btnCandySend.textContent = '🚀 Cifrar, Firmar y Guardar en la Nube (Inciso B)';
        }, 2500);
      } catch (err) {
        candyConsole.textContent = `[!] Error en Candy: ${err.message}`;
        btnCandySend.disabled = false;
      }
    });
  }

  // Inciso C: Candy altera archivos en la nube, duplica y renombra a x, y, z
  const btnCandyIncisoC = document.getElementById('btn-candy-inciso-c');
  if (btnCandyIncisoC) {
    btnCandyIncisoC.addEventListener('click', async () => {
      let files = storage.getAllFiles();
      let names = Object.keys(files);

      // Asegurar que existan archivos base para crear x, y, z
      if (names.length === 0) {
        // Crear automáticamente mensaje de Alicia y de Candy
        const pkgA = await engine.createHybridPackage({
          author: 'alicia',
          plaintext: 'Mensaje legítimo de Alicia para Betito',
          applyEncryption: true,
          applySignature: true
        });
        storage.uploadFile('temp_alicia', pkgA);

        const pkgC = await engine.createHybridPackage({
          author: 'candy',
          plaintext: 'Mensaje confidencial de Candy para Betito',
          applyEncryption: true,
          applySignature: true
        });
        storage.uploadFile('temp_candy', pkgC);

        files = storage.getAllFiles();
        names = Object.keys(files);
      }

      // Proceder con el Inciso C:
      // Duplicar un archivo para tener 3 archivos y renombrarlos a x, y, z
      const sourceA = names[0];
      const sourceB = names[1] || names[0];

      // Guardar x (de primer archivo)
      storage.uploadFile('x', JSON.parse(JSON.stringify(files[sourceA].package)));

      // Guardar y (de segundo archivo o duplicado)
      storage.uploadFile('y', JSON.parse(JSON.stringify(files[sourceB].package)));

      // Guardar z (duplicado de x)
      storage.uploadFile('z', JSON.parse(JSON.stringify(files[sourceA].package)));

      // Si quedaron archivos temporales, eliminarlos para que solo queden x, y, z
      if (files['temp_alicia']) storage.deleteFile('temp_alicia');
      if (files['temp_candy']) storage.deleteFile('temp_candy');

      let logC = `=== [INCISO C] CANDY: MANIPULACIÓN DE ARCHIVOS EN LA NUBE ===\n`;
      logC += `Acción realizada: Duplicar archivo y renombrar como 'x', 'y', 'z'.\n`;
      logC += `Archivos actuales en la Nube (Total 3):\n`;
      logC += `  • Archivo "x" (Original: ${files[sourceA].author})\n`;
      logC += `  • Archivo "y" (Original: ${files[sourceB].author})\n`;
      logC += `  • Archivo "z" (Duplicado generado por Candy)\n`;
      logC += `\n[✔] Inciso C completado con éxito. Betito ahora debe indicar el autor de cada archivo (Inciso D).\n`;

      candyConsole.textContent = logC;
      candyConsole.scrollTop = candyConsole.scrollHeight;
    });
  }

  // Inciso E: Candy altera integridad para forzar fallo en Betito
  const btnCandyIncisoE = document.getElementById('btn-candy-inciso-e');
  if (btnCandyIncisoE) {
    btnCandyIncisoE.addEventListener('click', () => {
      const target = selectTamperTarget.value;
      if (!target) {
        alert('Por favor selecciona un archivo de la lista para alterar.');
        return;
      }

      storage.tamperFile(target);

      let logE = `=== [INCISO E] CANDY: FORZAR FALLO DEL SERVICIO DE INTEGRIDAD ===\n`;
      logE += `Archivo atacado: "${target}"\n`;
      logE += `Ataque: Modificación de 1 bit en el criptograma en tránsito (Man-in-the-Middle).\n`;
      logE += `Consecuencia esperada en Betito:\n`;
      logE += `  -> El hash SHA-256 no coincidirá con la Firma Digital RSA.\n`;
      logE += `  -> El servicio de Integridad y Autenticación marcarán FALLO (❌).\n`;
      logE += `  -> Betito mostrará la carita triste (☹️).\n`;

      candyConsole.textContent = logE;
      candyConsole.scrollTop = candyConsole.scrollHeight;
    });
  }

  // Inciso F: Candy corrige el archivo para restaurar integridad
  const btnCandyIncisoF = document.getElementById('btn-candy-inciso-f');
  if (btnCandyIncisoF) {
    btnCandyIncisoF.addEventListener('click', () => {
      const target = selectRepairTarget.value;
      if (!target) {
        alert('Por favor selecciona un archivo alterado para restaurar.');
        return;
      }

      storage.repairFile(target);

      let logF = `=== [INCISO F] CANDY: CORREGIR ARCHIVO / RESTAURAR INTEGRIDAD ===\n`;
      logF += `Archivo reparado: "${target}"\n`;
      logF += `Restauración: Se revirtió el bit alterado al valor original legítimo.\n`;
      logF += `Consecuencia esperada en Betito:\n`;
      logF += `  -> La firma digital volverá a verificar exitosamente (✅).\n`;
      logF += `  -> Betito mostrará la carita feliz (😃).\n`;

      candyConsole.textContent = logF;
      candyConsole.scrollTop = candyConsole.scrollHeight;
    });
  }

  // ========================================================
  // ACCIONES DE BETITO (INCISO D Y MENÚ MODULAR)
  // ========================================================
  const btnBetitoProcess = document.getElementById('btn-betito-process');
  const betitoDetectedAuthor = document.getElementById('betito-detected-author');
  const badgeSvcConf = document.getElementById('badge-svc-conf');
  const badgeSvcInteg = document.getElementById('badge-svc-integ');
  const badgeSvcAuth = document.getElementById('badge-svc-auth');
  const badgeSvcNonrep = document.getElementById('badge-svc-nonrep');
  const betitoFaceIcon = document.getElementById('betito-face-icon');
  const betitoVerdictText = document.getElementById('betito-verdict-text');
  const betitoRecoveredMsg = document.getElementById('betito-recovered-msg');
  const betitoConsole = document.getElementById('betito-console');

  // Menú de Selección de Procesos en Betito (Pág. 3)
  const betitoOptDecrypt = document.getElementById('betito-opt-decrypt');
  const betitoOptVerify = document.getElementById('betito-opt-verify');

  // Manejo e Importación de Llaves Públicas en Betito (Nota Pág. 4)
  let betitoCustomKey = null;
  const inputBetitoPem = document.getElementById('input-betito-pem');
  const betitoKeyStatus = document.getElementById('betito-key-status');
  const btnLoadWebAlice = document.getElementById('btn-load-web-alice');
  const btnLoadWebCandy = document.getElementById('btn-load-web-candy');
  const btnResetKeyMode = document.getElementById('btn-reset-key-mode');

  if (inputBetitoPem) {
    inputBetitoPem.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        betitoCustomKey = await engine.importPublicKeyFromPem(text);
        if (betitoKeyStatus) {
          betitoKeyStatus.innerHTML = `✅ Llave importada de archivo: <strong>${file.name}</strong>`;
          betitoKeyStatus.style.color = '#34d399';
        }
      } catch (err) {
        alert('Error al importar archivo PEM: ' + err.message);
      }
    });
  }

  if (btnLoadWebAlice) {
    btnLoadWebAlice.addEventListener('click', async () => {
      try {
        const pem = await engine.exportPublicKeyPem('alicia');
        betitoCustomKey = await engine.importPublicKeyFromPem(pem);
        if (betitoKeyStatus) {
          betitoKeyStatus.innerHTML = `✅ Descargada de Web: <strong>alicia_public.pem</strong>`;
          betitoKeyStatus.style.color = '#f472b6';
        }
      } catch (err) {
        alert('Error al descargar llave de Alicia: ' + err.message);
      }
    });
  }

  if (btnLoadWebCandy) {
    btnLoadWebCandy.addEventListener('click', async () => {
      try {
        const pem = await engine.exportPublicKeyPem('candy');
        betitoCustomKey = await engine.importPublicKeyFromPem(pem);
        if (betitoKeyStatus) {
          betitoKeyStatus.innerHTML = `✅ Descargada de Web: <strong>candy_public.pem</strong>`;
          betitoKeyStatus.style.color = '#c084fc';
        }
      } catch (err) {
        alert('Error al descargar llave de Candy: ' + err.message);
      }
    });
  }

  if (btnResetKeyMode) {
    btnResetKeyMode.addEventListener('click', () => {
      betitoCustomKey = null;
      if (betitoKeyStatus) {
        betitoKeyStatus.innerHTML = `ℹ️ Estado Llave: Detección automática (Alicia / Candy).`;
        betitoKeyStatus.style.color = 'var(--accent-cyan)';
      }
      if (inputBetitoPem) inputBetitoPem.value = '';
    });
  }

  if (btnBetitoProcess) {
    btnBetitoProcess.addEventListener('click', async () => {
      const selectedFile = selectBetitoFile.value;
      if (!selectedFile) {
        alert('Por favor selecciona un archivo de la lista para procesar.');
        return;
      }

      const fileItem = storage.getFile(selectedFile);
      if (!fileItem) {
        alert('El archivo no existe en la nube.');
        return;
      }

      const applyDecryption = betitoOptDecrypt ? betitoOptDecrypt.checked : true;
      const applyVerification = betitoOptVerify ? betitoOptVerify.checked : true;

      if (!applyDecryption && !applyVerification) {
        alert('Debes seleccionar al menos un servicio en el menú (Descifrado o Verificación).');
        return;
      }

      btnBetitoProcess.disabled = true;
      btnBetitoProcess.textContent = 'Procesando Servicios Seleccionados...';

      try {
        const result = await engine.processAndVerifyPackage(fileItem.package, {
          applyDecryption,
          applyVerification,
          customVerificationKey: betitoCustomKey
        });

        // 1. Mostrar autor identificado
        betitoDetectedAuthor.textContent = result.detectedAuthor;
        if (result.detectedAuthor.includes('Alicia')) {
          betitoDetectedAuthor.className = 'role-badge badge-pink';
        } else if (result.detectedAuthor.includes('Candy')) {
          betitoDetectedAuthor.className = 'role-badge badge-purple';
        } else if (result.detectedAuthor.includes('Importada') || result.detectedAuthor.includes('PEM')) {
          betitoDetectedAuthor.className = 'role-badge badge-green';
        } else {
          betitoDetectedAuthor.className = 'role-badge badge-red';
        }

        // 2. Actualizar semáforo de servicios
        function setBadge(el, activeRequested, isOk, textOk, textFail) {
          if (!activeRequested) {
            el.className = 'role-badge badge-blue';
            el.querySelector('span').textContent = 'NO SOLICITADO ⏸️';
          } else {
            el.className = isOk ? 'role-badge badge-green' : 'role-badge badge-red';
            el.querySelector('span').textContent = isOk ? textOk : textFail;
          }
        }

        setBadge(badgeSvcConf, applyDecryption, result.services.confidencialidad, 'VÁLIDA (AES+DH) ✅', 'FALLIDA ❌');
        setBadge(badgeSvcInteg, applyVerification, result.services.integridad, 'VÁLIDA (SHA-256) ✅', 'FALLIDA ❌');
        setBadge(badgeSvcAuth, applyVerification, result.services.autenticacion, 'CONFIRMADA ✅', 'NO VERIFICADA ❌');
        setBadge(badgeSvcNonrep, applyVerification, result.services.noRepudio, 'VIGENTE ✅', 'INAPLICABLE ❌');

        // 3. Carita y veredicto
        const confOk = !applyDecryption || result.services.confidencialidad;
        const integOk = !applyVerification || result.services.integridad;
        const allOk = confOk && integOk;

        if (allOk) {
          betitoFaceIcon.textContent = '😃';
          betitoVerdictText.textContent = `Archivo "${selectedFile}" procesado correctamente con los servicios solicitados. Autor: ${result.detectedAuthor}.`;
          betitoVerdictText.style.color = 'var(--accent-green)';
        } else {
          betitoFaceIcon.textContent = '☹️';
          betitoVerdictText.textContent = `¡ALERTA DE SEGURIDAD! Fallo en servicios seleccionados para "${selectedFile}".`;
          betitoVerdictText.style.color = 'var(--accent-red)';
        }

        // 4. Mensaje descifrado recuperado
        betitoRecoveredMsg.textContent = result.recoveredPlaintext;
        betitoRecoveredMsg.className = allOk ? 'code-block green' : 'code-block pink';

        // 5. Consola detallada de Betito
        let logBetito = `=== [INCISO D] BETITO: PROCESAMIENTO HÍBRIDO (DIFFIE-HELLMAN + RSA) ===\n`;
        logBetito += `Archivo analizado: "${selectedFile}"\n`;
        logBetito += `Fecha: ${new Date().toLocaleTimeString()}\n`;
        logBetito += `Servicios solicitados: Descifrado=${applyDecryption ? 'SÍ' : 'NO'}, Verificación=${applyVerification ? 'SÍ' : 'NO'}\n\n`;
        logBetito += result.opLog.join('\n') + '\n\n';
        logBetito += `--- RESULTADO FINAL ---\n`;
        logBetito += `• Autor del archivo: ${result.detectedAuthor}\n`;
        logBetito += `• Contenido: "${result.recoveredPlaintext}"\n`;
        logBetito += `• Veredicto visual: ${allOk ? 'CORRECTO (😃)' : 'FALLIDO (☹️)'}\n`;

        betitoConsole.textContent = logBetito;
        betitoConsole.scrollTop = betitoConsole.scrollHeight;

        btnBetitoProcess.disabled = false;
        btnBetitoProcess.textContent = '🔓 Procesar Archivo (Inciso D)';
      } catch (err) {
        betitoConsole.textContent = `[!] Excepción en Betito: ${err.message}`;
        btnBetitoProcess.disabled = false;
        btnBetitoProcess.textContent = '🔓 Procesar Archivo (Inciso D)';
      }
    });
  }

  // ========================================================
  // CONTROLADOR DEL DIAGRAMA ANIMADO (SIMULADOR VISUAL)
  // ========================================================
  const inputMessage = document.getElementById('input-message');
  const diagramMsgInput = document.getElementById('diagram-msg-input');
  const diagramBetitoOutput = document.getElementById('diagram-betito-output');
  const btnPlay = document.getElementById('btn-play');
  const playIcon = document.getElementById('play-icon');
  const playText = document.getElementById('play-text');
  const btnStep = document.getElementById('btn-step');
  const btnReset = document.getElementById('btn-reset');
  const btnTamper = document.getElementById('btn-tamper');
  const selectSpeed = document.getElementById('select-speed');

  const statusText = document.getElementById('status-text');
  const statusStepHint = document.getElementById('status-step-hint');

  const lblAliceHash = document.getElementById('lbl-alice-hash');
  const lblAliceSig = document.getElementById('lbl-alice-sig');
  const lblBetitoSig = document.getElementById('lbl-betito-sig');
  const lblBetitoHash = document.getElementById('lbl-betito-hash');
  const lblBetitoRsaHash = document.getElementById('lbl-betito-rsa-hash');
  const iconHappy = document.getElementById('icon-happy');
  const iconSad = document.getElementById('icon-sad');
  const chkConf = document.getElementById('chk-conf');
  const chkInteg = document.getElementById('chk-integ');
  const chkAuth = document.getElementById('chk-auth');
  const chkNonrep = document.getElementById('chk-nonrep');
  const chkBadge = document.getElementById('chk-badge');

  let isPlaying = false;
  let currentStep = 0;
  const totalSteps = 8;
  let timerId = null;
  let isDiagramTampered = false;
  let diagramCryptoData = null;

  const stepsConfig = [
    { step: 1, title: 'Mensaje Original (m)', activeStreams: ['stream-m-aes', 'stream-m-hash'], activeNodes: ['station-alice-m'] },
    { step: 2, title: 'Diffie-Hellman: Clave K y Vector IV', activeStreams: ['stream-dh-alice-aes', 'stream-dh-betito-aes'], activeNodes: ['station-dh'] },
    { step: 3, title: 'Cifrado AES-CBC y Digest Hash SHA-256', activeStreams: ['stream-aes-cipher', 'stream-hash-rsa'], activeNodes: ['station-alice-aes', 'station-alice-cipher', 'station-alice-hash'] },
    { step: 4, title: 'Firma Digital RSA de Alicia', activeStreams: ['stream-rsa-sig'], activeNodes: ['station-alice-rsa', 'station-alice-sig'] },
    { step: 5, title: 'Transmisión por la Nube (Canal Inseguro)', activeStreams: ['stream-cipher-cloud', 'stream-sig-cloud'], activeNodes: ['station-cloud', 'station-betito-sig-in', 'station-betito-cipher-in'] },
    { step: 6, title: 'Descifrado AES y Extracción RSA (Betito)', activeStreams: ['stream-cipher-betito-aes', 'stream-betito-aes-m', 'stream-betito-sig-rsa'], activeNodes: ['station-betito-aes', 'station-betito-m', 'station-betito-rsa'] },
    { step: 7, title: 'Embudo Hash SHA-256 en Betito', activeStreams: ['stream-betito-m-hash', 'stream-betito-hash-comp', 'stream-betito-rsa-comp'], activeNodes: ['station-betito-hash'] },
    { step: 8, title: 'Comparador de Integridad y Servicios (=)', activeStreams: [], activeNodes: ['station-comparator'] }
  ];

  async function updateDiagramCrypto() {
    const text = (inputMessage ? inputMessage.value.trim() : '') || 'Mensaje de prueba';
    const pkg = await engine.createHybridPackage({
      author: 'alicia',
      plaintext: text,
      applyEncryption: true,
      applySignature: true
    });

    if (isDiagramTampered) {
      pkg.content.payload = pkg.content.payload.slice(0, -1) + 'F';
    }

    const verification = await engine.processAndVerifyPackage(pkg);

    diagramCryptoData = {
      pkg,
      verification,
      plaintext: text
    };

    if (lblAliceHash) lblAliceHash.textContent = pkg.debugDetails.hashBinary.slice(0, 8) + '..';
    if (lblAliceSig) lblAliceSig.textContent = pkg.content.signature.slice(0, 8) + '..';
    if (lblBetitoSig) lblBetitoSig.textContent = pkg.content.signature.slice(0, 8) + '..';
    if (lblBetitoHash) lblBetitoHash.textContent = verification.localHashBinary.slice(0, 8) + '..';
    if (lblBetitoRsaHash) lblBetitoRsaHash.textContent = pkg.debugDetails.hashBinary.slice(0, 8) + '..';
  }

  function clearDiagramStates() {
    document.querySelectorAll('.flow-stream').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.node-shape').forEach(el => el.classList.remove('active'));
    if (iconHappy) iconHappy.setAttribute('opacity', '0.2');
    if (iconSad) iconSad.setAttribute('opacity', '0.2');
    if (chkBadge) chkBadge.setAttribute('opacity', '0.2');
    [chkConf, chkInteg, chkAuth, chkNonrep].forEach(el => {
      if (el) el.className.baseVal = 'security-list-item';
    });
  }

  function renderDiagramStep(idx) {
    if (idx === 0) {
      clearDiagramStates();
      if (statusText) statusText.textContent = 'Listo. Presiona "Iniciar Flujo" o usa "Paso a Paso".';
      if (statusStepHint) statusStepHint.textContent = `(Paso 0 de ${totalSteps})`;
      return;
    }

    const conf = stepsConfig[idx - 1];
    if (!conf) return;

    if (statusText) statusText.textContent = `${conf.title}`;
    if (statusStepHint) statusStepHint.textContent = `(Paso ${idx} de ${totalSteps})`;

    conf.activeStreams.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('active');
    });

    conf.activeNodes.forEach(id => {
      const node = document.getElementById(id);
      if (node) node.querySelectorAll('.node-shape').forEach(s => s.classList.add('active'));
    });

    if (diagramBetitoOutput) {
      if (idx >= 6 && diagramCryptoData) {
        diagramBetitoOutput.textContent = diagramCryptoData.verification.recoveredPlaintext;
        diagramBetitoOutput.style.color = diagramCryptoData.verification.decryptionSuccessful ? 'var(--accent-cyan)' : 'var(--accent-red)';
      } else {
        diagramBetitoOutput.textContent = 'Esperando flujo...';
        diagramBetitoOutput.style.color = 'var(--text-muted)';
      }
    }

    if (idx === 8 && diagramCryptoData) {
      const ok = diagramCryptoData.verification.services.integridad;
      if (ok) {
        if (iconHappy) iconHappy.setAttribute('opacity', '1');
        if (iconSad) iconSad.setAttribute('opacity', '0.1');
        if (chkBadge) { chkBadge.setAttribute('opacity', '1'); chkBadge.textContent = '✅'; }
        if (chkConf) chkConf.classList.add('verified');
        if (chkInteg) chkInteg.classList.add('verified');
        if (chkAuth) chkAuth.classList.add('verified');
        if (chkNonrep) chkNonrep.classList.add('verified');
      } else {
        if (iconHappy) iconHappy.setAttribute('opacity', '0.1');
        if (iconSad) iconSad.setAttribute('opacity', '1');
        if (chkBadge) { chkBadge.setAttribute('opacity', '1'); chkBadge.textContent = '❌'; }
        if (chkInteg) chkInteg.classList.add('failed');
      }
    }
  }

  async function nextDiagramStep() {
    if (!diagramCryptoData) await updateDiagramCrypto();
    if (currentStep >= totalSteps) {
      currentStep = 0;
      clearDiagramStates();
    }
    currentStep++;
    renderDiagramStep(currentStep);
    if (currentStep >= totalSteps && isPlaying) stopDiagramPlay();
  }

  function toggleDiagramPlay() {
    if (isPlaying) stopDiagramPlay();
    else startDiagramPlay();
  }

  async function startDiagramPlay() {
    isPlaying = true;
    if (playIcon) playIcon.textContent = '⏸';
    if (playText) playText.textContent = 'Pausar';
    btnPlay.classList.remove('btn-primary');
    btnPlay.classList.add('btn-secondary');

    if (!diagramCryptoData) await updateDiagramCrypto();
    if (currentStep >= totalSteps) {
      currentStep = 0;
      clearDiagramStates();
    }

    const interval = parseInt(selectSpeed.value, 10) || 3000;
    const loop = () => {
      if (!isPlaying) return;
      nextDiagramStep();
      if (currentStep < totalSteps) {
        timerId = setTimeout(loop, interval);
      } else {
        stopDiagramPlay();
      }
    };
    loop();
  }

  function stopDiagramPlay() {
    isPlaying = false;
    if (playIcon) playIcon.textContent = '▶';
    if (playText) playText.textContent = 'Iniciar Flujo';
    btnPlay.classList.remove('btn-secondary');
    btnPlay.classList.add('btn-primary');
    if (timerId) clearTimeout(timerId);
  }

  btnPlay?.addEventListener('click', toggleDiagramPlay);
  btnStep?.addEventListener('click', () => {
    stopDiagramPlay();
    nextDiagramStep();
  });
  btnReset?.addEventListener('click', () => {
    stopDiagramPlay();
    currentStep = 0;
    clearDiagramStates();
    updateDiagramCrypto();
  });

  btnTamper?.addEventListener('click', async () => {
    isDiagramTampered = !isDiagramTampered;
    btnTamper.classList.toggle('active', isDiagramTampered);
    btnTamper.innerHTML = isDiagramTampered
      ? '<span>🚨</span> Ataque Activo'
      : '<span>⚡</span> Alterar Paquete';
    await updateDiagramCrypto();
    if (currentStep > 0) renderDiagramStep(currentStep);
  });

  inputMessage?.addEventListener('input', () => {
    if (diagramMsgInput) diagramMsgInput.value = inputMessage.value;
    updateDiagramCrypto();
  });

  if (diagramMsgInput) {
    diagramMsgInput.addEventListener('input', () => {
      if (inputMessage) inputMessage.value = diagramMsgInput.value;
      updateDiagramCrypto();
    });
    diagramMsgInput.addEventListener('keydown', (e) => e.stopPropagation());
  }

  // ========================================================
  // INSPECTOR DE NODOS DEL DIAGRAMA INTERACTIVO (MODAL)
  // ========================================================
  const inspectorModal = document.getElementById('inspector-modal');
  const modalClose = document.getElementById('modal-close');
  const modalBtnAction = document.getElementById('modal-btn-action');
  const modalIcon = document.getElementById('modal-icon');
  const modalTitle = document.getElementById('modal-title');
  const modalContent = document.getElementById('modal-content');

  function openInspectorModal(title, icon, html) {
    if (!inspectorModal) return;
    if (modalTitle) modalTitle.textContent = title;
    if (modalIcon) modalIcon.textContent = icon;
    if (modalContent) modalContent.innerHTML = html;
    inspectorModal.classList.add('active', 'open');
  }

  function closeInspectorModal() {
    if (inspectorModal) inspectorModal.classList.remove('active', 'open');
  }

  modalClose?.addEventListener('click', closeInspectorModal);
  modalBtnAction?.addEventListener('click', closeInspectorModal);
  inspectorModal?.addEventListener('click', (e) => {
    if (e.target === inspectorModal) closeInspectorModal();
  });

  const nodeDescriptions = {
    'dh': {
      title: 'Intercambio de Llaves Diffie-Hellman (Esquema 2)',
      icon: '🤝',
      getContent: (d) => `
        <p><strong>Propósito:</strong> Establecer una clave simétrica secreta compartida (<em>K</em>) y un vector de inicialización (<em>IV</em>) a través de un canal inseguro sin transmitir la clave.</p>
        <div style="background:rgba(2,6,23,0.6); padding:0.8rem; border-radius:8px; font-family:var(--font-mono); font-size:0.82rem; margin:0.6rem 0; line-height:1.5;">
          <strong style="color:var(--accent-cyan);">Para K:</strong><br>
          • Primo p: 1024 bits (RFC 3526 MODP Group 2), Generador g = 2<br>
          • Secreto a de Alicia: 0x${d?.pkg?.debugDetails?.dh?.a?.slice(0, 16) || '...'}...<br>
          • Llave Pública Ka: g^a mod p = 0x${d?.pkg?.dhPublicExchange?.Ka?.slice(0, 20) || '...'}...<br>
          • Llave Pública Kb: g^b mod p = 0x${d?.pkg?.debugDetails?.dh?.Kb?.slice(0, 20) || '...'}...<br>
          • <strong>K Compartida:</strong> S = Kb^a mod p = Ka^b mod p = 0x${d?.pkg?.debugDetails?.dh?.K?.slice(0, 20) || '...'}...<br>
          • <strong>K_AES derivada (128 bits):</strong> 0x${d?.pkg?.debugDetails?.aesKeyHex || '...'}<br><br>
          <strong style="color:var(--accent-amber);">Para IV:</strong><br>
          • Secreto c de Alicia: 0x${d?.pkg?.debugDetails?.dh?.c?.slice(0, 16) || '...'}...<br>
          • Llave Pública Kc: g^c mod p = 0x${d?.pkg?.dhPublicExchange?.Kc?.slice(0, 20) || '...'}...<br>
          • Llave Pública Kd: g^d mod p = 0x${d?.pkg?.debugDetails?.dh?.Kd?.slice(0, 20) || '...'}...<br>
          • <strong>IV Compartido:</strong> S = Kd^c mod p = Kc^d mod p = 0x${d?.pkg?.debugDetails?.dh?.IV?.slice(0, 20) || '...'}...<br>
          • <strong>Vector IV derivado (128 bits):</strong> 0x${d?.pkg?.debugDetails?.ivHex || '...'}
        </div>
        <p><strong>Servicio provisto:</strong> Base matemática para la Confidencialidad sin almacenamiento previo de llaves compartidas.</p>
      `
    },
    'alice-m': {
      title: 'Mensaje Original (m) - Alicia',
      icon: '📄',
      getContent: (d) => `
        <p>Texto en claro redactado por el emisor que requiere protección de seguridad.</p>
        <div class="code-block" style="margin:0.6rem 0;">"${d?.plaintext || '...'}"</div>
        <p><strong>Longitud:</strong> ${(d?.plaintext || '').length} caracteres (${new TextEncoder().encode(d?.plaintext || '').byteLength} bytes UTF-8).</p>
      `
    },
    'alice-aes': {
      title: 'Cifrado Simétrico AES-CBC (Alicia)',
      icon: '🔒',
      getContent: (d) => `
        <p><strong>Algoritmo:</strong> AES en modo CBC (Cipher Block Chaining) con bloque de 128 bits y relleno PKCS#7 (NIST FIPS 197).</p>
        <p>Utiliza la clave simétrica <em>K_AES</em> y el vector <em>IV</em> calculados mediante Diffie-Hellman.</p>
        <div style="background:rgba(2,6,23,0.6); padding:0.8rem; border-radius:8px; font-family:var(--font-mono); font-size:0.82rem; margin:0.6rem 0;">
          • K_AES: 0x${d?.pkg?.debugDetails?.aesKeyHex || '...'}<br>
          • IV: 0x${d?.pkg?.debugDetails?.ivHex || '...'}<br>
          • Criptograma generado: ${d?.pkg?.content?.payload?.slice(0, 40) || '...'}...
        </div>
        <p><strong>Servicio:</strong> Confidencialidad.</p>
      `
    },
    'alice-hash': {
      title: 'Función Resumen Criptográfica SHA-256 (Embudo)',
      icon: '⚗️',
      getContent: (d) => `
        <p><strong>Algoritmo:</strong> SHA-256 (NIST FIPS 180-4).</p>
        <p>Reduce cualquier longitud de mensaje a un resumen irreversible y único de 256 bits (32 bytes).</p>
        <div style="background:rgba(2,6,23,0.6); padding:0.8rem; border-radius:8px; font-family:var(--font-mono); font-size:0.82rem; margin:0.6rem 0;">
          • Digest Hex: 0x${d?.pkg?.debugDetails?.hashHex || '...'}<br>
          • Bits representativos: ${d?.pkg?.debugDetails?.hashBinary || '...'}
        </div>
        <p><strong>Servicio:</strong> Integridad de Datos.</p>
      `
    },
    'alice-rsa': {
      title: 'Firma Digital RSA (Alicia)',
      icon: '✍️',
      getContent: (d) => `
        <p><strong>Algoritmo:</strong> RSASSA-PKCS1-v1_5 con módulo de 2048 bits (RFC 8017).</p>
        <p>El emisor cifra el hash SHA-256 utilizando su propia <strong>Clave Privada (A_Privada)</strong>.</p>
        <div style="background:rgba(2,6,23,0.6); padding:0.8rem; border-radius:8px; font-family:var(--font-mono); font-size:0.82rem; margin:0.6rem 0;">
          • Firma Digital: ${d?.pkg?.content?.signature?.slice(0, 48) || '...'}... (256 bytes)
        </div>
        <p><strong>Servicios:</strong> Autenticación (solo Alicia tiene su clave privada) y No Repudio (no puede negar el envío).</p>
      `
    },
    'cloud': {
      title: 'Canal Inseguro de Transmisión (La Nube / Drive)',
      icon: '☁️',
      getContent: (d) => `
        <p>Medio de transporte público donde cualquier atacante (ej. Candy) puede interceptar o alterar paquetes.</p>
        <p><strong>Elementos transmitidos según el Esquema 2 de la Dra. Nidia:</strong></p>
        <ul>
          <li>1. Criptograma <em>c</em> (Cifrado con AES-CBC).</li>
          <li>2. Firma digital RSA (Hash cifrado con A_Privada).</li>
          <li>3. Parámetros públicos DH (Ka, Kc) para que Betito pueda calcular K e IV.</li>
        </ul>
        <p style="color:var(--accent-amber);"><em>¡La clave AES no viaja en el canal ni existe sobre digital RSA! Se deduce matemáticamente por Diffie-Hellman.</em></p>
      `
    },
    'comparator': {
      title: 'Comparador de Integridad (=)',
      icon: '⚖️',
      getContent: (d) => `
        <p>Betito compara:</p>
        <ul>
          <li><strong>Hash Local:</strong> Obtenido pasando el mensaje descifrado por el embudo SHA-256 local.</li>
          <li><strong>Hash Verificado:</strong> Obtenido aplicando la clave pública de Alicia (A_Pública) a la firma digital recibida.</li>
        </ul>
        <p>Si ambos son idénticos bit a bit: 😃 <strong>Los 4 servicios están garantizados</strong>.</p>
        <p>Si difieren: ☹️ <strong>Alerta: Ataque o corrupción de datos detectada</strong>.</p>
      `
    }
  };

  document.querySelectorAll('.station-node').forEach(node => {
    const stId = node.getAttribute('data-station');
    if (!stId) return;
    node.style.cursor = 'pointer';
    node.addEventListener('click', () => {
      const info = nodeDescriptions[stId] || {
        title: `Estación: ${stId}`,
        icon: '🔍',
        getContent: () => '<p>Nodo del esquema de Criptografía Híbrida.</p>'
      };
      openInspectorModal(info.title, info.icon, info.getContent(diagramCryptoData));
    });
  });

  // Actualizar nube y diagrama inicial
  updateCloudUI();
  updateDiagramCrypto();
});
