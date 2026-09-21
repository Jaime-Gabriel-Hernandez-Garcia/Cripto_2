# Práctica: Criptografía Híbrida

Sistema interactivo de Criptografía Híbrida para el laboratorio de criptografía de la Escuela Superior de Cómputo (ESCOM - IPN).

## Arquitectura Criptográfica (Esquema 2)

1. **Intercambio de Llaves Diffie-Hellman (MODP)**:
   - Grupo MODP 2 (1024 bits, primo RFC 3526 / RFC 2409, generador $g=2$).
   - Derivación matemática de secreto compartido $K = K_b^a \pmod p$ y vector $IV = K_d^c \pmod p$.
   - KDF basado en SHA-256 para derivar clave simétrica $K_{AES}$ (16 bytes) e $IV$ (16 bytes).

2. **Cifrado Simétrico AES-CBC**:
   - AES-128 en modo CBC con relleno PKCS#7 (NIST FIPS 197 / NIST SP 800-38A).
   - Servicio: **Confidencialidad**.

3. **Función Resumen Criptográfica SHA-256**:
   - NIST FIPS PUB 180-4 (digest de 256 bits).
   - Servicio: **Integridad**.

4. **Firma Digital RSA**:
   - RSASSA-PKCS1-v1_5 con clave de 2048 bits y exponente $e=65537$ (RFC 8017).
   - Importación y exportación de llaves públicas en formato PEM (RFC 7468 / SPKI).
   - Servicios: **Autenticación** y **No Repudio**.

## Roles Implementados

- **Diagrama Interactivo**: Visualización gráfica del protocolo, flujo paso a paso e inspector de nodos.
- **Alicia (Emisor 1)**: Cifrado y firma de mensajes legítimos con guardado en nube.
- **Candy (Emisor 2 / Ataque)**: Emisión legítima y laboratorio de ataques en nube (duplicación x/y/z, alteración de integridad y restauración).
- **Betito (Receptor)**: Menú de selección de procesos (1 o 2 de 2), selector dinámico de llaves PEM / Web y semáforo de verificación de servicios.
- **Nube (Drive Compartido)**: Canal inseguro centralizado para la transmisión de paquetes cifrados.

## Estilo y Diseño

- Interfaz minimalista de alto contraste tipo Swiss / Linear Dark OLED.
- Cero dependencias externas complejas; compatible con navegadores modernos a través de la W3C Web Cryptography API.
