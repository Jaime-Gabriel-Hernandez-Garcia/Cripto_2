# Práctica: Intercambio de Claves ECDH Tripartito (P-256)

**Instituto Politécnico Nacional**  
**Escuela Superior de Cómputo (ESCOM)**  
**Materia:** Selected Topics in Cryptography  
**Profesora:** Dra. Nidia A. Cortez Duarte  

---

## 1. Descripción General

Simulador interactivo del protocolo de **Acuerdo de Claves de Grupo (Group Key Exchange)** basado en **Criptografía de Curvas Elípticas (ECDH Tripartito)** ejecutado entre tres participantes (Alice, Bob y Candy).

El sistema simula un esquema de intercambio cíclico en anillo (mediante paso de memorias USB o canal de transmisión) sobre la curva estándar **NIST P-256 (secp256r1 / FIPS 186-5)**, permitiendo que las tres entidades computen de forma autónoma el mismo secreto de grupo $abc \cdot G$ sin revelar jamás sus escalares privados locales.

---

## 2. Fundamento Criptográfico y Matemático

### 2.1. Parámetros de la Curva NIST P-256 (`secp256r1`)
- **Ecuación de Weierstrass corta:**  
  $$y^2 \equiv x^3 + ax + b \pmod p$$
  con $a = -3$ y $b$ especificado por NIST FIPS 186-5.
- **Módulo primo $p$:**  
  $$p = 2^{256} - 2^{224} + 2^{192} + 2^{96} - 1$$
- **Punto base generador:** $G = (G_x, G_y)$ de orden primo $n \approx 2^{256}$.
- **Cofactor:** $h = 1$ (no existen subgrupos pequeños; todos los puntos no nulos generan el grupo).

---

### 2.2. Álgebra del Protocolo por Rondas

#### Fase 1: Generación y Publicación de Claves
Cada participante $i \in \{A, B, C\}$ genera de manera pseudoaleatoria segura su escalar privado $d_i \in [1, n-1]$ y computa su punto público:
- **Alice:** $a \in \mathbb{F}_n \implies A = a \cdot G$
- **Bob:** $b \in \mathbb{F}_n \implies B = b \cdot G$
- **Candy:** $c \in \mathbb{F}_n \implies C = c \cdot G$

#### Fase 2: Primer Traspaso USB y Puntos Parciales
Los puntos públicos circulan cíclicamente en el anillo ($C \to \text{Alice}$, $A \to \text{Bob}$, $B \to \text{Candy}$):
- **Alice** recibe $C$ y calcula el punto intermedio:  
  $$P_A = a \cdot C = a \cdot (c \cdot G) = ac \cdot G$$
- **Bob** recibe $A$ y calcula el punto intermedio:  
  $$P_B = b \cdot A = b \cdot (a \cdot G) = ba \cdot G$$
- **Candy** recibe $B$ y calcula el punto intermedio:  
  $$P_C = c \cdot B = c \cdot (b \cdot G) = cb \cdot G$$

#### Fase 3: Segundo Traspaso USB y Derivación del Secreto Compartido
Los puntos parciales vuelven a circular cíclicamente ($cbG \to \text{Alice}$, $acG \to \text{Bob}$, $baG \to \text{Candy}$):
- **Alice** multiplica su escalar privado por $P_C$:  
  $$S_A = a \cdot (cb \cdot G) = abc \cdot G$$
- **Bob** multiplica su escalar privado por $P_A$:  
  $$S_B = b \cdot (ac \cdot G) = bac \cdot G = abc \cdot G$$
- **Candy** multiplica su escalar privado por $P_B$:  
  $$S_C = c \cdot (ba \cdot G) = cba \cdot G = abc \cdot G$$

Por las propiedades conmutativas y asociativas de la adición de puntos en curvas elípticas:
$$S_A = S_B = S_C = abc \cdot G$$

#### Derivación de Clave Simétrica (KDF)
El estándar NIST SP 800-56A recomienda utilizar la coordenada afín $X$ del punto $abc \cdot G$ como entrada a una función de derivación de claves (KDF) basada en hash:
$$K_{\text{AES}} = \text{SHA-256}(X(abc \cdot G))$$
Esta llave de 256 bits alimenta algoritmos simétricos autenticados como **AES-256-GCM** (integrable con la Práctica 1).

---

## 3. Seguridad y Resistencia Criptoanalítica

1. **Problema del Logaritmo Discreto en Curvas Elípticas (ECDLP):**  
   Dado $G$ y $Q = d \cdot G$, es computacionalmente intratable encontrar $d$. Para P-256, el mejor ataque genérico (Pollard's rho) requiere $\mathcal{O}(\sqrt{n}) \approx 2^{128}$ operaciones.
2. **Problema Computacional de Diffie-Hellman (CDH):**  
   El atacante que observe las transmisiones solo obtiene $\{A, B, C\}$ y los parciales $\{acG, baG, cbG\}$. Computar $abcG$ sin conocer al menos uno de los escalares $\{a, b, c\}$ es equivalente al problema CDH.
3. **Prevención Man-in-the-Middle (MITM):**  
   En entornos de producción, las identidades públicas deben autenticarse mediante firmas digitales (ECDSA / RSA) o certificados X.509 para garantizar autenticación y no repudio.

---

## 4. Estructura de Archivos

- `index.html`: Estructura semántica, controles de flujo, stepper interactivo de 3 rondas y diagrama de circuito en SVG.
- `style.css`: Sistema de diseño moderno Dark Glass & Border de alto contraste, unificado con la paleta de colores de la Práctica 1 y Práctica 2.
- `script.js`: Controlador de la lógica criptográfica, interoperable offline y compatible con Web Crypto API para derivación SHA-256 y portapapeles.
- `elliptic.min.js`: Distribución local de la biblioteca criptográfica para curva P-256, garantizando funcionamiento 100% offline en el laboratorio.

---

## 5. Instrucciones de Uso

1. Abrir `index.html` en cualquier navegador web moderno (Chrome, Firefox, Edge, Safari).
2. Hacer clic en **"⚡ Generar las 3 Claves"** para que Alice, Bob y Candy obtengan sus pares de claves P-256.
3. Avanzar ronda por ronda con **"Iniciar Intercambio"** o utilizar **"▶ Simular Flujo Completo"** para ver la ejecución paso a paso con trazado visual en el diagrama SVG.
4. Inspeccionar la verificación en la **Fase 03**, comparando la coordenada $X$, la clave KDF derivada y los valores calculados de forma autónoma por cada participante.

