# Landing de venta de Skillio (HTML estático)

Esta es la página que se ve en **skillio.digital** cuando alguien entra sin haber iniciado sesión.

## Dónde está cada cosa
- `public/lp/preview-es.html`: la **fuente legible**. Es la que se edita.
- `public/lp/index.html`: la **versión liviana que se publica**. No se edita a mano: se genera.
- `public/lp/img/`: imágenes, videos y la fuente. En la fuente se referencian como `img/...`.
- `landing-html/optimizar.py`: genera `index.html` a partir de la fuente.

## Cómo editar y publicar
1. Editá `public/lp/preview-es.html`. Si lo abrís directo en el navegador, las imágenes cargan bien.
2. Desde la raíz del proyecto corré: `python landing-html/optimizar.py`. Este paso:
   - minifica la página;
   - cambia `img/...` por `/lp/img/...`, porque la página se sirve en `/` y no en `/lp/`.
3. Commit y push a `main`. Vercel publica solo en 1 a 3 minutos.

## Cómo se sirve (no tocar sin avisar)
- `src/proxy.ts` muestra `public/lp/index.html` en `/` a los visitantes sin sesión. La URL no cambia.
- Al usuario logueado lo manda a `/app`. Si la URL trae `?preapproval_id=`, que es la vuelta de Mercado Pago, la atiende `src/app/page.tsx`.

## Ya conectado (no romper)
- **Botones de prueba gratis:** todos van a `/app?upload=1`, que abre la app con la ventana para subir el apunte.
- **Medición:** en el `<head>` están el Meta Pixel (PageView), Microsoft Clarity y la captura de UTMs en la cookie `skillio_utm`, que se usa para atribución. Usan los mismos IDs que el resto del sitio. No se sacan.
- **Sin popup de descuento en la landing** (decisión del dueño, 15-nov-2026). El 25 % OFF (SKILLIO25) se ofrece SOLO dentro de la app, una vez, cuando la persona ve el paywall y lo cierra. No volver a agregar un popup de salida.
- **Precios:**
  - Mensual $29.990.
  - Pase $79.900, o 3 × $26.633.
  - Con SKILLIO25: Pase $59.900 y Mensual $22.490 el primer mes.
  - Si cambian, la fuente única es `src/lib/pricing.ts`. Hay que actualizar la landing a mano.
- **Garantía de 7 días:** está también en los Términos de la app (`src/app/terminos/page.tsx`, sección 9). Si cambia el plazo, cambiarlo en los dos lados.

## Reglas del dueño
- **Botones (decisión del 16-nov-2026, revierte la del 15-nov):** en celular se puede entrar a probar desde el primer segundo. Hay 3 entradas: «Probá gratis» en el header (más llamativo que «Iniciar sesión»), «Probalo gratis con tu apunte» en el hero y la **barra fija abajo, siempre visible en celular**. Están verificados en 360×640, 390×844 y 412×915. Todos los botones llevan `data-cta` y `data-btn="<nombre>"`; el nombre viaja a Meta y al embudo, así que **todo botón nuevo de prueba necesita su `data-btn`**.
- Se mantienen la fuente Plus Jakarta Sans, el texto que se escribe solo y las tarjetas 3D del hero.
- Los testimonios (Lorena, Carolina, Martín) son de usuarios reales, según confirmó el socio el 15-nov-2026, y por eso no llevan aviso de IA. Si en algún momento se suma un testimonio hecho con IA o actuado, tiene que decirlo en pantalla.
- **No poner números inventados.** Por ejemplo, la cantidad de estudiantes tiene que ser real.
- Mobile es lo más importante: el tráfico viene de Instagram y Facebook.

## Eventos del embudo (no romper)
- **Landing:**
  - `ViewContent` con `content_category:"landing"`.
  - `CTA_Click` con `{boton}` y UTM.
  - En `funnel_events`: `landing_vista` y `cta_click:<boton>`.
- **App:**
  - `Upload_Panel_Open` con `{origen}`.
  - `File_Selected` con `{tipo}`.
  - `Apunte_Subido` y `Activacion`, que se mandan por navegador y por CAPI con el mismo event_id.
  - En `funnel_events`: `panel_subida_abierto`, `archivo_elegido`, `apunte_subido` y `resumen_generado`.

## Velocidad
- `index.html` tiene que pesar alrededor de 100 KB o menos.
- Imágenes y videos con `loading="lazy"` y `preload="none"`. Nada en base64.
- Después de publicar, medir con PageSpeed en móvil.
