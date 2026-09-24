# Práctica: Calculadora de Curvas Elípticas sobre $\mathbb{F}_p$

**Instituto Politécnico Nacional**  
**Escuela Superior de Cómputo (ESCOM)**  
**Materia:** Selected Topics in Cryptography  
**Profesora:** Dra. Nidia A. Cortez Duarte  

---

## 1. Descripción General
Calculadora web interactiva desarrollada en **Vanilla JavaScript**, **HTML5** y **CSS3** sin dependencias externas, diseñada para el estudio exhaustivo, verificación algebraica, cálculo de puntos, operaciones de grupo abeliano, multiplicación escalar, identificación de generadores e impresión de tablas matriciales sobre curvas elípticas en la forma corta de Weierstrass:

$$y^2 \equiv x^3 + ax + b \pmod p$$

---

## 2. Lenguaje y Tecnologías Utilizadas
- **Lenguaje:** JavaScript estándar (ECMAScript 6+) ejecutado nativamente en el navegador.
- **Entorno Gráfico:** HTML5 semántico y CSS3 modular (diseño responsive con CSS Grid, Flexbox y temas oscuros de alto contraste).
- **Visualización Geométrica:** HTML5 Canvas API en 2D para renderizado del plano discreto $\mathbb{F}_p \times \mathbb{F}_p$, simetría axial respecto a $y = p/2$ y rectas secantes/tangentes proyectivas.
- **Sin Bibliotecas de Terceros:** Aritmética modular de precisión entera implementada desde cero con Algoritmo Extendido de Euclides.

---

## 3. Métodos y Funciones Implementados

### 3.1. Métodos de Aritmética Modular Básica
- **`mod(n, m)`**
  - *Descripción:* Calcula el residuo positivo de $n \pmod m$, garantizando resultados en el intervalo $[0, m-1]$ incluso para operandos negativos.
  - *Parámetros:* `n` (Number: dividendo), `m` (Number: módulo).
  - *Retorno:* (Number) Residuo en $[0, m-1]$.

- **`modInverse(a, m)`**
  - *Descripción:* Calcula el inverso modular $a^{-1} \pmod m$ mediante el Algoritmo Extendido de Euclides (EEA).
  - *Parámetros:* `a` (Number: elemento base), `m` (Number: módulo).
  - *Retorno:* (Number|null) Inverso modular $x$ tal que $a \cdot x \equiv 1 \pmod m$, o `null` si $\gcd(a, m) \neq 1$.

- **`isPrime(n)`**
  - *Descripción:* Test determinista de primalidad para verificar que el módulo $p$ define un campo de Galois $\mathbb{F}_p$.
  - *Parámetros:* `n` (Number: entero a evaluar).
  - *Retorno:* (Boolean) `true` si es primo, `false` si es compuesto o $\le 1$.

- **`eulerPhi(n)`**
  - *Descripción:* Función indicatriz de Euler $\phi(n)$ para determinar la cantidad de generadores de un grupo cíclico de orden $n$.
  - *Parámetros:* `n` (Number: orden del grupo).
  - *Retorno:* (Number) Cantidad de enteros coprimos con $n$ en $[1, n]$.

---

### 3.2. Operaciones de Ley de Grupo y Verificación
- **`calculateCurve()`**
  - *Descripción:* Función controladora principal. Valida la curva, verifica la condición de no singularidad $4a^3 + 27b^2 \not\equiv 0 \pmod p$, genera los residuos cuadráticos, encuentra los puntos afines, computa la cardinalidad $\#E(\mathbb{F}_p)$, la cota de Hasse, invoca la identificación de generadores y construye las tablas.
  - *Parámetros:* Ninguno (lee del estado de la interfaz).

- **`addPoints(P, Q, a, p)`**
  - *Descripción:* Implementa la ley de adición en la curva elíptica:
    - Elemento neutro: $P + \mathcal{O} = P$ y $\mathcal{O} + Q = Q$.
    - Puntos opuestos: $P + (-P) = \mathcal{O}$ cuando $x_1 = x_2$ e $y_1 \equiv -y_2 \pmod p$.
    - Doblado de punto ($P = Q$): Pendiente tangente $\lambda \equiv (3x_1^2 + a)(2y_1)^{-1} \pmod p$.
    - Suma de puntos distintos ($P \neq Q$): Pendiente secante $\lambda \equiv (y_2 - y_1)(x_2 - x_1)^{-1} \pmod p$.
    - Coordenadas resultantes: $x_3 \equiv \lambda^2 - x_1 - x_2 \pmod p$, $y_3 \equiv \lambda(x_1 - x_3) - y_1 \pmod p$.
  - *Parámetros:*
    - `P` (Object|String): Coordenadas $\{x, y\}$ o `'INF'`.
    - `Q` (Object|String): Coordenadas $\{x, y\}$ o `'INF'`.
    - `a` (Number): Coeficiente lineal de la curva.
    - `p` (Number): Módulo primo del campo finito $\mathbb{F}_p$.
  - *Retorno:* (Object) `{ R, lambda, intersect, type, title, steps }`.

---

### 3.3. Procedimientos Requeridos para el Reporte (Señalar con Recuadro Rojo)

#### Procedimiento 1: Multiplicación Escalar ($k \cdot P$)
```javascript
/* ==========================================================================
   [RECUADRO ROJO REPORTE - PROCEDIMIENTO 1: MULTIPLICACIÓN ESCALAR]
   Función: scalarMultiply(k, P, a, p)
   Descripción: Realiza la multiplicación escalar k · P sobre la curva elíptica
                utilizando el algoritmo Double-and-Add (Doblado y Suma binaria).
   Parámetros:
     - k (Number): Escalar entero (k >= 0).
     - P (Object|String): Punto base {x, y} o 'INF' (punto al infinito 𝒪).
     - a (Number): Coeficiente lineal de la curva elíptica y² = x³ + ax + b (mod p).
     - p (Number): Módulo primo del campo finito 𝔽ₚ.
   Retorna:
     - Object: {
         R: Punto resultante {x, y} o 'INF',
         k: Escalar aplicado,
         P: Punto base utilizado,
         binaryStr: Cadena binaria de k,
         steps: Array con la secuencia detallada de pasos matemáticos
       }
   ========================================================================== */
function scalarMultiply(k, P, a, p) {
  k = parseInt(k, 10);
  if (isNaN(k) || k < 0) k = 0;

  if (P === 'INF' || k === 0) {
    return {
      R: 'INF',
      k,
      P,
      binaryStr: '0',
      steps: [
        `Escalar k = ${k}.`,
        `Propiedad del elemento neutro: ${k} · ${formatPoint(P)} = 𝒪.`
      ]
    };
  }

  if (k === 1) {
    return {
      R: P,
      k,
      P,
      binaryStr: '1',
      steps: [
        `Escalar k = 1:`,
        `1 · ${formatPoint(P)} = ${formatPoint(P)}.`
      ]
    };
  }

  const binaryStr = k.toString(2);
  const steps = [];
  steps.push(`Representación binaria del escalar: k = ${k} = (${binaryStr})₂ (Longitud: ${binaryStr.length} bits)`);

  let current = 'INF';

  for (let i = 0; i < binaryStr.length; i++) {
    const bit = binaryStr[i];
    const bitIndex = i + 1;

    // En el algoritmo Double-and-Add: doblamos si current ya no es INF
    if (current !== 'INF') {
      const prev = current;
      const doubleRes = addPoints(current, current, a, p);
      current = doubleRes.R;
      steps.push(`Paso ${bitIndex}.a [Bit ${bit}] → Doblado (Double): 2 · ${formatPoint(prev)} = ${formatPoint(current)}`);
    }

    // Si el bit actual es 1, sumamos el punto base P
    if (bit === '1') {
      if (current === 'INF') {
        current = P;
        steps.push(`Paso ${bitIndex}.b [Bit 1] → Inicialización: R = P = ${formatPoint(P)}`);
      } else {
        const prev = current;
        const addRes = addPoints(current, P, a, p);
        current = addRes.R;
        steps.push(`Paso ${bitIndex}.b [Bit 1] → Suma (Add): ${formatPoint(prev)} + ${formatPoint(P)} = ${formatPoint(current)}`);
      }
    }
  }

  steps.push(`Resultado Final: ${k} · ${formatPoint(P)} = ${formatPoint(current)}`);

  return {
    R: current,
    k,
    P,
    binaryStr,
    steps
  };
}
```

#### Procedimiento 2: Identificación y Listado de Puntos Generadores
```javascript
/* ==========================================================================
   [RECUADRO ROJO REPORTE - PROCEDIMIENTO 2: IDENTIFICACIÓN DE PUNTOS GENERADORES]
   Función: findGeneratorsAndOrders(allAffinePoints, a, p, groupOrder)
   Descripción: Calcula el orden cíclico de cada punto en el grupo E(𝔽ₚ) y determina
                cuáles son los puntos generadores de la curva elíptica.
                Un punto G es generador si genera todo el grupo cíclico, es decir,
                su orden es exactamente igual a la cardinalidad #E(𝔽ₚ).
   Parámetros:
     - allAffinePoints (Array): Lista de puntos finitos [{x, y}, ...].
     - a (Number): Coeficiente lineal de la curva.
     - p (Number): Módulo primo del campo finito 𝔽ₚ.
     - groupOrder (Number): Cardinalidad del grupo #E(𝔽ₚ) = puntos_afines + 1.
   Retorna:
     - Object: {
         isCyclic: Boolean,         // Verdadero si el grupo es cíclico
         generators: Array,         // Lista de puntos generadores {x, y}
         pointOrders: Array,        // Lista [{ point, order, isGenerator, subgroup }]
         phiN: Number,              // Cantidad teórica de generadores φ(#E(𝔽ₚ))
         maxOrder: Number           // Orden máximo encontrado en el grupo
       }
   ========================================================================== */
function findGeneratorsAndOrders(allAffinePoints, a, p, groupOrder) {
  const allPoints = ['INF', ...allAffinePoints];
  const pointOrders = [];
  const generators = [];
  let maxOrder = 1;

  for (const pt of allPoints) {
    if (pt === 'INF') {
      pointOrders.push({
        point: 'INF',
        order: 1,
        isGenerator: groupOrder === 1,
        subgroup: ['INF']
      });
      continue;
    }

    // Calcular múltiplos sucesivos: 1P, 2P, 3P, ... hasta alcanzar INF
    let current = pt;
    let order = 1;
    const subgroup = [pt];

    while (current !== 'INF' && order <= groupOrder + 1) {
      const nextRes = addPoints(current, pt, a, p);
      current = nextRes.R;
      order++;
      subgroup.push(current);
      if (current === 'INF') break;
    }

    if (order > maxOrder) maxOrder = order;

    const isGen = (order === groupOrder);
    if (isGen) {
      generators.push(pt);
    }

    pointOrders.push({
      point: pt,
      order,
      isGenerator: isGen,
      subgroup
    });
  }

  const isCyclic = (maxOrder === groupOrder);
  const phiN = isCyclic ? eulerPhi(groupOrder) : 0;

  return {
    isCyclic,
    generators,
    pointOrders,
    phiN,
    maxOrder
  };
}
```

---

### 3.4. Impresión y Exportación de Tablas
- **`buildAndRenderCayleyTable()`**: Construye la matriz de adición $P_i + P_j$ para todos los puntos de la curva.
- **`buildAndRenderScalarTable()`**: Construye la matriz de múltiplos escalares $k \cdot P$ para $k \in \{1, \dots, N\}$.
- **`printTableInNewWindow(title, tableElement, subtitle)`**: Despliega una ventana emergente profesional formateada con membretes del IPN y ESCOM, lista para generar PDF o impresión directa.
- **`exportCayleyCsv()`** y **`exportScalarCsv()`**: Exporta las tablas completas en formato CSV al portapapeles.

---

## 4. Tabla Comparativa de Seguridad: Curvas Elípticas (ECC) vs RSA
*(Requisito de la Rúbrica de Autoevaluación NIST SP 800-57 y BSI)*

| Nivel de Seguridad (bits) | Clave Curva Elíptica (ECC) | Clave RSA Equivalente | Ratio de Tamaño (RSA / ECC) | Curvas Estándar Recomendadas | Ámbito de Aplicación |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **80 bits** *(Legado)* | 160 bits | 1024 bits | **6.4x** | secp160r1 | Desaprobado por falta de seguridad |
| **112 bits** | 224 bits | 2048 bits | **9.1x** | NIST P-224 | Sistemas legados |
| **128 bits** *(Estándar actual)* | **256 bits** | **3072 bits** | **12.0x** | secp256k1, NIST P-256, Curve25519 | TLS 1.3, Bitcoin, SSH, Signal |
| **192 bits** *(Alta seguridad)* | 384 bits | 7680 bits | **20.0x** | NIST P-384 | Gubernamental Top Secret, Bancario |
| **256 bits** *(Máxima seguridad)* | 512 - 521 bits | 15360 bits | **29.5x** | NIST P-521, Curve448 | Archivo a largo plazo, PQC Híbrido |

### Ventajas de las Curvas Elípticas frente a RSA:
1. **Dificultad Matemática:** La seguridad de RSA radica en el problema de factorización de enteros (IFP), para el cual existen algoritmos subexponenciales como la Criba General del Cuerpo de Números (GNFS). En contraste, ECC se basa en el Problema del Logaritmo Discreto en Curvas Elípticas (ECDLP), que solo admite algoritmos de resolución genérica de complejidad completamente exponencial $\mathcal{O}(\sqrt{n})$.
2. **Eficiencia de Almacenamiento y Transmisión:** Una clave ECC de 256 bits provee la misma seguridad que una clave RSA de 3072 bits, reduciendo el ancho de banda y la sobrecarga en certificados y firmas digitales en un factor de 12.
3. **Consumo Energético y Cómputo:** Las operaciones de firma y doblado en ECC son notablemente más veloces y demandan menor consumo energético, haciéndolas ideales para dispositivos móviles, tarjetas inteligentes y chips embebidos.

---

## 5. Guía de Capturas para el Reporte
Para satisfacer la entrega de la práctica, tomar las siguientes capturas directamente desde la aplicación:

1. **Validación de una curva:**
   - Curva válida: $y^2 \equiv x^3 + 4x + 4 \pmod{11}$ (Discriminante $4a^3 + 27b^2 \equiv 6 \not\equiv 0 \pmod{11}$, banner verde).
   - Curva singular: $a = 0, b = 0 \pmod{11}$ (Discriminante $0 \equiv 0 \pmod{11}$, banner rojo de singularidad).
2. **Cálculo de puntos:**
   - Tabla paso a paso mostrando residuos cuadráticos y los 10 puntos afines $\{(0, 2), (0, 9), (1, 3), (1, 8), (2, 3), (2, 8), (7, 1), (7, 10), (8, 3), (8, 8)\}$.
   - Métricas de cardinalidad: $\#E(\mathbb{F}_{11}) = 11$ (con $\mathcal{O}$).
3. **Suma de puntos:**
   - Operación: $(0, 2) + (1, 3) = (8, 8)$ con desglose completo de la pendiente secante $\lambda$.
4. **Doblado de puntos:**
   - Operación: $2(0, 2) = (1, 8)$ con desglose de la pendiente tangente $\lambda$.
5. **Multiplicación escalar:**
   - Operación: $k \cdot P$ para $k = 3$ y $P = (0, 2)$, mostrando el algoritmo Double-and-Add en binario $(11)_2$ y el resultado $(2, 8)$.
6. **Puntos Generadores y Tablas:**
   - Sección de Puntos Generadores indicando que los 10 puntos afines son generadores de orden 11.
   - Vista de la Tabla de Cayley de Suma y Tabla de Multiplicación Escalar con opción de imprimir.

---

## 6. Autoevaluación de la Práctica

| Criterio del Reporte | Valor | Cumplimiento |
| :--- | :---: | :---: |
| Contiene todos los datos de la portada y sello | 1 | 1 |
| Se describen la(s) biblioteca(s) utilizada(s) así como sus métodos o funciones | 1 | 1 |
| Se incluye la tabla comparativa de las distintas curvas elípticas y su equivalente en RSA | 1 | 1 |
| Se incluye el código fuente desarrollado en formato de texto | 1 | 1 |
| Se presentan capturas del funcionamiento | 1 | 1 |
| **No se menciona encriptar/desencriptar ni sus conjugaciones** | 1 | 1 |
| **TOTAL** | **6** | **6** |
