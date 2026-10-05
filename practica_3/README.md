# Práctica: Intercambio de Claves ECDH Tripartito (P-256)

**Instituto Politécnico Nacional**  
**Escuela Superior de Cómputo (ESCOM)**  
**Materia:** Selected Topics in Cryptography  
**Profesora:** Dra. Nidia A. Cortez Duarte  

---

## 1. Descripción General

Simulador interactivo del protocolo de **Acuerdo de Claves de Grupo (Group Key Exchange)** basado en **Criptografía de Curvas Elípticas (ECDH Tripartito)** ejecutado entre tres participantes (Alice, Bob y Candy).

El sistema modela fielmente el esquema de intercambio cíclico en anillo propuesto en laboratorio mediante el traspaso secuencial de memorias USB o archivos locales, sustentado en la curva estándar **NIST P-256 (secp256r1 / FIPS 186-5)**. Permite que las tres entidades computen de forma autónoma el mismo secreto de grupo $abc \cdot G$ sin revelar jamás sus escalares privados locales.

---

## 2. ¿Por qué usamos la Curva NIST P-256 (`secp256r1`)?

La adopción de la curva **NIST P-256** (también conocida como `prime256v1` o `secp256r1`) no es arbitraria; responde a rigurosos fundamentos algebraicos y de seguridad normativa:

1. **Eficiencia en Aritmética Modular (Primo de Solinas / Pseudo-Mersenne):**  
   El módulo primo $p$ está definido como:
   $$p = 2^{256} - 2^{224} + 2^{192} + 2^{96} - 1$$
   Esta forma especial permite calcular la reducción modular $A \pmod p$ mediante sumas y desplazamientos de palabras de 32 y 64 bits a nivel de CPU, eliminando la necesidad de realizar costosas divisiones euclidianas de enteros largos.

2. **Cofactor Unitario ($h = 1$):**  
   El orden del grupo coincide exactamente con el orden primo $n$ del generador $G$ ($|E(\mathbb{F}_p)| = n$). Al no existir subgrupos pequeños, **se neutraliza completamente el ataque de confinamiento en subgrupos pequeños (*Small Subgroup Attack* / Lim-Lee)**, una vulnerabilidad crítica que afecta a protocolos Diffie-Hellman en curvas con cofactor $h > 1$ (como Curve25519 con $h=8$ si no se valida exhaustivamente la torsión).

3. **Cota de Seguridad de 128 bits:**  
   Frente a los mejores algoritmos genéricos de resolución del Problema del Logaritmo Discreto en Curvas Elípticas (ECDLP), como el algoritmo $\rho$ de Pollard con complejidad $\mathcal{O}(\sqrt{n})$, el espacio de búsqueda es de $\approx 2^{128}$ operaciones. Esto equivale al nivel de protección que ofrece una clave RSA de 3072 bits, pero con un punto público de tan sólo 65 bytes no comprimido (o 33 bytes comprimido), lo cual optimiza drásticamente el almacenamiento en memorias USB y el ancho de banda.

4. **Estándar de Interoperabilidad Global:**  
   Cumple con las normas **NIST FIPS 186-5**, **NIST SP 800-56A Rev 3**, **RFC 5903** y **RFC 8446 (TLS 1.3)**. Es el sustrato criptográfico empleado en Apple Secure Enclave, llaves de seguridad FIDO2/WebAuthn, tokens bancarios y suites gubernamentales CNSA / Suite B.

---

## 3. Generación Criptográfica con Biblioteca y CSPRNG

Las claves del sistema **no se simulan ni se obtienen mediante funciones matemáticas inseguras como `Math.random()`**:

- **Biblioteca `elliptic.js`**: Implementación verificada para curvas elípticas de Weierstrass corta sobre campos finitos $\mathbb{F}_p$.
- **CSPRNG (Cryptographically Secure Pseudo-Random Number Generator)**: Al invocar `ec.genKeyPair()`, la biblioteca delega la obtención de entropía a la API nativa `window.crypto.getRandomValues()`, asegurando números pseudoaleatorios criptográficamente seguros derivados de fuentes físicas del sistema operativo (ruido térmico, interrupciones de hardware).
- **Aritmética Proyectiva Jacobiana**: La multiplicación escalar $d \cdot G$ se efectúa en coordenadas proyectivas $(X : Y : Z)$ para mitigar ataques de temporización (*timing attacks*) al suprimir divisiones modulares en cada duplicación y suma intermedia.

---

## 4. Importación y Exportación de Claves por USB

El sistema incorpora un simulador de **Memorias USB** que permite:

1. **Exportación Individual**: Guardar la clave privada, pública y metadatos en un archivo descargable `clave_usb_[participante]_p256.json`.
2. **Importación Individual**: Seleccionar desde el almacenamiento del equipo o memoria USB un archivo `.json` o `.txt` con el escalar privado. La biblioteca valida automáticamente que el escalar $d$ satisfaga $1 \le d < n$ y calcula su correspondiente punto afín público $Q = d \cdot G$.
3. **Paquete Global USB**: Exportar o importar en lote las claves de las tres identidades en un único archivo `claves_usb_ecdh_p256_bundle.json`.
4. **Inyección Manual**: Formulario para introducir escalares en hexadecimal (64 caracteres) con validación inmediata en la curva P-256.

---

## 5. Álgebra del Protocolo por Rondas

### Fase 1: Publicación de Puntos Públicos
- Alice: $a \in \mathbb{F}_n \implies A = a \cdot G$
- Bob: $b \in \mathbb{F}_n \implies B = b \cdot G$
- Candy: $c \in \mathbb{F}_n \implies C = c \cdot G$

### Fase 2: Traspaso USB y Puntos Intermedios
Los puntos públicos circulan cíclicamente en el anillo ($C \to \text{Alice}$, $A \to \text{Bob}$, $B \to \text{Candy}$):
- **Alice** computa $P_A = a \cdot C = ac \cdot G$
- **Bob** computa $P_B = b \cdot A = ba \cdot G$
- **Candy** computa $P_C = c \cdot B = cb \cdot G$

### Fase 3: Segundo Traspaso USB y Secreto de Grupo
Los puntos intermedios vuelven a circular cíclicamente ($cbG \to \text{Alice}$, $acG \to \text{Bob}$, $baG \to \text{Candy}$):
- **Alice** computa $S_A = a \cdot (cb \cdot G) = abc \cdot G$
- **Bob** computa $S_B = b \cdot (ac \cdot G) = bac \cdot G = abc \cdot G$
- **Candy** computa $S_C = c \cdot (ba \cdot G) = cba \cdot G = abc \cdot G$

Dado que la multiplicación escalar en $E(\mathbb{F}_p)$ es asociativa y conmutativa:
$$S_A = S_B = S_C = abc \cdot G$$

### Derivación de Clave Simétrica (KDF)
Siguiendo NIST SP 800-56A, se extrae la coordenada afín $X(abc \cdot G)$ de 256 bits y se somete a la función hash SHA-256:
$$K_{\text{AES}} = \text{SHA-256}(X(abc \cdot G))$$
Esta llave de 256 bits alimenta algoritmos simétricos autenticados como **AES-256-GCM** (integrable con la Práctica 1).

---

## 6. Estructura de Archivos

- `index.html`: Estructura semántica, panel de control de memorias USB, stepper de 3 rondas y diagrama SVG interactivo.
- `style.css`: Sistema de diseño moderno Dark Glass & Border alineado con la Práctica 1 y Práctica 2.
- `script.js`: Controlador criptográfico, integración con `elliptic.js`, lectura/escritura de archivos USB y KDF SHA-256 nativo.
- `elliptic.min.js`: Distribución local autónoma (100% offline) de la biblioteca criptográfica.
