# Práctica 2: Curvas Elípticas sobre 𝔽ₚ

Herramienta interactiva y minimalista para el estudio, verificación y operaciones de grupo en Curvas Elípticas finitas.

## Ecuación de Weierstrass Corta
$$y^2 \equiv x^3 + ax + b \pmod p$$

## Características
1. **Verificación de No Singularidad**: $4a^3 + 27b^2 \not\equiv 0 \pmod p$.
2. **Cálculo de Puntos**: Búsqueda para cada $x \in \{0, \dots, p-1\}$ y raíces mod $p$.
3. **Métricas**: Orden $|E(\mathbb{F}_p)|$ con elemento neutro $\mathcal{O}$ y cota de Hasse.
4. **Ley de Grupo (Aritmética de Puntos)**:
   - **Suma de puntos diferentes ($P \neq Q$)**: pendiente $\lambda \equiv (y_2 - y_1)(x_2 - x_1)^{-1} \pmod p$.
   - **Doblado de punto ($2P$)**: pendiente tangente $\lambda \equiv (3x_1^2 + a)(2y_1)^{-1} \pmod p$.
   - **Inverso aditivo ($-P$)**: $-P = (x_1, p - y_1) \implies P + (-P) = \mathcal{O}$.
   - **Elemento neutro**: $P + \mathcal{O} = P$.
5. **Plano Discreto**: Visualización en Canvas $\mathbb{F}_p \times \mathbb{F}_p$, resaltado de $P, Q, R$ y recta secante/tangente.
