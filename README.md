# Laboratorio de Criptografía

Repositorio de prácticas de criptografía y seguridad informática para la Escuela Superior de Cómputo (ESCOM IPN).

## Índice de Prácticas

- **[Práctica 1: Criptografía Híbrida](./practica_1/)**
  - Diffie-Hellman (ECDH/DH)
  - Cifrado simétrico AES-GCM
  - Firma y verificación RSA
  - Simulación de almacenamiento en nube con chunks cifrados

- **[Práctica 2: Curvas Elípticas sobre 𝔽ₚ](./practica_2/)**
  - Ecuación corta de Weierstrass: $y^2 \equiv x^3 + ax + b \pmod p$
  - Verificación de no singularidad: $4a^3 + 27b^2 \not\equiv 0 \pmod p$
  - Búsqueda exhaustiva de puntos afines
  - Conteo de orden: $|E(\mathbb{F}_p)|$ con $\mathcal{O}$ y cota de Hasse
  - Ley de grupo: Suma ordinaria ($P + Q = R$) y Doblado ($2P = R$) con inversos modulares
  - Gráfico interactivo en espacio discreto $\mathbb{F}_p \times \mathbb{F}_p$ con secante y reflexión

- **[Práctica 3: Intercambio de Claves ECDH Tripartito](./practica_3/)**
  - Protocolo de acuerdo de claves de grupo (*Group Key Exchange*) de 3 participantes (Alice, Bob y Candy)
  - Curva elíptica estándar NIST P-256 (`secp256r1` / FIPS 186-5)
  - Esquema circular cíclico por USB en 3 rondas (puntos base, intermedios y derivación autónoma de $abc \cdot G$)
  - Derivación de clave simétrica KDF mediante SHA-256 para AES-256-GCM
  - Diagrama de circuito SVG interactivo y compatibilidad 100% offline

---
Acceso web directo: Abrir `index.html` en la raíz para navegar entre las prácticas interactivas.
