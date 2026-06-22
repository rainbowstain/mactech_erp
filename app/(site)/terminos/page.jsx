import Link from "next/link";

export const metadata = {
  title: "Términos, Condiciones, Garantía y Diagnóstico | MacTech Arica",
  description:
    "Términos y condiciones de servicio, garantía y diagnóstico de MacTech Arica: alcance, plazos, responsabilidades, garantías, exclusiones y condiciones de retiro.",
  alternates: { canonical: "https://mactech.cl/terminos" },
  robots: { index: true, follow: true },
};

const META = [
  { label: "Servicio", value: "Diagnóstico, reparación, mantención y recuperación de equipos electrónicos" },
  { label: "Cobertura", value: "Teléfonos, tablets, notebooks, PCs, Mac, All-in-One, consolas y otros equipos compatibles" },
  { label: "Aplicación", value: "Cada ingreso al taller y toda reparación aprobada por el cliente" },
];

const DIAG_PLAZOS = [
  ["Teléfonos, tablets y relojes inteligentes", "1 a 72 horas", "Puede variar si existe daño de placa, humedad o bloqueo"],
  ["Notebooks, PC, All-in-One y consolas", "12 a 96 horas", "Dependiendo del acceso interno y de la complejidad"],
  ["Placas electrónicas, microsoldadura y fallas complejas", "Indefinido", "Sujeto a la naturaleza del daño y a la disponibilidad de herramientas"],
];

const GARANTIA = [
  ["Cambio de piezas nuevas", "Pantallas, baterías, conectores, parlantes, cámaras, flex, botones, ventiladores, fuentes y componentes similares", "90 días", "Solo por mal funcionamiento del repuesto o instalación"],
  ["Cambio de piezas usadas o reacondicionadas", "Componente instalado por MACTECH", "30 días", "Solo por mal funcionamiento del repuesto"],
  ["Reparación de placa / microsoldadura", "Trabajo sobre circuitos, pads, integrados, pistas y componentes electrónicos", "30 días", "Sólo respecto de la reparación efectuada"],
];

const SECTIONS = [
  {
    n: 1,
    title: "Alcance del servicio",
    body: [
      "MACTECH presta servicios de diagnóstico, mantenimiento, reparación, recuperación, ensamblaje, reemplazo de repuestos, limpieza técnica y pruebas de funcionamiento sobre equipos electrónicos de consumo y trabajo.",
      "Este documento aplica, entre otros, a: teléfonos Android y iPhone; tablets iPad y Android; notebooks; computadores de escritorio (PC); equipos All-in-One; MacBook; iMac; consolas de videojuegos; controles y periféricos; smartwatches; equipos gamer; monitores; placas madre; tarjetas gráficas; discos de almacenamiento; fuentes de poder; y otros equipos compatibles con el alcance del taller.",
      "Cuando un equipo no pueda ser reparado por falta de repuestos, por imposibilidad técnica, por riesgos de seguridad o por un daño irreversible detectado durante la revisión, MACTECH informará al cliente antes de continuar.",
    ],
  },
  {
    n: 2,
    title: "Ingreso del equipo y Orden de Trabajo",
    body: [
      "Todo equipo que ingrese al taller debe quedar registrado mediante una Orden de Trabajo (OT), ya sea impresa o digital, con los datos del cliente, identificación del equipo, estado general, accesorios entregados, observaciones relevantes y falla reportada.",
      "El cliente declara que la información entregada en la OT es veraz y suficiente para la correcta atención del equipo. Si el equipo presenta contraseñas, bloqueos, cuentas activas o restricciones de acceso, debe informarlo al momento del ingreso.",
      "Al retirar el equipo, el cliente deberá presentar la OT o autorizar a un tercero mediante un medio escrito, acompañado de copia o foto legible de su cédula de identidad y una autorización verificable por WhatsApp, correo electrónico u otro medio que MACTECH pueda validar.",
      "MACTECH podrá negarse a entregar equipos cuando la identidad del receptor no pueda ser verificada razonablemente o cuando exista sospecha de fraude, suplantación, conflicto de titularidad o incumplimiento de los requisitos de retiro.",
    ],
  },
  {
    n: 3,
    title: "Recepción, accesorios y estado del equipo",
    body: [
      "MACTECH recibe el equipo en el estado visible declarado al ingreso. El cliente debe retirar fundas, memorias externas, accesorios no esenciales, tarjetas SIM, tarjetas de memoria y cualquier elemento que no sea parte fija del equipo, salvo que el trabajo lo requiera.",
      "El taller no se responsabiliza por piezas, accesorios, cables, cargadores, adaptadores, chips, cases, controles, soportes, dongles, discos, memorias, licencias, tarjetas, antenas u otros elementos que no hayan sido declarados expresamente en la OT.",
      "Cuando un equipo ingresa con golpes, dobleces, humedad, corrosión, señales de apertura previa, piezas faltantes, reparaciones anteriores o daños estructurales, el cliente acepta que pueden aparecer fallas adicionales durante la intervención debido al estado previo del dispositivo.",
    ],
  },
  {
    n: 4,
    title: "Diagnóstico",
    body: [
      "El diagnóstico consiste en la revisión técnica del equipo para determinar la falla, estimar el alcance del daño y emitir un presupuesto. El diagnóstico puede ser superficial o profundo, según la complejidad del caso y la autorización del cliente.",
      "El valor del diagnóstico podrá ser cobrado conforme al tarifario vigente de MACTECH. Si el cliente aprueba la reparación, dicho valor podrá descontarse total o parcialmente del presupuesto final, según la política comercial vigente al momento del ingreso.",
      "El diagnóstico tiene una vigencia de 5 días hábiles desde su emisión, salvo que MACTECH informe un plazo distinto. Vencido ese plazo, el presupuesto podrá ser actualizado por cambios de precio, disponibilidad de repuestos, nuevas observaciones técnicas o variaciones de tipo de cambio.",
      "Los tiempos de diagnóstico son estimados y dependen de la complejidad del caso, del tipo de falla y de la disponibilidad de insumos, herramientas o repuestos necesarios.",
    ],
  },
  {
    n: 5,
    title: "Plazos estimados de diagnóstico",
    table: { head: ["Tipo de equipo / caso", "Plazo estimado", "Observaciones"], rows: DIAG_PLAZOS },
  },
  {
    n: 6,
    title: "Presupuesto y autorización de reparación",
    body: [
      "El presupuesto comunica al cliente el costo aproximado de la reparación, considerando mano de obra, repuestos, limpieza, pruebas y otros insumos necesarios.",
      "La reparación sólo comienza una vez que el cliente la aprueba expresamente por escrito, por mensaje o por un medio verificable por MACTECH.",
      "Si durante la intervención se detectan fallas adicionales no visibles al ingreso, el presupuesto podrá ajustarse. En ese caso, MACTECH deberá informar al cliente antes de continuar, salvo que el cliente haya autorizado expresamente una intervención de mayor alcance.",
      "Los presupuestos aprobados no son reembolsables una vez iniciado el trabajo, salvo acuerdo expreso distinto o disposición legal aplicable.",
    ],
  },
  {
    n: 7,
    title: "Repuestos, piezas y compatibilidad",
    body: [
      "MACTECH podrá utilizar repuestos originales, OEM, genéricos, compatibles, reacondicionados o usados, según disponibilidad, urgencia, presupuesto y autorización del cliente.",
      "Si el cliente exige exclusivamente repuestos originales y estos no están disponibles, MACTECH podrá rechazar el trabajo, reprogramarlo o proponer una alternativa compatible.",
      "Los plazos de obtención de repuestos pueden variar entre 1 y 90 días, según origen, importación, stock local, proveedor, aduana y logística. Una vez recibido el repuesto, la instalación y prueba puede requerir hasta 7 días hábiles adicionales, dependiendo del tipo de trabajo.",
      "Si un repuesto llega defectuoso, incompleto o en malas condiciones, el pedido podrá ser reemplazado y el nuevo plazo será el que informe el proveedor o proveedor alternativo.",
      "La garantía de los repuestos cubre fallas de hardware o funcionamiento del componente instalado, pero no cubre problemas de software, configuración, incompatibilidad externa, virus, bloqueos de cuentas o daños posteriores al retiro.",
    ],
  },
  {
    n: 8,
    title: "Garantía del servicio",
    body: [
      "La garantía cubre exclusivamente la falla reparada y el componente instalado o intervenido por MACTECH, dentro del plazo correspondiente. El plazo corre desde la fecha de entrega del equipo al cliente y se valida mediante la OT, boleta, factura o comprobante equivalente.",
    ],
    table: { head: ["Tipo de trabajo", "Cobertura", "Plazo", "Condición principal"], rows: GARANTIA },
    after: [
      "La garantía no se extiende ni se renueva por haber sido ejercida, salvo que MACTECH repare nuevamente la misma falla dentro del periodo de cobertura y ello sea expresamente reconocido por escrito.",
    ],
  },
  {
    n: 9,
    title: "Qué cubre la garantía",
    body: [
      "La garantía cubre la falla específica reparada, el componente instalado o reemplazado y la mano de obra asociada a ese trabajo.",
      "Cuando el cliente presente el equipo dentro del plazo de garantía, MACTECH evaluará si la falla coincide con la reparación original. Si la falla es distinta o proviene de una causa nueva, se tratará como un servicio independiente.",
      "En caso de una falla cubierta, MACTECH podrá optar por reparar, reemplazar o reevaluar el componente afectado según corresponda técnica y comercialmente.",
    ],
  },
  {
    n: 10,
    title: "Qué no cubre la garantía",
    list: [
      "Daños por golpes, caídas, presión, flexión, torsión, vibración o aplastamiento posterior a la entrega.",
      "Daños por líquido, humedad, corrosión, sulfatación o condensación ocurridos después de la reparación o presentes fuera del alcance diagnosticado.",
      "Intervención por terceros, manipulación del cliente, apertura no autorizada, sellos retirados o alterados.",
      "Fallas de software, sistema operativo, firmware, malware, virus, cuentas, licencias, bloqueos de fábrica o restricciones de activación.",
      "Fallas distintas de la originalmente reparada, incluso si se manifiestan en el mismo equipo.",
      "Desgaste natural, batería envejecida, limpieza superficial, calibraciones, actualizaciones o problemas externos al trabajo realizado.",
    ],
  },
  {
    n: 11,
    title: "Riesgos técnicos y limitaciones",
    body: [
      "El cliente entiende que algunos equipos pueden llegar al taller con daños previos que no siempre son visibles al ingreso. En esos casos, al desarmar, calentar, soldar, limpiar o medir, pueden aparecer fallas adicionales no preexistentes o antes no detectables.",
      "Esto es especialmente relevante en equipos doblados, quebrados, con placas golpeadas, sulfatación, historial de caída, exposición a líquidos, intentos de reparación previos, conectores arrancados, pistas cortadas y daños por cortocircuito.",
      "En trabajos de microsoldadura, recuperación de pistas, cambio de integrados, reemplazo de slots, reparación de circuitos, reflow, reballing o similares, el cliente acepta que existe un riesgo técnico inherente a la intervención y que el resultado depende del estado real del dispositivo.",
      "MACTECH no garantiza la recuperación total cuando el equipo presenta daños irreversibles, fallo múltiple de componentes o una condición previa incompatible con una reparación segura.",
    ],
  },
  {
    n: 12,
    title: "Equipos mojados, sulfatados o con daño severo",
    body: [
      "Los equipos con humedad, líquido, óxido, corrosión, sulfatación o residuos conductivos requieren procedimientos específicos y pueden presentar fallas ocultas posteriores al diagnóstico o reparación.",
      "El cliente acepta que, en este tipo de casos, no es posible garantizar un resultado absoluto ni la permanencia del funcionamiento de componentes que ya se encontraban afectados antes del ingreso.",
      "Si el equipo presenta daño extendido, MACTECH podrá limitar el servicio a limpieza, rescate parcial, diagnóstico o reparación de prioridad según viabilidad técnica.",
    ],
  },
  {
    n: 13,
    title: "Datos, cuentas, licencias y software",
    body: [
      "El respaldo de información es de exclusiva responsabilidad del cliente, salvo que se haya contratado expresamente el servicio de copia de seguridad o extracción de datos.",
      "MACTECH no se responsabiliza por pérdida, alteración o inaccesibilidad de información, cuentas, perfiles, contraseñas, licencias, activaciones, apps, juegos, configuración personalizada o archivos dañados por causas previas, fallas de hardware o acciones de terceros.",
      "El cliente debe informar si el equipo tiene cuentas activas o bloqueos como Apple ID, Google, Samsung, Huawei, Microsoft, Steam, PSN, Nintendo, Xbox, MDM, FRP, iCloud, BIOS, BitLocker, contraseñas de firmware o equivalentes.",
      "En equipos con bloqueo de cuenta, cifrado o administración remota, MACTECH podrá requerir la credencial, autorización o desbloqueo previo para realizar pruebas y asegurar la entrega correcta del servicio.",
    ],
  },
  {
    n: 14,
    title: "Consolas y equipos gamer",
    body: [
      "Las consolas de videojuegos, controles, fuentes, discos, lectores, ventilación, chips, puertos HDMI, placas electrónicas y accesorios se consideran equipos electrónicos sujetos a estas condiciones.",
      "En consolas con intervención previa, sobrecalentamiento, reparación antigua o daño de pista, la apertura del equipo puede revelar fallas no visibles al ingreso.",
      "MACTECH no se responsabiliza por licencias digitales, cuentas, bibliotecas de juegos, suscripciones, datos en la nube, cuentas parentales o bloqueos de red asociados a plataformas de juego.",
    ],
  },
  {
    n: 15,
    title: "PCs, notebooks, estaciones de trabajo y componentes",
    body: [
      "En computadores de escritorio, notebooks, All-in-One y estaciones de trabajo, el servicio puede incluir limpieza interna, cambio de pasta térmica, sustitución de ventiladores, revisión de voltajes, pruebas de encendido, diagnóstico de disco, memoria, fuente de poder, placa madre, tarjeta gráfica y periféricos internos.",
      "La garantía no cubre incompatibilidades entre componentes de terceros, ensamblajes previos mal ejecutados, overclock, modificaciones no informadas, BIOS alterada, firmware dañado o problemas derivados del uso de software no autorizado.",
      "En equipos de alto rendimiento o gaming, el cliente acepta que temperaturas, consumo, carga y estabilidad pueden requerir pruebas adicionales para validar el funcionamiento real.",
    ],
  },
  {
    n: 16,
    title: "Valor de la reparación y forma de pago",
    body: [
      "El diagnóstico, la reparación, la compra de repuestos y cualquier servicio adicional deben ser pagados al momento del retiro, salvo acuerdo escrito distinto.",
      "Si el cliente no paga el monto total aprobado, MACTECH podrá retener la entrega del equipo en los términos permitidos por la legislación aplicable y por la presente orden de trabajo.",
      "Los precios pueden variar por disponibilidad de stock, variación de proveedor, tipo de cambio, complejidad técnica o necesidad de repuestos adicionales detectados durante el trabajo.",
    ],
  },
  {
    n: 17,
    title: "Retiro, bodegaje y abandono",
    body: [
      "Una vez notificado que el equipo está listo para retiro, el cliente deberá retirarlo dentro del plazo indicado por MACTECH. Si no lo hace, podrá aplicarse un cobro por bodegaje según el tarifario vigente.",
      "Si el equipo permanece sin retiro por un periodo prolongado, MACTECH no se responsabiliza por deterioros posteriores, pérdida de accesorios no declarados, cambios de estado de batería o pérdida de información derivada del tiempo de almacenamiento.",
      "Para equipos no retirados dentro de los plazos legalmente aplicables, MACTECH podrá ejercer las acciones que correspondan conforme a la legislación chilena vigente y al documento de recepción suscrito por el cliente.",
    ],
  },
  {
    n: 18,
    title: "Responsabilidades del cliente",
    list: [
      "Entregar información veraz sobre la falla, historial de reparaciones, bloqueo, humedad, golpes o modificaciones previas.",
      "Retirar cuentas, respaldar datos y quitar elementos personales cuando corresponda.",
      "Revisar el equipo al momento de la entrega y comunicar observaciones de inmediato.",
      "Conservar la OT, boleta o comprobante para cualquier reclamo de garantía.",
    ],
  },
  {
    n: 19,
    title: "Responsabilidades de MACTECH",
    list: [
      "Informar al cliente sobre el diagnóstico, presupuesto y eventuales cambios relevantes antes de continuar.",
      "Ejecutar el trabajo con criterios técnicos razonables y buenas prácticas de taller.",
      "Entregar el equipo con prueba básica de funcionamiento, dentro de los límites técnicos de cada caso.",
      "Resguardar el equipo mientras permanezca en custodia del taller, sin perjuicio de las exclusiones expresamente informadas en este documento.",
    ],
  },
  {
    n: 20,
    title: "Aceptación expresa",
    body: [
      "El cliente declara haber leído íntegramente este documento, comprender su contenido y aceptar las condiciones aquí establecidas al ingresar el equipo, aprobar un presupuesto, autorizar una reparación o retirar el dispositivo.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="site legal">
      <div className="legal-bg" aria-hidden="true" />

      <header className="legal-top">
        <Link className="legal-home" href="/">
          <img src="/brand/mactech-logo-white-trim.png" alt="MacTech" />
        </Link>
        <Link className="legal-back" href="/">
          ← Volver al inicio
        </Link>
      </header>

      <article className="legal-sheet">
        <p className="kicker">MacTech</p>
        <h1 className="legal-title">Términos, Condiciones, Garantía y Diagnóstico</h1>

        <div className="legal-meta">
          {META.map((item) => (
            <div className="legal-meta-card" key={item.label}>
              <span className="legal-meta-label">{item.label}</span>
              <span className="legal-meta-value">{item.value}</span>
            </div>
          ))}
        </div>

        <div className="legal-intro">
          <p>
            MACTECH recibe, diagnostica, repara, prueba, entrega y garantiza equipos electrónicos de distintas
            marcas y sistemas operativos. Su objetivo es proteger tanto al cliente como al servicio técnico,
            definiendo con claridad el alcance del trabajo, los plazos, responsabilidades, garantías, exclusiones y
            condiciones de retiro.
          </p>
          <p>
            La aceptación de una Orden de Trabajo (OT), de un presupuesto enviado por WhatsApp, correo o cualquier
            otro medio escrito o hablado, o la simple entrega del equipo para revisión o reparación, implica que el
            cliente declara haber leído, entendido y aceptado estas condiciones.
          </p>
        </div>

        {SECTIONS.map((section) => (
          <section className="legal-section" key={section.n}>
            <h2>
              <span className="legal-num">{String(section.n).padStart(2, "0")}</span>
              {section.title}
            </h2>
            {(section.body || []).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
            {section.list ? (
              <ul className="legal-list">
                {section.list.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : null}
            {section.table ? (
              <div className="legal-table-wrap">
                <table className="legal-table">
                  <thead>
                    <tr>
                      {section.table.head.map((cell) => (
                        <th key={cell}>{cell}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.table.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {(section.after || []).map((paragraph, index) => (
              <p key={`after-${index}`}>{paragraph}</p>
            ))}
          </section>
        ))}

        <footer className="legal-foot">MacTech · Servicio Técnico Especializado</footer>
      </article>
    </main>
  );
}
