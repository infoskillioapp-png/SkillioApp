# Skillio 3.0 — Design System (MASTER)

> Fuente de verdad del rediseño 3.0. Las pantallas pueden tener overrides en
> `design-system/pages/<pagina>.md`. Estética: **"Foco cálido"** — minimalista,
> profesional, en tendencia, que invita a concentrarse. Centrada en el apunte.
> NO copiar la estética de Solvely (azul/violeta, gradientes, burbujeo).

## Principios
1. **Disciplina de color:** naranja = acción/activo · verde = dominado/correcto · rojo = error. Nada más.
2. **El contenido es la estrella.** Mucho aire, chrome mínimo, una acción protagonista por pantalla.
3. **Distintivo, no plantilla** (skill frontend-design). Tipografía con carácter + cuerpo ultra legible.
4. **Mobile-first** en lector y práctica. Micro-interacciones sutiles (150–250ms, transform/opacity, respeta `prefers-reduced-motion`).
5. **El % de Dominio es el corazón emocional**: sube según el avance por las secciones/temas.
6. Íconos **SVG** (estilo Lucide, viewBox 24, stroke ~1.7). **Nunca emojis como íconos.**

## Color — Light (default)
| Rol | Hex |
|-----|-----|
| Lienzo (bg) | **#FFFFFF** (blanco puro) |
| Superficie agrupada / hover sutil | #FAFAF9 |
| Borde hairline | #ECEAE6 |
| Texto | #1B1A17 · apagado #6B665E · faint #9A958C |
| **Naranja (marca/acción)** | **#F97316** · hover #EA580C · tint #FFF3EA |
| Verde (dominio/correcto) | #16A34A · tint #ECFDF3 |
| Rojo (incorrecto) | #E11D48→ usar #DC2626 · tint #FEF2F2 |

> En Tailwind: `orange-500`=#F97316, `orange-600`=#EA580C, `green-600`, `red-600`, `neutral-*`. Se puede construir casi todo con defaults de Tailwind.

## Color — Dark (opcional, estudio nocturno)
| Rol | Hex |
|-----|-----|
| Lienzo | #14110D |
| Superficie | #1D1915 |
| Borde | rgba(255,255,255,.08) |
| Texto | #F3EEE7 · apagado #B8B2A8 |
| Naranja | #FF7A33 |

## Tipografía
- **Títulos:** Space Grotesk (moderna, con carácter). `letter-spacing: -0.02em`.
- **Cuerpo:** Inter (legible para resúmenes largos, interlineado 1.6–1.7).
- Números de %/stats: variante tabular (tabular-nums).

## Forma / efectos
- Cards: `rounded-2xl` (1rem), borde hairline + sombra muy sutil `0 1px 2px rgba(27,26,23,.05)`; hover sube un poco la sombra y/o borde.
- Chips/botones: `rounded-full`.
- Botón primario: fondo naranja `#F97316`, texto blanco; hover `#EA580C`.
- Estados (status chips): No empezado (neutral) · En progreso (tint naranja) · Dominado (tint verde).
- Sin gradientes decorativos por todos lados. Una sola firma sutil permitida (ej. anillo de Dominio naranja).

## Layout base de la app
- **Rail izquierdo minimal (~72px):** logo Skillio + botón "+" (nuevo apunte, naranja) + slots futuros + avatar abajo.
- Contenido a `max-w` cómodo, centrado, mucho padding.
- **Booki:** botón flotante abajo a la derecha, limpio y discreto (no burbuja ruidosa).

## Marca
- Nombre **Skillio**. Mascota **Booki** (chat contextual del apunte).

## Decisiones de producto (afectan UI/datos)
- La IA **genera todo al subir** el apunte (resumen + secciones/temas + flashcards + simulacro).
- **% Dominio** por tema sube con el avance/aprobación; el global es el agregado por secciones.
- **Paywall:** se define más adelante (dónde bloquear).
- Stack: Next.js + Tailwind (mismo repo, rama `v3`).
