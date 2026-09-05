/**
 * CryptoEngine - Motor criptográfico híbrido completo para la práctica ESCOM IPN
 * Esquema 2 Asignado: Diffie-Hellman + AES-CBC + Firma Digital RSA (SHA-256)
 * 
 * Implementa:
 * 1. Intercambio de llaves Diffie-Hellman (MODP BigInt) para acordar K e IV
 * 2. Cifrado simétrico AES-CBC usando la clave K y vector IV derivados de DH
 * 3. Firma digital asimétrica RSA-PKCS1-v1_5 con digest SHA-256 (Embudo)
 * 4. Soporte para importación/exportación de llaves públicas en formato PEM estándar
 * 5. Ejecución modular: Cifrado/Descifrado y/o Firma/Verificación (1 de 2 o 2 de 2)
 */
class CryptoEngine {
  // Parámetros Diffie-Hellman estándar (RFC 3526 / RFC 2409 MODP Group 2 de 1024 bits)
  // Primo seguro p = 2^1024 - 2^960 - 1 + 2^64 * { [2^894 pi] + 129093 } y generador g = 2
  static DH_P = BigInt('0xFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE65381FFFFFFFFFFFFFFFF');
  static DH_G = 2n;

  constructor() {
    this.keys = {
      alicia: null, // Par de llaves RSA para firma
      candy: null,  // Par de llaves RSA para firma
      betito: null  // Par de llaves RSA
    };
    // Parámetros Diffie-Hellman persistentes de Betito (Receptor)
    this.betitoDH = {
      b: null,  // Secreto b para K
      Kb: null, // Llave pública Kb = g^b mod p
      d: null,  // Secreto d para IV
      Kd: null  // Llave pública Kd = g^d mod p
    };
    this.initialized = false;
  }

  // --- Exponenciación Modular Rápida en BigInt: (base^exp) mod mod ---
  static modPow(base, exponent, modulus) {
    if (modulus === 1n) return 0n;
    let result = 1n;
    base = base % modulus;
    let exp = exponent;
    while (exp > 0n) {
      if (exp % 2n === 1n) {
        result = (result * base) % modulus;
      }
      exp = exp / 2n;
      base = (base * base) % modulus;
    }
    return result;
  }

  // Genera un entero grande aleatorio de n bytes
  static randomBigInt(bytes = 32) {
    const buf = new Uint8Array(bytes);
    crypto.getRandomValues(buf);
    buf[0] = (buf[0] & 0x7f) | 0x40; // Asegura número positivo grande
    let hex = '';
    for (let i = 0; i < buf.length; i++) {
      hex += buf[i].toString(16).padStart(2, '0');
    }
    return BigInt('0x' + hex);
  }

  // --- Utilidades de codificación y conversión ---
  static bufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }

  static hexToBuffer(hex) {
    const clean = hex.replace(/[^0-9A-Fa-f]/g, '');
    const tokens = clean.match(/.{1,2}/g) || [];
    return new Uint8Array(tokens.map(byte => parseInt(byte, 16))).buffer;
  }

  static bufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    if (typeof btoa !== 'undefined') return btoa(binary);
    if (typeof window !== 'undefined' && window.btoa) return window.btoa(binary);
    return Buffer.from(binary, 'binary').toString('base64');
  }

  static base64ToBuffer(base64) {
    let binary = '';
    if (typeof atob !== 'undefined') binary = atob(base64);
    else if (typeof window !== 'undefined' && window.atob) binary = window.atob(base64);
    else binary = Buffer.from(base64, 'base64').toString('binary');

    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  static bufferToBinaryString(buffer, limitBytes = 4) {
    const bytes = new Uint8Array(buffer).slice(0, limitBytes);
    return Array.from(bytes)
      .map(b => b.toString(2).padStart(8, '0'))
      .join(' ') + (buffer.byteLength > limitBytes ? '...' : '');
  }

  static stringToBuffer(str) {
    return new TextEncoder().encode(str);
  }

  static bufferToString(buf) {
    return new TextDecoder().decode(buf);
  }

  // Conversión a formato PEM estándar
  static spkiToPem(spkiBuffer, label = 'PUBLIC KEY') {
    const b64 = CryptoEngine.bufferToBase64(spkiBuffer);
    const lines = b64.match(/.{1,64}/g) || [];
    return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`;
  }

  static pemToSpki(pemString) {
    const clean = pemString
      .replace(/-----BEGIN [^-]+-----/, '')
      .replace(/-----END [^-]+-----/, '')
      .replace(/\s+/g, '');
    return CryptoEngine.base64ToBuffer(clean);
  }

  /**
   * Deriva 16 bytes a partir de un secreto BigInt mediante SHA-256 (KDF)
   */
  static async derive16BytesFromBigInt(bigIntSecret) {
    const hex = bigIntSecret.toString(16);
    const buf = CryptoEngine.stringToBuffer(hex);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return new Uint8Array(hash).slice(0, 16);
  }

  /**
   * Inicializa llaves RSA y parámetros Diffie-Hellman persistentes
   */
  async initAllKeys() {
    // 1. Alicia: Par RSA para Firma Digital (RSASSA-PKCS1-v1_5, 2048 bits)
    this.keys.alicia = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: { name: 'SHA-256' }
      },
      true,
      ['sign', 'verify']
    );

    // 2. Candy: Par RSA para Firma Digital (RSASSA-PKCS1-v1_5, 2048 bits)
    this.keys.candy = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: { name: 'SHA-256' }
      },
      true,
      ['sign', 'verify']
    );

    // 3. Betito: Par RSA
    this.keys.betito = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: { name: 'SHA-256' }
      },
      true,
      ['sign', 'verify']
    );

    // 4. Parámetros Diffie-Hellman de Betito para K e IV
    // Para K: b = secreto, Kb = g^b mod p
    this.betitoDH.b = CryptoEngine.randomBigInt(32);
    this.betitoDH.Kb = CryptoEngine.modPow(CryptoEngine.DH_G, this.betitoDH.b, CryptoEngine.DH_P);

    // Para IV: d = secreto, Kd = g^d mod p
    this.betitoDH.d = CryptoEngine.randomBigInt(32);
    this.betitoDH.Kd = CryptoEngine.modPow(CryptoEngine.DH_G, this.betitoDH.d, CryptoEngine.DH_P);

    this.initialized = true;
    return this.keys;
  }

  /**
   * Exporta la llave pública de un usuario en formato PEM
   */
  async exportPublicKeyPem(role) {
    if (!this.keys[role]) await this.initAllKeys();
    const spki = await crypto.subtle.exportKey('spki', this.keys[role].publicKey);
    return CryptoEngine.spkiToPem(spki, `${role.toUpperCase()} PUBLIC KEY`);
  }

  /**
   * Importa una llave pública desde texto PEM
   */
  async importPublicKeyFromPem(pemString) {
    const buffer = CryptoEngine.pemToSpki(pemString);
    return await crypto.subtle.importKey(
      'spki',
      buffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      true,
      ['verify']
    );
  }

  /**
   * Genera el paquete de Criptografía Híbrida según el Esquema 2 (Diffie-Hellman + AES-CBC + RSA)
   * @param {Object} options
   * @param {string} options.author 'alicia' | 'candy'
   * @param {string} options.plaintext Mensaje m
   * @param {boolean} options.applyEncryption Aplicar cifrado simétrico AES-CBC con DH
   * @param {boolean} options.applySignature Aplicar firma digital RSA
   */
  async createHybridPackage({
    author,
    plaintext,
    applyEncryption = true,
    applySignature = true
  }) {
    if (!this.initialized) await this.initAllKeys();

    const authorKeyPair = this.keys[author];
    if (!authorKeyPair) throw new Error(`Autor desconocido: ${author}`);

    const dataBuffer = CryptoEngine.stringToBuffer(plaintext);
    const operationLog = [];

    let ciphertextHex = '';
    let signatureHex = '';
    let hashHex = '';
    let hashBinary = '';
    let aesKeyHex = '';
    let ivHex = '';

    // Variables Diffie-Hellman
    let a = null, Ka = null, K = null;
    let c = null, Kc = null, IV = null;

    operationLog.push(`[1] Mensaje de entrada: "${plaintext}" (${dataBuffer.byteLength} bytes).`);

    // --- A. SERVICIO DE INTEGRIDAD / FIRMA DIGITAL (RSA) ---
    if (applySignature) {
      // 1. Hash SHA-256 del mensaje original (Embudo en el diagrama)
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      hashHex = CryptoEngine.bufferToHex(hashBuffer);
      hashBinary = CryptoEngine.bufferToBinaryString(hashBuffer, 4);
      operationLog.push(`[2] Hash SHA-256 calculado (Embudo): 0x${hashHex.slice(0, 16)}... (bits: ${hashBinary})`);

      // 2. Firma Digital del mensaje con la clave privada del autor
      const sigBuffer = await crypto.subtle.sign(
        { name: 'RSASSA-PKCS1-v1_5' },
        authorKeyPair.privateKey,
        dataBuffer
      );
      signatureHex = CryptoEngine.bufferToHex(sigBuffer);
      operationLog.push(`[3] Firma Digital RSA generada con A_Privada (${author.toUpperCase()}): ${signatureHex.slice(0, 16)}...`);
      operationLog.push(`    -> Servicios provistos: Autenticación, Integridad y No Repudio.`);
    } else {
      operationLog.push(`[2] Firma digital OMITIDA por selección de usuario.`);
    }

    // --- B. SERVICIO DE CONFIDENCIALIDAD: DIFFIE-HELLMAN + AES-CBC ---
    let payloadToSend = plaintext;
    let dhPublicExchange = null;

    if (applyEncryption) {
      operationLog.push(`[4] Iniciando Intercambio de Llaves Diffie-Hellman con Betito:`);

      // 1. Diffie-Hellman Para K:
      // Emisor: a = secreto aleatorio, Ka = g^a mod p
      a = CryptoEngine.randomBigInt(32);
      Ka = CryptoEngine.modPow(CryptoEngine.DH_G, a, CryptoEngine.DH_P);
      // Secreto compartido K = (Kb)^a mod p
      K = CryptoEngine.modPow(this.betitoDH.Kb, a, CryptoEngine.DH_P);
      const rawAesKey = await CryptoEngine.derive16BytesFromBigInt(K);
      aesKeyHex = CryptoEngine.bufferToHex(rawAesKey.buffer);

      operationLog.push(`    • Para K: a=<secreto>, Ka = g^a mod p = ${Ka.toString(16).slice(0, 12)}...`);
      operationLog.push(`      Recibe Kb de Betito -> K = Kb^a mod p = ${K.toString(16).slice(0, 12)}...`);
      operationLog.push(`      -> Clave K_AES derivada (128 bits): 0x${aesKeyHex}`);

      // 2. Diffie-Hellman Para IV:
      // Emisor: c = secreto aleatorio, Kc = g^c mod p
      c = CryptoEngine.randomBigInt(32);
      Kc = CryptoEngine.modPow(CryptoEngine.DH_G, c, CryptoEngine.DH_P);
      // Secreto compartido IV = (Kd)^c mod p
      IV = CryptoEngine.modPow(this.betitoDH.Kd, c, CryptoEngine.DH_P);
      const ivBytes = await CryptoEngine.derive16BytesFromBigInt(IV);
      ivHex = CryptoEngine.bufferToHex(ivBytes.buffer);

      operationLog.push(`    • Para IV: c=<secreto>, Kc = g^c mod p = ${Kc.toString(16).slice(0, 12)}...`);
      operationLog.push(`      Recibe Kd de Betito -> IV = Kd^c mod p = ${IV.toString(16).slice(0, 12)}...`);
      operationLog.push(`      -> Vector IV derivado (128 bits): 0x${ivHex}`);

      // 3. Cifrado simétrico AES-CBC
      const aesCryptoKey = await crypto.subtle.importKey(
        'raw',
        rawAesKey,
        { name: 'AES-CBC' },
        false,
        ['encrypt']
      );

      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-CBC', iv: ivBytes },
        aesCryptoKey,
        dataBuffer
      );

      ciphertextHex = CryptoEngine.bufferToHex(encryptedBuffer);
      payloadToSend = ciphertextHex;

      dhPublicExchange = {
        Ka: Ka.toString(16),
        Kc: Kc.toString(16)
      };

      operationLog.push(`[5] Cifrado simétrico AES-CBC(IV, K_AES) completado.`);
      operationLog.push(`    -> Criptograma c: ${ciphertextHex.slice(0, 24)}... (${encryptedBuffer.byteLength} bytes)`);
      operationLog.push(`    -> Servicio provisto: Confidencialidad.`);
    } else {
      operationLog.push(`[4] Cifrado simétrico OMITIDO por selección de usuario (texto viajará en claro).`);
    }

    // Estructura del paquete transmitido por la nube (Canal Inseguro)
    // Fiel al Esquema 2 de la Dra. Nidia: Criptograma + Firma Digital (sin sobre digital RSA)
    const hybridPackage = {
      version: '2.0-DH',
      timestamp: new Date().toISOString(),
      metadata: {
        claimedAuthor: author,
        isEncrypted: applyEncryption,
        isSigned: applySignature,
        cipherAlgorithm: applyEncryption ? 'AES-CBC-128' : 'NONE',
        keyAgreement: applyEncryption ? 'Diffie-Hellman-MODP' : 'NONE',
        signatureAlgorithm: applySignature ? 'RSASSA-PKCS1-v1_5-2048' : 'NONE',
        hashAlgorithm: applySignature ? 'SHA-256' : 'NONE'
      },
      dhPublicExchange, // Ka y Kc para que Betito compute K e IV en la otra mitad
      content: {
        payload: payloadToSend,  // Criptograma o texto claro
        signature: signatureHex  // Firma digital RSA
      },
      debugDetails: {
        plaintext,
        hashHex,
        hashBinary,
        aesKeyHex,
        ivHex,
        dh: {
          a: a ? a.toString(16) : null,
          b: this.betitoDH.b ? this.betitoDH.b.toString(16) : null,
          Ka: Ka ? Ka.toString(16) : null,
          Kb: this.betitoDH.Kb ? this.betitoDH.Kb.toString(16) : null,
          K: K ? K.toString(16) : null,
          c: c ? c.toString(16) : null,
          d: this.betitoDH.d ? this.betitoDH.d.toString(16) : null,
          Kc: Kc ? Kc.toString(16) : null,
          Kd: this.betitoDH.Kd ? this.betitoDH.Kd.toString(16) : null,
          IV: IV ? IV.toString(16) : null
        },
        log: operationLog
      }
    };

    return hybridPackage;
  }

  /**
   * Proceso de Descifrado y/o Verificación por parte de Betito
   * Permite seleccionar el proceso de acuerdo a los servicios requeridos (1 de 2 o 2 de 2).
   * 
   * @param {Object} hybridPackage Paquete descargado de la nube
   * @param {Object} options
   * @param {boolean} options.applyDecryption Ejecutar descifrado AES con Diffie-Hellman
   * @param {boolean} options.applyVerification Ejecutar verificación de firma RSA
   * @param {CryptoKey|null} options.customVerificationKey Llave pública cargada desde archivo .PEM
   */
  async processAndVerifyPackage(hybridPackage, options = {}) {
    if (!this.initialized) await this.initAllKeys();

    const applyDecryption = options.applyDecryption !== undefined ? options.applyDecryption : true;
    const applyVerification = options.applyVerification !== undefined ? options.applyVerification : true;
    const customKey = options.customVerificationKey || null;

    const opLog = [];
    let recoveredPlaintext = '';
    let decryptionSuccessful = false;
    let signatureVerified = false;
    let detectedAuthor = 'Desconocido';
    let localHashHex = '';
    let localHashBinary = '';

    opLog.push(`[1] Betito analiza paquete de la nube.`);
    opLog.push(`    Configuración seleccionada por usuario: Descifrado=${applyDecryption ? 'SÍ' : 'NO'}, Verificación=${applyVerification ? 'SÍ' : 'NO'}`);

    // --- A. DESCIFRADO SIMÉTRICO (Diffie-Hellman + AES-CBC) ---
    let messageBuffer = null;

    if (hybridPackage.metadata.isEncrypted) {
      if (applyDecryption) {
        try {
          if (!hybridPackage.dhPublicExchange || !hybridPackage.dhPublicExchange.Ka || !hybridPackage.dhPublicExchange.Kc) {
            throw new Error('Faltan parámetros públicos Diffie-Hellman (Ka, Kc) en el paquete.');
          }

          // 1. Cómputo de la clave K mediante Diffie-Hellman en Betito:
          // K = (Ka)^b mod p
          const Ka = BigInt('0x' + hybridPackage.dhPublicExchange.Ka);
          const K = CryptoEngine.modPow(Ka, this.betitoDH.b, CryptoEngine.DH_P);
          const rawAesKey = await CryptoEngine.derive16BytesFromBigInt(K);
          const aesKeyHex = CryptoEngine.bufferToHex(rawAesKey.buffer);

          opLog.push(`[2] Betito computa K con Diffie-Hellman:`);
          opLog.push(`    • K = Ka^b mod p = ${K.toString(16).slice(0, 12)}...`);
          opLog.push(`    • K_AES derivada (128 bits): 0x${aesKeyHex}`);

          // 2. Cómputo del vector IV mediante Diffie-Hellman en Betito:
          // IV = (Kc)^d mod p
          const Kc = BigInt('0x' + hybridPackage.dhPublicExchange.Kc);
          const IV = CryptoEngine.modPow(Kc, this.betitoDH.d, CryptoEngine.DH_P);
          const ivBytes = await CryptoEngine.derive16BytesFromBigInt(IV);
          const ivHex = CryptoEngine.bufferToHex(ivBytes.buffer);

          opLog.push(`[3] Betito computa IV con Diffie-Hellman:`);
          opLog.push(`    • IV = Kc^d mod p = ${IV.toString(16).slice(0, 12)}...`);
          opLog.push(`    • Vector IV derivado (128 bits): 0x${ivHex}`);

          // 3. Descifrar con AES-CBC
          const aesKey = await crypto.subtle.importKey(
            'raw',
            rawAesKey,
            { name: 'AES-CBC' },
            false,
            ['decrypt']
          );

          const cipherBuffer = CryptoEngine.hexToBuffer(hybridPackage.content.payload);
          messageBuffer = await crypto.subtle.decrypt(
            { name: 'AES-CBC', iv: ivBytes },
            aesKey,
            cipherBuffer
          );

          recoveredPlaintext = CryptoEngine.bufferToString(messageBuffer);
          decryptionSuccessful = true;
          opLog.push(`[4] ✅ Criptograma AES descifrado con éxito: "${recoveredPlaintext}"`);
        } catch (err) {
          decryptionSuccessful = false;
          recoveredPlaintext = '[FALLO DE DESCIFRADO: Criptograma alterado o llave inválida]';
          messageBuffer = CryptoEngine.stringToBuffer(recoveredPlaintext);
          opLog.push(`[!] ❌ Error en descifrado AES: ${err.message}`);
        }
      } else {
        opLog.push(`[2] Descifrado OMITIDO por selección de usuario. Criptograma se mantiene en crudo.`);
        recoveredPlaintext = '[Descifrado no solicitado por usuario - Criptograma: ' + hybridPackage.content.payload.slice(0, 32) + '...]';
        messageBuffer = CryptoEngine.hexToBuffer(hybridPackage.content.payload);
      }
    } else {
      // Archivo no venía cifrado
      recoveredPlaintext = hybridPackage.content.payload;
      messageBuffer = CryptoEngine.stringToBuffer(recoveredPlaintext);
      decryptionSuccessful = true;
      opLog.push(`[2] Archivo en claro procesado: "${recoveredPlaintext}"`);
    }

    // --- B. VERIFICACIÓN DE FIRMA DIGITAL (SHA-256 + RSA) ---
    if (hybridPackage.metadata.isSigned) {
      if (applyVerification) {
        if (!decryptionSuccessful && hybridPackage.metadata.isEncrypted) {
          opLog.push(`[!] No es posible verificar firma: El descifrado falló (mensaje corrompido en canal inseguro).`);
          signatureVerified = false;
          detectedAuthor = 'Ninguno (Datos alterados)';
        } else {
          // 1. Embudo Hash SHA-256 calculado localmente sobre m
          const localHashBuf = await crypto.subtle.digest('SHA-256', messageBuffer);
          localHashHex = CryptoEngine.bufferToHex(localHashBuf);
          localHashBinary = CryptoEngine.bufferToBinaryString(localHashBuf, 4);
          opLog.push(`[5] Embudo Hash SHA-256 calculado en Betito: 0x${localHashHex.slice(0, 16)}... (bits: ${localHashBinary})`);

          try {
            const signatureBuf = CryptoEngine.hexToBuffer(hybridPackage.content.signature);

            // Si el usuario cargó una llave pública personalizada desde archivo .PEM:
            if (customKey) {
              opLog.push(`[*] Verificando con LLAVE PÚBLICA IMPORTADA (.PEM) por el usuario...`);
              const valid = await crypto.subtle.verify(
                { name: 'RSASSA-PKCS1-v1_5' },
                customKey,
                signatureBuf,
                messageBuffer
              );
              if (valid) {
                signatureVerified = true;
                detectedAuthor = 'Autor Verificado con PEM Importado';
                opLog.push(`[6] ✅ Firma verificada con éxito usando la llave pública (.PEM) importada.`);
              } else {
                signatureVerified = false;
                detectedAuthor = 'Ninguno (Firma no coincide con PEM)';
                opLog.push(`[!] ❌ Fallo de verificación: La firma digital no coincide con la llave PEM importada.`);
              }
            } else {
              // Prueba automática con las llaves públicas de Alicia y Candy
              const validAlice = await crypto.subtle.verify(
                { name: 'RSASSA-PKCS1-v1_5' },
                this.keys.alicia.publicKey,
                signatureBuf,
                messageBuffer
              );

              if (validAlice) {
                signatureVerified = true;
                detectedAuthor = 'Alicia';
                opLog.push(`[6] ✅ Firma verificada con A_Pública de ALICIA. Autor verificado: Alicia.`);
              } else {
                const validCandy = await crypto.subtle.verify(
                  { name: 'RSASSA-PKCS1-v1_5' },
                  this.keys.candy.publicKey,
                  signatureBuf,
                  messageBuffer
                );

                if (validCandy) {
                  signatureVerified = true;
                  detectedAuthor = 'Candy';
                  opLog.push(`[6] ✅ Firma verificada con C_Pública de CANDY. Autor verificado: Candy.`);
                } else {
                  signatureVerified = false;
                  detectedAuthor = 'Ninguno (Firma inválida o datos alterados)';
                  opLog.push(`[!] ❌ Fallo de verificación: La firma no coincide ni con Alicia ni con Candy, o el contenido fue alterado.`);
                }
              }
            }
          } catch (e) {
            signatureVerified = false;
            detectedAuthor = 'Error de verificación';
            opLog.push(`[!] ❌ Excepción al verificar firma: ${e.message}`);
          }
        }
      } else {
        opLog.push(`[5] Verificación de firma OMITIDA por selección de usuario.`);
      }
    } else {
      opLog.push(`[5] El archivo no incluye firma digital.`);
    }

    // --- C. ESTADO DE LOS 4 SERVICIOS CRIPTOGRÁFICOS ---
    const services = {
      confidencialidad: applyDecryption && hybridPackage.metadata.isEncrypted && decryptionSuccessful,
      integridad: applyVerification && hybridPackage.metadata.isSigned ? signatureVerified : false,
      autenticacion: applyVerification && signatureVerified && (detectedAuthor.includes('Alicia') || detectedAuthor.includes('Candy') || detectedAuthor.includes('PEM')),
      noRepudio: applyVerification && signatureVerified && (detectedAuthor.includes('Alicia') || detectedAuthor.includes('Candy') || detectedAuthor.includes('PEM'))
    };

    opLog.push(`[7] Evaluación de Servicios Ofrecidos:`);
    opLog.push(`    • Confidencialidad: ${services.confidencialidad ? 'VÁLIDA (AES-CBC + DH) ✅' : (applyDecryption ? 'FALLIDA ❌' : 'NO SOLICITADA ⏸️')}`);
    opLog.push(`    • Integridad: ${services.integridad ? 'VÁLIDA (SHA-256) ✅' : (applyVerification ? 'FALLIDA ❌' : 'NO SOLICITADA ⏸️')}`);
    opLog.push(`    • Autenticación: ${services.autenticacion ? 'CONFIRMADA (' + detectedAuthor + ') ✅' : (applyVerification ? 'NO CONFIRMADA ❌' : 'NO SOLICITADA ⏸️')}`);
    opLog.push(`    • No Repudio: ${services.noRepudio ? 'VIGENTE ✅' : (applyVerification ? 'INAPLICABLE ❌' : 'NO SOLICITADA ⏸️')}`);

    return {
      recoveredPlaintext,
      decryptionSuccessful,
      signatureVerified,
      detectedAuthor,
      localHashHex,
      localHashBinary,
      services,
      opLog
    };
  }
}

if (typeof window !== 'undefined') {
  window.CryptoEngine = CryptoEngine;
}
if (typeof globalThis !== 'undefined') {
  globalThis.CryptoEngine = CryptoEngine;
}
