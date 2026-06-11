import type { Metadata } from "next";
import { LegalShell } from "../_components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Política de Privacidad · Skillio",
  description:
    "Cómo Skillio recolecta, usa y protege tus datos personales. Responsable, derechos, terceros y seguridad.",
};

export default function PrivacidadPage() {
  return (
    <LegalShell
      title="Política de Privacidad"
      subtitle="En Skillio nos tomamos en serio tu privacidad. Acá te explicamos, en criollo, qué datos tratamos, para qué, con quién y qué derechos tenés."
      updatedAt="3 de junio de 2026"
    >
      <h2 id="responsable">1. Quién es el responsable de tus datos</h2>
      <p>
        El responsable del tratamiento de los datos personales recolectados a través de Skillio (la
        &ldquo;Aplicación&rdquo; o el &ldquo;Servicio&rdquo;) es:
      </p>
      <div className="meta-box">
        <div><strong>Responsable:</strong> Emiliano Ezequiel Huerta</div>
        <div><strong>CUIL:</strong> 20-42465841-9</div>
        <div><strong>Domicilio:</strong> Av. Colón 3590, Córdoba, Provincia de Córdoba, Argentina</div>
        <div><strong>Correo de contacto:</strong> info.skillioapp@gmail.com</div>
        <div><strong>Sitio:</strong> skillio.digital</div>
      </div>
      <p>
        Esta Política se rige por la <strong>Ley N° 25.326 de Protección de los Datos Personales</strong> de
        la República Argentina y su normativa complementaria. Al usar Skillio, aceptás las prácticas descritas
        en este documento.
      </p>

      <h2 id="datos">2. Qué datos recolectamos</h2>
      <p>Tratamos únicamente los datos necesarios para que el Servicio funcione:</p>
      <h3>Datos que nos das directamente</h3>
      <ul>
        <li><strong>Datos de cuenta:</strong> nombre, dirección de correo electrónico y foto de perfil (si la cargás), gestionados a través de nuestro proveedor de autenticación.</li>
        <li><strong>Contenido que subís:</strong> apuntes, archivos PDF, imágenes, notas y cualquier texto que cargues para que la IA lo procese.</li>
        <li><strong>Datos de pago:</strong> cuando contratás un plan, el pago se procesa a través de Mercado Pago. <strong>Nosotros no almacenamos los datos de tu tarjeta</strong>; solo recibimos la confirmación del estado de la suscripción.</li>
      </ul>
      <h3>Datos que se generan con el uso</h3>
      <ul>
        <li><strong>Datos de actividad:</strong> rachas de estudio, experiencia (XP), nivel, créditos disponibles y resultados generados por la IA.</li>
        <li><strong>Datos técnicos:</strong> dirección IP, tipo de dispositivo y navegador, e información de uso recolectada mediante cookies y tecnologías similares (ver sección 6).</li>
      </ul>

      <h2 id="finalidad">3. Para qué usamos tus datos</h2>
      <ul>
        <li>Crear y administrar tu cuenta y darte acceso al Servicio.</li>
        <li>Procesar tu contenido con inteligencia artificial para generar resúmenes, flashcards y simulacros.</li>
        <li>Gestionar suscripciones, pagos y créditos.</li>
        <li>Mejorar la Aplicación, prevenir fraudes y garantizar la seguridad.</li>
        <li>Enviarte comunicaciones operativas (por ejemplo, confirmaciones o avisos importantes).</li>
        <li>Medir el rendimiento de nuestras campañas publicitarias (ver sección 6).</li>
      </ul>
      <div className="callout">
        <p><strong>Sobre tus apuntes y la IA:</strong> el contenido que subís se envía a nuestro proveedor de IA solo para generar el resultado que pediste. No usamos tus apuntes privados para publicidad ni los compartimos con otros usuarios, salvo que vos decidas publicarlos voluntariamente en la sección Comunidad.</p>
      </div>

      <h2 id="terceros">4. Con quién compartimos datos</h2>
      <p>
        No vendemos tus datos personales. Los compartimos únicamente con proveedores que nos ayudan a operar
        el Servicio (&ldquo;encargados del tratamiento&rdquo;), que solo pueden usarlos según nuestras
        instrucciones:
      </p>
      <ul>
        <li><strong>Clerk</strong> — autenticación e inicio de sesión.</li>
        <li><strong>Supabase</strong> — base de datos donde se almacena tu cuenta y contenido.</li>
        <li><strong>Anthropic (Claude)</strong> — procesamiento de inteligencia artificial de los apuntes que subís.</li>
        <li><strong>Mercado Pago</strong> — procesamiento de pagos y suscripciones.</li>
        <li><strong>Meta Platforms</strong> — medición de publicidad mediante el píxel de Meta (ver sección 6).</li>
        <li><strong>Vercel</strong> — alojamiento (hosting) de la Aplicación.</li>
        <li><strong>Sentry</strong> — monitoreo de errores técnicos para mantener la app estable.</li>
      </ul>
      <p>
        Algunos de estos proveedores pueden alojar datos fuera de Argentina (por ejemplo, en Estados Unidos).
        En esos casos, la transferencia se realiza bajo los resguardos previstos por la normativa aplicable.
      </p>

      <h2 id="menores">5. Menores de edad</h2>
      <p>
        Skillio está pensado para estudiantes, por lo que <strong>puede ser utilizado por personas menores de
        18 años</strong>. Si sos menor de 18, declarás que contás con el consentimiento de tu madre, padre o
        tutor para usar el Servicio y aceptar esta Política.
      </p>
      <p>
        No recolectamos de forma consciente datos de menores de 13 años sin el consentimiento verificable de su
        representante legal. Si creés que un menor de 13 nos brindó datos sin ese consentimiento, escribinos a
        info.skillioapp@gmail.com y los eliminaremos.
      </p>

      <h2 id="cookies">6. Cookies y píxel de Meta</h2>
      <p>
        Usamos cookies y tecnologías similares para que la Aplicación funcione, recordar tu sesión y entender
        cómo se usa el Servicio. También utilizamos el <strong>Píxel de Meta (Facebook)</strong> para medir la
        efectividad de nuestras campañas publicitarias en plataformas de Meta (Facebook e Instagram) y mostrar
        anuncios relevantes.
      </p>
      <p>
        El píxel puede recolectar información sobre tu navegación y las acciones que realizás en el sitio
        (por ejemplo, visitar una página o iniciar una compra), y compartirla con Meta. Podés gestionar tus
        preferencias publicitarias desde la configuración de tu cuenta de Facebook/Instagram o desde la
        configuración de cookies de tu navegador.
      </p>

      <h2 id="seguridad">7. Seguridad de la información</h2>
      <p>
        Aplicamos medidas técnicas y organizativas razonables para proteger tus datos, incluyendo
        <strong> cifrado en tránsito y en reposo</strong>, control de accesos y proveedores de infraestructura
        con estándares de seguridad reconocidos. Ningún sistema es 100% infalible, pero trabajamos para
        minimizar los riesgos y reaccionar rápido ante cualquier incidente.
      </p>

      <h2 id="conservacion">8. Cuánto tiempo conservamos tus datos</h2>
      <p>
        Conservamos tus datos mientras tengas una cuenta activa y durante el tiempo necesario para cumplir
        obligaciones legales, contables y fiscales. Si eliminás tu cuenta, borramos o anonimizamos tus datos
        personales, salvo aquellos que debamos conservar por ley.
      </p>

      <h2 id="derechos">9. Tus derechos</h2>
      <p>
        Como titular de los datos, tenés derecho a <strong>acceder, rectificar, actualizar y suprimir</strong>
        tu información personal, así como a oponerte a determinados tratamientos. Para ejercerlos, escribinos a
        <strong> info.skillioapp@gmail.com</strong>.
      </p>
      <div className="callout">
        <p>
          La <strong>AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA</strong>, órgano de control de la Ley N° 25.326,
          tiene la atribución de atender las denuncias y reclamos que se interpongan con relación al
          incumplimiento de las normas sobre protección de datos personales.
        </p>
      </div>

      <h2 id="cambios">10. Cambios en esta Política</h2>
      <p>
        Podemos actualizar esta Política para reflejar cambios en el Servicio o en la normativa. Si los cambios
        son significativos, te lo notificaremos por medios razonables. La fecha de la última actualización
        figura al inicio de este documento.
      </p>

      <h2 id="contacto">11. Contacto</h2>
      <p>
        Ante cualquier consulta sobre privacidad o el tratamiento de tus datos, escribinos a{" "}
        <a href="mailto:info.skillioapp@gmail.com">info.skillioapp@gmail.com</a>.
      </p>
    </LegalShell>
  );
}
