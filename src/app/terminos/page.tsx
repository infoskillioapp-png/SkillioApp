import type { Metadata } from "next";
import { LegalShell } from "../_components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Términos y Condiciones · Skillio",
  description:
    "Términos y condiciones de uso de Skillio: planes, pagos, cancelación, botón de arrepentimiento y responsabilidades.",
};

export default function TerminosPage() {
  return (
    <LegalShell
      title="Términos y Condiciones"
      subtitle="Estas son las reglas para usar Skillio. Al crear una cuenta o contratar un plan, aceptás estos términos. Te recomendamos leerlos."
      updatedAt="3 de junio de 2026"
    >
      <h2 id="titular">1. Titular del servicio</h2>
      <p>
        Skillio (la &ldquo;Aplicación&rdquo; o el &ldquo;Servicio&rdquo;) es operado por:
      </p>
      <div className="meta-box">
        <div><strong>Titular:</strong> Emiliano Ezequiel Huerta</div>
        <div><strong>CUIL:</strong> 20-42475841-9</div>
        <div><strong>Domicilio:</strong> Abra de Zenta 267, Córdoba, Provincia de Córdoba, Argentina</div>
        <div><strong>Contacto:</strong> info.skillioapp@gmail.com</div>
      </div>

      <h2 id="objeto">2. Qué es Skillio</h2>
      <p>
        Skillio es una plataforma de apoyo al estudio que, mediante inteligencia artificial, permite generar
        <strong> resúmenes, flashcards y simulacros</strong> a partir de los apuntes que subís, además de
        herramientas de organización (agenda, Pomodoro, seguimiento de logros) y una sección de Comunidad.
      </p>
      <div className="callout">
        <p>
          <strong>La IA es una herramienta de apoyo, no un sustituto del estudio.</strong> Los resultados
          generados pueden contener errores o imprecisiones. Siempre revisá y verificá la información antes de
          usarla con fines académicos. Skillio no garantiza resultados académicos específicos.
        </p>
      </div>

      <h2 id="cuenta">3. Registro y cuenta</h2>
      <ul>
        <li>Para usar el Servicio necesitás crear una cuenta con datos veraces y mantenerlos actualizados.</li>
        <li>Sos responsable de la confidencialidad de tus credenciales y de toda actividad realizada desde tu cuenta.</li>
        <li>Una cuenta es personal e intransferible.</li>
      </ul>

      <h2 id="menores">4. Menores de edad</h2>
      <p>
        El Servicio puede ser utilizado por <strong>personas menores de 18 años</strong>. Si sos menor de edad,
        declarás contar con la autorización de tu madre, padre o tutor para registrarte, usar el Servicio y, en
        su caso, contratar un plan pago.
      </p>

      <h2 id="planes">5. Planes, precios y prueba gratuita</h2>
      <ul>
        <li>Skillio ofrece un plan gratuito y planes pagos (<strong>Básico</strong> y <strong>PRO</strong>) con distintos beneficios y créditos mensuales.</li>
        <li>Los precios se expresan en pesos argentinos (ARS) e incluyen los impuestos aplicables. Podemos modificar los precios a futuro; los cambios no afectan períodos ya pagados.</li>
        <li><strong>Prueba gratuita:</strong> al contratar un plan pago accedés a <strong>24 horas de prueba sin cargo</strong>. Si cancelás dentro de ese período, no se realiza ningún cobro.</li>
        <li>Los <strong>créditos</strong> son la unidad que consumen las funciones de IA. Se renuevan según tu plan y no son canjeables por dinero.</li>
      </ul>

      <h2 id="pagos">6. Pagos y renovación</h2>
      <p>
        Los pagos se procesan a través de <strong>Mercado Pago</strong>. Al contratar un plan pago te adherís a
        un <strong>débito automático mensual</strong>: la suscripción se renueva por períodos mensuales y se
        cobra automáticamente hasta que la canceles. Nosotros no almacenamos los datos de tu tarjeta.
      </p>

      <h2 id="cancelacion">7. Cancelación</h2>
      <p>
        Podés <strong>cancelar tu suscripción cuando quieras</strong> desde la Aplicación, en pocos clicks. Al
        cancelar:
      </p>
      <ul>
        <li>No se generan nuevos cobros a partir del siguiente período.</li>
        <li><strong>Conservás el acceso a las funciones del plan hasta que finalice el mes ya abonado.</strong></li>
        <li>Si cancelás durante las primeras 24 horas de prueba gratuita, no se te cobra nada.</li>
      </ul>

      <h2 id="arrepentimiento">8. Botón de arrepentimiento</h2>
      <div className="callout">
        <p>
          De acuerdo con el <strong>artículo 34 de la Ley N° 24.240 de Defensa del Consumidor</strong> y la
          Resolución 424/2020, tenés derecho a <strong>revocar la contratación dentro de los 10 (diez) días
          corridos</strong> contados desde la contratación, sin necesidad de expresar motivo y sin penalidad
          alguna.
        </p>
        <p>
          Para ejercer este derecho, escribinos a{" "}
          <a href="mailto:info.skillioapp@gmail.com?subject=Botón%20de%20arrepentimiento">
            info.skillioapp@gmail.com
          </a>{" "}
          con el asunto &ldquo;Botón de arrepentimiento&rdquo;. Procesaremos la baja y el reembolso de lo
          abonado conforme a la normativa vigente.
        </p>
      </div>

      <h2 id="reembolsos">9. Reembolsos</h2>
      <p>
        Más allá del derecho de arrepentimiento de la sección anterior, si por una falla atribuible a Skillio no
        pudiste acceder o gozar del Servicio que contrataste, <strong>nos comprometemos a reintegrarte el monto
        correspondiente</strong> o a compensarte de manera razonable. Para gestionarlo, contactanos a
        info.skillioapp@gmail.com describiendo lo sucedido.
      </p>

      <h2 id="uso">10. Uso aceptable</h2>
      <p>Al usar Skillio te comprometés a no:</p>
      <ul>
        <li>Subir contenido ilegal, que infrinja derechos de terceros (incluida la propiedad intelectual) o que sea ofensivo.</li>
        <li>Intentar vulnerar la seguridad de la plataforma, abusar de las funciones de IA o eludir los límites de créditos.</li>
        <li>Revender, automatizar o explotar el Servicio sin autorización.</li>
        <li>Compartir en la Comunidad material sobre el que no tengas derechos.</li>
      </ul>
      <p>Podemos suspender o cancelar cuentas que incumplan estos términos.</p>

      <h2 id="contenido">11. Tu contenido y la Comunidad</h2>
      <p>
        Conservás la titularidad de los apuntes y materiales que subís. Tu contenido es privado por defecto. Si
        elegís publicarlo en la <strong>Comunidad</strong>, otorgás a Skillio y al resto de los usuarios una
        licencia para visualizarlo y descargarlo dentro de la plataforma. Sos responsable de tener los derechos
        sobre lo que publicás.
      </p>

      <h2 id="propiedad">12. Propiedad intelectual de Skillio</h2>
      <p>
        La marca, el logo, el diseño, el software y los demás elementos de la Aplicación son propiedad de su
        titular y están protegidos por las leyes aplicables. No podés copiarlos ni utilizarlos sin autorización.
      </p>

      <h2 id="responsabilidad">13. Limitación de responsabilidad</h2>
      <p>
        El Servicio se ofrece &ldquo;tal cual&rdquo;. En la máxima medida permitida por la ley, Skillio no será
        responsable por daños indirectos, pérdida de datos o perjuicios derivados de decisiones tomadas en base
        a resultados generados por la IA. Nada en estos términos limita derechos que la ley te garantiza como
        consumidor.
      </p>

      <h2 id="modificaciones">14. Modificaciones</h2>
      <p>
        Podemos actualizar estos términos. Si los cambios son sustanciales, te lo notificaremos por medios
        razonables. El uso continuado del Servicio implica la aceptación de la versión vigente.
      </p>

      <h2 id="ley">15. Ley aplicable y jurisdicción</h2>
      <p>
        Estos términos se rigen por las leyes de la <strong>República Argentina</strong>. Ante cualquier
        controversia, y sin perjuicio de los derechos del consumidor de acudir a los organismos de defensa que
        correspondan, serán competentes los tribunales ordinarios de la Ciudad de Córdoba, Provincia de Córdoba.
      </p>

      <h2 id="contacto">16. Contacto</h2>
      <p>
        Por cualquier consulta sobre estos Términos, escribinos a{" "}
        <a href="mailto:info.skillioapp@gmail.com">info.skillioapp@gmail.com</a>.
      </p>
    </LegalShell>
  );
}
