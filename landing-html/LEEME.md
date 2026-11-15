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
- **Popup de salida:** solo muestra el código **SKILLIO25** para copiar. No lleva al checkout. El código se pega en el campo «¿Tenés un código de descuento?» del checkout (`/pagar`) y vale para los dos planes.
- **Precios:**
  - Mensual $29.990.
  - Pase $79.900, o 3 × $26.633.
  - Con SKILLIO25: Pase $59.900 y Mensual $22.490 el primer mes.
  - Si cambian, la fuente única es `src/lib/pricing.ts`. Hay que actualizar la landing a mano.
- **Garantía de 7 días:** está también en los Términos de la app (`src/app/terminos/page.tsx`, sección 9). Si cambia el plazo, cambiarlo en los dos lados.

## Reglas del dueño
- Ningún botón de compra arriba de todo: el primero va después de la demo.
- Se mantienen la fuente Plus Jakarta Sans, el texto que se escribe solo y las tarjetas 3D del hero.
- Los testimonios son videos hechos con IA y la página lo dice. Ese aviso no se saca.
- **No poner números inventados.** Por ejemplo, la cantidad de estudiantes tiene que ser real.
- Mobile es lo más importante: el tráfico viene de Instagram y Facebook.

## Velocidad
- `index.html` tiene que pesar alrededor de 100 KB o menos.
- Imágenes y videos con `loading="lazy"` y `preload="none"`. Nada en base64.
- Después de publicar, medir con PageSpeed en móvil.
