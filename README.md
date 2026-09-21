# Laboratorio de Criptografía

Repositorio de prácticas de criptografía y seguridad informática para la Escuela Superior de Cómputo (ESCOM IPN).

---

## Índice de Prácticas

### 🔐 [Práctica 1: Criptografía Híbrida](./practica_1/)
- **Intercambio de claves**: Diffie-Hellman (ECDH / DH).
- **Cifrado simétrico autenticado**: AES-GCM (256-bit).
- **Firma digital y verificación**: RSA (PKCS#1 / PSS).
- **Almacenamiento seguro**: Simulación de envío y almacenamiento de chunks cifrados en la nube.
- **Acceso web**: [Abrir Práctica 1](./practica_1/index.html)

---

### 📈 [Práctica 2: Curvas Elípticas sobre 𝔽ₚ](./practica_2/)
- **Ecuación corta de Weierstrass**:
  $$
  y^2 \equiv x^3 + ax + b \pmod p
  $$
- **Verificación de no singularidad**:
  $$
  4a^3 + 27b^2 \not\equiv 0 \pmod p
  $$
- **Búsqueda exhaustiva de puntos afines**: Cálculo de residuos cuadráticos y raíces cuadradas mod $p$.
- **Conteo de orden del grupo**: $|E(\mathbb{F}_p)|$ incluyendo el punto al infinito $\mathcal{O}$.
- **Verificación de la Cota de Hasse**:
  $$
  |p + 1 - |E(\mathbb{F}_p)|| \le 2\sqrt{p}
  $$
- **Visualización gráfica**: Plano discreto $\mathbb{F}_p \times \mathbb{F}_p$ con simetría respecto a $y = p/2$.
- **Acceso web**: [Abrir Práctica 2](./practica_2/index.html)

---

### ⏳ Práctica 3: *Próximamente*
- Módulo en desarrollo para las siguientes sesiones de laboratorio.

---

## Ejecución Local

Para interactuar con las prácticas:
1. Clona o descarga el repositorio.
2. Abre el portal principal haciendo doble clic en `index.html` en la raíz, o navega a la carpeta de la práctica que desees ejecutar.
