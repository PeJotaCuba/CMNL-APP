export interface RadialTerm {
  term: string;
  definition: string;
  category?: string;
  synonyms?: string[];
  antonyms?: string[];
}

export const RADIAL_TERMS_BASE: RadialTerm[] = [
  {
    term: "Absorbente poroso",
    definition: "Material con poros interconectados que disipa energía sonora por fricción viscosa. Efectivo en frecuencias medias y altas; requiere grandes espesores para actuar en graves.",
    category: "Acústica"
  },
  {
    term: "Absorción sonora",
    definition: "Capacidad de un material o estructura de captar energía sonora incidente y disiparla como calor, reduciendo así la energía reflejada hacia el recinto.",
    category: "Acústica"
  },
  {
    term: "Acorde",
    definition: "Dos o más sonidos producidos simultáneamente en intervalos de tercera. Se usa para subrayar una palabra, intención o entrada de un personaje.",
    category: "Música / Radiofónico"
  },
  {
    term: "Acotaciones",
    definition: "Anotaciones del escritor en el libreto, en mayúsculas, para que se destaquen y no se confundan con el diálogo. Ejemplo: “EN VOZ BAJA”.",
    category: "Guión / Libreto"
  },
  {
    term: "Actor",
    definition: "Quien, al actuar, crea una ilusión de naturalidad y realidad acorde con la obra, la época y el personaje. Las técnicas varían según el medio (Teatro, Cine, Televisión, Radio).",
    category: "Artístico"
  },
  {
    term: "Acústica",
    definition: "Rama científica y tecnológica que estudia los fenómenos sonoros perceptibles por el oído. Es fundamental para predecir el comportamiento del sonido y garantizar la habitabilidad de un recinto.",
    category: "Acústica"
  },
  {
    term: "Ad-libitum",
    definition: "Interpretación libre que hace el actor de un bocadillo ajustado al desarrollo del libreto, pero guardando relación con el hecho. A voluntad, a elección.",
    category: "Artístico / Interpretación"
  },
  {
    term: "Aguja para microestrías",
    definition: "Aguja especial para discos de 33⅓ y 45 R.P.M. (microsurcos de 0,001 mm). La de 78 R.P.M. es de 0,003 mm. Usar la incorrecta daña el disco.",
    category: "Técnica / Explotación"
  },
  {
    term: "Al toro",
    definition: "Erróneamente interpretado como “a ciegas”. En realidad, los toros de lidia no cierran los ojos al embestir.",
    category: "Argot / Vocabulario"
  },
  {
    term: "Amplificador portátil (O.P.6) y (B.N.2ª)",
    definition: "Consola portátil electrónica para controles remotos. El primero tiene dos micrófonos; el segundo, cuatro. Se le puede adicionar un mezclador portátil.",
    category: "Técnica / Equipamiento"
  },
  {
    term: "Argumento",
    definition: "Conjunto de hechos y circunstancias que determinan el desarrollo lógico de una obra dramática o comedia.",
    category: "Guión / Libreto"
  },
  {
    term: "Armónicos",
    definition: "Tonos cuyas frecuencias son múltiplos de la fundamental. Su balance determina la riqueza sonora y permite identificar y diferenciar fuentes sonoras.",
    category: "Física / Acústica"
  },
  {
    term: "Asesor de programas",
    definition: "Antiguamente llamado Productor de Mesa. Colaborador cercano del escritor y del director, que guía y colabora en la elaboración del libreto gracias a sus conocimientos técnicos, artísticos y políticos.",
    category: "Roles / Producción"
  },
  {
    term: "Atmósfera ambiental",
    definition: "Fondo sonoro que identifica la locación de una escena (aire libre o bajo techo). Respaldan la escena y ayudan al autor a situarse, aportando realismo.",
    category: "Diseño Sonoro / Producción"
  },
  {
    term: "Atmósfera psicológica",
    definition: "Se crea según el estado anímico de los personajes. Puede contrastar con la atmósfera ambiental (ej. fiesta de fondo mientras los protagonistas viven un drama).",
    category: "Diseño Sonoro / Producción"
  },
  {
    term: "Audiofrecuencia (A.F.)",
    definition: "Gama audible de ondas electromagnéticas, entre 20 y 20 000 ciclos (Hz). El oído humano normal oye entre 30 y 18 000 ciclos.",
    category: "Técnica / Física"
  },
  {
    term: "Back-ground",
    definition: "Música, efectos, diálogos, etc., que sirven de fondo sonoro.",
    category: "Diseño Sonoro"
  },
  {
    term: "Balance",
    definition: "Coordinación de los distintos elementos de un programa para lograr un equilibrio estético.",
    category: "Técnica / Realización"
  },
  {
    term: "Barrera acústica",
    definition: "Obstáculo diseñado para interrumpir la trayectoria directa del sonido. Su efectividad aumenta con la frecuencia y la altura; es poco útil frente a ruidos de baja frecuencia.",
    category: "Acústica"
  },
  {
    term: "Bis",
    definition: "Palabra francesa que significa repetición de una escena o número musical.",
    category: "Artístico / Música"
  },
  {
    term: "Bocadillo o parlamento",
    definition: "Intervención del actor en una obra. Puede ser de una o más palabras, o párrafos completos. Suele llevar un número antepuesto para su ubicación.",
    category: "Guión / Libreto"
  },
  {
    term: "Bolo",
    definition: "Actuación aislada efectuada por actores no contratados, llamados boleros en el capitalismo.",
    category: "Roles / Producción"
  },
  {
    term: "Camelar",
    definition: "Cuando el actor prefiere palabras incomprensibles o equivocadas, pero entonadas con osadía, que pueden romper el desarrollo de la obra y sacar de situación a otros actores.",
    category: "Artístico / Interpretación"
  },
  {
    term: "Campo sonoro directo",
    definition: "Zona donde predomina la energía que llega del emisor sin reflexiones previas. Es el área de máxima fidelidad y localización de la fuente.",
    category: "Acústica / Grabación"
  },
  {
    term: "Campo sonoro difuso",
    definition: "Condición ideal donde la energía se propaga con igual probabilidad en todas las direcciones, garantizando una escucha uniforme en todo el recinto.",
    category: "Acústica / Grabación"
  },
  {
    term: "Campo sonoro reverberado",
    definition: "Lugar donde predomina la energía acumulada por las sucesivas reflexiones. Su nivel define la \"viveza\" acústica de una sala.",
    category: "Acústica / Grabación"
  },
  {
    term: "Capote (\"pie de amigo\")",
    definition: "Ayuda que un actor da a otro que ha perdido el hilo de su parlamento, para que vuelva a entrar en situación. En grabación, se repite la escena.",
    category: "Artístico / Interpretación"
  },
  {
    term: "Clímax",
    definition: "Momento culminante de la obra.",
    category: "Guión / Estructura"
  },
  {
    term: "Coda",
    definition: "Final o remate de una pieza musical.",
    category: "Música"
  },
  {
    term: "Coeficiente de absorción (α)",
    definition: "Fracción de energía no reflejada por una superficie unitaria. Varía según la frecuencia, por lo que se debe seleccionar el material adecuado para equilibrar el espectro sonoro.",
    category: "Acústica / Física"
  },
  {
    term: "Composición de niveles",
    definition: "Suma logarítmica de múltiples fuentes mediante la fórmula L = 10 · log(∑ 10Li/10). Permite calcular el impacto total de varios equipos funcionando simultáneamente.",
    category: "Acústica / Física"
  },
  {
    term: "Conductor de programas",
    definition: "No sabe dirigir; mide el tiempo, vigila la asistencia y da la entrada según un guión. Puede asesorar sobre una materia, pero no conoce la técnica de montaje.",
    category: "Roles"
  },
  {
    term: "Continuidad de programas",
    definition: "Similar al guión, pero el redactor solo ordena los números musicales o de variedad y hace un comentario de presentación a cada uno.",
    category: "Guión / Libreto"
  },
  {
    term: "Control remoto",
    definition: "Programa que se emite desde un lugar fuera de los estudios de la emisora. También se puede simular desde un estudio de radio.",
    category: "Técnica / Emisión"
  },
  {
    term: "Copiar programas",
    definition: "Pasar a una cinta magnetofónica, a mayor o menor velocidad, una canción o programa ya elaborado desde otra cinta.",
    category: "Técnica / Explotación"
  },
  {
    term: "Corta",
    definition: "Término que se usa para detener una grabación en el instante de realizarla.",
    category: "Argot / Grabación"
  },
  {
    term: "Corte",
    definition: "Eliminar una línea o escena por innecesaria, generalmente para ajustar el tiempo, sin afectar el contenido o interés del libreto.",
    category: "Guión / Edición"
  },
  {
    term: "Corte directo",
    definition: "Paso de una escena o secuencia a otra, con o sin relación entre ellas. En radio, sustituye la transición musical y al narrador.",
    category: "Diseño Sonoro / Realización"
  },
  {
    term: "Cortinilla",
    definition: "Ráfaga musical de corta duración (generalmente de 10 a 15 segundos) que se utiliza para separar secciones, noticias o bloques dentro de un mismo programa radiofónico.",
    category: "Música / Estructura"
  },
  {
    term: "Cross fade",
    definition: "Disolvencia gradual de un sonido mientras es sustituido por otro. Desaparición de una escena y paso a la siguiente.",
    category: "Diseño Sonoro / Mezcla"
  },
  {
    term: "Cuarta pared radial",
    definition: "Pared supuesta entre el actor y el resto del personal en el estudio. El actor debe mirar al director u operador de efectos, pero solo ver al resto para no perder la concentración.",
    category: "Artístico / Interpretación"
  },
  {
    term: "Cue",
    definition: "Pie. Final que avisa.",
    category: "Argot"
  },
  {
    term: "Da-capo",
    definition: "Voz italiana que significa recomenzar una pieza o número musical desde su primera nota.",
    category: "Música"
  },
  {
    term: "dB (Decibel)",
    definition: "Unidad logarítmica que expresa la relación entre una magnitud sonora y una referencia. Un incremento de 1 dB representa un aumento del 26% en la magnitud física analizada.",
    category: "Acústica / Física"
  },
  {
    term: "dB(A) (Decibel A)",
    definition: "Unidad ponderada que ajusta la medición a la respuesta del oído humano. Es el estándar legal para evaluar riesgos de daño auditivo y molestias por ruido.",
    category: "Acústica / Física"
  },
  {
    term: "Debilitamiento (D)",
    definition: "Diferencia neta de niveles sonoros entre el local fuente y el receptor. Depende de las condiciones reales de instalación y de la absorción de los recintos.",
    category: "Acústica"
  },
  {
    term: "Decibelímetro o Metro VU",
    definition: "Indicador del nivel de la señal de audio que se envía a los moduladores. Está instalado en el centro de la consola de audio.",
    category: "Técnica / Equipamiento"
  },
  {
    term: "Difracción sonora",
    definition: "Desvío de las ondas al rodear obstáculos o pasar por aberturas. Los sonidos graves se difractan más, permitiendo que el ruido de baja frecuencia \"salte\" barreras.",
    category: "Acústica"
  },
  {
    term: "Difusión sonora",
    definition: "Dispersión de la energía en múltiples direcciones al reflejarse. Favorecida por superficies irregulares, mejora la espacialidad y evita concentraciones de energía.",
    category: "Acústica"
  },
  {
    term: "Director técnico y artístico",
    definition: "Responsable de seleccionar el reparto, montar, supervisar y dirigir cada elemento que participa en la grabación o emisión, para lograr el mensaje de la obra.",
    category: "Roles"
  },
  {
    term: "Diseño sonoro",
    definition: "Proceso de creación y manipulación de todos los elementos sonoros (voces, música, efectos) para construir una experiencia auditiva global y narrativa en un proyecto radiofónico o audiovisual.",
    category: "Diseño Sonoro / Producción"
  },
  {
    term: "Disonancia",
    definition: "Sonido o acorde desagradable que no concuerda con lo que le rodea. Su percepción es relativa a la época, la experiencia del oyente y el contexto de la pieza.",
    category: "Música / Física"
  },
  {
    term: "Distanciamiento",
    definition: "Sensación de \"estar alejado de\". Permite que la atención del oyente o espectador se mantenga y que sus emociones se despierten, aunque sea consciente de que solo es espectador.",
    category: "Artístico"
  },
  {
    term: "Disuelve",
    definition: "Música o efecto que se pierde suavemente.",
    category: "Diseño Sonoro / Mezcla"
  },
  {
    term: "Diva",
    definition: "Actriz lírica de extraordinaria facultad. Voz del italiano que significa \"divina\".",
    category: "Roles / Artístico"
  },
  {
    term: "Doblar",
    definition: "Cuando un actor interpreta dos o más papeles en una obra, ya sea por la cantidad de personajes o porque el personaje tiene doble personalidad o distintas etapas de edad.",
    category: "Artístico / Interpretación"
  },
  {
    term: "Eco",
    definition: "Reflexión percibida de forma distinguible del sonido original debido a un retardo suficiente (normalmente >50 ms). Es un defecto grave que anula la inteligibilidad del mensaje.",
    category: "Acústica"
  },
  {
    term: "Editar",
    definition: "Unir frases, efectos, números musicales o secuencias de una o varias cintas magnetofónicas para lograr el objetivo deseado.",
    category: "Técnica / Realización"
  },
  {
    term: "Efecto Haas (Efecto de precedencia)",
    definition: "Fenómeno por el cual el oído localiza la fuente sonora basándose en el primer estímulo recibido. Es fundamental para mantener la naturalidad espacial en sistemas de refuerzo sonoro.",
    category: "Física / Acústica"
  },
  {
    term: "Efecto y edición",
    definition: "Sonidos grabados en cintas o discos, realizados por el operador de sonidos y musicalizador. Se dividen en música y sonidos ambientales.",
    category: "Diseño Sonoro"
  },
  {
    term: "Efectos manuales",
    definition: "Sonidos producidos manualmente por el operador de efectos (pasos, puertas, cristales, etc.). El escritor los indica al margen del libreto.",
    category: "Diseño Sonoro"
  },
  {
    term: "Elenco",
    definition: "Lista del personal artístico disponible para un programa.",
    category: "Artístico"
  },
  {
    term: "Empatía",
    definition: "\"Sentirse parte de\". El oyente o espectador se emociona con lo que oye u observa, aunque no sufra todo el efecto físico y emocional de los personajes.",
    category: "Artístico"
  },
  {
    term: "En seco",
    definition: "Escena o presentación inicial en la que el locutor habla o narra sin música ni efecto de fondo.",
    category: "Diseño Sonoro / Locución"
  },
  {
    term: "Enmascaramiento",
    definition: "Elevación del umbral de audibilidad de un sonido por la presencia de otro. Puede usarse estratégicamente para aumentar la privacidad en oficinas abiertas.",
    category: "Física / Acústica"
  },
  {
    term: "Ensayos",
    definition: "Después de la lectura y explicación de la obra, se inicia la interpretación de acuerdo con las premisas del director y el estado creativo del actor.",
    category: "Artístico"
  },
  {
    term: "Entra música o efecto y baja a fondo de",
    definition: "La música o efecto suena un instante y luego baja para servir de fondo al narrador o diálogo.",
    category: "Guión / Mezcla"
  },
  {
    term: "Entra música o efecto y se mantiene a fondo de",
    definition: "La música o efecto entra y se mantiene a fondo del narrador o diálogo.",
    category: "Guión / Mezcla"
  },
  {
    term: "Escenas simultáneas o superpuestas",
    definition: "Dos escenas montadas por separado y relacionadas entre sí; una se interpone sobre la otra (play-back). El diálogo se entrelaza, con una en primer plano y la otra de fondo.",
    category: "Diseño Sonoro / Realización"
  },
  {
    term: "Estar en el aire",
    definition: "Referirse a todo el tiempo en que una transmisión está llegando al oyente a través de su receptor.",
    category: "Argot / Emisión"
  },
  {
    term: "Estilo",
    definition: "Lo formal. Los estilos más comunes son: Clásico, Romántico, Realista, Simbolismo, Expresionismo, Fantasía, etc. Sello especial de cada artista.",
    category: "Artístico"
  },
  {
    term: "Estroboscopio",
    definition: "Disco de cartón con circunferencias rayadas a igual distancia, que se usa para comprobar el número exacto de revoluciones por minuto de un motor de fonógrafo.",
    category: "Técnica / Explotación"
  },
  {
    term: "Estructura de un programa radial",
    definition: "Conjunto de especialidades que intervienen en su confección hasta la emisión: escritor, asesor, director, actor, musicalizador, operador de audio, etc.",
    category: "Producción / Roles"
  },
  {
    term: "Estudio de radio",
    definition: "Local acondicionado técnica y acústicamente donde se desarrolla casi toda la programación habitual de una emisora. Pueden ser privados o con público.",
    category: "Técnica / Espacios"
  },
  {
    term: "Fade in",
    definition: "Aparición gradual del sonido.",
    category: "Diseño Sonoro / Mezcla"
  },
  {
    term: "Fade out",
    definition: "Desaparición gradual del sonido.",
    category: "Diseño Sonoro / Mezcla"
  },
  {
    term: "Filtro",
    definition: "Efecto que se logra mediante el corte de frecuencia para obtener sonidos metálicos en las voces (teléfonos, autoparlantes, etc.).",
    category: "Técnica / Diseño Sonoro"
  },
  {
    term: "Focalización",
    definition: "Concentración indeseada de energía sonora en un punto, causada por superficies cóncavas o bóvedas. Genera \"puntos calientes\" y zonas de sombra acústica.",
    category: "Acústica"
  },
  {
    term: "Fondear",
    definition: "En el contexto radiofónico, significa situar una música o efecto sonoro a un nivel bajo, como fondo, para que sirva de ambientación sin interferir con la voz principal.",
    category: "Diseño Sonoro / Mezcla"
  },
  {
    term: "Formato",
    definition: "Ordenamiento de un programa musical, cómico o dramático musical que no sigue una regla específica. Distribución de los elementos según el criterio técnico, político y estético.",
    category: "Producción"
  },
  {
    term: "Frase musical melódica",
    definition: "Sucesión de sonidos que rítmicamente expresan un pensamiento musical.",
    category: "Música"
  },
  {
    term: "Frecuencia (f)",
    definition: "Tasa de repetición de un fenómeno periódico, medida en Hertz (Hz). Determina la percepción de graves o agudos, condicionando la selección de materiales para el control de ruido.",
    category: "Física / Acústica"
  },
  {
    term: "Frecuencia fundamental (fo)",
    definition: "Componente de menor frecuencia de un sonido complejo. Define la altura o tono percibido y es el punto de partida para el análisis de cualquier fuente sonora.",
    category: "Física / Acústica"
  },
  {
    term: "Frente de onda",
    definition: "Superficie continua que une los puntos alcanzados por una onda en un mismo instante. Su análisis permite visualizar la expansión de la energía y anticipar zonas de sombra.",
    category: "Física / Acústica"
  },
  {
    term: "Grabadora de cinta magnetofónica",
    definition: "Aparato mecánico-electrónico que se utiliza para grabar en cinta mediante la instalación de uno o varios micrófonos.",
    category: "Técnica / Equipamiento"
  },
  {
    term: "Grabar",
    definition: "Acción de pasar a la cinta magnetofónica o placa cualquier tipo de efecto sonoro, escena o número musical.",
    category: "Técnica / Grabación"
  },
  {
    term: "Guión radial",
    definition: "Guía por la cual el locutor entra en contacto con el oyente para un fin determinado, casi siempre en programas musicales. Existen distintos estilos.",
    category: "Guión / Libreto"
  },
  {
    term: "Hablar en seco",
    definition: "Hablar sin música ni efecto de fondo.",
    category: "Diseño Sonoro / Locución"
  },
  {
    term: "Hijuela",
    definition: "Escena añadida a una obra para aumentar su duración o para sustituir la que tenía, según la apreciación del asesor, escritor o director.",
    category: "Guión / Edición"
  },
  {
    term: "Índice de reducción sonora (R)",
    definition: "Medida de la capacidad aislante de un cerramiento frente al ruido aéreo. Es la diferencia entre el nivel incidente y el transmitido, y varía según la frecuencia.",
    category: "Acústica / Física"
  },
  {
    term: "Inteligibilidad",
    definition: "Medida de la claridad del habla. Depende de un tiempo de reverberación optimizado y de una relación señal-ruido adecuada.",
    category: "Acústica / Diseño Sonoro"
  },
  {
    term: "Intensidad sonora (I)",
    definition: "Tasa media de flujo de energía por unidad de área normal a una dirección. Su análisis es vital para identificar trayectorias de ruido y puntos de fuga energética.",
    category: "Acústica / Física"
  },
  {
    term: "Interrumpe",
    definition: "Palabra que usa el escritor, casi siempre en mayúscula y entre paréntesis, cuando se requiere interrumpir al interlocutor antes de que termine su bocadillo.",
    category: "Guión / Acotación"
  },
  {
    term: "Irse del aire",
    definition: "Desconexión con el oyente, ya sea por el final de las transmisiones o por algún desperfecto técnico.",
    category: "Argot / Emisión"
  },
  {
    term: "Lambriz (Resonador de panel)",
    definition: "Sistema de panel sobre cámara de aire que actúa como resonador. Es la solución técnica para absorber energía en bajas frecuencias (graves) mediante vibración de membrana.",
    category: "Acústica"
  },
  {
    term: "Lectura de mesa",
    definition: "Primer paso de una obra o libreto, en el que los actores leen el papel haciendo correcciones y detectando faltas de copia.",
    category: "Artístico / Ensayos"
  },
  {
    term: "Ligar con, enlazar con o mezclar (Cross Fade)",
    definition: "Disolvencia gradual de un sonido mientras es sustituido por otro. Se logra ajustando los atenuadores de la consola.",
    category: "Diseño Sonoro / Mezcla"
  },
  {
    term: "Libre camino medio (lk)",
    definition: "Distancia promedio recorrida por la onda entre reflexiones sucesivas. Permite estimar la densidad de reflexiones temporales y la escala acústica de un espacio.",
    category: "Acústica / Física"
  },
  {
    term: "LNw (Nivel de ruido de impacto normalizado)",
    definition: "Número único que evalúa el desempeño de un entrepiso frente a impactos. Un valor menor indica mayor protección y confort para el vecino inferior.",
    category: "Acústica / Estándar"
  },
  {
    term: "Longitud de onda (λ)",
    definition: "Distancia entre dos puntos sucesivos de la onda en la misma fase. Condiciona cómo el sonido sortea obstáculos: las ondas largas (graves) rodean objetos fácilmente.",
    category: "Física / Acústica"
  },
  {
    term: "Mesa de sonido",
    definition: "Aparato con dos o más platos giratorios, usado para efectos especiales, puentes musicales y otros sonidos complementarios de dramatizaciones.",
    category: "Técnica / Equipamiento"
  },
  {
    term: "Meterse en un jardín",
    definition: "Cuando el actor, al escapársele un concepto, inventa palabras sin encontrar salida para redondear su parlamento. En grabación, se repite la escena.",
    category: "Artístico / Interpretación"
  },
  {
    term: "Mezclador portátil (O.P.7)",
    definition: "Aparato electrónico que se adiciona a la consola de audio para agregar varios micrófonos más cuando sea necesario.",
    category: "Técnica / Equipamiento"
  },
  {
    term: "Mixer, consola de mesa o mezclador",
    definition: "Control que mezcla varios micrófonos.",
    category: "Técnica / Equipamiento"
  },
  {
    term: "Modo normal",
    definition: "Oscilaciones naturales del aire dependientes de la geometría del recinto. Su distribución regular es clave para evitar coloraciones tonales indeseadas.",
    category: "Acústica / Física"
  },
  {
    term: "Modular",
    definition: "En actuación, variar la expresión y dar suavidad a la voz. Técnicamente, bajar con el atenuador la modulación del sonido.",
    category: "Artístico / Técnica"
  },
  {
    term: "Monitor",
    definition: "Bocina a través de la cual el director y el técnico de audio escuchan el ensayo del programa.",
    category: "Técnica / Equipamiento"
  },
  {
    term: "Montaje",
    definition: "Acoplamiento técnico y artístico de la obra o libreto con todo el equipo, frente al micrófono, para verificar planos, música, efectos, movimiento audio-escénico e interpretación.",
    category: "Producción / Realización"
  },
  {
    term: "Morcilla",
    definition: "Palabra o chiste que el actor añade a su papel espontáneamente durante la grabación.",
    category: "Artístico / Interpretación"
  },
  {
    term: "Movimiento audio-escénico",
    definition: "Incorporación del movimiento al actor radial, teniendo en cuenta las leyes acústicas del estudio. La acción física ayuda a la incorporación del personaje.",
    category: "Artístico / Interpretación"
  },
  {
    term: "Música de fondo",
    definition: "Se utiliza para dar comienzo a una presentación o narración. En función dramática se usa en distintas formas.",
    category: "Música / Diseño Sonoro"
  },
  {
    term: "Narra-acción simultánea",
    definition: "Descripción del narrador de una escena que se desarrolla, pasando a segundo plano hasta que el narrador termina para traerla de nuevo a primer plano.",
    category: "Guión / Estructura"
  },
  {
    term: "Narrador",
    definition: "Especialidad dentro de la locución. Describe lo que no puede ser percibido directamente por el oyente (situación de lugar, tiempo y acción, y estados de ánimo de los personajes).",
    category: "Roles / Locución"
  },
  {
    term: "Nivel de intensidad sonora (Li)",
    definition: "Logaritmo de la razón entre la intensidad medida y 10⁻¹² W/m². En condiciones normales, su valor numérico suele igualarse al Lp.",
    category: "Acústica / Física"
  },
  {
    term: "Nivel de potencia sonora (Lw)",
    definition: "Medida de la energía total emitida por una fuente por unidad de tiempo. Es un valor intrínseco del equipo, esencial para especificar maquinaria.",
    category: "Acústica / Física"
  },
  {
    term: "Nivel de presión sonora (Lp)",
    definition: "Medida basada en la fluctuación instantánea de la presión estática. Es el parámetro principal para evaluar el cumplimiento normativo y el confort en ambientes.",
    category: "Acústica / Física"
  },
  {
    term: "Nivel sonoro (L)",
    definition: "Relación de una magnitud respecto a un valor de referencia, expresada en decibeles. Es la medida técnica estándar en ingeniería de sonido.",
    category: "Acústica / Física"
  },
  {
    term: "Nivel sonoro equivalente (Leq)",
    definition: "Nivel constante que contiene la misma energía que un sonido fluctuante en un periodo dado. Métrica fundamental para evaluar el impacto del tránsito y ruidos industriales.",
    category: "Acústica / Física"
  },
  {
    term: "Nivel sonoro ponderado (Lpond)",
    definition: "Nivel global ajustado mediante filtros (A, B, C o D) para reflejar juicios subjetivos. El filtro A es el más utilizado.",
    category: "Acústica / Física"
  },
  {
    term: "Niveles de ruido urbano (Ld, Ln, Ldn)",
    definition: "Niveles equivalentes diurnos (Ld), nocturnos (Ln) y de 24 horas (Ldn). El Ldn penaliza el ruido nocturno con 10 dB adicionales.",
    category: "Acústica / Estándar"
  },
  {
    term: "Niveles sonoros porcentuales (L10, L50, L90)",
    definition: "Indican el nivel sobrepasado durante un porcentaje del tiempo. L10 captura picos; L90 define el ruido de fondo.",
    category: "Acústica"
  },
  {
    term: "Onda sonora aérea",
    definition: "Perturbación caracterizada por variaciones periódicas de la presión del aire en el tiempo y el espacio. Es el vehículo primario de la comunicación y el ruido.",
    category: "Física / Acústica"
  },
  {
    term: "Operador de audio",
    definition: "Persona que manipula la consola de audio y, mediante su control, gusto artístico y balance, hace que el oyente perciba claramente los sonidos.",
    category: "Roles"
  },
  {
    term: "Operador de efectos manuales",
    definition: "Responsable de producir todos los sonidos o efectos especiales que no están grabados, de acuerdo con las necesidades de la escena.",
    category: "Roles"
  },
  {
    term: "Operador de sonidos musicalizados",
    definition: "Responsable de toda la música y los efectos sonoros grabados que intervienen en el libreto, así como de la atmósfera ambiental necesaria.",
    category: "Roles"
  },
  {
    term: "Original",
    definition: "Libreto que utiliza el director para confrontarlo con las copias. Es el que envía el autor, ya revisado por el asesor del programa.",
    category: "Guión / Libreto"
  },
  {
    term: "Papel",
    definition: "Parte escrita que corresponde a un solo personaje y que el actor ha de estudiar.",
    category: "Guión / Libreto"
  },
  {
    term: "Para sí",
    definition: "Palabras dichas en voz baja que solo el radioyente oye, como si fuera el pensamiento. Suele llevar reverberación o filtro.",
    category: "Guión / Acotación"
  },
  {
    term: "Pausa",
    definition: "Interrupción, larga o corta, que se denomina acción interior.",
    category: "Guión / Interpretación"
  },
  {
    term: "Pensando en voz alta",
    definition: "Lo opuesto a \"para sí\". El actor habla en voz baja, pero de forma que el personaje que está a su lado pueda oírlo.",
    category: "Guión / Interpretación"
  },
  {
    term: "Personaje",
    definition: "Toda figura que interviene en la obra. Pueden ser centrales (protagonista) o secundarios (para mostrar carácter o circunstancialmente).",
    category: "Artístico"
  },
  {
    term: "Pie",
    definition: "Final de un parlamento o escena. Se dice \"al pie\" para indicar la repetición del último concepto o para saltar en el ensayo.",
    category: "Argot"
  },
  {
    term: "Pisar un bocadillo",
    definition: "Error del actor al apurarse y hablar antes de que el compañero haya terminado su bocadillo.",
    category: "Artístico / Interpretación"
  },
  {
    term: "Plano sonoro",
    definition: "Distancia existente entre un actor y el micrófono. A medida que varía la distancia, varían los planos (primero, segundo, tercero, etc.).",
    category: "Diseño Sonoro / Grabación"
  },
  {
    term: "Play-back",
    definition: "Disco o cinta que graba un actor, sobre la que es posible dialogar consigo mismo o comentar una escena retrospectiva.",
    category: "Técnica / Realización"
  },
  {
    term: "Potencia acústica (W)",
    definition: "Energía sonora total emitida, medida en vatios. Conocerla permite predecir los niveles de presión resultantes en un entorno antes de instalar la fuente.",
    category: "Física / Acústica"
  },
  {
    term: "Presentación de un programa",
    definition: "Identificación del programa durante su emisión. Depende de la música, el efecto y la palabra, con o sin eco, reverberación o filtro.",
    category: "Producción / Estructura"
  },
  {
    term: "Principio de Huygens",
    definition: "Establece que cada punto de un frente de onda actúa como fuente secundaria. Explica por qué el sonido se \"filtra\" por pequeñas hendiduras.",
    category: "Física / Acústica"
  },
  {
    term: "Protagonista",
    definition: "Personaje que está en toda la trama, tiene trayectoria y sufre cambios internos o externos.",
    category: "Artístico"
  },
  {
    term: "Puente musical (transición)",
    definition: "Fragmento de música o efecto que marca un cambio de escenas. Puede ser de tiempo y lugar, o de tiempo o lugar.",
    category: "Música / Estructura"
  },
  {
    term: "Puesta en escena (Mise en scène)",
    definition: "Realización completa de una obra con toda la propiedad que su argumento requiere. En radio, se dice \"puesta en radio\".",
    category: "Producción / Realización"
  },
  {
    term: "Radio",
    definition: "Del latín \"radius\" (rayo). Significa difundir por medio de la radio, proyectando el sonido alrededor de un punto central (emisor). Apócope de radiodifusión.",
    category: "Técnica / Historia"
  },
  {
    term: "Radio debate",
    definition: "Audición privada de un programa grabado o en vivo, ofrecida a un grupo de personas que después lo analizan e intercambian juicios sobre aspectos técnicos y artísticos.",
    category: "Producción"
  },
  {
    term: "Radiofrecuencia (R.F.)",
    definition: "Gama de ondas electromagnéticas a partir de 20 000 ciclos que se propagan en el vacío. El límite de su alcance depende del emisor.",
    category: "Técnica / Física"
  },
  {
    term: "Rayo sonoro",
    definition: "Línea imaginaria perpendicular al frente de onda que indica la dirección de propagación. Es esencial para el trazado geométrico en auditorios.",
    category: "Física / Acústica"
  },
  {
    term: "Reflexión",
    definition: "Propiedad de rechazar parte de la energía sonora incidente. Las reflexiones controladas pueden reforzar la voz del orador sin amplificación electrónica.",
    category: "Acústica"
  },
  {
    term: "Reflexión especular",
    definition: "Sigue las leyes geométricas (ángulo de incidencia = ángulo de reflexión). Se manifiesta cuando las superficies son grandes respecto a la longitud de onda.",
    category: "Acústica / Física"
  },
  {
    term: "Refrito",
    definition: "Obra ya estrenada que se presenta con ligeras modificaciones.",
    category: "Producción / Argot"
  },
  {
    term: "Reparto",
    definition: "Relación del personal que trabaja en la obra.",
    category: "Artístico / Producción"
  },
  {
    term: "Repertorio",
    definition: "Lista de obras teatrales o musicales que una persona, compañía o empresa tiene estudiadas o preparadas.",
    category: "Artístico / Música"
  },
  {
    term: "Reprise",
    definition: "Voz de origen francés que indica repetición de un pasaje, así como el reestreno de una obra.",
    category: "Música / Argot"
  },
  {
    term: "Resonancia",
    definition: "Prolongación de un sonido que se va apagando gradualmente. Sonido elemental que acompaña al principal y comunica el timbre a cada voz o instrumento.",
    category: "Acústica / Física"
  },
  {
    term: "Reverberación",
    definition: "Reflejo del sonido en las paredes, que da lugar al eco o reverberación. El eco repite el sonido reflejado; la resonancia lo prolonga.",
    category: "Acústica / Física"
  },
  {
    term: "Reverberación artificial",
    definition: "Efecto producido mediante la cámara soviética M.33-45 (que produce eco) o la Cámara de Reverberación (que no produce eco). Se utiliza un altavoz y un micrófono en un espacio especial.",
    category: "Técnica / Diseño Sonoro"
  },
  {
    term: "Reverberación natural",
    definition: "Se produce cuando el sonido se refleja en las paredes y llega al oído con retraso. Depende de las condiciones acústicas del lugar.",
    category: "Acústica"
  },
  {
    term: "Ritmo",
    definition: "Mayor o menor dinámica que se imparte a los elementos de un programa. Rejuego equilibrado de tensiones e intensidades.",
    category: "Producción / Artístico"
  },
  {
    term: "Rompimiento",
    definition: "Acto que ocurre durante la audición de un programa y que rompe la empatía o el distanciamiento. Las causas son variadas.",
    category: "Producción"
  },
  {
    term: "Ruido de impacto",
    definition: "Producido por fuentes que golpean directamente la estructura (pisadas, caídas). Su control requiere capas elásticas para interrumpir la transmisión mecánica.",
    category: "Acústica"
  },
  {
    term: "Ruidos parásitos",
    definition: "Ruidos no deseados que aparecen en la grabación y cuya procedencia no siempre es determinable.",
    category: "Técnica / Grabación"
  },
  {
    term: "Rw (Índice compensado de reducción sonora)",
    definition: "Valor numérico único (ISO) que caracteriza el aislamiento de un cerramiento. Permite comparar objetivamente el desempeño de diferentes sistemas constructivos.",
    category: "Acústica / Estándar"
  },
  {
    term: "Sabín",
    definition: "Unidad de absorción sonora total de un recinto, expresada en m². Equivale a un metro cuadrado de material perfectamente absorbente; es la base del balance acústico.",
    category: "Acústica / Física"
  },
  {
    term: "Salir al aire",
    definition: "Significa que los sonidos captados por los micrófonos de un estudio, conectados al transmisor, comienzan a ser percibidos por el radioyente.",
    category: "Argot / Emisión"
  },
  {
    term: "Script",
    definition: "Libreto de Radio, Cine o Televisión.",
    category: "Guión / Libreto"
  },
  {
    term: "Sinfín",
    definition: "En el argot radiofónico, se refiere a una pieza musical o efecto sonoro que se repite de forma continua y cíclica, sirviendo como base rítmica o atmosférica de fondo para una sección.",
    category: "Música / Diseño Sonoro"
  },
  {
    term: "Sinopsis",
    definition: "Exposición breve y condensada del argumento.",
    category: "Guión / Estructura"
  },
  {
    term: "Sonido",
    definition: "Perturbación mecánica que se desplaza a través de medios elásticos como el aire, manifestándose como variaciones periódicas de presión.",
    category: "Física / Acústica"
  },
  {
    term: "Speaker",
    definition: "Locutor. Persona que comunica los hechos y divulga lo que beneficia o perjudica a la colectividad.",
    category: "Roles / Locución"
  },
  {
    term: "Sub-tema",
    definition: "Música o efecto que va inmediatamente después del tema musical y se mantiene como fondo del texto de presentación del programa.",
    category: "Música / Estructura"
  },
  {
    term: "Sub-texto",
    definition: "Concepto o mensaje que se deduce del texto sin estar directamente escrito. Es una impresión mental que hace pensar o reflexionar en algo más de lo escrito.",
    category: "Artístico / Guión"
  },
  {
    term: "Sub-trama",
    definition: "Acción secundaria que se desarrolla al margen del argumento principal, en circunstancias condicionadas a la trama.",
    category: "Guión / Estructura"
  },
  {
    term: "Sube música o efecto, se mantiene y cesa",
    definition: "Puede hacerse de fondo al narrador o diálogo, o bien sin narrador o diálogo, o cortando uno y otro.",
    category: "Guión / Mezcla"
  },
  {
    term: "Suspenso y falso suspenso",
    definition: "El suspenso mantiene el interés del oyente para el siguiente capítulo. Si la solución no justifica el suspense, se llama falso suspenso y el espectáculo pierde interés.",
    category: "Guión / Estructura"
  },
  {
    term: "Talk-back",
    definition: "Micrófono de intercomunicación situado en la cabina del director.",
    category: "Técnica / Equipamiento"
  },
  {
    term: "Técnica radial",
    definition: "Conjunto de procedimientos de que se sirve el arte radiofónico. Sin su dominio, el escritor no puede escribir para el medio, ni el director dirigir, ni el actor actuar.",
    category: "Producción / Roles"
  },
  {
    term: "Tema-asunto",
    definition: "Lo que plantea el libreto. Es el contenido de la obra, lo que el autor se propuso al escribirla.",
    category: "Guión / Estructura"
  },
  {
    term: "Tema musical",
    definition: "Melodía que identifica la presentación o despedida de un espectáculo. A veces se sustituye por efectos.",
    category: "Música / Estructura"
  },
  {
    term: "Temática",
    definition: "Relativo al tema. Tema o conjunto de temas.",
    category: "Guión / Estructura"
  },
  {
    term: "Terminación de frase en la interrupción del diálogo",
    definition: "Cuando el diálogo es interrumpido, el actor que ha de ser interrumpido debe escribir una frase por si el bocadillo o efecto que corta la acción no entra a tiempo.",
    category: "Guión / Interpretación"
  },
  {
    term: "Tiempo de reverberación (TR)",
    definition: "Tiempo necesario para que el nivel sonoro disminuya 60 dB. Es el indicador de calidad más relevante para determinar si una sala es apta para conferencias o conciertos.",
    category: "Acústica / Física"
  },
  {
    term: "Timbre",
    definition: "Característica subjetiva que distingue fuentes de igual tono. Depende de la estructura de armónicos; su preservación es vital para la identidad sonora en salas de música.",
    category: "Acústica / Física"
  },
  {
    term: "Tipos o géneros de la obra",
    definition: "Elementos dramáticos que dominan en la pieza radial, teatral o televisiva. Si el material es serio: tragedia o melodrama; si es ligero: comedia o farsa.",
    category: "Guión / Estructura"
  },
  {
    term: "Tono",
    definition: "Percepción subjetiva de la altura (grave/agudo) basada en la frecuencia. Es la unidad base para el análisis de ruido por bandas.",
    category: "Física / Acústica"
  },
  {
    term: "Trac",
    definition: "Estado patológico que inhabilita a músicos, cantantes y actores para continuar su actuación. Ocurre con frecuencia cuando el artista sabe que ha de converger la atención del público.",
    category: "Artístico / Interpretación"
  },
  {
    term: "Trama",
    definition: "Encadenamiento gradual de los personajes y la acción para desarrollar el argumento de una obra.",
    category: "Guión / Estructura"
  },
  {
    term: "Transición dramática",
    definition: "Cambio de tono o entonación que determina una modificación en el estado de ánimo del personaje. A veces el silencio se convierte en transición.",
    category: "Guión / Interpretación"
  },
  {
    term: "Transición musical o puente",
    definition: "Fragmentos de música o efectos que indican cambios de escena. Puede ser de tiempo o lugar, y de tiempo y lugar. También se puede utilizar el silencio.",
    category: "Música / Estructura"
  },
  {
    term: "Umbral de audibilidad / Umbral de dolor",
    definition: "Límites del rango dinámico humano; desde el mínimo sonido detectable hasta el nivel donde la audición se vuelve dolorosa (>120 dB).",
    category: "Física / Acústica"
  },
  {
    term: "Velocidad del sonido (c)",
    definition: "Velocidad de propagación en un medio; en el aire a 22 ºC es de 345 m/s. Es la constante crítica para calcular ecos, retardos y fenómenos de resonancia.",
    category: "Física / Acústica"
  },
  {
    term: "Velocidades de grabación",
    definition: "Cintas magnetofónicas: 17/8, 33/4, 71/2, 15 y 30 p.p.s. (las no profesionales: 17/8 y 33/4). Discos: 16, 331/3, 45 y 78 R.P.M.",
    category: "Técnica / Explotación"
  },
  {
    term: "Vivo",
    definition: "Programa no grabado con antelación. Se produce en el estudio y sale directamente al aire.",
    category: "Argot / Emisión"
  },
  {
    term: "Voz radiofónica",
    definition: "No existe un tipo específico. No hay dos voces iguales. Depende del personaje, de lo que se diga y de cómo se diga.",
    category: "Artístico / Locución"
  }
];
