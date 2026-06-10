# Media de la landing

Subí los archivos acá con estos nombres EXACTOS. Si falta alguno, la landing
muestra un placeholder con instrucciones (no se rompe).

## Video (loop, sin audio)
Se reproducen solos, en loop y muteados (`autoplay loop muted playsInline`).
Formato recomendado: **.mp4** (H.264) liviano. Ideal < 3 MB para que cargue rápido.
- `hero.mp4` — Hero. Loop 10–15s mostrando la transformación: apunte → resumen +
  flashcards + simulacro. Relación ~16:10. Es lo primero que ve el usuario.
- `antes-despues.mp4` — Sección "Cómo funciona". Antes/después: apunte caótico →
  material ordenado. Relación ~16:9.

> Si me pasás un .gif en vez de .mp4, lo convierto a mp4 (pesa mucho menos) o
> cambio el nombre en el código. Avisá.

## Fotos de testimonios (carpeta `testimonios/`)
Caras reales mejoran muchísimo la conversión. Cuadradas (~200x200), .jpg:
- `sofi.jpg`, `mati.jpg`, `luchi.jpg`, `juli.jpg`, `fran.jpg`, `cami.jpg`

Si una foto falta, se muestra un avatar con la inicial (fallback automático).
