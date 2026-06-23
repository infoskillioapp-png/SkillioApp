import type { ResumenData } from "@/app/app/ia/resumen/_components/resumen-client";
import type { TarjetasData } from "@/app/app/ia/tarjetas/_components/tarjetas-client";
import type { SimulacroData } from "@/app/app/ia/simulacro/_components/simulacro-client";

export type DemoTopic = "psicologia" | "circulatorio" | "industrial" | "economia";

export const DEMO_TOPICS: { id: DemoTopic; emoji: string; label: string }[] = [
  { id: "psicologia",   emoji: "🧠", label: "Psicología: Freud" },
  { id: "circulatorio", emoji: "❤️", label: "Sistema Circulatorio" },
  { id: "industrial",   emoji: "🏭", label: "Rev. Industrial" },
  { id: "economia",     emoji: "📈", label: "Oferta y Demanda" },
];

// ─── PSICOLOGÍA: FREUD ──────────────────────────────────────────────────────

const psicologiaResumen: ResumenData = {
  noteId: "demo-psicologia",
  noteTitle: "Psicología: Freud y el Psicoanálisis",
  subjectName: "Psicología",
  intro: "Sigmund Freud revolucionó la comprensión de la mente humana al proponer que la mayor parte de nuestra vida mental ocurre fuera de la conciencia, en un inconsciente que determina pensamientos, emociones y conductas.",
  sections: [
    {
      name: "El Inconsciente",
      points: [
        { emoji: "🧠", title: "El inconsciente como motor del comportamiento", description: "Freud propuso que la mayor parte de nuestra vida mental ocurre fuera de la conciencia: deseos reprimidos, recuerdos dolorosos y conflictos internos que determinan nuestras acciones sin que lo sepamos.", category: "El Inconsciente" },
        { emoji: "🧊", title: "El iceberg freudiano: tres zonas de la mente", description: "Freud dividió la mente en: consciente (lo que sabemos en este momento), preconsciente (accesible con esfuerzo, como un recuerdo) e inconsciente (completamente inaccesible, donde residen los deseos reprimidos).", category: "El Inconsciente" },
      ],
    },
    {
      name: "Estructura de la Personalidad",
      points: [
        { emoji: "🔥", title: "El Ello: principio de placer", description: "La instancia más primitiva de la mente. Busca la satisfacción inmediata de impulsos sin considerar la realidad ni la moral. Está completamente en el inconsciente y es la fuente de la energía psíquica (libido).", category: "Estructura de la Personalidad" },
        { emoji: "⚖️", title: "El Yo: mediador entre impulso y realidad", description: "Emerge del Ello durante los primeros años de vida. Regula los impulsos del Ello según la realidad externa (principio de realidad) y negocia con el Superyo. Es parcialmente consciente y parcialmente inconsciente.", category: "Estructura de la Personalidad" },
        { emoji: "📏", title: "El Superyo: la moral internalizada", description: "Representa los valores, normas y prohibiciones sociales incorporados desde la infancia (principalmente de los padres). Actúa como una conciencia moral que censura los impulsos y genera culpa cuando son transgredidos.", category: "Estructura de la Personalidad" },
      ],
    },
    {
      name: "Mecanismos de Defensa",
      points: [
        { emoji: "🚫", title: "La represión: el mecanismo central", description: "El Yo empuja al inconsciente pensamientos, deseos o recuerdos que generan angustia insoportable. Es el mecanismo de defensa más fundamental y la base de todos los demás.", category: "Mecanismos de Defensa" },
        { emoji: "🎨", title: "Sublimación, proyección y racionalización", description: "Otros mecanismos clave: sublimación (canalizar impulsos hacia actividades socialmente valoradas como el arte), proyección (atribuir impulsos propios a otros) y racionalización (justificar racionalmente una conducta irracional).", category: "Mecanismos de Defensa" },
      ],
    },
    {
      name: "El Método Psicoanalítico",
      points: [
        { emoji: "🛋️", title: "La asociación libre: el método central", description: "El paciente verbaliza todo lo que le viene a la mente sin censura alguna. Esta técnica permite que el material inconsciente emerja a través de lapsus, omisiones y conexiones inesperadas.", category: "El Método Psicoanalítico" },
        { emoji: "🌙", title: "Los sueños: la vía regia al inconsciente", description: "Freud los llamó 'la vía regia al inconsciente'. El sueño tiene un contenido manifiesto (lo que recordamos) y uno latente (el deseo inconsciente disfrazado). La interpretación de los sueños es clave en el tratamiento psicoanalítico.", category: "El Método Psicoanalítico" },
      ],
    },
  ],
  fileUrl: null,
};

const psicologiaTarjetas: TarjetasData = {
  noteId: "demo-psicologia",
  noteTitle: "Psicología: Freud y el Psicoanálisis",
  subjectName: "Psicología",
  flashcards: [
    { front: "¿Qué representa el inconsciente para Freud?", back: "La parte de la mente que contiene deseos reprimidos, recuerdos dolorosos y conflictos que no podemos acceder conscientemente, pero que determinan nuestro comportamiento.", category: "El Inconsciente" },
    { front: "¿Cuál es la diferencia entre el Ello y el Superyo?", back: "El Ello busca satisfacción inmediata de impulsos (principio de placer). El Superyo representa la moral internalizada (principio del deber). El Yo media entre ambos y la realidad.", category: "Estructura" },
    { front: "¿Qué es la represión según Freud?", back: "El mecanismo de defensa central: el Yo rechaza al inconsciente pensamientos o deseos que generan angustia insoportable, impidiéndoles acceder a la conciencia.", category: "Mecanismos de Defensa" },
    { front: "¿Por qué Freud llamó a los sueños 'la vía regia al inconsciente'?", back: "Porque durante el sueño los mecanismos de censura se relajan, permitiendo que el contenido inconsciente (deseos, conflictos) emerja disfrazado en forma de imágenes simbólicas que el analista puede interpretar.", category: "El Método" },
  ],
};

const psicologiaSimulacro: SimulacroData = {
  noteId: "demo-psicologia",
  noteTitle: "Psicología: Freud y el Psicoanálisis",
  subjectName: "Psicología",
  questions: [
    { kind: "multiple_choice", question: "¿Cuál de las siguientes instancias de la personalidad actúa según el principio de realidad?", options: ["El Ello", "El Yo", "El Superyo", "El Preconsciente"], correct: 1, explanation: "El Yo emerge del Ello para adaptarse a la realidad externa, mediando entre los impulsos y las exigencias del mundo real y del Superyo." },
    { kind: "multiple_choice", question: "¿Qué ocurre cuando el Yo no puede manejar la angustia generada por el conflicto entre el Ello y el Superyo?", options: ["Activa el principio de placer sin restricciones", "Activa mecanismos de defensa inconscientes", "Fortalece directamente al Superyo", "Genera conciencia ampliada"], correct: 1, explanation: "Los mecanismos de defensa (represión, proyección, sublimación) son estrategias inconscientes del Yo para manejar la angustia sin enfrentarla directamente." },
    { kind: "true_false", question: "El contenido manifiesto del sueño revela directamente y sin distorsión el deseo inconsciente.", correct: false, explanation: "Freud distingue entre contenido manifiesto (lo que se recuerda) y latente (el deseo real). El sueño siempre distorsiona el deseo mediante condensación y desplazamiento." },
    { kind: "multiple_choice", question: "¿En cuál de estos casos se produce sublimación, según Freud?", options: ["Una persona culpa a otro de sus propios errores", "Alguien olvida sistemáticamente un recuerdo doloroso", "Un artista pinta para canalizar su agresividad", "Un niño imita el comportamiento de su padre"], correct: 2, explanation: "La sublimación consiste en redirigir la energía de impulsos inaceptables hacia actividades socialmente valoradas, como el arte, la ciencia o el deporte." },
  ],
};

// ─── SISTEMA CIRCULATORIO ────────────────────────────────────────────────────

const circulatorioResumen: ResumenData = {
  noteId: "demo-circulatorio",
  noteTitle: "El Sistema Circulatorio",
  subjectName: "Biología",
  intro: "El sistema circulatorio es la red de transporte del cuerpo humano: lleva oxígeno y nutrientes a cada célula y recoge los desechos metabólicos para su eliminación, todo impulsado por el incansable trabajo del corazón.",
  sections: [
    {
      name: "El Corazón",
      points: [
        { emoji: "❤️", title: "Bomba incansable: estructura del corazón", description: "Músculo hueco del tamaño de un puño que late aproximadamente 100.000 veces por día. Tiene cuatro cámaras: dos aurículas (reciben sangre) y dos ventrículos (la expulsan). Está dividido en mitad derecha (sangre desoxigenada) e izquierda (sangre oxigenada).", category: "El Corazón" },
        { emoji: "🔄", title: "Sístole y diástole: el ciclo cardíaco", description: "La sístole es la contracción del corazón que expulsa la sangre hacia las arterias. La diástole es el período de relajación en que las cámaras se llenan de sangre. La presión arterial registra ambas fases (ej: 120/80 mmHg).", category: "El Corazón" },
        { emoji: "🚪", title: "Válvulas cardíacas: el flujo en una sola dirección", description: "Cuatro válvulas (mitral, tricúspide, aórtica y pulmonar) aseguran que la sangre fluya en una sola dirección, evitando el reflujo. Su mal funcionamiento genera soplos cardíacos.", category: "El Corazón" },
      ],
    },
    {
      name: "Los Dos Circuitos",
      points: [
        { emoji: "🫁", title: "Circulación pulmonar: sangre a los pulmones", description: "Transporta sangre desoxigenada desde el ventrículo derecho a los pulmones para oxigenarla, y la devuelve (ya oxigenada) a la aurícula izquierda. También llamada circulación menor.", category: "Los Dos Circuitos" },
        { emoji: "🌐", title: "Circulación sistémica: sangre al cuerpo", description: "Distribuye sangre oxigenada desde el ventrículo izquierdo a todos los tejidos del cuerpo, y devuelve la sangre desoxigenada a la aurícula derecha. También llamada circulación mayor.", category: "Los Dos Circuitos" },
      ],
    },
    {
      name: "Los Vasos Sanguíneos",
      points: [
        { emoji: "🏃", title: "Arterias: alta presión, sangre que sale", description: "Conducen la sangre desde el corazón. Tienen paredes gruesas y elásticas para soportar la presión. La arteria aorta es la más grande del cuerpo. Excepción: la arteria pulmonar lleva sangre desoxigenada.", category: "Los Vasos" },
        { emoji: "🕸️", title: "Capilares: el intercambio celular real", description: "Vasos microscópicos de pared muy delgada donde ocurre el verdadero intercambio: oxígeno y nutrientes pasan a las células, y CO₂ y desechos ingresan al torrente sanguíneo.", category: "Los Vasos" },
        { emoji: "🌊", title: "Venas: retorno al corazón", description: "Devuelven la sangre al corazón con baja presión. Tienen válvulas internas que evitan el reflujo en venas largas (como las de las piernas). Excepción: la vena pulmonar lleva sangre oxigenada.", category: "Los Vasos" },
      ],
    },
    {
      name: "La Sangre",
      points: [
        { emoji: "🔴", title: "Glóbulos rojos: transporte de oxígeno", description: "Los eritrocitos contienen hemoglobina, una proteína que capta el oxígeno en los pulmones y lo libera en los tejidos. Un mm³ de sangre contiene entre 4 y 6 millones de eritrocitos.", category: "La Sangre" },
        { emoji: "🛡️", title: "Glóbulos blancos y plaquetas", description: "Los leucocitos defienden el organismo de infecciones y son parte del sistema inmune. Las plaquetas (trombocitos) forman coágulos para detener hemorragias ante una lesión.", category: "La Sangre" },
      ],
    },
  ],
  fileUrl: null,
};

const circulatorioTarjetas: TarjetasData = {
  noteId: "demo-circulatorio",
  noteTitle: "El Sistema Circulatorio",
  subjectName: "Biología",
  flashcards: [
    { front: "¿Cuántas cámaras tiene el corazón y cuál es la función de cada par?", back: "Cuatro cámaras: las dos aurículas reciben la sangre (derecha: desoxigenada; izquierda: oxigenada) y los dos ventrículos la expulsan (derecho: hacia los pulmones; izquierdo: hacia el cuerpo).", category: "Corazón" },
    { front: "¿Cuál es la diferencia entre la circulación pulmonar y la sistémica?", back: "La pulmonar (menor) lleva sangre desoxigenada al pulmón para oxigenarla y la devuelve al corazón. La sistémica (mayor) distribuye la sangre oxigenada a todos los tejidos del cuerpo.", category: "Los Circuitos" },
    { front: "¿Qué es la hemoglobina y por qué es esencial?", back: "Proteína contenida en los glóbulos rojos que se une al oxígeno en los pulmones y lo libera en los tejidos. Sin hemoglobina funcional, las células no recibirían el oxígeno necesario para su metabolismo.", category: "La Sangre" },
    { front: "¿Por qué los capilares son los vasos más importantes funcionalmente?", back: "Porque son los únicos suficientemente delgados para permitir el intercambio directo entre la sangre y las células: oxígeno y nutrientes hacia los tejidos, CO₂ y desechos de regreso a la sangre.", category: "Los Vasos" },
  ],
};

const circulatorioSimulacro: SimulacroData = {
  noteId: "demo-circulatorio",
  noteTitle: "El Sistema Circulatorio",
  subjectName: "Biología",
  questions: [
    { kind: "multiple_choice", question: "¿Desde qué cavidad cardíaca sale la sangre hacia la arteria pulmonar?", options: ["Aurícula derecha", "Ventrículo derecho", "Aurícula izquierda", "Ventrículo izquierdo"], correct: 1, explanation: "El ventrículo derecho recibe sangre desoxigenada de la aurícula derecha y la impulsa hacia los pulmones a través de la arteria pulmonar para oxigenarla." },
    { kind: "multiple_choice", question: "¿Qué tipo de sangre transporta la arteria pulmonar?", options: ["Sangre rica en oxígeno", "Sangre con abundantes plaquetas", "Sangre desoxigenada", "Plasma sin células"], correct: 2, explanation: "Es la gran excepción: la arteria pulmonar es la única arteria que transporta sangre desoxigenada, desde el corazón hacia los pulmones para su oxigenación." },
    { kind: "true_false", question: "Las venas siempre transportan sangre desoxigenada de regreso al corazón.", correct: false, explanation: "La vena pulmonar es la excepción: lleva sangre ya oxigenada desde los pulmones hacia la aurícula izquierda del corazón." },
    { kind: "multiple_choice", question: "¿Dónde ocurre el intercambio gaseoso entre la sangre y las células del cuerpo?", options: ["En las arterias de gran calibre", "En las venas periféricas", "En la aorta", "En los capilares"], correct: 3, explanation: "Los capilares son vasos microscópicos de pared tan delgada que permiten la difusión directa de gases y nutrientes entre la sangre y los tejidos circundantes." },
  ],
};

// ─── REVOLUCIÓN INDUSTRIAL ───────────────────────────────────────────────────

const industrialResumen: ResumenData = {
  noteId: "demo-industrial",
  noteTitle: "La Revolución Industrial",
  subjectName: "Historia",
  intro: "La Revolución Industrial fue la transformación más profunda de la humanidad desde la invención de la agricultura: convirtió sociedades agrarias en economías industriales, creó nuevas clases sociales y sentó las bases del mundo moderno.",
  sections: [
    {
      name: "Origen y Condiciones",
      points: [
        { emoji: "🇬🇧", title: "Gran Bretaña: por qué allí y en ese momento", description: "La Revolución Industrial comenzó en Inglaterra entre 1760-1840 gracias a una combinación única: vastas reservas de carbón y hierro, sistema bancario desarrollado, estabilidad política, colonias como fuente de materias primas y el mayor mercado naval del mundo.", category: "Origen" },
        { emoji: "🌾", title: "Los enclosures: la precondición agraria", description: "Antes de la industrialización, el cercamiento de tierras comunales (enclosures) expulsó a millones de campesinos de sus tierras, creando la mano de obra asalariada sin tierra ni herramientas que las fábricas necesitaban.", category: "Origen" },
      ],
    },
    {
      name: "Innovaciones Tecnológicas",
      points: [
        { emoji: "♨️", title: "La máquina de vapor: el corazón de la revolución", description: "James Watt perfeccionó en 1769 una máquina capaz de convertir vapor en movimiento mecánico continuo. Transformó la industria textil, la minería y el transporte, multiplicando la productividad humana por decenas.", category: "Tecnología" },
        { emoji: "🚂", title: "El ferrocarril: el sistema nervioso industrial", description: "Las locomotoras a vapor conectaron ciudades, aceleraron el comercio y redujeron el tiempo de transporte de semanas a horas. Fueron también el mayor impulsor de la siderurgia y del consumo de carbón.", category: "Tecnología" },
        { emoji: "🏭", title: "El sistema fabril: concentrar para producir más", description: "Reemplazó el trabajo artesanal doméstico (putting-out system). Concentró a los trabajadores en fábricas bajo supervisión directa, con división del trabajo y producción en serie, aumentando exponencialmente la producción.", category: "Tecnología" },
      ],
    },
    {
      name: "Transformación Social",
      points: [
        { emoji: "👷", title: "El surgimiento del proletariado industrial", description: "Apareció una nueva clase social: los obreros industriales que, sin tierra ni herramientas propias, vendían su fuerza de trabajo a cambio de un salario. Vivían en condiciones de extrema precariedad: jornadas de 14-16 horas, trabajo infantil desde los 6 años.", category: "Sociedad" },
        { emoji: "🏙️", title: "La urbanización explosiva y sus consecuencias", description: "Ciudades como Manchester y Birmingham crecieron de forma caótica. La migración masiva del campo generó hacinamiento, epidemias de cólera y tifus, y condiciones de vida insalubres que impactaron en la mortalidad infantil.", category: "Sociedad" },
      ],
    },
    {
      name: "Consecuencias Históricas",
      points: [
        { emoji: "💰", title: "El capitalismo industrial y el laissez-faire", description: "La industrialización consolidó el sistema capitalista: los dueños del capital (burguesía industrial) controlaban los medios de producción, mientras el Estado adoptaba el laissez-faire (no intervención en la economía).", category: "Consecuencias" },
        { emoji: "🌍", title: "El imperialismo como consecuencia directa", description: "Las fábricas necesitaban materias primas (algodón, caucho, metales) y mercados para sus productos. Esto impulsó la expansión colonial de Europa en África, Asia y América en el siglo XIX.", category: "Consecuencias" },
        { emoji: "✊", title: "Socialismo y movimiento obrero", description: "Las pésimas condiciones laborales generaron respuesta organizada: sindicatos, huelgas y el surgimiento del pensamiento socialista. Marx y Engels publicaron el Manifiesto Comunista (1848) como respuesta directa a la explotación industrial.", category: "Consecuencias" },
      ],
    },
  ],
  fileUrl: null,
};

const industrialTarjetas: TarjetasData = {
  noteId: "demo-industrial",
  noteTitle: "La Revolución Industrial",
  subjectName: "Historia",
  flashcards: [
    { front: "¿Por qué la Revolución Industrial comenzó en Gran Bretaña y no en otro país?", back: "Por su combinación única: carbón y hierro abundantes, capital financiero disponible, colonias como fuente de materias primas y mercado, y estabilidad política que favorecía la inversión y la propiedad privada.", category: "Origen" },
    { front: "¿Qué rol jugó la máquina de vapor en la industrialización?", back: "Fue el motor fundamental: permitió mecanizar la producción textil, minar carbón en mayor profundidad y crear el ferrocarril, multiplicando la capacidad productiva y transformando radicalmente el transporte y el comercio.", category: "Tecnología" },
    { front: "¿Qué es el proletariado industrial y por qué surgió?", back: "La clase obrera fabril que trabajaba a cambio de un salario sin poseer medios de producción. Surgió cuando los campesinos fueron expulsados de sus tierras (enclosures) y migraron a las ciudades industriales en búsqueda de trabajo.", category: "Sociedad" },
    { front: "¿Qué relación hay entre la Revolución Industrial y el imperialismo del siglo XIX?", back: "Las fábricas necesitaban materias primas baratas y mercados para sus productos manufacturados, lo que impulsó a las potencias industriales a expandirse y colonizar África, Asia y América, creando imperios coloniales formales.", category: "Consecuencias" },
  ],
};

const industrialSimulacro: SimulacroData = {
  noteId: "demo-industrial",
  noteTitle: "La Revolución Industrial",
  subjectName: "Historia",
  questions: [
    { kind: "multiple_choice", question: "¿Cuál fue el principal combustible energético de la Primera Revolución Industrial?", options: ["Petróleo", "Gas natural", "Energía hidráulica", "Carbón"], correct: 3, explanation: "El carbón era el combustible que alimentaba las máquinas de vapor en fábricas y ferrocarriles. Gran Bretaña tenía vastas reservas de carbón, lo que fue una ventaja decisiva para su industrialización temprana." },
    { kind: "multiple_choice", question: "¿Qué sistema de producción reemplazó la industrialización?", options: ["El feudalismo agrario", "El trabajo doméstico artesanal (putting-out system)", "El trabajo esclavo en plantaciones", "Las corporaciones gremiales medievales"], correct: 1, explanation: "El putting-out system distribuía materias primas en hogares rurales donde los artesanos producían a destajo. La fábrica lo reemplazó centralizando la producción bajo supervisión directa y división del trabajo." },
    { kind: "true_false", question: "La Revolución Industrial mejoró de inmediato las condiciones de vida de los trabajadores industriales.", correct: false, explanation: "Inicialmente las empeoró: jornadas de 14-16 horas, trabajo infantil desde los 6 años, hacinamiento en barrios insalubres, salarios de subsistencia y ausencia total de derechos laborales o protección social." },
    { kind: "multiple_choice", question: "¿Cuál de estas corrientes de pensamiento surgió como respuesta directa a las condiciones de los trabajadores industriales?", options: ["El liberalismo económico clásico", "El mercantilismo colonial", "El socialismo y el marxismo", "El absolutismo ilustrado"], correct: 2, explanation: "Marx y Engels observaron las condiciones de los obreros industriales para desarrollar su crítica al capitalismo. El Manifiesto Comunista (1848) fue una respuesta directa a la explotación de la clase obrera." },
  ],
};

// ─── OFERTA Y DEMANDA ────────────────────────────────────────────────────────

const economiaResumen: ResumenData = {
  noteId: "demo-economia",
  noteTitle: "Oferta y Demanda: El Mercado",
  subjectName: "Economía",
  intro: "La oferta y la demanda son las fuerzas fundamentales que determinan los precios y las cantidades en los mercados. Su interacción explica desde el precio del pan hasta el valor del dólar.",
  sections: [
    {
      name: "La Demanda",
      points: [
        { emoji: "📉", title: "Ley de la Demanda: relación inversa precio-cantidad", description: "A mayor precio de un bien, menor cantidad que los consumidores desean comprar (y viceversa). Esta relación inversa se grafica como una curva con pendiente negativa. El movimiento ocurre siempre suponiendo 'todo lo demás constante' (ceteris paribus).", category: "Demanda" },
        { emoji: "🔄", title: "Qué desplaza la curva de demanda", description: "El precio mueve el punto sobre la curva, pero hay factores que desplazan toda la curva: cambios en los ingresos del consumidor, en los precios de bienes sustitutos o complementarios, en los gustos, o en las expectativas futuras.", category: "Demanda" },
        { emoji: "🛒", title: "Bienes normales, inferiores y de Giffen", description: "Los bienes normales aumentan su demanda cuando sube el ingreso. Los inferiores (ej: fideos de marca blanca) la disminuyen con más ingreso. Los bienes de Giffen son la excepción paradójica: su demanda sube al subir el precio.", category: "Demanda" },
      ],
    },
    {
      name: "La Oferta",
      points: [
        { emoji: "📈", title: "Ley de la Oferta: relación directa precio-cantidad", description: "A mayor precio de mercado, mayor cantidad que los productores están dispuestos a ofrecer. La curva de oferta tiene pendiente positiva: los productores producen más cuando el precio sube porque es más rentable.", category: "Oferta" },
        { emoji: "⚙️", title: "Qué desplaza la curva de oferta", description: "Los costos de producción, la tecnología disponible, los precios de insumos, los subsidios y los impuestos desplazan toda la curva de oferta. Si los costos bajan (ej: nueva tecnología), la curva se desplaza hacia la derecha (más oferta a cada precio).", category: "Oferta" },
      ],
    },
    {
      name: "El Equilibrio de Mercado",
      points: [
        { emoji: "⚖️", title: "El precio de equilibrio: donde se cruzan las curvas", description: "Es el precio al que la cantidad ofrecida iguala exactamente a la demandada. No hay ni excedente ni escasez. Se llama precio de equilibrio porque el mercado 'se vacía' sin necesidad de intervención.", category: "Equilibrio" },
        { emoji: "📦", title: "Excedente y escasez: los desequilibrios", description: "Si el precio está por encima del equilibrio: hay excedente (más oferta que demanda). Si está por debajo: hay escasez (la demanda supera la oferta). En mercados competitivos, el precio tiende a moverse hacia el equilibrio.", category: "Equilibrio" },
      ],
    },
    {
      name: "Política de Precios",
      points: [
        { emoji: "🏛️", title: "Precios máximos y mínimos: intervención estatal", description: "Los gobiernos pueden fijar precios máximos (techos) para proteger consumidores. Si el techo está por debajo del equilibrio, genera escasez. Los precios mínimos (pisos) buscan proteger productores; si están por encima del equilibrio, generan excedentes.", category: "Política" },
        { emoji: "📊", title: "Elasticidad: sensibilidad de la demanda al precio", description: "Mide cuánto cambia la cantidad demandada ante una variación del precio. Demanda elástica (bienes de lujo o con muchos sustitutos): la cantidad cae mucho ante una suba de precio. Demanda inelástica (medicamentos, sal): la cantidad apenas cambia.", category: "Política" },
      ],
    },
  ],
  fileUrl: null,
};

const economiaTarjetas: TarjetasData = {
  noteId: "demo-economia",
  noteTitle: "Oferta y Demanda: El Mercado",
  subjectName: "Economía",
  flashcards: [
    { front: "¿Qué dice la Ley de la Demanda y por qué existe esa relación?", back: "A mayor precio, menor cantidad demandada. La relación inversa existe porque los consumidores tienen presupuesto limitado: si un bien sube de precio, buscan sustitutos o compran menos.", category: "Demanda" },
    { front: "¿Cuál es la diferencia entre un movimiento sobre la curva y un desplazamiento de la curva de demanda?", back: "Un movimiento sobre la curva ocurre cuando cambia el precio del propio bien. Un desplazamiento de toda la curva ocurre cuando cambia otro factor: ingresos, gustos, precio de sustitutos o complementarios.", category: "Demanda" },
    { front: "¿Qué es el precio de equilibrio?", back: "El precio al que la cantidad que los consumidores quieren comprar es exactamente igual a la que los productores quieren vender. El mercado queda 'limpio': no sobra ni falta producto.", category: "Equilibrio" },
    { front: "¿Qué genera un precio máximo (techo) fijado por debajo del precio de equilibrio?", back: "Genera escasez: como el precio es artificialmente bajo, la demanda supera a la oferta. El bien escasea, pueden aparecer colas de espera o mercados informales (mercado negro).", category: "Política" },
  ],
};

const economiaSimulacro: SimulacroData = {
  noteId: "demo-economia",
  noteTitle: "Oferta y Demanda: El Mercado",
  subjectName: "Economía",
  questions: [
    { kind: "multiple_choice", question: "Si el ingreso de los consumidores aumenta, ¿qué sucede con la curva de demanda de un bien normal (como ropa de marca)?", options: ["Se desplaza hacia la izquierda (cae)", "No se mueve, solo cambia el punto sobre la curva", "Se desplaza hacia la derecha (aumenta)", "Se vuelve completamente inelástica"], correct: 2, explanation: "Para bienes normales, existe relación directa entre ingreso y demanda. Con más ingreso, los consumidores quieren más de estos bienes a cualquier precio: la curva entera se desplaza hacia la derecha." },
    { kind: "multiple_choice", question: "Un avance tecnológico reduce los costos de producción de smartphones. ¿Qué ocurre con la curva de oferta?", options: ["Se desplaza hacia la izquierda (menos oferta)", "Se desplaza hacia la derecha (más oferta)", "El precio de equilibrio sube", "La curva de demanda también se desplaza"], correct: 1, explanation: "La mejora tecnológica permite producir más al mismo costo. Los productores ofrecen más unidades a cualquier precio: la curva de oferta se desplaza hacia la derecha, bajando el precio de equilibrio." },
    { kind: "true_false", question: "Un precio mínimo (piso de precios) fijado por encima del equilibrio genera escasez en el mercado.", correct: false, explanation: "Un precio por encima del equilibrio genera excedente (sobreproducción), NO escasez. Los productores quieren vender más de lo que los consumidores están dispuestos a comprar a ese precio elevado." },
    { kind: "multiple_choice", question: "La demanda de insulina para diabéticos es prácticamente inelástica. ¿Qué significa esto?", options: ["Que la demanda aumenta cuando sube el precio", "Que una suba de precio genera una gran caída en la cantidad demandada", "Que ante grandes cambios de precio, la cantidad demandada varía muy poco", "Que el bien tiene muchos sustitutos perfectos"], correct: 2, explanation: "La insulina es un bien de primera necesidad sin sustitutos: los pacientes la necesitan independientemente del precio. Inelástica significa que los cambios de precio apenas afectan la cantidad demandada." },
  ],
};

// ─── Exports ────────────────────────────────────────────────────────────────

const RESUMEN: Record<DemoTopic, ResumenData> = {
  psicologia:   psicologiaResumen,
  circulatorio: circulatorioResumen,
  industrial:   industrialResumen,
  economia:     economiaResumen,
};

const TARJETAS: Record<DemoTopic, TarjetasData> = {
  psicologia:   psicologiaTarjetas,
  circulatorio: circulatorioTarjetas,
  industrial:   industrialTarjetas,
  economia:     economiaTarjetas,
};

const SIMULACRO: Record<DemoTopic, SimulacroData> = {
  psicologia:   psicologiaSimulacro,
  circulatorio: circulatorioSimulacro,
  industrial:   industrialSimulacro,
  economia:     economiaSimulacro,
};

export function isDemoNoteId(noteId: string): boolean {
  return noteId.startsWith("demo-");
}

export function getDemoTopic(noteId: string): DemoTopic | null {
  const slug = noteId.replace("demo-", "") as DemoTopic;
  return RESUMEN[slug] ? slug : null;
}

export function getDemoResumen(noteId: string): ResumenData | null {
  const t = getDemoTopic(noteId);
  return t ? RESUMEN[t] : null;
}

export function getDemoTarjetas(noteId: string): TarjetasData | null {
  const t = getDemoTopic(noteId);
  return t ? TARJETAS[t] : null;
}

export function getDemoSimulacro(noteId: string): SimulacroData | null {
  const t = getDemoTopic(noteId);
  return t ? SIMULACRO[t] : null;
}
