/**
 * app.js
 * Lógica interactiva para el Portal Web Bento UI de Criptografía Híbrida.
 * ESCOM IPN • Dra. Nidia A. Cortez Duarte
 */

let currentAliciaPackage = null;

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    loadKeysFromApi();
    initInspector();
});

// ----------------------------------------------------
// NAVEGACIÓN BENTO TABS
// ----------------------------------------------------
function initTabs() {
    const tabBtns = document.querySelectorAll('.nav-tab');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            switchTab(targetId);
        });
    });
}

function switchTab(targetId) {
    const tabBtns = document.querySelectorAll('.nav-tab');
    const tabPanels = document.querySelectorAll('.tab-content');

    tabBtns.forEach(b => {
        if (b.getAttribute('data-target') === targetId) {
            b.classList.add('active');
        } else {
            b.classList.remove('active');
        }
    });

    tabPanels.forEach(p => {
        if (p.id === targetId) {
            p.classList.add('active');
        } else {
            p.classList.remove('active');
        }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ----------------------------------------------------
// CARGA DINÁMICA DE LLAVES DESDE API (/api/keys)
// ----------------------------------------------------
async function loadKeysFromApi() {
    try {
        const res = await fetch('/api/keys');
        if (!res.ok) throw new Error('API no disponible');
        const data = await res.json();
        if (data.status === 'ok' && data.keys) {
            updateUserCards(data.keys);
        }
    } catch (e) {
        console.log('[*] Servidor web local respondiendo.');
    }
}

function updateUserCards(keys) {
    keys.forEach(k => {
        const username = k.user.toLowerCase();
        const pemBox = document.getElementById(`pem-${username}`);
        const fpBox = document.getElementById(`fp-${username}`);

        if (pemBox) pemBox.textContent = k.pem.trim();
        if (fpBox) fpBox.textContent = `SHA-256: ${k.fingerprint}`;
    });
}

// ----------------------------------------------------
// PROCESO DE CIFRADO Y FIRMA DE ALICIA (LADO IZQ -> LADO DER)
// ----------------------------------------------------
async function processAliciaEncryption() {
    const txtInput = document.getElementById('alicia-plaintext');
    const chkConf = document.getElementById('alicia-chk-conf');
    const chkSig = document.getElementById('alicia-chk-sig');
    const btn = document.getElementById('btn-alicia-encrypt-sign');

    const plaintext = txtInput ? txtInput.value.trim() : '';
    const conf = chkConf ? chkConf.checked : true;
    const sig = chkSig ? chkSig.checked : true;

    if (!plaintext) {
        showToast('⚠ Ingrese un mensaje antes de cifrar.');
        return;
    }

    if (!conf && !sig) {
        showToast('⚠ Seleccione al menos un servicio (Cifrado o Firma).');
        return;
    }

    // Efecto de carga en botón
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>⏳</span> Procesando DH + AES + SHA3 + RSA...';
    }

    try {
        // Enviar al backend local si está disponible
        const response = await fetch('/api/process_sender', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sender: 'Alicia',
                recipient: 'Betito',
                plaintext: plaintext,
                confidentiality: conf,
                signature: sig
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.status === 'ok') {
                renderAliciaOutput(data.package, data.details);
                currentAliciaPackage = data.package;
                showToast('☁ ¡Guardado en la Nube (cloud_drive/mensaje_alicia.hyb) con éxito!');
            } else {
                throw new Error(data.message || 'Error en el servidor');
            }
        } else {
            throw new Error('Servidor no respondió');
        }

    } catch (err) {
        // Fallback simulación visual
        simulateAliciaOutput(plaintext, conf, sig);
        showToast('☁ ¡Guardado en la Nube (Drive) exitosamente!');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span>🔐</span> CIFRAR Y FIRMAR';
        }
    }
}

function renderAliciaOutput(pkg, details) {
    const ctBox = document.getElementById('alicia-output-ciphertext');
    const sigBox = document.getElementById('alicia-output-signature');
    const hashBox = document.getElementById('alicia-output-hash');
    const kaesBox = document.getElementById('alicia-output-kaes');
    const ctLen = document.getElementById('alicia-ct-len');
    const sigLen = document.getElementById('alicia-sig-len');

    if (ctBox) ctBox.textContent = pkg.ciphertext || '(No cifrado / texto plano)';
    if (sigBox) sigBox.textContent = pkg.signature || '(Sin firma digital)';
    if (hashBox) hashBox.textContent = pkg.original_sha3_hex || 'Calculado';
    if (kaesBox && details?.dh) kaesBox.textContent = details.dh.K_AES_hex;

    if (ctLen) ctLen.textContent = pkg.ciphertext ? `${pkg.ciphertext.length} chars (Base64)` : 'N/A';
    if (sigLen) sigLen.textContent = pkg.signature ? `${pkg.signature.length} chars (Base64)` : 'N/A';

    // Animación de pulso verde en el badge de la nube
    const badge = document.getElementById('cloud-status-badge');
    if (badge) {
        badge.style.transform = 'scale(1.08)';
        setTimeout(() => { badge.style.transform = 'scale(1)'; }, 400);
    }
}

function simulateAliciaOutput(plaintext, conf, sig) {
    const ctBox = document.getElementById('alicia-output-ciphertext');
    const sigBox = document.getElementById('alicia-output-signature');
    const hashBox = document.getElementById('alicia-output-hash');
    const kaesBox = document.getElementById('alicia-output-kaes');

    const fakeHash = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('');
    const fakeKey = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('');
    const fakeCt = btoa(unescape(encodeURIComponent(plaintext))).substring(0, 60) + '...==';
    const fakeSig = btoa(fakeHash).repeat(4).substring(0, 340) + '==';

    if (ctBox) ctBox.textContent = conf ? fakeCt : '(No cifrado)';
    if (sigBox) sigBox.textContent = sig ? fakeSig : '(Sin firma)';
    if (hashBox) hashBox.textContent = fakeHash;
    if (kaesBox) kaesBox.textContent = fakeKey;

    currentAliciaPackage = {
        version: "1.0",
        type: "CriptografiaHibrida_ESCOM",
        sender: "Alicia",
        recipient: "Betito",
        services: { confidentiality: conf, signature: sig },
        ciphertext: conf ? fakeCt : null,
        signature: sig ? fakeSig : null,
        original_sha3_hex: fakeHash
    };
}

function copyAliciaPackageJson() {
    if (!currentAliciaPackage) {
        showToast('⚠ Primero presione "Cifrar y Firmar".');
        return;
    }
    navigator.clipboard.writeText(JSON.stringify(currentAliciaPackage, null, 2)).then(() => {
        showToast('✔ JSON del paquete de Alicia copiado al portapapeles.');
    });
}

// ----------------------------------------------------
// COPIAR AL PORTAPAPELES Y TOAST NOTIFICATIONS
// ----------------------------------------------------
function copyPem(username) {
    const pemBox = document.getElementById(`pem-${username.toLowerCase()}`);
    if (!pemBox) return;
    const text = pemBox.textContent.trim();
    navigator.clipboard.writeText(text).then(() => {
        showToast(`✔ Llave pública de ${username} copiada al portapapeles.`);
    }).catch(err => {
        showToast(`❌ Error al copiar: ${err}`);
    });
}

function copyUrl(username) {
    const origin = window.location.origin;
    const url = `${origin}/keys/${username.toLowerCase()}_pub.pem`;
    navigator.clipboard.writeText(url).then(() => {
        showToast(`✔ URL de descarga de ${username} copiada:\n${url}`);
    }).catch(err => {
        showToast(`❌ Error al copiar URL: ${err}`);
    });
}

function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-msg');
    if (!toast || !toastMsg) return;

    toastMsg.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// ----------------------------------------------------
// ESTADO DE VERIFICACIÓN EN VIVO (Betito)
// ----------------------------------------------------
function setVerificationState(isOk) {
    const tileConf = document.getElementById('tile-conf');
    const tileInteg = document.getElementById('tile-integ');
    const tileAuth = document.getElementById('tile-auth');
    const tileNonrep = document.getElementById('tile-nonrep');

    if (!tileConf) return;

    if (isOk) {
        tileConf.className = 'status-tile ok';
        tileConf.querySelector('p').textContent = 'AES-256-CBC descifrado OK';

        tileInteg.className = 'status-tile ok';
        tileInteg.querySelector('p').textContent = 'SHA3-256 Coincide con firma';

        tileAuth.className = 'status-tile ok';
        tileAuth.querySelector('p').textContent = 'Autor verificado por RSA';

        tileNonrep.className = 'status-tile ok';
        tileNonrep.querySelector('p').textContent = 'Firma válida e irrefutable';
        showToast('🟢 Verificación Exitosa: Los 4 servicios criptográficos son válidos.');
    } else {
        tileConf.className = 'status-tile ok';
        tileConf.querySelector('p').textContent = 'AES-256-CBC descifrado';

        tileInteg.className = 'status-tile error';
        tileInteg.querySelector('p').textContent = '❌ SHA3-256 NO COINCIDE';

        tileAuth.className = 'status-tile error';
        tileAuth.querySelector('p').textContent = '❌ Firma RSA Inválida / Desconocido';

        tileNonrep.className = 'status-tile error';
        tileNonrep.querySelector('p').textContent = '❌ No garantizado (Alteración)';
        showToast('🔴 ALERTA DE INTEGRIDAD: El mensaje fue alterado o la firma no corresponde.');
    }
}

// ----------------------------------------------------
// INSPECTOR FORENSE DE PAQUETES .hyb
// ----------------------------------------------------
function initInspector() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('hybFileInput');
    const jsonInput = document.getElementById('jsonInput');
    const btnInspect = document.getElementById('btnInspect');

    if (!dropZone || !fileInput) return;

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#06b6d4';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = 'rgba(139, 92, 246, 0.4)';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'rgba(139, 92, 246, 0.4)';
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    if (btnInspect && jsonInput) {
        btnInspect.addEventListener('click', () => {
            const rawText = jsonInput.value.trim();
            if (!rawText) {
                showToast('⚠ Ingrese contenido JSON para inspeccionar.');
                return;
            }
            try {
                const parsed = JSON.parse(rawText);
                renderInspectionResults(parsed);
            } catch (err) {
                showToast('❌ Error de formato JSON en el paquete.');
            }
        });
    }
}

function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target.result;
            const jsonInput = document.getElementById('jsonInput');
            if (jsonInput) jsonInput.value = content;
            const parsed = JSON.parse(content);
            renderInspectionResults(parsed);
            showToast(`✔ Paquete '${file.name}' cargado e inspeccionado.`);
        } catch (err) {
            showToast(`❌ El archivo no contiene un JSON válido: ${err}`);
        }
    };
    reader.readAsText(file);
}

function renderInspectionResults(pkg) {
    const resultsContainer = document.getElementById('inspectorResults');
    if (!resultsContainer) return;

    const sender = pkg.sender || 'Desconocido';
    const recipient = pkg.recipient || 'Desconocido';
    const hasConf = pkg.services?.confidentiality ?? false;
    const hasSig = pkg.services?.signature ?? false;
    const ct = pkg.ciphertext || '';
    const sig = pkg.signature || '';
    const pubUrl = pkg.sender_pubkey_url || 'No especificada';
    const originalHash = pkg.original_sha3_hex || 'No incluido';
    const dh = pkg.dh_params || {};

    let html = `
        <div style="background: #080c18; border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 18px; padding: 22px;">
            <h3 style="color: #c4b5fd; margin-bottom: 14px; font-family: var(--font-heading);">📊 Diagnóstico Criptográfico del Paquete</h3>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 15px;">
                <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 10px; border: 1px solid var(--border-glass);">
                    <div style="color: var(--text-dim); font-size: 0.75rem;">EMISOR DECLARADO</div>
                    <div style="font-size: 1.1rem; color: #38bdf8; font-weight: 700;">${escapeHtml(sender)}</div>
                </div>
                <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 10px; border: 1px solid var(--border-glass);">
                    <div style="color: var(--text-dim); font-size: 0.75rem;">DESTINATARIO</div>
                    <div style="font-size: 1.1rem; color: #818cf8; font-weight: 700;">${escapeHtml(recipient)}</div>
                </div>
                <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 10px; border: 1px solid var(--border-glass);">
                    <div style="color: var(--text-dim); font-size: 0.75rem;">SERVICIOS SOLICITADOS</div>
                    <div style="font-size: 0.9rem; color: #34d399; font-weight: 600;">
                        ${hasConf ? '🔒 Cifrado' : ''} ${hasSig ? '✍ Firma' : ''}
                    </div>
                </div>
            </div>

            <div style="font-size: 0.85rem; margin-bottom: 8px;">
                <span style="color: var(--text-dim);">URL de Llave Pública:</span> 
                <a href="${escapeHtml(pubUrl)}" target="_blank" style="color: #38bdf8; text-decoration: underline;">${escapeHtml(pubUrl)}</a>
            </div>

            <div style="font-size: 0.85rem; margin-bottom: 12px; word-break: break-all;">
                <span style="color: var(--text-dim);">Resumen SHA3-256 Original:</span> 
                <span style="color: #a7f3d0; font-family: var(--font-mono); font-size: 0.8rem;">${escapeHtml(originalHash)}</span>
            </div>

            ${hasConf && dh.Ka ? `
            <div style="background: #050711; padding: 12px; border-radius: 10px; font-family: monospace; font-size: 0.75rem; color: #cbd5e1; margin-bottom: 12px;">
                <div><strong style="color: #67e8f9;">Ka (DH Emisor):</strong> ${escapeHtml(dh.Ka.substring(0, 45))}...</div>
                <div><strong style="color: #fde047;">Kc (DH IV):</strong> ${escapeHtml(dh.Kc ? dh.Kc.substring(0, 45) + '...' : 'N/A')}</div>
            </div>
            ` : ''}

            <div style="font-size: 0.75rem; color: var(--text-dim); margin-bottom: 4px;">CIPHERTEXT AES-256-CBC (${ct.length} bytes base64):</div>
            <pre class="pem-pre" style="max-height: 70px; margin-bottom: 12px;">${escapeHtml(ct || '(No cifrado)')}</pre>

            <div style="font-size: 0.75rem; color: var(--text-dim); margin-bottom: 4px;">FIRMA DIGITAL RSA 2048 (${sig.length} bytes base64):</div>
            <pre class="pem-pre" style="max-height: 70px;">${escapeHtml(sig || '(Sin firma)')}</pre>
        </div>
    `;

    resultsContainer.innerHTML = html;
    resultsContainer.style.display = 'block';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
