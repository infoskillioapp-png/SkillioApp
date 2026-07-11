"use client";

// Botón de soporte dentro de la app (WhatsApp). Espeja al FAB de Booki: abajo a
// la IZQUIERDA (Booki está a la derecha). En desktop es una pastilla ovalada con
// "Soporte"; en mobile queda solo el círculo verde para no chocar con el pill de
// Booki ni con la barra inferior.
const WHATSAPP = "5493517732460";
const MSG = encodeURIComponent("¡Hola! Necesito ayuda con Skillio 🙂");

export function SupportButton() {
  return (
    <a
      id="support-fab"
      href={`https://wa.me/${WHATSAPP}?text=${MSG}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Soporte por WhatsApp"
    >
      <span className="sfk">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="#fff" aria-hidden>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </span>
      <span className="slabel">Soporte</span>

      <style>{`
        #support-fab{position:fixed;left:26px;bottom:26px;z-index:50;display:flex;align-items:center;gap:9px;background:#fff;padding:9px 18px 9px 9px;border-radius:999px;font-weight:600;font-size:13.5px;color:var(--ink);text-decoration:none;box-shadow:0 16px 36px rgba(40,44,90,.2);transition:transform .22s, box-shadow .22s}
        #support-fab:hover{transform:translateY(-3px);box-shadow:0 20px 44px rgba(40,44,90,.26)}
        #support-fab .sfk{width:34px;height:34px;border-radius:50%;background:#25D366;display:grid;place-items:center;flex-shrink:0}
        @media(max-width:720px){
          #support-fab{left:14px;bottom:82px;padding:0;background:#25D366;box-shadow:0 8px 20px rgba(37,211,102,.45)}
          #support-fab .sfk{width:44px;height:44px;background:transparent}
          #support-fab .slabel{display:none}
        }
      `}</style>
    </a>
  );
}
