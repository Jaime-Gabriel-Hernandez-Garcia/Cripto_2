# Práctica 2: Curvas Elípticas sobre 𝔽ₚ

Herramienta interactiva y minimalista para el estudio, verificación y visualización de Curvas Elípticas en campos finitos $\mathbb{F}_p$.

---

## Modelo Matemático

### Ecuación de Weierstrass Corta
$$
y^2 \equiv x^3 + ax + b \pmod p
$$

### 1. Condición de No Singularidad
Para que la curva forme un grupo abeliano bien definido y sin auto-intersecciones (nodos) ni puntos de retroceso (cúspides), el discriminante no debe anularse:
$$
4a^3 + 27b^2 \not\equiv 0 \pmod p
$$

### 2. Puntos Afines y Elemento Neutro
El conjunto de puntos está formado por todas las soluciones enteras $(x, y) \in \mathbb{F}_p \times \mathbb{F}_p$ más el elemento neutro en el infinito $\mathcal{O}$:
$$
E(\mathbb{F}_p) = \{ (x, y) \in \mathbb{F}_p \times \mathbb{F}_p \mid y^2 \equiv x^3 + ax + b \pmod p \} \cup \{ \mathcal{O} \}
$$

### 3. Cota de Hasse
El orden total del grupo $|E(\mathbb{F}_p)|$ satisface:
$$
p + 1 - 2\sqrt{p} \le |E(\mathbb{F}_p)| \le p + 1 + 2\sqrt{p}
$$

---

## Características de la Aplicación
- **Verificación instantánea**: Cálculo del discriminante con desglose aritmético paso a paso.
- **Tabla exhaustiva**: Desglose para cada $x \in \{0, \dots, p-1\}$ con prueba de residuo cuadrático y raíces $y$.
- **Gráfico en Canvas**: Coordenadas discretas con eje de simetría $y = p/2$ y hover sincronizado con la tabla.
- **Presets interactivos**: Ejemplos preconfigurados incluyendo casos válidos y singulares.

---

## Uso
Abre `index.html` en esta carpeta con cualquier navegador web moderno.
