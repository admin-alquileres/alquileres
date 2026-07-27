import{initializeApp}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import{getFirestore,collection,getDocs,addDoc,updateDoc,doc,query,where,orderBy}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import{getAuth,signInWithEmailAndPassword,signOut,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import{getDatabase,ref,set,onValue,onDisconnect,serverTimestamp}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const FC={apiKey:"AIzaSyDnsmUuwjiT2Gzq3y9NAvxaeFEmn3LTMw4",authDomain:"alquileres-eckerdt.firebaseapp.com",projectId:"alquileres-eckerdt",storageBucket:"alquileres-eckerdt.firebasestorage.app",messagingSenderId:"368148074641",appId:"1:368148074641:web:4369af59f3e7b2f3daef30",databaseURL:"https://alquileres-eckerdt-default-rtdb.firebaseio.com"};
const fireApp=initializeApp(FC);
const db=getFirestore(fireApp);
const auth=getAuth(fireApp);
const rtdb=getDatabase(fireApp);

let S=window.S={
  sec:"dashboard",usuario:null,
  propietarios:[],propiedades:[],contratos:[],pagos:[],inquilinos:[],
  modal:null,contratoActivo:null,form:{},formExtras:[],
  filtros:{buscar:"",buscarPor:"inquilino",estado:"activo"},
  liqMes:"",loading:true,synced:false,inquilinoActivo:null,itemsCobro:[],formExtras:[],alertasTipo:"todas",alertasPlazo:30,sortCol:"inquilino",sortDir:1,setupBuscar:"",setupCambios:{},propietarioActivo:null,liqSeleccion:{},migSeleccion:{},migEditando:{},contratoRenovar:null,propiedadesInmuebles:[],editarPropiedadId:null,matrizGastosId:null,matrizTemp:null,fechaCorte:"2026-07",modalExtra:null,editarExtrasId:null,_extrasTemp:null,ipcMes:"",depCuotasCobro:1,cobranzaMes:"",cobranzaProp:"",cobranzaBuscar:"",cobranzaEstado:"todos",propBuscar:"",ultimoPago:null,
  presencia:[]
};

const $=id=>document.getElementById(id);
const moneda=n=>"$"+Math.round(n||0).toLocaleString("es-AR");
const hoy=()=>new Date().toISOString().split("T")[0];
const mesActual=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");};
const MESES=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const mesNombre=m=>{if(!m)return"";const p=m.split("-");if(p.length===2)return MESES[+p[1]-1]+" "+p[0];return m;};
const mesNombreMay=m=>mesNombre(m).toUpperCase();
const diasPara=fin=>Math.round((new Date(fin)-new Date())/86400000);
const NAVS=[{id:"dashboard",ic:"▦",lbl:"Dashboard"},{id:"contratos",ic:"◻",lbl:"Contratos"},{id:"cobranzas",ic:"$",lbl:"Cobranzas"},{id:"liquidaciones",ic:"≡",lbl:"Liquidaciones"},{id:"ipc",ic:"⟳",lbl:"Actualiz. IPC"},{id:"servicios",ic:"🧾",lbl:"Pago de servicios"},{id:"inquilinos",ic:"◎",lbl:"Inquilinos"},{id:"propietarios",ic:"◉",lbl:"Propietarios"},{id:"caja",ic:"💰",lbl:"Caja"},{id:"setup",ic:"⚙",lbl:"Puesta a punto"},{id:"deudores",ic:"⚠",lbl:"Deudores"},{id:"puntualidad",ic:"⏱",lbl:"Puntualidad"}];
const TITLES={dashboard:["Dashboard","Resumen general de la cartera"],contratos:["Contratos","Clic en un contrato para ver detalles y registrar pagos"],cobranzas:["Cobranzas","Historial de cobros"],liquidaciones:["Liquidaciones","Liquidación mensual a propietarios"],ipc:["Actualiz. IPC","Contratos a actualizar en los próximos 60 días"],servicios:["Pago de servicios","Carga masiva de gastos fijos por servicio"],inquilinos:["Inquilinos","Datos y contratos"],propietarios:["Propietarios","Ficha y propiedades"],caja:["Caja agencia","Ingresos y gastos de la agencia"],setup:["Puesta a punto","Actualización masiva de contratos"],deudores:["Deudores","Contratos con pagos pendientes o en atraso"],puntualidad:["Puntualidad de pago","Ranking de días de pago respecto al plazo"]};

// ── MANUAL DE USO ──────────────────────────────────────────────────────────
const MANUAL_TEMAS = [
  {
    id: "primeros-pasos",
    ic: "🚀",
    titulo: "Primeros pasos",
    html: `
      <p>Este sistema reemplaza las planillas y los papeles para gestionar los alquileres de Eckerdt Negocios Inmobiliarios. Todo lo que cargás se guarda automáticamente en Firebase — no hay botón de "guardar todo", cada acción se confirma sola.</p>
      <div class="manual-tip">
        <strong>💡 Tip clave:</strong> si dos personas entran al mismo tiempo, el sistema avisa quién está conectado (mirá la barra "En línea ahora" abajo a la izquierda). Evitá editar el mismo contrato que otra persona está usando en simultáneo.
      </div>
      <h4>El menú de la izquierda</h4>
      <p>Cada ítem del menú es una sección distinta. Las que vas a usar más seguido día a día son <strong>Contratos</strong> (para registrar cobros) y <strong>Dashboard</strong> (para ver qué necesita atención hoy).</p>
      <h4>Buscador global</h4>
      <p>Arriba de todo hay un buscador (🔍) que busca en TODO el sistema a la vez: inquilinos, propietarios, direcciones. Útil cuando no te acordás en qué sección está algo.</p>
    `
  },
  {
    id: "dashboard",
    ic: "▦",
    titulo: "Dashboard",
    html: `
      <p>Es la pantalla de inicio. Te muestra de un vistazo qué necesita tu atención <strong>hoy</strong>, sin tener que ir sección por sección a buscarlo.</p>
      <h4>Las alertas (tarjetas con color)</h4>
      <ul class="manual-list">
        <li><strong>📋 Renovación / Contrato VENCIDO</strong> — un contrato está llegando a su fecha de fin (o ya pasó). Hay que decidir si se renueva, se modifica, o el inquilino se va.</li>
        <li><strong>🔄 Actualizar próximo mes / Actualización VENCIDA</strong> — toca aplicar el ajuste de alquiler por IPC. <em>Si el contrato está cerca de vencer, esta alerta no aparece</em> — primero hay que resolver la renovación, ese contrato nuevo va a tener su propia fecha de actualización.</li>
        <li><strong>🏦 Depósito pendiente / 💼 Honorarios pendientes</strong> — falta cobrar una cuota de depósito de garantía o de honorarios de la inmobiliaria.</li>
        <li><strong>💸 Pago vencido</strong> — un inquilino tiene un cobro de un mes anterior que quedó sin marcar como cobrado.</li>
      </ul>
      <h4>Filtros de alertas</h4>
      <p>Podés filtrar las alertas por tipo (IPC, Renovaciones, Pagos, Depósitos, Honorarios) y por plazo (30/60/90 días) para no marearte con todo junto.</p>
      <h4>Las tarjetas de números</h4>
      <p>Arriba de todo: contratos activos, cuántos inquilinos ya pagaron este mes, cuántos propietarios ya cobraron, comisiones del mes vs. objetivo, propietarios sin liquidar, e inmuebles disponibles para alquilar.</p>
      <div class="manual-tip">
        <strong>💡 Tip:</strong> la tarjeta "Inmuebles disponibles" y "Prop. sin liquidar" son clickeables — te llevan directo a Propietarios para resolver el tema.
      </div>
    `
  },
  {
    id: "contratos",
    ic: "◻",
    titulo: "Contratos",
    html: `
      <p>Es la lista completa de contratos: activos, vencidos y finalizados. Hacé clic en cualquier fila para abrir el contrato y registrar un cobro.</p>
      <h4>Buscar y filtrar</h4>
      <p>Podés buscar por inquilino, propietario o domicilio (elegí qué buscar con el selector de la izquierda), y filtrar por estado (Todos / Activos / Vencidos / Finalizados).</p>
      <p>Las columnas son clickeables para ordenar — por ejemplo, hacé clic en "Actualiz." para ver primero los contratos que antes necesitan ajuste de IPC.</p>
      <div class="manual-tip">
        <strong>⚠️ El ícono de alerta junto al inquilino</strong> significa que ese contrato tiene depósito u honorarios pendientes de cobrar.
      </div>
      <h4>Crear un contrato nuevo</h4>
      <p>Botón "+ Nuevo contrato" arriba a la derecha. El formulario te pide, en orden:</p>
      <ol class="manual-list">
        <li><strong>Propietario y propiedad</strong> — si la propiedad ya está ocupada por otro contrato activo, no vas a poder seleccionarla (aparece marcada "Ocupada").</li>
        <li><strong>Datos del inquilino</strong> — nombre es obligatorio, el resto es opcional pero recomendado.</li>
        <li><strong>Condiciones económicas</strong> — alquiler y comisión de la agencia.</li>
        <li><strong>Gastos a cargo del inquilino</strong> — si hay gastos fijos que el inquilino paga aparte (ej. expensas).</li>
        <li><strong>Vigencia</strong> — fecha de inicio (obligatoria) y de fin.</li>
        <li><strong>¿Lleva depósito de garantía?</strong> — <em>es obligatorio elegir Sí o No</em>, no se puede guardar el contrato sin responder esto. Si elegís "Sí", aparece la opción de pagarlo en 1, 2 o 3 cuotas.</li>
        <li><strong>Honorarios de la inmobiliaria</strong> — medio mes o un mes completo, en 1 o 2 cuotas.</li>
        <li><strong>Actualización</strong> — cada cuántos meses se ajusta el alquiler (3/4/6/12) y con qué índice.</li>
        <li><strong>Gastos fijos</strong> — la matriz de gastos (TGI, Agua, Luz, etc.) que se van a cobrar mes a mes.</li>
      </ol>
    `
  },
  {
    id: "registrar-cobro",
    ic: "💵",
    titulo: "Registrar un cobro mensual",
    html: `
      <p>Esta es la operación que vas a hacer más seguido. Se hace abriendo un contrato (desde Contratos, Cobranzas, o el Dashboard) y usando el bloque <strong>"Registrar pago del mes"</strong>.</p>
      <h4>Paso a paso</h4>
      <ol class="manual-list">
        <li>Elegí el <strong>período</strong> (mes) que estás cobrando. El sistema recalcula automáticamente los ítems que corresponden a ese mes: gastos fijos, depósito pendiente, honorarios pendientes y saldo del mes anterior si lo hay.</li>
        <li>Revisá el <strong>alquiler</strong> — viene precargado, pero podés ajustarlo si hace falta.</li>
        <li>Completá los montos de los <strong>ítems fijos</strong> que tengan un campo vacío (ej. si el monto de Agua varía cada mes).</li>
        <li>Si hace falta, agregá ítems con los botones <strong>+ Fijo</strong>, <strong>+ Variable</strong>, <strong>± Saldo</strong>, <strong>⏰ Mora</strong> o <strong>🏢 Gestión</strong>.</li>
        <li>Mirá el <strong>Resumen del cobro</strong> al final — te muestra el total, la comisión de la agencia y el neto para el propietario.</li>
        <li>Si todavía no vas a cobrar (por ejemplo, preparás el detalle un día antes), usá <strong>"Guardar gastos para cobrar después"</strong> — así no se pierde lo que armaste.</li>
      </ol>
      <div class="manual-tip">
        <strong>💡 Importante sobre depósito y honorarios:</strong> aunque guardes gastos manuales para un mes (como un descuento puntual), el sistema siempre va a sumar la cuota de depósito u honorarios pendiente si corresponde — no hace falta agregarla a mano, y no se pierde por tener otros ítems guardados.
      </div>
      <h4>Botones de "Depósito y honorarios"</h4>
      <p>Arriba del bloque de cobro vas a ver dos tarjetas: <strong>Depósito garantía</strong> y <strong>Honorarios inmobiliaria</strong>. Si dicen "Cuota pendiente", podés usar el botón "Registrar cuota X de depósito/honorarios" para marcarla cobrada directamente, sin pasar por el flujo completo de cobro mensual.</p>
      <h4>El botón ⏰ Mora</h4>
      <p>No se ingresa el monto a mano: el sistema calcula sola la mora (1% diario sobre el alquiler, contando los días de atraso desde el 1° del mes hasta la fecha de cobro que pusiste). Si el pago todavía está en plazo, te avisa que no corresponde mora en vez de agregar algo.</p>
      <h4>El botón 🏢 Gestión</h4>
      <p>Es un ítem que queda anotado en el detalle del cobro, pero <strong>no suma al total cobrado al inquilino ni afecta la comisión</strong> — usalo solo para dejar registrada una nota de gestión interna, no para cobrar algo extra.</p>
      <h4>Comentarios temporales</h4>
      <p>Podés dejar una nota rápida en el contrato (por ejemplo "Llamar para confirmar fecha de pago") que se borra cuando quieras. No queda guardada como historial permanente — para eso usá el historial de notas del inquilino o la propiedad.</p>
    `
  },
  {
    id: "cobranzas",
    ic: "$",
    titulo: "Cobranzas",
    html: `
      <p>Es el historial completo de todos los cobros registrados, con filtros por mes, propietario, estado y búsqueda por inquilino o dirección.</p>
      <h4>Para qué sirve</h4>
      <ul class="manual-list">
        <li>Revisar qué se cobró en un mes puntual.</li>
        <li>Emitir el <strong>PDF del recibo</strong> para el inquilino (botón 📄 Inq).</li>
        <li>Eliminar un cobro mal registrado (🗑️) — esto NO borra el contrato, solo ese pago puntual.</li>
      </ul>
      <div class="manual-tip">
        <strong>⚠️ Cuidado con eliminar pagos:</strong> si borrás un cobro por error, las cuotas de depósito/honorarios que se hayan marcado como pagadas en ese cobro no se revierten automáticamente. Si tenés dudas, mejor preguntale a Gastón antes de borrar.
      </div>
    `
  },
  {
    id: "liquidaciones",
    ic: "≡",
    titulo: "Liquidaciones",
    html: `
      <p>Acá se calcula cuánto hay que transferirle a cada propietario por los alquileres que se cobraron en un mes.</p>
      <h4>Cómo se calcula</h4>
      <p>Para cada propietario, el sistema toma todos los cobros del mes seleccionado y resta la comisión de la agencia:</p>
      <p class="manual-formula">Alquiler cobrado − Comisión de la agencia = Neto a transferir al propietario</p>
      <p>Los gastos extra que el inquilino pagó (como TGI o Agua) se muestran aparte y no afectan la comisión — la comisión se calcula siempre solo sobre el alquiler.</p>
      <h4>PDFs</h4>
      <p>Cada tarjeta tiene dos botones: <strong>📄 PDF Propietario</strong> (el detalle de la liquidación) y <strong>📄 PDF Inquilino</strong> (el recibo de lo que pagó).</p>
      <h4>Resumen del mes</h4>
      <p>Si hay más de una liquidación en el mes seleccionado, aparece una tarjeta con el total general: todo lo cobrado, la comisión total de la agencia, y el total a transferir a todos los propietarios juntos.</p>
    `
  },
  {
    id: "ipc",
    ic: "⟳",
    titulo: "Actualización IPC",
    html: `
      <p>Acá se aplican los ajustes de alquiler según el índice de precios (IPC u otro índice configurado por contrato).</p>
      <h4>Cómo funciona</h4>
      <p>Los contratos se agrupan automáticamente según cada cuántos meses se actualizan (3, 4, 6 o 12 meses), y se muestran los que corresponden actualizar en el mes que tenés seleccionado en el selector de arriba (podés navegar mes a mes con las flechas ◀ ▶).</p>
      <ol class="manual-list">
        <li>Elegí el grupo (por ejemplo "Cada 6 meses").</li>
        <li>Escribí el <strong>% de aumento</strong> en el campo correspondiente — el sistema calcula en vivo el nuevo monto para cada contrato del grupo.</li>
        <li>Revisá la columna "Dif. dep. / cuotas" — si el contrato tiene depósito pendiente, te avisa ahí.</li>
        <li>Usá <strong>"✓ Aplicar a todos"</strong> para confirmar el aumento — se aplica a TODOS los contratos de ese grupo a la vez, con el mismo porcentaje. No hay forma de aplicar un % distinto a un solo contrato del grupo desde esta pantalla; si necesitás un % diferente para uno en particular, hacelo desde la ficha de ese contrato.</li>
        <li>El botón <strong>📱 WhatsApp</strong> (individual o "a todos") te abre un mensaje prearmado para avisarle al inquilino el nuevo monto.</li>
      </ol>
      <div class="manual-tip">
        <strong>💡 Importante:</strong> si un contrato está por vencer antes de que llegue su próxima actualización, no va a aparecer en esta lista — primero hay que resolver la renovación (ver Dashboard).
      </div>
    `
  },
  {
    id: "inquilinos",
    ic: "◎",
    titulo: "Inquilinos",
    html: `
      <p>Ficha de cada persona que alquila, con su historial completo más allá del contrato puntual.</p>
      <h4>Qué vas a encontrar en la ficha</h4>
      <ul class="manual-list">
        <li>Datos de contacto (teléfono, email, DNI, garante).</li>
        <li>Estado de depósito y honorarios de cada contrato activo, con botón para cobrar la cuota pendiente sin tener que ir al contrato.</li>
        <li>Lista de contratos (activos e históricos).</li>
        <li>Historial de notas (llamados, acuerdos — a diferencia de los "comentarios temporales" del contrato, esto sí queda guardado).</li>
        <li>Historial de pagos de los últimos 12 meses.</li>
      </ul>
      <div class="manual-tip">
        <strong>💡 Tip:</strong> si un inquilino tiene depósito u honorarios pendientes en algún contrato activo, vas a ver un chip rojo "dep./hon. pend." junto a su nombre en la lista general.
      </div>
    `
  },
  {
    id: "propietarios",
    ic: "◉",
    titulo: "Propietarios",
    html: `
      <p>Ficha de cada propietario, con todas sus propiedades, estado de cobro, y cuenta corriente.</p>
      <h4>Lista general</h4>
      <p>Te muestra de un vistazo cuántas propiedades activas tiene cada uno, si tiene alguna disponible para alquilar, y el estado de cobro ("Al día" o "$X pendiente").</p>
      <h4>Dentro de la ficha de un propietario</h4>
      <ul class="manual-list">
        <li><strong>Tarjetas de resumen</strong> — propiedades activas, disponibles, alquileres a liquidar, gastos extra, comisión y neto estimado.</li>
        <li><strong>Cuenta corriente</strong> — para registrar ajustes manuales (a favor o en contra del propietario) que no son parte de una liquidación normal. Quedan pendientes hasta la próxima liquidación.</li>
        <li><strong>Propiedades e historial</strong> — cada propiedad con su chip de "Ocupada: [inquilino]" o "Disponible", y un registro de eventos (reparaciones, arreglos) que persiste aunque cambie el inquilino.</li>
      </ul>
      <div class="manual-tip">
        <strong>💡 Tip:</strong> el historial de eventos de una propiedad (gasista, arreglos, etc.) es independiente del inquilino — si se va uno y entra otro, esa historia queda guardada igual.
      </div>
    `
  },
  {
    id: "caja",
    ic: "💰",
    titulo: "Caja agencia",
    html: `
      <p>El movimiento de plata de la agencia en sí — separado de lo que se les cobra a inquilinos o se les transfiere a propietarios.</p>
      <h4>Tipos de movimiento</h4>
      <ul class="manual-list">
        <li><strong>+ Honorario</strong> — un ingreso de honorarios que no vino del flujo automático de comisiones.</li>
        <li><strong>+ Gasto</strong> — un gasto de la agencia (insumos, servicios, etc.).</li>
        <li><strong>+ Retiro Matías</strong> — dinero que retira el socio.</li>
        <li><strong>+ Adelanto inquilino</strong> — plata que se le adelanta a un inquilino, que se marca como "Pendiente" hasta que se recupera.</li>
      </ul>
      <h4>El saldo disponible</h4>
      <p class="manual-formula">Comisiones totales + Ingresos manuales − Gastos − Adelantos sin recuperar = Saldo disponible</p>
      <p>Las comisiones se calculan solas en base a los cobros registrados — no hace falta cargarlas a mano.</p>
    `
  },
  {
    id: "puesta-a-punto",
    ic: "⚙",
    titulo: "Puesta a punto",
    html: `
      <p>Es la pantalla para revisar y completar datos de contratos existentes que quedaron incompletos — por ejemplo, contratos migrados de planillas viejas que no tenían toda la información.</p>
      <h4>Las tarjetas de arriba</h4>
      <p>Te dicen de un vistazo cuántos contratos activos hay, y cuántos tienen algún dato faltante: sin fecha de última actualización, sin teléfono, o sin depósito cargado.</p>
      <h4>Cómo se usa</h4>
      <p>Es una grilla editable: hacé clic en cualquier campo (alquiler, fechas, depósito, gastos, etc.) y escribí el dato correcto. Los cambios se guardan automáticamente en cuanto salís del campo — las filas que modificaste se marcan con un punto naranja (●) en la columna "Modificado".</p>
      <div class="manual-tip">
        <strong>💡 Tip:</strong> usá el buscador para encontrar un contrato puntual en vez de scrollear toda la lista.
      </div>
    `
  },
  {
    id: "deudores",
    ic: "⚠",
    titulo: "Deudores",
    html: `
      <p>Lista de contratos con atraso real en el pago — útil para saber a quién hay que llamar.</p>
      <h4>Cómo se calcula el atraso</h4>
      <p>El sistema revisa, mes por mes, si hay un pago registrado como cobrado. Si pasaron más de 5 días del mes sin que haya un cobro registrado, ese mes se cuenta como atraso.</p>
      <h4>Fecha de corte</h4>
      <p>Arriba hay un selector de "Evaluar deudas desde" — todo lo anterior a esa fecha se considera saldado y no se cuenta como deuda, aunque no tenga un pago registrado en el sistema (típicamente se usa para no arrastrar deuda de antes de empezar a usar el sistema).</p>
      <div class="manual-tip">
        <strong>💡 Tip:</strong> el color de "Meses atraso" te da una pista visual rápida — amarillo es 1 mes, naranja 2, rojo 3 o más.
      </div>
    `
  },
  {
    id: "preguntas-frecuentes",
    ic: "❓",
    titulo: "Preguntas frecuentes",
    html: `
      <h4>¿Por qué un contrato dice "Ocupada" pero el inquilino ya se fue?</h4>
      <p>Revisá que el contrato viejo esté realmente marcado como "Finalizado" y no como "Activo". El sistema decide ocupado/disponible mirando si hay un contrato activo para esa dirección.</p>
      <h4>¿Por qué no me deja seleccionar una propiedad al crear un contrato?</h4>
      <p>Esa propiedad ya tiene un contrato activo. Primero hay que finalizar el contrato anterior.</p>
      <h4>¿Qué hago si me equivoqué al cargar un cobro?</h4>
      <p>Vas a Cobranzas, buscás el pago, y usás el botón 🗑️ para eliminarlo. Si el error involucra una cuota de depósito u honorarios ya marcada como pagada, avisale a Gastón para revisar que quede consistente.</p>
      <h4>¿Cómo sé si alguien más está usando el sistema en este momento?</h4>
      <p>Mirá abajo a la izquierda — si dice "En línea ahora" con nombres, hay otra persona conectada. Si dice "Sincronizado · Firebase", estás sola/o.</p>
      <h4>¿Qué pasa si pierdo la conexión a internet?</h4>
      <p>El sistema te avisa con "Sin conexión" en la esquina inferior izquierda. Esperá a que vuelva la conexión antes de seguir cargando datos, para no perder cambios.</p>
    `
  }
];



function toast(msg,ok=true){
  $("tmsg").textContent=msg;
  $("tdot").style.background=ok?"#4BC8E8":"#e74c3c";
  $("toast").classList.add("show");
  setTimeout(()=>$("toast").classList.remove("show"),2500);
}

function badge(e){
  const m={activo:"bg Activo",cobrado:"bg Cobrado",pendiente:"by Pendiente",vencido:"br Vencido"};
  const[c,l]=(m[e]||"bgr "+e).split(" ");
  return `<span class="badge ${c}">${l}</span>`;
}

function logoSVG(s){s=s||32;
  return `<svg width="${s}" height="${s*.78}" viewBox="0 0 46 36" fill="none">
    <polygon points="2,34 14,4 20,16" fill="#4BC8E8"/>
    <polygon points="14,4 20,16 23,20" fill="#2B6B7A"/>
    <polygon points="23,20 26,16 32,4" fill="#2B6B7A"/>
    <polygon points="26,16 32,4 44,34" fill="#3A9DB5"/>
    <circle cx="23" cy="3" r="4" fill="#F5A623"/>
    <circle cx="23" cy="3" r="1.8" fill="#0A0A0A"/>
  </svg>`;}

// ── PRESENCIA ──────────────────────────────────────────────────────────────────
function iniciarPresencia(user){
  const uid=user.uid;
  const nombre=user.email.split("@")[0];
  const userRef=ref(rtdb,"presencia/"+uid);
  set(userRef,{nombre,online:true,desde:Date.now()});
  onDisconnect(userRef).remove();
  onValue(ref(rtdb,"presencia"),snap=>{
    const data=snap.val()||{};
    S.presencia=Object.values(data).filter(u=>u.online);
    render();
  });
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
S.fechaCorte=localStorage.getItem('fechaCorte')||'2026-07';
onAuthStateChanged(auth,user=>{
  if(user){S.usuario=user;iniciarPresencia(user);cargarTodo();}
  else{S.usuario=null;S.loading=false;S.presencia=[];renderLogin();}
});

window.doLogin=async()=>{
  const email=$("l-email").value.trim();
  const pass=$("l-pass").value;
  const btn=$("l-btn");const err=$("l-err");
  if(!email||!pass){err.textContent="Completá usuario y contraseña";err.style.display="block";return;}
  btn.disabled=true;btn.textContent="Ingresando...";err.style.display="none";
  try{await signInWithEmailAndPassword(auth,email,pass);}
  catch(e){err.textContent="Usuario o contraseña incorrectos";err.style.display="block";btn.disabled=false;btn.textContent="Ingresar";}
};
window.doLogout=async()=>{
  if(S.usuario){const r=ref(rtdb,"presencia/"+S.usuario.uid);set(r,null);}
  await signOut(auth);
  S={...S,sec:"dashboard",propietarios:[],propiedades:[],contratos:[],pagos:[],inquilinos:[],synced:false,presencia:[]};
};

// ── FIREBASE CRUD ──────────────────────────────────────────────────────────────
async function fbAdd(col,data){
  try{const r=await addDoc(collection(db,col),{...data,_ts:Date.now()});toast("Guardado ✓");return r.id;}
  catch(e){toast("Error: "+e.message,false);return null;}
}
async function fbUpd(col,id,data){
  try{await updateDoc(doc(db,col,id),{...data,_ts:Date.now()});toast("Actualizado ✓");}
  catch(e){toast("Error: "+e.message,false);}
}

async function cargarTodo(){
  S.loading=true;render();
  try{
    for(const col of["propietarios","propiedades","contratos","pagos","inquilinos"]){
      const snap=await getDocs(collection(db,col));
      S[col]=snap.docs.map(d=>({...d.data(),_id:d.id}));
    }
    S.pagos=S.pagos.filter(p=>!p._eliminado);
    S.propiedadesInmuebles=S.propiedades.filter(p=>!p._eliminado);
    const meses=[...new Set(S.pagos.map(p=>p.mes))].sort().reverse();
    S.liqMes=meses[0]||mesActual();
    S.synced=true;
  }catch(e){toast("Error: "+e.message,false);}
  S.loading=false;render();
}

// ── PDF ───────────────────────────────────────────────────────────────────────
const LOGO_B64="data:image/jpeg;base64,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EPCxwSIyQhNSYoKSBHKiIxTA0PGywtJA4kOT/9oADAMBAQIRAxEAAAC/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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";

function numeroALetras(n){
  n=Math.round(n);
  const u=["","uno","dos","tres","cuatro","cinco","seis","siete","ocho","nueve","diez","once","doce","trece","catorce","quince","dieciséis","diecisiete","dieciocho","diecinueve"];
  const d=["","diez","veinte","treinta","cuarenta","cincuenta","sesenta","setenta","ochenta","noventa"];
  const c=["","cien","doscientos","trescientos","cuatrocientos","quinientos","seiscientos","setecientos","ochocientos","novecientos"];
  function m1000(n){
    if(n===0)return"";if(n===100)return"cien";if(n<20)return u[n];
    if(n<100){const dd=Math.floor(n/10),uu=n%10;return d[dd]+(uu?" y "+u[uu]:"");}
    const cc=Math.floor(n/100),r=n%100;
    let base=c[cc];if(cc===1&&r>0)base="ciento";
    return base+(r?" "+m1000(r):"");
  }
  if(n===0)return"cero";
  if(n>=1000000){const mm=Math.floor(n/1000000),r=n%1000000;return(mm===1?"un millón":m1000(mm)+" millones")+(r?" "+m1000(r):"");}
  if(n>=1000){const mm=Math.floor(n/1000),r=n%1000;return(mm===1?"mil":m1000(mm)+" mil")+(r?" "+m1000(r):"");}
  return m1000(n);
}

function nroRecibo(){return String(Math.floor(10000000+Math.random()*90000000)).padStart(8,"0");}

function membretePDF(doc,nroRec){
  // ── RECIBO X — formato argentino ──────────────────────────────────────────
  doc.setFillColor(255,255,255);doc.rect(0,0,210,297,"F");
  // Caja con X grande a la izquierda
  doc.setDrawColor(20,20,20);doc.setLineWidth(1.2);doc.rect(12,6,22,22);
  doc.setFont("helvetica","bold");doc.setFontSize(24);doc.setTextColor(20,20,20);
  doc.text("X",23,22,{align:"center"});
  // "RECIBO" debajo del cuadro
  doc.setFont("helvetica","bold");doc.setFontSize(10);doc.setTextColor(40,40,40);
  doc.text("RECIBO",23,32,{align:"center"});
  // "DOCUMENTO NO VÁLIDO COMO FACTURA" y N° a la derecha
  doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(80,80,80);
  doc.text("DOCUMENTO NO VALIDO COMO FACTURA",198,10,{align:"right"});
  doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(40,40,40);
  doc.text("N "+nroRec,198,17,{align:"right"});
  // Línea separadora
  doc.setDrawColor(180,180,180);doc.setLineWidth(0.4);doc.line(12,36,198,36);
  return 42;
}

function generarPDFInquilino(p){
  const{jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:"mm",format:"a4"});
  const cont=S.contratos.find(x=>x._id===p.contratoId)||{};
  const nro=p.comprobante||nroRecibo();
  const alq=p.alquiler||p.monto||0;
  // Usar itemsCobro si existe, sino extras (compatibilidad hacia atrás)
  const items=p.itemsCobro||(p.extras||[]).map(e=>({tipo:"fijo",desc:e.desc,monto:+(e.monto||0)}));
  const totalItems=items.reduce((s,it)=>s+(it.monto||0),0);
  const totalInq=p.totalInquilino||alq+totalItems;
  const com=p.comision||Math.round(alq*(cont.comisionAgencia??5)/100);
  const fecha=p.fechaCobro||new Date().toLocaleDateString("es-AR");
  const hora=new Date().toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});
  let y=membretePDF(doc,nro);

  // Encabezado
  doc.setFontSize(9);doc.setFont("helvetica","bold");doc.setTextColor(40,40,40);
  doc.text("Fecha y Hora: "+fecha+"  "+hora,198,y,{align:"right"});y+=8;
  doc.setFontSize(10);doc.setFont("helvetica","normal");
  doc.text("Recibimos de:",12,y);doc.setFont("helvetica","bold");
  doc.text((p.inquilino||"").toUpperCase(),44,y);y+=6;
  doc.setFont("helvetica","normal");
  doc.text("Propiedad:",12,y);doc.setFont("helvetica","bold");
  doc.text(p.direccion||"",34,y);y+=8;

  // Alquiler
  doc.setFillColor(245,245,245);doc.rect(12,y-5,186,9,"F");
  doc.setFont("helvetica","bold");doc.setFontSize(11);doc.setTextColor(20,20,20);
  doc.text("PAGO ALQUILER MES DE "+mesNombreMay(p.mes),14,y);
  doc.text(moneda(alq),198,y,{align:"right"});y+=10;

  // Items (fijos, variables, saldo)
  items.forEach(it=>{
    const neg=(it.monto||0)<0;
    doc.setFont("helvetica","normal");doc.setFontSize(10);
    doc.setTextColor(neg?180:60,neg?30:60,neg?30:60);
    const label=it.desc||(it.tipo==="saldo"?"Saldo mes anterior":it.tipo);
    doc.text(label+":",16,y);
    doc.text((neg?"":"")+moneda(it.monto||0),198,y,{align:"right"});
    y+=7;
  });

  // Línea separadora y total
  doc.setDrawColor(180,180,180);doc.line(12,y,198,y);y+=7;
  doc.setFont("helvetica","bold");doc.setFontSize(10);doc.setTextColor(20,20,20);
  doc.text("Son Pesos",12,y);
  doc.setFontSize(12);doc.text(moneda(totalInq),198,y,{align:"right"});y+=6;
  doc.setFont("helvetica","italic");doc.setFontSize(8.5);doc.setTextColor(80,80,80);
  doc.text("("+numeroALetras(totalInq)+" pesos)",12,y);y+=8;

  // Pagados a propietario
  doc.setFont("helvetica","bold");doc.setFontSize(9.5);doc.setTextColor(40,40,40);
  doc.text("Pagados a: "+(cont.propietarioNombre||p.propietarioNombre||"").toUpperCase(),12,y);y+=10;

  y+=16;

  // Firma
  doc.setDrawColor(100,100,100);doc.setLineWidth(0.3);doc.line(12,y,70,y);
  doc.setFontSize(8);doc.setTextColor(100,100,100);
  doc.text("Firma",38,y+4,{align:"center"});y+=18;

  // Línea de corte
  for(let x=12;x<198;x+=6){doc.setDrawColor(150,150,150);doc.line(x,y,x+3,y);}
  doc.setFontSize(7.5);doc.setTextColor(120,120,120);
  doc.text("-- Cortar aqui - Talon para la inmobiliaria --",105,y-2,{align:"center"});y+=5;

  // Talon — espejo del recibo con detalle de items
  doc.setFontSize(8);doc.setFont("helvetica","bold");doc.setTextColor(60,60,60);
  doc.text("RECIBO N. "+nro,12,y+4);doc.text(fecha+" "+hora,198,y+4,{align:"right"});y+=8;
  doc.setFont("helvetica","normal");doc.setFontSize(7.5);
  doc.text("Inquilino: "+(p.inquilino||""),12,y);
  doc.text("Prop.: "+(p.direccion||""),105,y);y+=5;
  doc.setFont("helvetica","bold");doc.setFontSize(8);
  doc.text("Alquiler "+mesNombreMay(p.mes),12,y);
  doc.text(moneda(alq),198,y,{align:"right"});y+=5;
  // Items del cobro en el talon
  items.forEach(function(it){
    if(!it.desc&&!it.monto) return;
    doc.setFont("helvetica","normal");doc.setFontSize(7.5);
    const neg=(it.monto||0)<0;
    doc.setTextColor(neg?180:60,60,60);
    const lbl=(it.desc||it.tipo).substring(0,40);
    doc.text(lbl+":",14,y);
    doc.text((neg?"- ":"")+moneda(Math.abs(it.monto||0)),198,y,{align:"right"});y+=4;
  });
  doc.setTextColor(60,60,60);
  doc.setDrawColor(150,150,150);doc.setLineWidth(0.2);doc.line(12,y,198,y);y+=4;
  doc.setFont("helvetica","bold");doc.setFontSize(8);
  doc.text("TOTAL: "+moneda(totalInq),12,y);
  doc.text("Prop.: "+(cont.propietarioNombre||p.propietarioNombre||""),105,y);y+=5;
  doc.setDrawColor(200,200,200);doc.setLineWidth(0.1);doc.line(12,y,198,y);y+=4;
  doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(100,100,100);
  doc.text("Comisión agencia ("+(cont.comisionAgencia??5)+"%): "+moneda(com),12,y);y+=4;

  doc.save("Recibo-Inquilino-"+(p.inquilino||"").replace(/ /g,"_")+"-"+mesNombreMay(p.mes)+".pdf");
}

function generarPDFPropietario(p){
  const{jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:"mm",format:"a4"});
  const cont=S.contratos.find(x=>x._id===p.contratoId)||{};
  const nro=p.comprobante||nroRecibo();
  const alq=p.alquiler||p.monto||0;
  // Items cobrados al inquilino (para mostrar el desglose)
  const items=p.itemsCobro||(p.extras||[]).map(e=>({tipo:"fijo",desc:e.desc,monto:+(e.monto||0)}));
  const itemsFijos=items.filter(it=>it.tipo==="fijo"&&(it.monto||0)>0);
  const totalItems=items.reduce((s,it)=>s+(it.monto||0),0);
  const totalInq=p.totalInquilino||alq+totalItems;
  const com=p.comision||Math.round(alq*(cont.comisionAgencia??5)/100);
  const neto=p.netoPropiertario||(alq-com);
  const fecha=p.fechaCobro||new Date().toLocaleDateString("es-AR");
  const hora=new Date().toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});
  let y=membretePDF(doc,nro);

  // Encabezado
  doc.setFontSize(9);doc.setFont("helvetica","bold");doc.setTextColor(40,40,40);
  doc.text("Fecha y Hora: "+fecha+"  "+hora,198,y,{align:"right"});y+=8;
  doc.setFontSize(10);doc.setFont("helvetica","normal");
  doc.text("Propiedad:",12,y);doc.setFont("helvetica","bold");doc.text(p.direccion||"",36,y);y+=6;
  doc.setFont("helvetica","normal");
  doc.text("Inquilino:",12,y);doc.setFont("helvetica","bold");doc.text((p.inquilino||"").toUpperCase(),34,y);y+=6;
  doc.setFont("helvetica","normal");
  doc.text("Propietario:",12,y);doc.setFont("helvetica","bold");doc.text((p.propietarioNombre||"").toUpperCase(),40,y);y+=8;

  // Alquiler cobrado
  doc.setFillColor(245,245,245);doc.rect(12,y-5,186,9,"F");
  doc.setFont("helvetica","bold");doc.setFontSize(11);doc.setTextColor(20,20,20);
  doc.text("ALQUILER MES DE "+mesNombreMay(p.mes),14,y);
  doc.text(moneda(alq),198,y,{align:"right"});y+=10;

  // Gastos fijos cobrados al inquilino (solo los positivos fijos, son del propietario)
  if(itemsFijos.length){
    doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(60,60,60);
    doc.text("Gastos cobrados al inquilino:",12,y);y+=6;
    itemsFijos.forEach(it=>{
      doc.setFont("helvetica","normal");doc.setFontSize(10);doc.setTextColor(60,60,60);
      doc.text(it.desc+":",16,y);doc.text(moneda(it.monto||0),198,y,{align:"right"});y+=7;
    });
    doc.setFont("helvetica","bold");doc.setFontSize(10);doc.setTextColor(20,20,20);
    doc.text("Total cobrado al inquilino:",12,y);doc.text(moneda(totalInq),198,y,{align:"right"});y+=8;
  }

  // Separador
  doc.setDrawColor(180,180,180);doc.line(12,y,198,y);y+=6;

  // Comisión
  doc.setFont("helvetica","normal");doc.setFontSize(10);doc.setTextColor(180,30,30);
  doc.text("Retencion honorarios administracion ("+(cont.comisionAgencia??5)+"%): ",12,y);
  doc.text("- "+moneda(com),198,y,{align:"right"});y+=8;

  // Neto
  doc.setDrawColor(40,40,40);doc.setLineWidth(0.5);doc.line(12,y,198,y);y+=7;
  doc.setFont("helvetica","bold");doc.setFontSize(12);doc.setTextColor(20,20,20);
  doc.text("NETO A TRANSFERIR AL PROPIETARIO:",12,y);
  doc.setTextColor(27,142,60);doc.text(moneda(neto),198,y,{align:"right"});y+=6;
  doc.setFont("helvetica","italic");doc.setFontSize(8.5);doc.setTextColor(80,80,80);
  doc.text("("+numeroALetras(neto)+" pesos)",12,y);y+=12;

  // Período y firma
  doc.setFont("helvetica","normal");doc.setFontSize(9);doc.setTextColor(60,60,60);
  doc.text("Periodo: "+mesNombreMay(p.mes),12,y);y+=14;
  doc.setDrawColor(100,100,100);doc.setLineWidth(0.3);doc.line(12,y,70,y);
  doc.setFontSize(8);doc.text("Firma",38,y+4,{align:"center"});
  doc.text("Eckerdt Negocios Inmobiliarios",198,y+4,{align:"right"});

  doc.save("Liquidacion-Prop-"+(p.propietarioNombre||"").replace(/ /g,"_")+"-"+mesNombreMay(p.mes)+".pdf");
}

// onclick handlers usando data-id para evitar problemas de comillas

function renderIPC(){
  const activos=S.contratos.filter(c=>c.estado==="activo"||!c.estado);
  const mesSel=S.ipcMes||mesActual();
  const [anioSel,mSel]=mesSel.split("-").map(Number);
  const mesNombres=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const mesLbl=mesNombres[mSel-1]+" "+anioSel;
  const mesSig=(()=>{const d=new Date(anioSel,mSel,1);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");})();
  const [anioSig,mSig]=mesSig.split("-").map(Number);
  const mesLblSig=mesNombres[mSig-1]+" "+anioSig;
  const mesPrev=(()=>{const d=new Date(anioSel,mSel-2,1);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");})();
  const grupos={3:[],4:[],6:[],12:[]};
  const vencenAntes=[];
  let cntSig=0;
  activos.forEach(c=>{
    const fr=+(c.frecActualizacion||6);
    if(!grupos[fr]) grupos[fr]=[];
    const prox=getProxActualizacion(c);
    if(!prox) return;
    if(c.fin){
      const _fp=c.fin.split('-').map(Number);
      const finDate=new Date(_fp[0],_fp[1]-1,_fp[2]);
      if(prox>=finDate){vencenAntes.push({c,prox,fr});return;}
    }
    const proxMes=prox.getFullYear()+"-"+String(prox.getMonth()+1).padStart(2,"0");
    if(proxMes===mesSel) grupos[fr].push({c,prox});
    if(proxMes===mesSig) cntSig++;
  });
  const totalSel=Object.values(grupos).reduce((s,g)=>s+g.length,0);
  const selector=`<div style="display:flex;align-items:center;gap:10px;margin:16px 0">
    <button class="btn sm" data-action="ipcMesPrev" style="font-size:16px;padding:4px 10px">◀</button>
    <input type="month" class="inp" value="${mesSel}" data-action="setIpcMes" style="width:160px;font-size:13px">
    <button class="btn sm" data-action="ipcMesNext" style="font-size:16px;padding:4px 10px">▶</button>
    <span style="font-size:13px;font-weight:600;color:var(--celeste)">${mesLbl}</span>
  </div>`;
  let html=`<div class="kgrid" style="grid-template-columns:repeat(3,1fr)">
    <div class="kcard" style="border-top-color:${totalSel>0?"var(--naranja)":"var(--gris4)"}"><div class="klbl">En ${mesLbl}</div><div class="kval" style="color:${totalSel>0?"var(--naranja)":"var(--gris4)"}">${totalSel}</div><div class="ksub">contratos a actualizar</div></div>
    <div class="kcard" style="border-top-color:var(--gris4)"><div class="klbl">En ${mesLblSig}</div><div class="kval" style="color:var(--gris3)">${cntSig}</div><div class="ksub">próximo mes</div></div>
    <div class="kcard" style="border-top-color:var(--celeste)"><div class="klbl">Contratos activos</div><div class="kval">${activos.length}</div></div>
  </div>${selector}`;
  let hayBloques=false;
  [3,4,6,12].forEach(fr=>{
    const items=grupos[fr];
    const vencFr=vencenAntes.filter(v=>v.fr===fr);
    if(!items.length&&!vencFr.length) return;
    hayBloques=true;
    const filas=items.map(item=>{
      const c=item.c;
      const dep=c.deposito||{};
      const depPend=dep.pendiente||0;
      return `<tr class="ipc-row" data-id="${c._id}" data-alq="${c.alquilerBase}" data-fr="${fr}">
        <td class="tdm">${c.inquilino||""}</td>
        <td>${c.direccion||""}</td>
        <td style="color:var(--gris3);font-size:11px">${c.propietarioNombre||""}</td>
        <td style="color:var(--gris3);font-size:11px">${item.prox.toLocaleDateString("es-AR")}</td>
        <td style="font-weight:600">${moneda(c.alquilerBase)}</td>
        <td class="nuevo-alq" style="font-weight:700;color:var(--celeste)">—</td>
        <td class="dif-alq" style="font-size:11px;color:#5ddb8a">—</td>
        <td class="dif-dep" style="font-size:11px">${depPend>0?'<span style="color:var(--rojo)">⚠️ dep. '+moneda(depPend)+'</span>':''}</td>
        <td>${c.telefono?`<button class="btn sm" style="background:rgba(37,211,102,.12);color:#25d366;padding:4px 8px;font-size:11px"
          onclick="abrirWhatsAppIPC('${c._id}', +document.getElementById('ipc-pct-${fr}')?.value)">📱</button>`:'<span style="color:var(--gris4);font-size:10px">Sin tel.</span>'}</td>
      </tr>`;
    }).join("");
    html+=`<div class="lcard" style="border-left:3px solid var(--naranja);margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px">
        <div>
          <div style="font-size:15px;font-weight:700">Cada ${fr} meses</div>
          <div style="font-size:11px;color:var(--gris3)">${items.length} contrato(s) en ${mesLbl}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <label style="font-size:11px;color:var(--gris3)">% aumento c/${fr}m:</label>
          <input class="inp ipc-inp" type="number" step="0.01" placeholder="ej: 12.5" id="ipc-pct-${fr}"
            oninput="calcularNuevosMontos(${fr})"
            style="width:90px">
          <button class="btn" style="background:rgba(39,174,96,.15);color:#5ddb8a"
            onclick="aplicarIPCGrupo(${fr})">✓ Aplicar a todos</button>
        </div>
      </div>
      ${items.length?'<div class="tw"><table><thead><tr><th>Inquilino</th><th>Propiedad</th><th>Propietario</th><th>Próx. actualiz.</th><th>Alquiler actual</th><th>Nuevo alquiler</th><th>Aumento</th><th>Dif. dep. / cuotas</th><th>WA</th></tr></thead><tbody>'+filas+'</tbody></table></div>':""}
      ${(function(){
        if(!vencFr.length) return '';
        const vRows=vencFr.map(function(v){
          const proxStr=v.prox.getFullYear()+"-"+String(v.prox.getMonth()+1).padStart(2,"0");
          return '<tr>'
            +'<td style="font-size:12px">'+v.c.inquilino+'</td>'
            +'<td style="font-size:11px;color:var(--gris3)">'+(v.c.direccion||'—')+'</td>'
            +'<td style="font-size:11px;color:var(--naranja)">'+v.c.fin+'</td>'
            +'<td style="font-size:11px;color:var(--gris3)">'+proxStr+'</td>'
            +'</tr>';
        }).join('');
        const n=vencFr.length;
        return '<div style="margin-top:10px;background:rgba(245,166,35,.06);border:1px solid rgba(245,166,35,.25);border-radius:8px;padding:10px 14px">'
          +'<div style="font-size:11px;font-weight:600;color:var(--naranja);margin-bottom:8px">📅 '+n+' contrato'+(n>1?'s vencen':' vence')+' antes de la próxima actualización — no corresponde aumento</div>'
          +'<div style="overflow-x:auto"><table><thead><tr><th>Inquilino</th><th>Propiedad</th><th>Vencimiento</th><th>Próx. actualiz.</th></tr></thead><tbody>'+vRows+'</tbody></table></div>'
          +'</div>';
      })()}
    </div>`;
  });
  if(!hayBloques) html+=`<div class="empty">Sin contratos a actualizar en ${mesLbl}</div>`;
  return html;
}

window.calcularNuevosMontos=function(fr){
  const inp=document.getElementById(`ipc-pct-${fr}`);
  if(!inp) return;
  const pct=parseFloat(inp.value);
  document.querySelectorAll(`.ipc-row[data-fr="${fr}"]`).forEach(row=>{
    const alq=+(row.dataset.alq||0);
    const tdN=row.querySelector(".nuevo-alq");
    const tdD=row.querySelector(".dif-alq");
    const tdDep=row.querySelector(".dif-dep");
    if(!tdN||!tdD) return;
    if(isNaN(pct)||!pct){tdN.textContent="—";tdD.textContent="—";return;}
    const nuevo=Math.round(alq*(1+pct/100));
    const cid=row.dataset.id;
    const c=S.contratos.find(x=>x._id===cid)||{};
    const depPagado=(c.deposito||{}).pagado||0;
    const difDep=nuevo-depPagado;
    tdN.textContent=moneda(nuevo);
    tdD.textContent="+"+moneda(nuevo-alq);
    tdD.style.color="#5ddb8a";
    if(tdDep) tdDep.innerHTML=difDep>0?`<span style="color:var(--rojo)">+${moneda(difDep)} dep.</span>`:`<span style="color:#5ddb8a">✓</span>`;
  });
};

function waIpcMsgTexto(c,pct,nuevo,proxStr){
  const depViejo=(c.deposito&&c.deposito.total)||0;
  const tieneDeposito=depViejo>0; // total===0 significa que el contrato nunca tuvo depósito (ver confirmarRenovacion)
  const difDep=tieneDeposito?nuevo-depViejo:0;

  let msg="[Mensaje automático]\n";
  msg+="Hola "+(c.inquilino||"")+"! Te informamos que a partir de "+proxStr+" el alquiler de "+(c.direccion||"")+" se actualiza a "+moneda(nuevo)+" (+"+pct+"%).\n";

  if(tieneDeposito&&difDep>0){
    msg+="Además, el depósito en garantía se actualiza de "+moneda(depViejo)+" a "+moneda(nuevo)+" — la diferencia de "+moneda(difDep)+" se puede abonar el próximo mes en 1 o 2 cuotas, como prefieras.\n";
  }

  msg+="Cualquier duda o consulta, quedamos a disposición. Saludos!\n";
  msg+="INMOBILIARIA ECKERDT";
  return msg;
}
function waIpcDatosItem(item){
  const c=item.c;const pct=item.pct;
  const nuevo=Math.round((c.alquilerBase||0)*(1+pct/100));
  const prox=getProxActualizacion(c);
  const proxStr=prox?prox.toLocaleDateString("es-AR",{month:"long",year:"numeric"}):"próximo mes";
  const tel=(c.telefono||"").replace(/\D/g,"").replace(/^0/,"");
  return{nuevo,proxStr,tel,msg:waIpcMsgTexto(c,pct,nuevo,proxStr)};
}
window.abrirWhatsAppIPC=function(cid,pct){
  if(!pct||isNaN(+pct)){toast("Ingresá un % primero",false);return;}
  const c=S.contratos.find(function(x){return x._id===cid;});
  if(!c)return;
  const{tel,msg}=waIpcDatosItem({c:c,pct:+pct});
  if(!tel){toast("Sin teléfono cargado",false);return;}
  window.open("https://wa.me/549"+tel+"?text="+encodeURIComponent(msg),"_blank");
};
window.aplicarIPCGrupo=async function(fr){
  const inp=document.getElementById(`ipc-pct-${fr}`);
  if(!inp) return;
  const pct=parseFloat(inp.value);
  if(!pct||isNaN(pct)){toast("Ingresá un % válido",false);return;}
  const rows=document.querySelectorAll(`.ipc-row[data-fr="${fr}"]`);
  if(!confirm(`¿Aplicar +${pct}% a los ${rows.length} contrato(s) de c/${fr}m?`)) return;
  const promises=[];
  rows.forEach(row=>{
    const cid=row.dataset.id;
    const c=S.contratos.find(x=>x._id===cid);
    if(!c) return;
    const depCuotas=1;
    const nuevo=Math.round(c.alquilerBase*(1+pct/100));
    const depViejo=c.deposito||{};
    const totalViejo=depViejo.total||0;
    const difDep=nuevo-totalViejo;
    const nuevoDeposito=difDep>0
      ?calcularDepositoActualizacionIPC(nuevo,difDep,depCuotas)
      :{...depViejo,total:nuevo,pendiente:0,completo:true};
    const upd={alquilerBase:nuevo,ultimaActualizacion:hoy(),pctUltimaActualizacion:pct,deposito:nuevoDeposito};
    promises.push(fbUpd("contratos",cid,upd).then(()=>{
      S.contratos=S.contratos.map(x=>x._id===cid?{...x,...upd}:x);
    }));
  });
  await Promise.all(promises);
  toast(`✅ ${promises.length} contrato(s) actualizados`);
  render();
};

async function cobrarCuotaDep(cid){
  const c=S.contratos.find(x=>x._id===cid);if(!c)return;
  const dep=c.deposito||{};
  const montoFaltante=dep.pendiente||0;
  if(!montoFaltante){toast("El depósito ya está completo",false);return;}
  const n=dep.cuotasTotales||dep.cuotas||1;
  const yaPagadas=dep.cuotasPagadas!==undefined?dep.cuotasPagadas:(dep.pagadas||0);
  const proximaCuota=yaPagadas+1;
  const montoEstaCuota=Math.min(montoFaltante,dep.montoCuota||montoFaltante);
  if(!confirm(`¿Registrar cuota ${proximaCuota} de ${n} del depósito (${moneda(montoEstaCuota)}) para ${c.inquilino}?`))return;
  const nuevoDeposito=registrarCuotaDeposito(dep);
  await fbUpd("contratos",cid,{deposito:nuevoDeposito});
  S.contratos=S.contratos.map(x=>x._id===cid?{...x,deposito:nuevoDeposito}:x);
  toast(nuevoDeposito.completo?"Depósito completado ✓":`Cuota ${proximaCuota} de ${n} registrada ✓ — queda ${moneda(nuevoDeposito.pendiente)}`);
  render();
}

async function cobrarCuotaHon(cid){
  const c=S.contratos.find(x=>x._id===cid);if(!c)return;
  const hon=c.honorarios||{};
  const montoFaltante=hon.pendiente||0;
  if(!montoFaltante){toast("Los honorarios ya están completos",false);return;}
  if(!confirm(`¿Registrar 2da cuota honorarios de ${moneda(montoFaltante)} para ${c.inquilino}?`))return;
  const cuotaNum=(hon.pagadas||0)+1;
  const nuevosHon={...hon,pagado:(hon.pagado||0)+montoFaltante,pendiente:0,pagadas:cuotaNum,completo:true};
  await fbUpd("contratos",cid,{honorarios:nuevosHon});
  S.contratos=S.contratos.map(x=>x._id===cid?{...x,honorarios:nuevosHon}:x);
  const cajaData={tipo:"honorario",fecha:hoy(),monto:montoFaltante,concepto:"Honorarios — "+(c.inquilino||"")+(c.direccion?" ("+c.direccion+")":""),detalle:"Generado automáticamente al registrar cuota de honorarios desde ficha de contrato",inquilino:c.inquilino||"",cuotas:hon.cuotas||1,cuotaNum,recuperado:false};
  const cajaId=await fbAdd("caja",cajaData);
  if(cajaId) S_CAJA.movimientos.unshift({...cajaData,_id:cajaId});
  toast("2da cuota honorarios registrada ✓");render();
}


// ── FINALIZAR CONTRATO ──────────────────────────────────────────────────────
async function finalizarContrato(cid){
  const c=S.contratos.find(x=>x._id===cid);if(!c)return;
  if(!confirm(`¿Finalizar contrato de ${c.inquilino} en ${c.direccion||""}?\nEl historial se conserva.`))return;
  const motivo=prompt("Motivo (opcional):");if(motivo===null)return;
  const upd={estado:"finalizado",fechaFinalizacion:hoy(),motivoFinalizacion:motivo||"Finalizado"};
  await fbUpd("contratos",cid,upd);
  S.contratos=S.contratos.map(x=>x._id===cid?{...x,...upd}:x);
  toast("Contrato finalizado ✓");S.modal=null;S.contratoActivo=null;render();
}

// ── EDITAR / ELIMINAR PAGOS ─────────────────────────────────────────────────
async function eliminarPago(pid){
  const p=S.pagos.find(x=>x._id===pid);if(!p)return;
  if(!confirm(`¿Eliminar pago de ${mesNombre(p.mes)} de ${p.inquilino||""}?`))return;
  await fbUpd("pagos",pid,{_eliminado:true});
  S.pagos=S.pagos.filter(x=>x._id!==pid);
  toast("Pago eliminado ✓");render();
}

// ── CAJA ────────────────────────────────────────────────────────────────────
var S_CAJA={tab:"todos",movimientos:[],cargado:false};
let S_CAJA_DETALLE=false;
let S_CAJA_DIF_DETALLE=false;

async function cargarCaja(limit=120){
  if(S_CAJA.cargado)return;
  try{
    // Cargar los últimos `limit` movimientos ordenados por fecha desc
    const snap=await getDocs(collection(db,"caja"));
    S_CAJA.movimientos=snap.docs.map(d=>({...d.data(),_id:d.id})).filter(m=>!m._eliminado).sort((a,b)=>(b.fecha||"").localeCompare(a.fecha||""));
    S_CAJA.total=snap.size;
    S_CAJA.cargado=true;
    S_CAJA.limit=limit;
  }catch(e){
    // Fallback sin query compleja si falla el índice
    try{
      const snap2=await getDocs(collection(db,"caja"));
      S_CAJA.movimientos=snap2.docs.map(d=>({...d.data(),_id:d.id})).filter(m=>!m._eliminado).sort((a,b)=>(b.fecha||"").localeCompare(a.fecha||"")).slice(0,limit);
      S_CAJA.total=snap2.size;
      S_CAJA.cargado=true;
      S_CAJA.limit=limit;
    }catch(e2){toast("Error cargando caja",false);}
  }
}

async function cargarMasCaja(){
  S_CAJA.cargado=false;
  await cargarCaja((S_CAJA.limit||120)+120);
  render();
}

function renderModalCaja(){
  const f=S.form||{};const tipo=f.tipo||"gasto";
  const labels={gasto:"Gasto de agencia",retiro:"Retiro — Matías",adelanto:"Adelanto inquilino",honorario:"Honorario"};
  let extra="";
  if(tipo==="adelanto"||tipo==="honorario")
    extra+=`<div><label class="fl">Inquilino</label><input id="cj-inq" class="inp" style="width:100%" value="${f.inquilino||""}"></div>`;
  if(tipo==="honorario"){
    extra+=`<div><label class="fl">Cuotas</label><select id="cj-cuotas" class="inp" style="width:100%">
      <option value="1"${+(f.cuotas||1)===1?" selected":""}>1 cuota</option>
      <option value="2"${+(f.cuotas||1)===2?" selected":""}>2 cuotas</option>
    </select></div>`;
  }
  return `<div class="overlay"><div class="modal">
    <button class="mclose" onclick="closeModal()">✕</button>
    <div class="mth"><div class="mth-ic">💰</div>${labels[tipo]||tipo}</div>
    <div class="fg">
      <div><label class="fl">Concepto *</label><input id="cj-concepto" class="inp" style="width:100%" value="${f.concepto||""}"></div>
      <div><label class="fl">Monto ($) *</label><input id="cj-monto" class="inp" style="width:100%" type="number" value="${f.monto||""}"></div>
      <div><label class="fl">Fecha</label><input id="cj-fecha" class="inp" style="width:100%" type="date" value="${f.fecha||hoy()}"></div>
      ${extra}
      <div><label class="fl">Detalle</label><input id="cj-detalle" class="inp" style="width:100%" value="${f.detalle||""}"></div>
    </div>
    <div class="fa">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn naranja" onclick="guardarMovCaja()">Guardar</button>
    </div>
  </div></div>`;
}

window.guardarMovCaja=async function(){
  const concepto=(document.getElementById("cj-concepto")||{}).value||"";
  const monto=+((document.getElementById("cj-monto")||{}).value||0);
  const fecha=(document.getElementById("cj-fecha")||{}).value||hoy();
  const detalle=(document.getElementById("cj-detalle")||{}).value||"";
  const inquilino=(document.getElementById("cj-inq")||{}).value||"";
  const cuotas=+((document.getElementById("cj-cuotas")||{}).value||1);
  const f=S.form||{};
  if(!concepto||!monto){toast("Completá concepto y monto",false);return;}
  const data={tipo:f.tipo,fecha,monto,concepto,detalle,recuperado:false};
  if(f.tipo==="adelanto")data.inquilino=inquilino;
  if(f.tipo==="honorario"){data.inquilino=inquilino;data.cuotas=cuotas;}
  const id=await fbAdd("caja",data);
  if(id){S_CAJA.movimientos.unshift({...data,_id:id});S.modal=null;render();toast("Registrado ✓");}
};

// ── PAGO DE SERVICIOS ──────────────────────────────────────────────────────
function renderServicios(){
  if(!S_GPEND_TODOS)cargarTodosGastosPendientes();
  const activos=S.contratos.filter(c=>c.estado==="activo"||!c.estado);
  const grupos={};
  activos.forEach(c=>{
    const gastos=gastosQueCorresponden(c,S_SERVICIOS_MES);
    gastos.forEach(g=>{
      const nombre=g.nombre||g.id;
      if(!grupos[nombre])grupos[nombre]=[];
      grupos[nombre].push({contrato:c,gasto:g});
    });
  });
  const selectorH='<div style="margin-bottom:16px"><label class="fl">Período</label>'
    +'<input class="inp" type="month" value="'+S_SERVICIOS_MES+'" data-action="serviciosMes" style="max-width:200px"></div>';
  const gruposH=Object.keys(grupos).sort().map(function(nombreServicio){
    const filas=grupos[nombreServicio].map(function(item){
      const c=item.contrato;const g=item.gasto;
      const key=c._id+"__"+g.id;
      const valorActual=S_SERVICIOS_VALORES[key]||"";
      return '<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--negro4)">'
        +'<div style="flex:1;font-size:13px">'+(c.inquilino||"")
        +' <span style="color:var(--gris3);font-size:11px">'+(c.direccion||"")+(c.propietarioNombre?" · "+c.propietarioNombre:"")+'</span></div>'
        +'<input class="inp" type="number" placeholder="$" style="width:140px"'
        +' data-action="serviciosMonto" data-key="'+key+'" value="'+valorActual+'">'
        +'</div>';
    }).join("");
    return '<div style="margin-bottom:20px">'
      +'<div style="font-weight:700;color:var(--celeste);margin-bottom:6px;font-size:14px">'+nombreServicio
      +' <span style="color:var(--gris3);font-weight:400;font-size:12px">('+grupos[nombreServicio].length+')</span></div>'
      +filas+'</div>';
  }).join("");
  const vacioH=Object.keys(grupos).length===0
    ?'<div style="color:var(--gris3);padding:20px 0">No hay servicios configurados para este período.</div>':"";
  return selectorH+gruposH+vacioH
    +'<button class="btn naranja" data-action="serviciosGuardarTodos" style="margin-top:10px">💾 Guardar todos</button>';
}
async function serviciosGuardarTodos(){
  const porContrato={};
  Object.entries(S_SERVICIOS_VALORES).forEach(function(entry){
    const key=entry[0];const valor=entry[1];
    const monto=+valor;
    if(!monto||monto<=0)return;
    const sep=key.indexOf("__");
    const cid=key.slice(0,sep);const gastoId=key.slice(sep+2);
    if(!porContrato[cid])porContrato[cid]=[];
    const c=S.contratos.find(function(x){return x._id===cid;});
    if(!c)return;
    const gastoInfo=gastosQueCorresponden(c,S_SERVICIOS_MES).find(function(g){return g.id===gastoId;});
    porContrato[cid].push({tipo:"fijo",desc:(gastoInfo&&gastoInfo.nombre)||gastoId,monto});
  });
  const cids=Object.keys(porContrato);
  if(!cids.length){toast("No hay montos cargados para guardar",false);return;}
  try{
    for(const cid of cids){
      const existentes=(S_GPEND[cid]&&S_GPEND[cid].por_mes&&S_GPEND[cid].por_mes[S_SERVICIOS_MES])||[];
      const nombresNuevos=new Set(porContrato[cid].map(function(it){return it.desc;}));
      const conservados=existentes.filter(function(it){return!(it.tipo==="fijo"&&nombresNuevos.has(it.desc));});
      const itemsFinales=[...conservados,...porContrato[cid]];
      await guardarGastosPendientes(cid,S_SERVICIOS_MES,itemsFinales);
    }
    S_SERVICIOS_VALORES={};
    toast("Servicios guardados ✓ ("+cids.length+" contratos)");
    render();
  }catch(e){toast("Error al guardar: "+e.message,false);}
}

function renderCaja(){
  if(!S_CAJA.cargado){cargarCaja().then(()=>render());return '<div class="loading"><div class="spinner"></div>Cargando caja...</div>';}
  if(!S_SALDO_PROP_TODOS)cargarTodosSaldosProp();
  if(!S_GPEND_TODOS)cargarTodosGastosPendientes();
  const movs=S_CAJA.movimientos;
  const mesHoy=mesActual();
  const comAuto=S.pagos.filter(p=>p.estado==="cobrado"&&p.mes===mesHoy).reduce((s,p)=>s+(p.comision||Math.round((p.alquiler||0)*(p.comisionAgencia??5)/100)),0);
  const comTotal=S.pagos.filter(p=>p.estado==="cobrado").reduce((s,p)=>s+(p.comision||Math.round((p.alquiler||0)*(p.comisionAgencia??5)/100)),0);
  const ingMan=movs.filter(m=>m.tipo==="honorario"||m.tipo==="ingreso").reduce((s,m)=>s+(m.monto||0),0);
  const egresos=movs.filter(m=>m.tipo==="gasto"||m.tipo==="retiro").reduce((s,m)=>s+(m.monto||0),0);
  const adelPend=movs.filter(m=>m.tipo==="adelanto"&&!m.recuperado).reduce((s,m)=>s+(m.monto||0),0);
  const saldo=comTotal+ingMan-egresos-adelPend;
  const comObj=S.contratos.filter(c=>c.estado==="activo"||!c.estado).reduce((s,c)=>s+Math.round((c.alquilerBase||0)*(c.comisionAgencia??5)/100),0);
  const pctCom=comObj>0?Math.round(comAuto/comObj*100):0;
  const tab=S_CAJA.tab||"todos";
  const fil=tab==="todos"?movs:movs.filter(m=>m.tipo===tab);
  const tabs=[{k:"todos",l:"Todos"},{k:"honorario",l:"Honorarios"},{k:"gasto",l:"Gastos"},{k:"retiro",l:"Retiros"},{k:"adelanto",l:"Adelantos"}];
  const tabsH=tabs.map(t=>'<button class="btn sm" data-action="cajaTab" data-tab="'+t.k+'" style="'+(tab===t.k?"background:var(--celeste);color:var(--negro)":"background:var(--negro3);color:var(--gris3)")+'">'+t.l+'</button>').join("");
  const movsH=fil.map(m=>{
    const pos=m.tipo==="honorario"||m.tipo==="ingreso";
    const lbl={gasto:"Gasto",retiro:"Retiro Matías",adelanto:"Adelanto",honorario:"Honorario",ingreso:"Ingreso"}[m.tipo]||m.tipo;
    let ex="";
    if(m.inquilino)ex+=" · "+m.inquilino;
    if(m.tipo==="adelanto")ex+=" "+(m.recuperado?'<span style="color:#5ddb8a;font-size:10px">✓ Recuperado</span>':'<span style="color:var(--naranja);font-size:10px">Pendiente</span>');
    if(m.tipo==="honorario"&&m.cuotas>1)ex+=" · Cuota "+(m.cuotaNum||1)+"/"+m.cuotas;
    const btnElim='<button class="btn sm" data-action="cajaEliminar" data-id="'+m._id+'" style="background:rgba(231,76,60,.15);color:#ff7b6b;padding:3px 7px;font-size:10px">✕</button>';
    const btnRec=(m.tipo==="adelanto"&&!m.recuperado)?'<button class="btn sm" data-action="cajaRecuperar" data-id="'+m._id+'" style="background:rgba(39,174,96,.15);color:#5ddb8a;padding:3px 7px;font-size:10px;margin-right:4px">✓ Recuperado</button>':"";
    return '<div style="display:flex;align-items:center;justify-content:space-between;background:var(--negro2);border:1px solid var(--negro4);border-radius:8px;padding:10px 12px;gap:8px">'
      +'<div style="flex:1"><div style="font-size:12px;font-weight:500">'+lbl+" — "+m.concepto+ex+'</div>'+(m.detalle?'<div style="font-size:10px;color:var(--gris3)">'+m.detalle+'</div>':"")+'</div>'
      +'<div style="font-size:14px;font-weight:700;color:'+(pos?"#5ddb8a":"#ff7b6b")+'">'+(pos?"+":"-")+moneda(m.monto||0)+'</div>'
      +'<div style="font-size:10px;color:var(--gris3);white-space:nowrap">'+(m.fecha||"")+'</div>'
      +btnRec+btnElim+'</div>';
  }).join("");
  const btnMas=(S_CAJA.total||0)>movs.length
    ?'<button class="btn" data-action="cajaMas" style="margin-top:12px;width:100%;background:var(--negro3);color:var(--gris3)">Cargar más ('+((S_CAJA.total||0)-movs.length)+' movimientos más)</button>'
    :"";
  return '<div class="kgrid" style="grid-template-columns:repeat(3,1fr)">'
    +'<div class="kcard" style="border-top-color:var(--celeste)"><div class="klbl">Saldo disponible</div><div class="kval" style="font-size:20px;color:var(--celeste)">'+moneda(saldo)+'</div></div>'
    +'<div class="kcard"><div class="klbl">Comisiones '+mesNombre(mesHoy)+'</div><div class="kval" style="font-size:20px;color:#5ddb8a">'+moneda(comAuto)+'</div><div class="ksub">'+pctCom+'% del objetivo</div></div>'
    +'<div class="kcard"><div class="klbl">Adelantos pendientes</div><div class="kval" style="font-size:20px;color:#ff7b6b">'+moneda(adelPend)+'</div></div>'
    +'</div>'
    +'<button class="btn sm" data-action="cajaToggleDetalle" style="margin-bottom:8px;background:var(--negro3);color:var(--gris3)">'+(S_CAJA_DETALLE?'▲ Ocultar detalle del saldo':'▼ Ver detalle del saldo')+'</button>'
    +(S_CAJA_DETALLE
      ?(()=>{
        const pagosCobrados=S.pagos.filter(p=>p.estado==="cobrado").slice().sort((a,b)=>(a.mes||"").localeCompare(b.mes||""));
        const comisionesListH=pagosCobrados.map(p=>{
          const com=p.comision||Math.round((p.alquiler||0)*(p.comisionAgencia??5)/100);
          return '<div style="display:flex;justify-content:space-between;padding:3px 0 3px 12px;color:#5ddb8a;font-size:12px">'
            +'<span>'+mesNombre(p.mes||"")+' — '+(p.inquilino||"(sin inquilino)")+'</span>'
            +'<span style="font-weight:600">+'+moneda(com)+'</span></div>';
        }).join("");
        const comisionesBlockH='<div style="padding:4px 0;color:#5ddb8a;font-weight:600">Comisiones cobradas (histórico)</div>'
          +(comisionesListH||'<div style="padding:3px 0 3px 12px;color:var(--gris3);font-size:12px">Sin comisiones cobradas</div>')
          +'<div style="display:flex;justify-content:space-between;padding:4px 0 4px 12px;border-top:1px solid var(--negro4);margin-top:4px;color:#5ddb8a;font-size:12px"><span>Subtotal</span><span style="font-weight:600">+'+moneda(comTotal)+'</span></div>';
        return '<div style="background:var(--negro2);border:1px solid var(--negro4);border-radius:8px;padding:14px 16px;margin-bottom:14px;font-size:13px">'
          +comisionesBlockH
          +'<div style="display:flex;justify-content:space-between;padding:4px 0;color:#5ddb8a"><span>Honorarios / ingresos manuales</span><span style="font-weight:600">+'+moneda(ingMan)+'</span></div>'
          +'<div style="display:flex;justify-content:space-between;padding:4px 0;color:#ff7b6b"><span>Gastos y retiros</span><span style="font-weight:600">-'+moneda(egresos)+'</span></div>'
          +'<div style="display:flex;justify-content:space-between;padding:4px 0;color:#ff7b6b"><span>Adelantos pendientes</span><span style="font-weight:600">-'+moneda(adelPend)+'</span></div>'
          +'<div style="display:flex;justify-content:space-between;padding:8px 0 0;margin-top:6px;border-top:1px solid var(--negro4);font-weight:700;color:var(--celeste)"><span>Saldo disponible</span><span>'+moneda(saldo)+'</span></div>'
          +'</div>';
      })()
      :'')
    +'<button class="btn sm" data-action="cajaDifToggle" style="margin-bottom:8px;background:var(--negro3);color:var(--gris3)">'+(S_CAJA_DIF_DETALLE?'▲ Ocultar diferencias de saldo':'▼ 🔄 Diferencias de saldo')+'</button>'
    +(S_CAJA_DIF_DETALLE
      ?(()=>{
        const activos=S.contratos.filter(c=>c.estado==="activo"||!c.estado);
        const difsInq=activos
          .map(c=>{const pend=saldosPendientesFuturos(c);const dif=pend!==0?pend:diferenciaUltimoPago(c);return{inquilino:c.inquilino,direccion:c.direccion,dif};})
          .filter(x=>x.dif!==0);
        const totalDifInq=difsInq.reduce((s,x)=>s+x.dif,0);
        const nombresProp=[...new Set(activos.map(c=>c.propietarioNombre).filter(Boolean))].sort();
        const difsProps=nombresProp
          .map(n=>({nombre:n,monto:(S_SALDO_PROP[n]&&S_SALDO_PROP[n].monto)||0}))
          .filter(x=>x.monto!==0);
        const totalDifProp=difsProps.reduce((s,x)=>s+x.monto,0);
        const neto=totalDifInq+totalDifProp;
        const rowInqH=difsInq.map(x=>
          '<div style="display:flex;justify-content:space-between;padding:3px 0 3px 12px;font-size:12px">'
          +'<span style="color:var(--gris3)">'+(x.inquilino||'—')+' <span style="font-size:10px;color:var(--gris4)">'+x.direccion+'</span></span>'
          +'<span style="font-weight:600;color:'+(x.dif>0?'#5ddb8a':'#ff7b6b')+'">'+(x.dif>0?'+':'')+moneda(x.dif)+'</span></div>'
        ).join('')||'<div style="padding:3px 0 3px 12px;color:var(--gris3);font-size:12px">Sin diferencias pendientes</div>';
        const rowPropH=difsProps.map(x=>
          '<div style="display:flex;justify-content:space-between;padding:3px 0 3px 12px;font-size:12px">'
          +'<span style="color:var(--gris3)">'+x.nombre+'</span>'
          +'<span style="font-weight:600;color:'+(x.monto>0?'#5ddb8a':'#ff7b6b')+'">'+(x.monto>0?'+':'')+moneda(x.monto)+'</span></div>'
        ).join('')||'<div style="padding:3px 0 3px 12px;color:var(--gris3);font-size:12px">Sin saldos pendientes</div>';
        const colorInq=totalDifInq>0?'#5ddb8a':totalDifInq<0?'#ff7b6b':'var(--gris3)';
        const colorProp=totalDifProp>0?'#5ddb8a':totalDifProp<0?'#ff7b6b':'var(--gris3)';
        const colorNeto=neto>0?'#5ddb8a':neto<0?'#ff7b6b':'var(--gris3)';
        return '<div style="background:var(--negro2);border:1px solid var(--negro4);border-radius:8px;padding:14px 16px;margin-bottom:14px;font-size:13px">'
          +'<div style="padding:4px 0;color:var(--celeste);font-weight:600">Diferencias de inquilinos</div>'
          +'<div style="font-size:10px;color:var(--gris3);padding-bottom:6px">+ = pagó de más (plata en caja, se devuelve el mes siguiente) · − = pagó de menos</div>'
          +rowInqH
          +'<div style="display:flex;justify-content:space-between;padding:4px 0 4px 12px;border-top:1px solid var(--negro4);margin-top:4px;font-size:12px"><span>Subtotal inquilinos</span><span style="font-weight:600;color:'+colorInq+'">'+(totalDifInq>=0?'+':'')+moneda(totalDifInq)+'</span></div>'
          +'<div style="padding:4px 0;margin-top:8px;color:var(--celeste);font-weight:600">Saldos de propietarios</div>'
          +'<div style="font-size:10px;color:var(--gris3);padding-bottom:6px">+ = la agencia les debe · − = nos deben</div>'
          +rowPropH
          +'<div style="display:flex;justify-content:space-between;padding:4px 0 4px 12px;border-top:1px solid var(--negro4);margin-top:4px;font-size:12px"><span>Subtotal propietarios</span><span style="font-weight:600;color:'+colorProp+'">'+(totalDifProp>=0?'+':'')+moneda(totalDifProp)+'</span></div>'
          +'<div style="display:flex;justify-content:space-between;padding:8px 0 0;margin-top:6px;border-top:1px solid var(--negro4);font-weight:700;color:'+colorNeto+'"><span>Neto diferencias <span style="font-size:10px;font-weight:400;color:var(--gris3)">· a compensar el mes siguiente</span></span><span>'+(neto>=0?'+':'')+moneda(neto)+'</span></div>'
          +'</div>';
      })()
      :'')
    +'<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">'
    +'<button class="btn sm" data-action="cajaAbrirModal" data-tipo="honorario">+ Honorario</button>'
    +'<button class="btn sm" data-action="cajaAbrirModal" data-tipo="gasto">+ Gasto</button>'
    +'<button class="btn sm naranja" data-action="cajaAbrirModal" data-tipo="retiro">+ Retiro Matías</button>'
    +'<button class="btn sm" data-action="cajaAbrirModal" data-tipo="adelanto" style="background:rgba(245,166,35,.15);color:var(--naranja)">+ Adelanto inquilino</button>'
    +'</div>'
    +'<div style="display:flex;gap:6px;margin-bottom:16px">'+tabsH+'</div>'
    +'<div style="display:flex;flex-direction:column;gap:6px">'+(movsH||'<div class="empty">Sin movimientos</div>')+'</div>'
    +btnMas;
}


async function marcarRecuperado(id){
  await fbUpd("caja",id,{recuperado:true});
  S_CAJA.movimientos=S_CAJA.movimientos.map(m=>m._id===id?{...m,recuperado:true}:m);
  toast("Recuperado ✓");render();
}

async function eliminarMovCaja(id){
  if(!confirm("¿Eliminar este movimiento?"))return;
  try{
    await fbUpd("caja",id,{_eliminado:true});
    S_CAJA.movimientos=S_CAJA.movimientos.filter(m=>m._id!==id);
    toast("Eliminado ✓");
  }catch(e){toast("Error al eliminar: "+e.message,false);}
  render();
}

// ── PUESTA A PUNTO ──────────────────────────────────────────────────────────
function renderSetup(){
  const activos=S.contratos.filter(c=>c.estado==="activo"||!c.estado);
  const q=(S.setupBuscar||"").toLowerCase();
  const lista=q?activos.filter(c=>(c.inquilino||"").toLowerCase().includes(q)||(c.direccion||"").toLowerCase().includes(q)):activos;
  const nC=Object.keys(S.setupCambios).length;
  const iS="width:100%;padding:5px 7px;font-size:11px;border:1px solid var(--negro4);border-radius:5px;background:var(--negro3);color:var(--blanco);font-family:Inter,sans-serif";

  const rows=lista.map(c=>{
    const cam=S.setupCambios[c._id]||{};
    const get=(k,def)=>cam[k]!==undefined?cam[k]:(c[k]!==undefined?c[k]:def);
    const alqV=get("alquilerBase","");
    const ultV=get("ultimaActualizacion","");
    const frV=+(get("frecActualizacion",6));
    const inicioV=get("inicio","");
    const finV=get("fin","");
    const comV=get("comisionAgencia",5);
    const telV=get("telefono","");
    const garanteV=get("garante","");
    const dep=cam.deposito!==undefined?cam.deposito:(c.deposito||{});
    const depTotal=+(dep.total||0);
    const depPagado=+(dep.pagado||0);
    const depComp=dep.completo||depPagado>=depTotal;
    const extras=cam.extras!==undefined?cam.extras:(c.extras||[]);
    const extrasFijos=extras.filter(e=>+(e.monto||0)>0);
    const mod=Object.keys(cam).length>0;

    const inp=(val,key,type)=>'<input type="'+(type||"text")+'" value="'+(val||"")+'" oninput="setupMarcar(\''+c._id+'\',\''+key+'\',this.type===\'number\'?+this.value:this.value,this)" style="'+iS+'">';
    const extrasHtml=extrasFijos.length
      ?extrasFijos.map(e=>'<div style="font-size:10px;display:flex;justify-content:space-between;gap:4px"><span>'+e.desc+'</span><span style="color:var(--celeste)">$'+Math.round(+(e.monto||0)).toLocaleString("es-AR")+'</span></div>').join("")
      :'<span style="color:var(--gris4);font-size:10px">Sin gastos</span>';

    return '<tr style="'+(mod?"background:rgba(245,166,35,.03)":"")+'">'
      // Inquilino + datos contacto
      +'<td><div style="font-weight:500;font-size:12px">'+(c.inquilino||"")+'</div>'
      +'<div style="font-size:10px;color:var(--gris3)">'+(c.direccion||"")+'</div>'
      +'<div style="margin-top:4px"><input placeholder="Teléfono" value="'+(telV||"")+'" oninput="setupMarcar(\''+c._id+'\',\'telefono\',this.value,this)" style="'+iS+';margin-bottom:3px"></div>'
      +'<div><input placeholder="Garante" value="'+(garanteV||"")+'" oninput="setupMarcar(\''+c._id+'\',\'garante\',this.value,this)" style="'+iS+'"></div>'
      +'</td>'
      // Propietario + comisión
      +'<td><div style="font-size:11px;color:var(--gris3);margin-bottom:4px">'+(c.propietarioNombre||"")+'</div>'
      +'<div style="font-size:10px;color:var(--gris4)">Comisión %</div>'
      +'<input type="number" value="'+(comV??5)+'" oninput="setupMarcar(\''+c._id+'\',\'comisionAgencia\',+this.value,this)" style="'+iS+';width:60px">'
      +'</td>'
      // Alquiler
      +'<td><input type="number" value="'+(alqV||"")+'" oninput="setupMarcar(\''+c._id+'\',\'alquilerBase\',+this.value,this)" style="'+iS+'">'
      +(c.alquilerBase?'<div style="font-size:10px;color:var(--gris3);text-decoration:line-through">$'+Math.round(c.alquilerBase).toLocaleString("es-AR")+'</div>':"")
      +'</td>'
      // Vigencia inicio - fin
      +'<td>'
      +'<div style="font-size:10px;color:var(--gris4);margin-bottom:2px">Inicio</div>'
      +'<input type="date" value="'+(inicioV||"")+'" oninput="setupMarcar(\''+c._id+'\',\'inicio\',this.value,this)" style="'+iS+';margin-bottom:4px">'
      +'<div style="font-size:10px;color:var(--gris4);margin-bottom:2px">Vto.</div>'
      +'<input type="date" value="'+(finV||"")+'" oninput="setupMarcar(\''+c._id+'\',\'fin\',this.value,this)" style="'+iS+'">'
      +'</td>'
      // Última actualiz + frecuencia
      +'<td>'
      +'<input type="date" value="'+(ultV||"")+'" oninput="setupMarcar(\''+c._id+'\',\'ultimaActualizacion\',this.value,this)" style="'+iS+';margin-bottom:4px">'
      +(!c.ultimaActualizacion?'<div style="font-size:10px;color:var(--rojo)">Sin fecha</div>':"")
      +'<select onchange="setupMarcar(\''+c._id+'\',\'frecActualizacion\',+this.value,this)" style="'+iS+'">'
      +[3,4,6,12].map(v=>'<option value="'+v+'"'+(frV===v?" selected":"")+'>c/'+v+'m</option>').join("")
      +'</select>'
      +'</td>'
      // Depósito
      +'<td>'
      +'<div style="font-size:10px;color:var(--gris4);margin-bottom:2px">Total dep.</div>'
      +'<input type="number" placeholder="$" value="'+(depTotal||"")+'" oninput="setupMarcarDep(\''+c._id+'\',\'total\',+this.value)" style="'+iS+';margin-bottom:4px">'
      +'<div style="font-size:10px;color:var(--gris4);margin-bottom:2px">Pagado</div>'
      +'<input type="number" placeholder="$" value="'+(depPagado||"")+'" oninput="setupMarcarDep(\''+c._id+'\',\'pagado\',+this.value)" style="'+iS+'">'
      +(depTotal>0?'<div style="font-size:10px;color:'+(depComp?"var(--verde)":"var(--naranja)")+'">'+( depComp?"Completo":"Parcial: debe $"+(depTotal-depPagado).toLocaleString("es-AR"))+'</div>':"")
      +'</td>'
      // Gastos fijos
      +'<td style="min-width:120px">'+extrasHtml
      +'<button class="btn sm" style="font-size:9px;padding:2px 6px;margin-top:2px;width:100%" data-action="setupEditarExtras" data-id="'+c._id+'">Extras simples</button>'+'<button class="btn sm" style="font-size:9px;padding:2px 6px;margin-top:2px;width:100%;background:rgba(75,200,232,.1);color:var(--celeste)" data-action="matrizGastos" data-id="'+c._id+'">Matriz gastos</button>'
      +'</td>'
      // Modificado
      +'<td style="text-align:center">'+(mod?'<span style="color:var(--naranja)">●</span>':"")+'</td>'
      +'</tr>';
  }).join("");

  return '<div class="kgrid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">'
    +'<div class="kcard"><div class="klbl">Contratos activos</div><div class="kval" style="color:var(--celeste)">'+activos.length+'</div></div>'
    +'<div class="kcard"><div class="klbl">Sin fecha actualiz.</div><div class="kval" style="color:var(--rojo)">'+activos.filter(c=>!c.ultimaActualizacion).length+'</div></div>'
    +'<div class="kcard"><div class="klbl">Sin teléfono</div><div class="kval" style="color:var(--naranja)">'+activos.filter(c=>!c.telefono).length+'</div></div>'
    +'<div class="kcard"><div class="klbl">Sin depósito</div><div class="kval" style="color:var(--naranja)">'+activos.filter(c=>!c.deposito||!c.deposito.total).length+'</div></div>'
    +'</div>'
    +'<div class="filters" style="margin-bottom:12px">'
    +'<input class="inp" id="setup-buscar-inp" placeholder="Buscar inquilino o dirección..." value="'+(S.setupBuscar||"")+'" data-action="setupBuscar" style="min-width:280px">'
    +'<span style="font-size:11px;color:var(--gris3)">'+lista.length+' de '+activos.length+'</span>'
    +'</div>'
    +'<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%;min-width:900px">'
    +'<thead><tr><th>Inquilino / Tel / Garante</th><th>Propietario / Com.</th><th>Alquiler</th><th>Vigencia</th><th>Actualiz.</th><th>Depósito</th><th>Gastos fijos</th><th></th></tr></thead>'
    +'<tbody>'+(rows||'<tr><td colspan=8><div class="empty">Sin contratos activos</div></td></tr>')+'</tbody>'
    +'</table></div>'
    +'<div style="margin-top:24px">'+'<div class="stitle">Saldo inicial de propietarios</div>'+'<div style="font-size:11px;color:var(--gris3);margin-bottom:12px">Si hay propietarios con saldo pendiente del sistema anterior, cargalo acá como punto de partida.</div>'+'<div style="display:flex;flex-wrap:wrap;gap:10px">'+([...new Set(activos.map(c=>c.propietarioNombre).filter(Boolean))].sort().map(nombre=>{  const saldoAct=(S_SALDO_PROP[nombre]&&S_SALDO_PROP[nombre].monto)||0;  return '<div style="background:var(--negro3);border:1px solid var(--negro4);border-radius:8px;padding:10px 14px;min-width:220px">'    +'<div style="font-size:12px;font-weight:600;margin-bottom:6px">'+nombre+'</div>'    +'<div style="font-size:10px;color:var(--gris3);margin-bottom:4px">Saldo actual: <strong style="color:'+(saldoAct>0?"#5ddb8a":saldoAct<0?"#ff7b6b":"var(--gris3)")+'">'+moneda(saldoAct)+'</strong></div>'    +'<div style="display:flex;gap:6px;align-items:center">'    +'<input type="number" id="saldo-init-'+nombre+'" class="inp" style="flex:1" placeholder="$0" value="'+(saldoAct||'')+'">'    +'<button class="btn sm naranja" data-action="guardarSaldoInit" data-nombre="'+nombre+'">Guardar</button>'    +'</div></div>';}).join(''))+'</div></div>'+'<div style="position:sticky;bottom:0;background:var(--negro2);border-top:1px solid var(--negro4);padding:14px 0;display:flex;align-items:center;justify-content:space-between;margin-top:16px">'
    +'<span style="font-size:12px;color:var(--gris3)">'+nC+' cambio(s) pendiente(s)</span>'
    +'<div style="display:flex;gap:8px">'
    +'<button class="btn sm" data-action="abrirFeriados" style="background:rgba(245,166,35,.12);color:var(--naranja)">📅 Feriados</button>'
    +'<button class="btn" data-action="setupDescartar" style="background:var(--negro3);color:var(--gris3)">Descartar</button>'
    +'<button class="btn naranja" onclick="setupGuardar()" '+(nC===0?"disabled":"")+'>Guardar todo</button>'
    +'</div></div>';
}

window.setupMarcar=function(id,field,val,el){
  if(!S.setupCambios[id])S.setupCambios[id]={};
  S.setupCambios[id][field]=val;
  if(el)el.style.borderColor="var(--naranja)";
  const n=document.querySelector("[data-setup-n]");
  if(n)n.textContent=Object.keys(S.setupCambios).length;
};

window.setupMarcarDep=function(id,campo,valor){
  const c=S.contratos.find(x=>x._id===id)||{};
  if(!S.setupCambios[id])S.setupCambios[id]={};
  const dep={...(c.deposito||{}),...(S.setupCambios[id].deposito||{})};
  if(campo==="total"){dep.total=+valor;dep.pendiente=Math.max(0,dep.total-(dep.pagado||0));}
  else if(campo==="pagado"){dep.pagado=+valor;dep.completo=(+valor)>=(dep.total||0);dep.pendiente=Math.max(0,(dep.total||0)-(+valor));}
  S.setupCambios[id].deposito=dep;
  // No re-render para no perder foco del input
};

window.setupGuardar=async function(){
  const ids=Object.keys(S.setupCambios);
  if(!ids.length)return;
  if(!confirm("Guardar "+ids.length+" cambio(s) en Firebase?"))return;
  let ok=0;
  for(const id of ids){
    try{
      const data={...S.setupCambios[id],_ts:Date.now()};
      await fbUpd("contratos",id,data);
      S.contratos=S.contratos.map(x=>x._id===id?{...x,...data}:x);
      if(data.telefono){
        const inqExist=S.inquilinos.find(i=>i.nombre===S.contratos.find(x=>x._id===id)?.inquilino);
        if(inqExist&&inqExist._id) fbUpd('inquilinos',inqExist._id,{telefono:data.telefono}).catch(()=>{});
      }
      ok++;
    }catch(e){toast("Error en "+id,false);}
  }
  S.setupCambios={};
  toast(`✅ ${ok} actualizado(s)`);
  render();
};

// ── HISTORIAL DE PROPIEDAD ──────────────────────────────────────────────────
const S_HIST = {};  // cache: { propId: [{_id, fecha, desc, creadoEn}] }
let S_HIST_PROMISE = null;  // carga compartida: evita fetches/pushes concurrentes duplicados

function propId(c){
  // Usamos la dirección como ID de propiedad (normalizada)
  return (c.propiedadId||c.direccion||"").toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");
}

async function cargarHistorialProp(pid){
  if(S_HIST[pid]) return;
  if(!S_HIST_PROMISE){
    S_HIST_PROMISE=(async()=>{
      try{
        const snap = await getDocs(collection(db,"historial_prop"));
        const todos = snap.docs.map(d=>({...d.data(),_id:d.id}));
        // Agrupar por propiedadId en un objeto local: recién al final se
        // vuelca a S_HIST de una sola vez, para que una carga a medio
        // terminar nunca quede pisando/duplicando el cache real.
        const grupos={};
        todos.forEach(e=>{
          const k=e.propiedadId;
          if(!grupos[k]) grupos[k]=[];
          grupos[k].push(e);
        });
        Object.keys(grupos).forEach(k=>{
          grupos[k].sort((a,b)=>(b.fecha||"").localeCompare(a.fecha||""));
        });
        Object.assign(S_HIST, grupos);
      }catch(e){
        // no seteamos nada: la próxima llamada reintenta la carga completa
      }finally{
        S_HIST_PROMISE=null;
      }
    })();
  }
  await S_HIST_PROMISE;
  // Asegurar que el pid buscado quede inicializado aunque no tenga entradas
  if(!S_HIST[pid]) S_HIST[pid]=[];
}

async function agregarHistorialProp(pid){
  const elFecha = document.getElementById("hp-fecha-"+pid);
  const elDesc  = document.getElementById("hp-desc-"+pid);
  if(!elFecha||!elDesc) return;
  const fecha = elFecha.value;
  const desc  = elDesc.value.trim();
  if(!desc){ toast("Escribí una descripción",false); return; }
  const data = {propiedadId:pid, fecha, descripcion:desc, creadoEn:Date.now()};
  const id = await fbAdd("historial_prop", data);
  if(id){
    if(!S_HIST[pid]) S_HIST[pid]=[];
    S_HIST[pid].unshift({...data,_id:id});
    elDesc.value="";
    // Re-render solo la tabla inline sin re-renderizar todo
    renderHistPropInline(pid);
    toast("Registrado ✓");
  }
}

async function eliminarHistorialProp(id, pid){
  if(!confirm("¿Eliminar este registro?")) return;
  try{
    await updateDoc(doc(db,"historial_prop",id),{_eliminado:true});
  }catch(e){}
  if(S_HIST[pid]) S_HIST[pid] = S_HIST[pid].filter(e=>e._id!==id);
  renderHistPropInline(pid);
}

function renderHistPropInline(pid){
  const el = document.getElementById("hp-tabla-"+pid);
  if(!el) return;
  const entradas = (S_HIST[pid]||[]).filter(e=>!e._eliminado);
  if(!entradas.length){
    el.innerHTML=`<p style="font-size:11px;color:var(--gris3);padding:8px 0">Sin registros todavía.</p>`;
    return;
  }
  el.innerHTML=`<div class="tw" style="margin-top:8px"><table>
    <thead><tr><th style="width:110px">Fecha</th><th>Descripción</th><th style="width:40px"></th></tr></thead>
    <tbody>${entradas.map(e=>`<tr>
      <td style="white-space:nowrap;color:var(--gris3);font-size:11px">${e.fecha||"—"}</td>
      <td style="font-size:12px">${e.descripcion||""}</td>
      <td><button class="btn sm" style="background:rgba(231,76,60,.15);color:#ff7b6b;padding:2px 6px"
        data-action="hpropEliminar" data-id="${e._id}" data-pid="${pid}">✕</button></td>
    </tr>`).join("")}
    </tbody>
  </table></div>`;
}

function renderSeccionHistorialProp(c){
  const pid = propId(c);
  if(!pid) return "";
  // Cargar en segundo plano y re-renderizar la tabla inline cuando lleguen los datos
  if(!S_HIST[pid]){
    cargarHistorialProp(pid).then(()=>renderHistPropInline(pid));
  }
  const entradas = (S_HIST[pid]||[]).filter(e=>!e._eliminado);
  const tablaHTML = entradas.length
    ? `<div class="tw" style="margin-top:8px"><table>
        <thead><tr><th style="width:110px">Fecha</th><th>Descripción</th><th style="width:40px"></th></tr></thead>
        <tbody>${entradas.map(e=>`<tr>
          <td style="white-space:nowrap;color:var(--gris3);font-size:11px">${e.fecha||"—"}</td>
          <td style="font-size:12px">${e.descripcion||""}</td>
          <td><button class="btn sm" style="background:rgba(231,76,60,.15);color:#ff7b6b;padding:2px 6px"
            data-action="hpropEliminar" data-id="${e._id}" data-pid="${pid}">✕</button></td>
        </tr>`).join("")}
        </tbody>
      </table></div>`
    : `<p style="font-size:11px;color:var(--gris3);padding:8px 0">Sin registros todavía.</p>`;

  return `
  <div class="fsec" style="margin-top:4px">
    <div class="fsec-t">🏠 Historial de la propiedad <span style="font-weight:400;color:var(--gris3);font-size:10px">— ${c.direccion||""} · persiste entre inquilinos</span></div>
    <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin-bottom:10px">
      <div><label class="fl">Fecha</label>
        <input id="hp-fecha-${pid}" class="inp" type="date" value="${hoy()}" style="width:150px">
      </div>
      <div style="flex:1;min-width:220px"><label class="fl">Descripción del evento</label>
        <input id="hp-desc-${pid}" class="inp" style="width:100%"
          placeholder="Ej: Se cambió canilla cocina, plomero Pérez"
          onkeydown="if(event.key==='Enter')agregarHistorialProp('${pid}')">
      </div>
      <button class="btn naranja" style="padding:8px 14px;height:36px"
        data-action="hpropAgregar" data-pid="${pid}">+ Agregar</button>
    </div>
    <div id="hp-tabla-${pid}">${tablaHTML}</div>
  </div>`;
}

// ── ITEMS DE COBRO (fijos, variables, saldo) ────────────────────────────────

function syncItemsFromDOM(){
  // Sincroniza lo que el usuario escribió en los inputs al S.itemsCobro
  document.querySelectorAll(".item-cobro-row").forEach((row,i)=>{
    const dEl=row.querySelector(".item-desc");
    const mEl=row.querySelector(".item-monto");
    if(!S.itemsCobro[i]) return;
    if(dEl) S.itemsCobro[i].desc=dEl.value;
    if(mEl) S.itemsCobro[i].monto=+(mEl.value||0);
  });
  // También el alquiler
  const alqEl=document.getElementById("cobro-alquiler");
  if(alqEl) S.form.alquiler=+(alqEl.value||0);
}
function addItemCobro(tipo){
  syncItemsFromDOM();
  const defaults={fijo:{desc:"",monto:0},variable:{desc:"",monto:0},saldo:{desc:"Saldo mes anterior",monto:0}};
  S.itemsCobro.push({tipo,desc:defaults[tipo]?.desc||"",monto:defaults[tipo]?.monto||0});
  renderParcial();
}
function removeItemCobro(i){
  syncItemsFromDOM();
  S.itemsCobro.splice(i,1);
  renderParcial();
}
function updItemCobro(i,field,val){
  if(S.itemsCobro[i]) S.itemsCobro[i][field] = field==="monto"?+(val||0):val;
  // Actualizar resumen sin re-render completo
  updateResumen();
}
function updateResumen(){
  const el=document.getElementById("cobro-resumen");
  if(!el||!S.contratoActivo)return;
  syncItemsFromDOM();
  const c=S.contratoActivo;
  const alq=+(S.form.alquiler||0);
  const totalItems=S.itemsCobro.reduce((s,it)=>s+(it.monto||0),0);
  const totalInq=alq+totalItems;
  const com=Math.round(alq*(c.comisionAgencia??5)/100);
  const netoP=alq-com;
  const filas=S.itemsCobro.map(it=>{
    const neg=(it.monto||0)<0;
    const color=neg?"#ff7b6b":it.tipo==="saldo"?"var(--naranja)":"var(--celeste)";
    return '<div class="rrow" style="color:'+color+'"><span>'+(it.desc||it.tipo)+'</span><span>'+(neg?"":"")+moneda(it.monto||0)+'</span></div>';
  }).join("");
  el.innerHTML=
    '<div class="rrow"><span>Alquiler</span><span>'+moneda(alq)+'</span></div>'
    +filas
    +'<div class="rrow" style="font-weight:600;font-size:13px;border-top:1px solid var(--negro4);margin-top:4px;padding-top:8px;color:var(--naranja)"><span>Total inquilino</span><span>'+moneda(totalInq)+'</span></div>'
    +'<div style="height:6px"></div>'
    +'<div class="rrow" style="color:#ff7b6b"><span>Comisión ('+(c.comisionAgencia??5)+'%)</span><span>− '+moneda(com)+'</span></div>'
    +'<div class="rrow" style="color:#5ddb8a;font-weight:600;font-size:13px"><span>Neto propietario</span><span>'+moneda(netoP)+'</span></div>';
}


// ── HISTORIAL DEL INQUILINO ─────────────────────────────────────────────────
const S_HIST_INQ = {};  // cache: { nombreNorm: [{_id, fecha, nota}] }

function inqKey(nombre){
  return (nombre||"").toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");
}

async function cargarHistorialInq(nombre){
  const k=inqKey(nombre);
  if(S_HIST_INQ[k]) return;
  try{
    const snap=await getDocs(collection(db,"historial_inq"));
    snap.docs.forEach(d=>{
      const e={...d.data(),_id:d.id};
      const ek=inqKey(e.inquilino||"");
      if(!S_HIST_INQ[ek])S_HIST_INQ[ek]=[];
      S_HIST_INQ[ek].push(e);
    });
    if(!S_HIST_INQ[k])S_HIST_INQ[k]=[];
    Object.keys(S_HIST_INQ).forEach(kk=>{
      S_HIST_INQ[kk].sort((a,b)=>(b.fecha||"").localeCompare(a.fecha||""));
    });
  }catch(e){ S_HIST_INQ[k]=[]; }
}

async function agregarHistorialInq(nombre){
  const k=inqKey(nombre);
  const elF=document.getElementById("hi-fecha-"+k);
  const elN=document.getElementById("hi-nota-"+k);
  if(!elF||!elN) return;
  const fecha=elF.value;
  const nota=elN.value.trim();
  if(!nota){toast("Escribí una anotación",false);return;}
  const data={inquilino:nombre,fecha,nota,creadoEn:Date.now()};
  const id=await fbAdd("historial_inq",data);
  if(id){
    if(!S_HIST_INQ[k])S_HIST_INQ[k]=[];
    S_HIST_INQ[k].unshift({...data,_id:id});
    elN.value="";
    renderHistInqInline(nombre);
    toast("Anotación guardada ✓");
  }
}

async function eliminarHistorialInq(id, nombre){
  if(!confirm("¿Eliminar esta anotación?")) return;
  try{ await updateDoc(doc(db,"historial_inq",id),{_eliminado:true}); }catch(e){}
  const k=inqKey(nombre);
  if(S_HIST_INQ[k]) S_HIST_INQ[k]=S_HIST_INQ[k].filter(e=>e._id!==id);
  renderHistInqInline(nombre);
}

function renderHistInqInline(nombre){
  const k=inqKey(nombre);
  const el=document.getElementById("hi-tabla-"+k);
  if(!el) return;
  const entradas=(S_HIST_INQ[k]||[]).filter(e=>!e._eliminado);
  if(!entradas.length){
    el.innerHTML=`<p style="font-size:11px;color:var(--gris3);padding:8px 0">Sin anotaciones todavía.</p>`;
    return;
  }
  el.innerHTML=`<div class="tw" style="margin-top:8px"><table>
    <thead><tr><th style="width:110px">Fecha</th><th>Anotación</th><th style="width:40px"></th></tr></thead>
    <tbody>${entradas.map(e=>`<tr>
      <td style="white-space:nowrap;color:var(--gris3);font-size:11px">${e.fecha||"—"}</td>
      <td style="font-size:12px">${e.nota||""}</td>
      <td><button class="btn sm" style="background:rgba(231,76,60,.15);color:#ff7b6b;padding:2px 6px"
        data-action="hinqEliminar" data-id="${e._id}" data-nombre="${nombre.replace(/'/g,'')}">✕</button></td>
    </tr>`).join("")}
    </tbody>
  </table></div>`;
}

function renderSeccionHistorialInq(nombre){
  const k=inqKey(nombre);
  if(!S_HIST_INQ[k]){
    cargarHistorialInq(nombre).then(()=>renderHistInqInline(nombre));
  }
  const entradas=(S_HIST_INQ[k]||[]).filter(e=>!e._eliminado);
  const tablaHTML=entradas.length
    ?`<div class="tw" style="margin-top:8px"><table>
        <thead><tr><th style="width:110px">Fecha</th><th>Anotación</th><th style="width:40px"></th></tr></thead>
        <tbody>${entradas.map(e=>`<tr>
          <td style="white-space:nowrap;color:var(--gris3);font-size:11px">${e.fecha||"—"}</td>
          <td style="font-size:12px">${e.nota||""}</td>
          <td><button class="btn sm" style="background:rgba(231,76,60,.15);color:#ff7b6b;padding:2px 6px"
            data-action="hinqEliminar" data-id="${e._id}" data-nombre="${nombre.replace(/'/g,'')}">✕</button></td>
        </tr>`).join("")}
        </tbody>
      </table></div>`
    :`<p style="font-size:11px;color:var(--gris3);padding:8px 0">Sin anotaciones todavía.</p>`;

  return `<div class="fsec" style="margin-top:4px">
    <div class="fsec-t">📋 Historial del inquilino
      <span style="font-weight:400;color:var(--gris3);font-size:10px">— llamados, acuerdos, observaciones</span>
    </div>
    <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin-bottom:10px">
      <div><label class="fl">Fecha</label>
        <input id="hi-fecha-${k}" class="inp" type="date" value="${hoy()}" style="width:150px">
      </div>
      <div style="flex:1;min-width:220px"><label class="fl">Anotación</label>
        <input id="hi-nota-${k}" class="inp" style="width:100%"
          placeholder="Ej: Llamó para avisar desperfecto en baño, acordamos..."
          data-action="hinqEnter" data-nombre="${nombre}">
      </div>
      <button class="btn naranja" style="padding:8px 14px;height:36px"
        data-action="hinqAgregar" data-nombre="${nombre}">+ Agregar</button>
    </div>
    <div id="hi-tabla-${k}">${tablaHTML}</div>
  </div>`;
}

function renderDeudores(){
  const hoyD=new Date();
  const activos=S.contratos.filter(c=>c.estado==="activo"||!c.estado);
  // Fecha de corte: solo evaluar deudas desde esta fecha en adelante
  const _corteParts=(S.fechaCorte||"2026-07").split('-').map(Number);
  const corte=new Date(_corteParts[0],_corteParts[1]-1,1);
  const corteStr=(S.fechaCorte||"2026-07")+"-01";
  const corteMes=S.fechaCorte||"2026-07"; // "2026-07"

  const deudores=activos.map(c=>{
    const pagosC=S.pagos.filter(p=>p.contratoId===c._id&&!p._eliminado);
    const mesesSinPago=[];
    // Generar meses desde el corte (o inicio del contrato si es posterior) hasta hoy
    const _ip=c.inicio&&c.inicio>corteStr?c.inicio.split('-').map(Number):null;
    const inicioEval=_ip?new Date(_ip[0],_ip[1]-1,1):new Date(corte);
    let cur=new Date(inicioEval);
    const limite=new Date(hoyD.getFullYear(),hoyD.getMonth(),1);
    while(cur<=limite){
      const m=cur.getFullYear()+"-"+String(cur.getMonth()+1).padStart(2,"0");
      const tienePago=pagosC.some(p=>p.mes===m&&(p.estado==="cobrado"||p.estado==="pagado"));
      if(!tienePago){
        const diasAtraso=Math.round((hoyD-cur)/86400000);
        if(diasAtraso>5) mesesSinPago.push({mes:m,diasAtraso});
      }
      cur=new Date(cur.getFullYear(),cur.getMonth()+1,1);
    }
    const totalPendiente=pagosC.filter(p=>p.estado==="pendiente"||p.estado==="vencido").reduce((s,p)=>s+(p.totalInquilino||p.total||p.monto||0),0);
    const deudaEstimada=mesesSinPago.length*(c.alquilerBase||0);
    return {c,mesesSinPago,totalPendiente,deudaEstimada,mesesAtraso:mesesSinPago.length};
  }).filter(d=>d.mesesAtraso>0||d.totalPendiente>0)
    .sort((a,b)=>b.mesesAtraso-a.mesesAtraso||b.deudaEstimada-a.deudaEstimada);

  const totalDeuda=deudores.reduce((s,d)=>s+d.deudaEstimada,0);

  // Selector de fecha de corte
  const corteSel='<div style="display:flex;align-items:center;gap:10px;background:var(--negro3);border:1px solid var(--negro4);border-radius:8px;padding:10px 14px;margin-bottom:16px">'
    +'<span style="font-size:13px">📅</span>'
    +'<div style="flex:1"><div style="font-size:12px;font-weight:600">Evaluar deudas desde</div>'
    +'<div style="font-size:11px;color:var(--gris3)">Meses anteriores se consideran saldados</div></div>'
    +'<input type="month" class="inp" id="fecha-corte-input" value="'+corteMes+'" style="width:160px" data-action="setFechaCorte">'
    +'</div>';

  if(!deudores.length){
    return corteSel+'<div class="empty" style="padding:60px 0;font-size:16px">✅ Sin deudores desde '+mesNombre(corteMes)+'</div>';
  }

  const rows=deudores.map(d=>{
    const c=d.c;
    const color=d.mesesAtraso>=3?"var(--rojo)":d.mesesAtraso>=2?"var(--naranja)":"var(--amarillo)";
    const mesesStr=d.mesesSinPago.slice(0,3).map(m=>mesNombre(m.mes)).join(", ")+(d.mesesSinPago.length>3?" y "+(d.mesesSinPago.length-3)+" más":"");
    return '<tr>'
      +'<td class="tdm">'+c.inquilino+'<br><span class="tds">'+(c.telefono?telLink(c.telefono):"Sin tel.")+'</span></td>'
      +'<td>'+c.direccion+'<br><span class="tds">Prop: '+c.propietarioNombre+'</span></td>'
      +'<td style="font-weight:700;color:'+color+';font-size:16px">'+d.mesesAtraso+' mes'+(d.mesesAtraso!==1?"es":"")+'</td>'
      +'<td style="font-size:11px;color:var(--gris3)">'+mesesStr+'</td>'
      +'<td style="font-weight:600;color:'+color+'">'+moneda(d.deudaEstimada)+'</td>'
      +'<td><button class="btn sm primary" data-action="abrirContrato" data-id="'+c._id+'">Ver contrato</button></td>'
      +'</tr>';
  }).join("");

  return corteSel
    +'<div class="kgrid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">'
    +'<div class="kcard" style="border-top-color:var(--rojo)"><div class="klbl">Contratos con atraso</div><div class="kval" style="color:var(--rojo)">'+deudores.length+'</div><div class="ksub">desde '+mesNombre(corteMes)+'</div></div>'
    +'<div class="kcard" style="border-top-color:var(--naranja)"><div class="klbl">Deuda estimada</div><div class="kval" style="font-size:17px;color:var(--naranja)">'+moneda(totalDeuda)+'</div></div>'
    +'<div class="kcard" style="border-top-color:var(--amarillo)"><div class="klbl">Peor caso</div><div class="kval">'+deudores[0].mesesAtraso+' mes'+(deudores[0].mesesAtraso!==1?"es":"")+'</div><div class="ksub">'+deudores[0].c.inquilino+'</div></div>'
    +'</div>'
    +'<div class="tw"><table><thead><tr><th>Inquilino</th><th>Propiedad</th><th>Meses atraso</th><th>Períodos</th><th>Deuda estimada</th><th></th></tr></thead>'
    +'<tbody>'+rows+'</tbody></table></div>';
}

// ── PUNTUALIDAD DE PAGO ──────────────────────────────────────────────────────
let S_PUNT_PLAZO=10; // día límite de pago, configurable desde la UI

function diasRespectoVencimiento(p,plazo){
  // p.mes: "YYYY-MM" (período que se está pagando)
  // p.fechaCobro: "YYYY-MM-DD" (fecha real en que se cobró)
  const[anio,mesNum]=p.mes.split("-").map(Number);
  const vencimiento=new Date(anio,mesNum-1,plazo); // ej. 2026-07-10
  const cobro=new Date(p.fechaCobro+"T00:00:00");
  const diffMs=cobro-vencimiento;
  return Math.round(diffMs/86400000); // negativo = anticipado, positivo = tarde
}

function fmtDiasVenc(d){ return (d>0?"+":"")+d; }

function renderPuntualidad(){
  const plazo=S_PUNT_PLAZO;
  const pagos=S.pagos.filter(p=>p.estado==="cobrado"&&p.fechaCobro&&!p._eliminado);
  const grupos={};
  pagos.forEach(p=>{
    if(!p.mes||!/^\d{4}-\d{2}$/.test(p.mes)) return; // sin período válido: excluir del cálculo, no romper
    const key=p.contratoId||("sin_contrato__"+(p.inquilino||""));
    if(!grupos[key]) grupos[key]={inquilino:p.inquilino||"(sin nombre)",direccion:p.direccion||"",dias:[]};
    const d=diasRespectoVencimiento(p,plazo);
    if(!isNaN(d)) grupos[key].dias.push(d);
  });
  const filas=Object.values(grupos).filter(g=>g.dias.length>0).map(g=>{
    const total=g.dias.length;
    const suma=g.dias.reduce((a,b)=>a+b,0);
    const diasProm=Math.round((suma/total)*10)/10;
    const tardios=g.dias.filter(d=>d>0).length;
    return{...g,totalPagos:total,diasPromedio:diasProm,pagosTardios:tardios};
  });
  filas.sort((a,b)=>b.pagosTardios!==a.pagosTardios?b.pagosTardios-a.pagosTardios:b.diasPromedio-a.diasPromedio);

  const totalContratos=filas.length;
  const totalPagos=pagos.length;
  const totalTardios=filas.reduce((s,f)=>s+f.pagosTardios,0);
  const pctCumplimiento=totalContratos?Math.round(((totalContratos-filas.filter(f=>f.pagosTardios>0).length)/totalContratos)*100):100;

  const plazoSel='<div style="display:flex;align-items:center;gap:10px;background:var(--negro3);border:1px solid var(--negro4);border-radius:8px;padding:10px 14px;margin-bottom:16px">'
    +'<span style="font-size:13px">⏱</span>'
    +'<div style="flex:1"><div style="font-size:12px;font-weight:600">Plazo límite de pago</div>'
    +'<div style="font-size:11px;color:var(--gris3)">Día del mes a partir del cual un pago se considera tardío</div></div>'
    +'<input type="number" min="1" max="28" class="inp" id="punt-plazo-input" value="'+plazo+'" style="width:80px" data-action="puntPlazo">'
    +'</div>';

  if(!totalContratos){
    return plazoSel+'<div class="empty" style="padding:60px 0;font-size:16px">Sin pagos cobrados registrados todavía</div>';
  }

  // Histograma: días respecto al vencimiento, de -15 a +15, con overflow a los extremos
  const RANGO_HIST=15;
  const N_HIST=RANGO_HIST*2+1; // 0=underflow (<=-15), 1..29 = -14..14, 30=overflow (>=+15)
  const counts=new Array(N_HIST).fill(0);
  filas.forEach(f=>{
    f.dias.forEach(d=>{
      if(d<=-RANGO_HIST) counts[0]++;
      else if(d>=RANGO_HIST) counts[N_HIST-1]++;
      else counts[d+RANGO_HIST]++;
    });
  });
  const maxCount=Math.max(1,...counts);
  const histH=counts.map((count,i)=>{
    const pct=Math.round((count/maxCount)*100);
    const isUnder=i===0,isOver=i===N_HIST-1;
    const dVal=isUnder||isOver?null:i-RANGO_HIST;
    const esTarde=isOver||(dVal!==null&&dVal>0);
    const color=esTarde?"var(--rojo)":"var(--celeste)";
    const label=isUnder?"≤-"+RANGO_HIST:isOver?"≥+"+RANGO_HIST:fmtDiasVenc(dVal);
    return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">'
      +'<div style="width:34px;font-size:10px;color:var(--gris3);text-align:right">'+label+'</div>'
      +'<div style="flex:1;background:var(--negro3);border-radius:3px;height:14px;position:relative">'
        +'<div style="width:'+Math.max(pct,count>0?3:0)+'%;background:'+color+';height:100%;border-radius:3px"></div>'
      +'</div>'
      +'<div style="width:24px;font-size:10px;color:var(--gris3)">'+count+'</div>'
      +'</div>';
  }).join("");

  const dentroDePlazo=filas.filter(f=>f.diasPromedio<=0).sort((a,b)=>a.diasPromedio-b.diasPromedio);
  const excedidos=filas.filter(f=>f.diasPromedio>0).sort((a,b)=>b.pagosTardios!==a.pagosTardios?b.pagosTardios-a.pagosTardios:b.diasPromedio-a.diasPromedio);

  const tablaDentroH=dentroDePlazo.length
    ? '<div class="tw"><table><thead><tr><th>Inquilino</th><th>Dirección</th><th>Pagos</th><th>Días vs. vencimiento</th></tr></thead><tbody>'
      +dentroDePlazo.map(f=>{
          const cerca=f.diasPromedio>=-1;
          const style=cerca?' style="color:var(--naranja)"':'';
          return '<tr'+style+'><td class="tdm">'+f.inquilino+'</td><td style="color:var(--gris3);font-size:11px">'+f.direccion+'</td><td>'+f.totalPagos+'</td><td>'+fmtDiasVenc(f.diasPromedio)+'</td></tr>';
        }).join("")
      +'</tbody></table></div>'
    : '<p style="color:var(--gris3);padding:12px 0">Sin datos dentro de plazo.</p>';

  const tablaExcedidosH=excedidos.length
    ? '<div class="tw"><table><thead><tr><th>Inquilino</th><th>Dirección</th><th>Pagos</th><th>Días vs. vencimiento</th><th>Tardíos</th></tr></thead><tbody>'
      +excedidos.map(f=>'<tr><td class="tdm">'+f.inquilino+'</td><td style="color:var(--gris3);font-size:11px">'+f.direccion+'</td><td>'+f.totalPagos+'</td><td>'+fmtDiasVenc(f.diasPromedio)+'</td><td style="color:var(--rojo);font-weight:600">'+f.pagosTardios+'</td></tr>').join("")
      +'</tbody></table></div>'
    : '<p style="color:var(--gris3);padding:12px 0">Nadie excede el plazo 🎉</p>';

  return plazoSel
    +'<div class="kgrid">'
      +'<div class="kcard" style="border-top-color:var(--celeste)"><div class="klbl">Contratos analizados</div><div class="kval">'+totalContratos+'</div></div>'
      +'<div class="kcard" style="border-top-color:var(--gris4)"><div class="klbl">Pagos considerados</div><div class="kval">'+totalPagos+'</div></div>'
      +'<div class="kcard" style="border-top-color:var(--rojo)"><div class="klbl">Pagos tardíos</div><div class="kval" style="color:var(--rojo)">'+totalTardios+'</div></div>'
      +'<div class="kcard" style="border-top-color:var(--verde)"><div class="klbl">Cumplimiento</div><div class="kval">'+pctCumplimiento+'%</div></div>'
    +'</div>'
    +'<div style="font-weight:600;margin-bottom:8px">Distribución de días respecto al vencimiento</div>'
    +histH
    +'<div style="font-weight:600;margin:20px 0 8px">Ranking — dentro del plazo (ordenado por días respecto al vencimiento)</div>'
    +tablaDentroH
    +'<div style="font-weight:600;margin:20px 0 8px">Exceden el plazo (pagados después del vencimiento)</div>'
    +tablaExcedidosH;
}


function abrirGrillaGastos(cid){
  S.modalExtra="grilla_gastos";
  S.grillaContrato=cid;
  render();
}

function renderModalGrillaGastos(){
  const c=S.contratos.find(function(x){return x._id===S.grillaContrato;});
  if(!c) return "";
  const extras=(c.extras||[]).filter(function(e){return e.desc&&+(e.monto||0)>0;});
  if(!extras.length){
    return '<div class="overlay"><div class="modal" style="max-width:480px">'
      +'<button class="mclose" data-action="cerrarGrilla">x</button>'
      +'<div class="mth"><div class="mth-ic">📊</div>Seguimiento de gastos — '+(c.inquilino||"")+'</div>'
      +'<div style="padding:20px 0;text-align:center">'
      +'<div style="font-size:32px;margin-bottom:12px">📋</div>'
      +'<div style="color:var(--gris3);margin-bottom:16px">Este contrato no tiene gastos fijos configurados.</div>'
      +'<button class="btn naranja" data-action="irSetup">Ir a Puesta a punto →</button>'
      +'</div><div class="fa"><button class="btn" data-action="cerrarGrilla">Cerrar</button></div>'
      +'</div></div>';
  }
  const pagosC=S.pagos.filter(function(p){return p.contratoId===c._id&&!p._eliminado&&p.estado==="cobrado";}).sort(function(a,b){return(a.mes||"").localeCompare(b.mes||"");});
  const mesActualS=mesActual();
  // Generar rango de meses: desde 6 meses atrás hasta 2 meses adelante
  const _baseParts=mesActualS.split('-').map(Number);
  const meses=[];
  for(let i=-8;i<=2;i++){
    const d=new Date(_baseParts[0],_baseParts[1]-1+i,1);
    meses.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));
  }
  function norm(s){return(s||"").toLowerCase().replace(/[^a-z0-9]/g,"");}
  function fueCobrado(mes,itemDesc){
    const pago=pagosC.find(function(p){return p.mes===mes;});
    if(!pago) return false;
    const items=pago.itemsCobro||(pago.extras||[]).map(function(e){return{desc:e.desc,monto:e.monto};});
    const nd=norm(itemDesc);
    return items.some(function(it){const ni=norm(it.desc||"");return ni.includes(nd)||nd.includes(ni)||ni===nd;});
  }
  const filas=meses.map(function(mes){
    const tienePago=pagosC.some(function(p){return p.mes===mes;});
    const esFuturo=mes>mesActualS;
    const celdas=extras.map(function(e){
      const corresponde=gastoCorrespondeEnMes(e,mes);
      const cobrado=fueCobrado(mes,e.desc);
      let celda;
      if(!corresponde){
        celda='<td style="text-align:center;padding:7px 4px"><span title="No corresponde este mes" style="color:var(--gris4);font-size:12px">·</span></td>';
      } else if(cobrado){
        celda='<td style="text-align:center;padding:7px 4px;background:rgba(39,174,96,.08)"><span title="Cobrado" style="font-size:15px">✅</span></td>';
      } else if(esFuturo){
        celda='<td style="text-align:center;padding:7px 4px;background:rgba(75,200,232,.05)"><span title="Corresponde cobrar" style="font-size:13px;color:var(--celeste)">📋</span></td>';
      } else if(tienePago){
        celda='<td style="text-align:center;padding:7px 4px;background:rgba(231,76,60,.05)"><span title="Correspondia y no se cobro" style="font-size:13px;color:var(--rojo)">⬜</span></td>';
      } else {
        celda='<td style="text-align:center;padding:7px 4px"><span style="color:var(--gris4);font-size:13px">—</span></td>';
      }
      return celda;
    }).join("");
    const mesLabel=mesNombre(mes).substring(0,3)+" "+mes.substring(2,4);
    const esActual=mes===mesActualS;
    return '<tr style="'+(esActual?"background:rgba(75,200,232,.05)":"")+'"><td style="white-space:nowrap;font-size:11px;color:var(--gris3);padding:6px 10px;font-weight:'+(esActual?"600":"400")+'">'+mesLabel+(esActual?" ←":"")+'</td>'+celdas+'</tr>';
  }).join("");
  const thItems=extras.map(function(e){
    return '<th style="text-align:center;padding:6px 4px;font-size:10px;white-space:nowrap;position:sticky;top:0;background:var(--negro2);min-width:65px" title="'+e.desc+' — '+labelFrecuencia(e.frecuencia)+'">'+e.desc+'<div style="font-size:8px;color:var(--gris4);font-weight:400">'+labelFrecuencia(e.frecuencia)+'</div></th>';
  }).join("");
  return '<div class="overlay"><div class="modal" style="max-width:min(720px,95vw);max-height:85vh;overflow:hidden;display:flex;flex-direction:column">'
    +'<button class="mclose" data-action="cerrarGrilla">x</button>'
    +'<div class="mth"><div class="mth-ic">📊</div>Seguimiento de gastos — '+c.inquilino+'<span style="font-size:11px;font-weight:400;color:var(--gris3);margin-left:8px">'+c.direccion+'</span></div>'
    +'<div style="overflow:auto;flex:1;padding:0 4px">'
    +'<table style="border-collapse:collapse;width:100%;font-family:Inter,sans-serif">'
    +'<thead><tr><th style="text-align:left;padding:6px 10px;font-size:11px;color:var(--gris3);white-space:nowrap;position:sticky;top:0;background:var(--negro2)">Mes</th>'+thItems+'</tr></thead>'
    +'<tbody>'+filas+'</tbody>'
    +'</table></div>'
    +'<div style="padding:10px 16px;border-top:1px solid var(--negro4);display:flex;gap:10px;font-size:10px;color:var(--gris3);align-items:center;flex-wrap:wrap">'
    +'<span>✅ Cobrado</span><span>📋 Corresponde (futuro)</span><span>⬜ Correspondia y no se cobro</span><span>· No corresponde este mes</span>'
    +'<div style="flex:1"></div>'
    +'<button class="btn" data-action="cerrarGrilla" style="padding:6px 16px">Cerrar</button>'
    +'</div></div></div>';
}

function abrirRenovacion(cid){
  const c=S.contratos.find(x=>x._id===cid);
  if(!c)return;
  // Pre-cargar con datos actuales
  S.modal="renovar_contrato";
  S.contratoRenovar=cid;
  S.form={
    inicio:hoy(),
    fin:"",
    alquilerBase:c.alquilerBase||0,
    comisionAgencia:c.comisionAgencia??5,
    frecActualizacion:c.frecActualizacion||6,
    indiceActualizacion:c.indiceActualizacion||"IPC",
    depCuotas:1,
    honMonto:"medio",
    honCuotas:1,
    notasActualizacion:c.notasActualizacion||""
  };
  render();
}

function renderModalRenovar(){
  const cid=S.contratoRenovar;
  const c=S.contratos.find(x=>x._id===cid);
  if(!c)return"";
  const f=S.form;
  const inp=(k,type)=>`<input class="inp" style="width:100%" type="${type||"text"}" data-action="setForm" data-key="${k}" value="${f[k]||""}">`;
  const teniaDepositoAntes=((c.deposito&&c.deposito.total)||0)>0;
  return `<div class="overlay"><div class="modal" style="max-width:560px">
    <button class="mclose" data-action="closeModal">✕</button>
    <div class="mth"><div class="mth-ic">🔄</div>Renovar contrato — ${c.inquilino||""}</div>
    <div style="background:rgba(75,200,232,.06);border:1px solid rgba(75,200,232,.2);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:var(--gris3)">
      📋 Propiedad: <strong style="color:var(--blanco)">${c.direccion||""}</strong> · 
      Propietario: <strong style="color:var(--blanco)">${c.propietarioNombre||""}</strong><br>
      Contrato anterior: ${c.inicio||""} → ${c.fin||"S/F"} · Alquiler anterior: <strong style="color:var(--celeste)">${moneda(c.alquilerBase)}</strong>${teniaDepositoAntes?"":' · <span style="color:var(--gris4)">Sin depósito de garantía</span>'}
    </div>
    <div class="fg">
      <div><label class="fl">Nueva fecha inicio *</label>${inp("inicio","date")}</div>
      <div><label class="fl">Nueva fecha fin</label>${inp("fin","date")}</div>
      <div><label class="fl">Nuevo alquiler ($) *</label>${inp("alquilerBase","number")}</div>
      <div><label class="fl">Comisión agencia (%)</label>${inp("comisionAgencia","number")}</div>
      <div><label class="fl">Frecuencia actualización</label>
        <select class="inp" style="width:100%" data-action="setForm" data-key="frecActualizacion">
          ${[3,4,6,12].map(v=>`<option value="${v}"${+(f.frecActualizacion||6)===v?" selected":""}>Cada ${v} meses</option>`).join("")}
        </select>
      </div>
      <div><label class="fl">Índice</label>
        <select class="inp" style="width:100%" data-action="setForm" data-key="indiceActualizacion">
          ${["IPC","ICL","CVS","Acuerdo"].map(v=>`<option value="${v}"${(f.indiceActualizacion||"IPC")===v?" selected":""}>  ${v}</option>`).join("")}
        </select>
      </div>
      <div><label class="fl">¿Lleva depósito de garantía? *</label>
        <select class="inp" style="width:100%;${f.tieneDepositoRenov?'':'border-color:var(--naranja)'}" data-action="setForm" data-key="tieneDepositoRenov">
          <option value=""${!f.tieneDepositoRenov?" selected":""}>-- Elegir --</option>
          <option value="si"${f.tieneDepositoRenov==="si"?" selected":""}>Sí</option>
          <option value="no"${f.tieneDepositoRenov==="no"?" selected":""}>No</option>
        </select>
        ${!f.tieneDepositoRenov?'<div style="font-size:10px;color:var(--naranja);margin-top:3px">Obligatorio para confirmar la renovación</div>':''}
      </div>
      ${f.tieneDepositoRenov==="si"?`
      <div><label class="fl">Depósito — cuotas para financiar la diferencia</label>
        <select class="inp" style="width:100%" data-action="setForm" data-key="depCuotas">
          <option value="1"${+(f.depCuotas||1)===1?" selected":""}>1 cuota (completo al ingreso)</option>
          <option value="2"${+(f.depCuotas||1)===2?" selected":""}>2 cuotas</option>
          <option value="3"${+(f.depCuotas||1)===3?" selected":""}>3 cuotas</option>
        </select>
      </div>`:''}
      <div><label class="fl">Honorarios</label>
        <select class="inp" style="width:100%" data-action="setForm" data-key="honMonto">
          <option value="medio"${(f.honMonto||"medio")==="medio"?" selected":""}>Medio mes</option>
          <option value="mes"${f.honMonto==="mes"?" selected":""}>Un mes completo</option>
        </select>
      </div>
      <div style="grid-column:1/-1"><label class="fl">Notas</label>
        <textarea class="inp" style="width:100%;height:50px;resize:vertical" data-action="setForm" data-key="notasActualizacion">${f.notasActualizacion||""}</textarea>
      </div>
    </div>
    <div class="fa">
      <button class="btn" data-action="closeModal">Cancelar</button>
      <button class="btn naranja" data-action="confirmarRenovacion">🔄 Confirmar renovación</button>
    </div>
  </div></div>`;
}

// ── DEPÓSITO: modelo unificado de cuotas (1, 2 o 3) ─────────────────────────
// Usado tanto al dar de alta un contrato como al actualizar por IPC.
// total: monto objetivo vigente del depósito en este momento.
// cuotasTotales: en cuántas cuotas se decidió cubrir ESTE monto (1, 2 o 3).
// cuotasPagadas: cuántas de esas cuotas ya se cobraron (arranca en 1, la primera se paga en el acto).
// montoCuota: total/cuotasTotales redondeado.
// pagadoAcumulado: lo que ya entró de este total.
// pendiente: total - pagadoAcumulado.
function calcularDeposito(total, cuotasTotales){
  const n=Math.max(1,Math.min(3,+(cuotasTotales||1)));
  const montoCuota=Math.round(total/n);
  // 1 cuota: pago único al firmar, no pasa por cobros mensuales.
  // 2+ cuotas: cada cuota se registra a través del flujo mensual (arranca en 0).
  const cuotasPagadas=n===1?1:0;
  const pagadoAcumulado=n===1?total:0;
  const pendiente=Math.max(0,total-pagadoAcumulado);
  return{
    total,
    cuotasTotales:n,
    cuotasPagadas,
    montoCuota,
    pagadoAcumulado,
    pendiente,
    completo:pendiente===0,
    // compatibilidad hacia atrás con vistas/reportes que leían estos nombres viejos
    cuotas:n,
    pagadas:cuotasPagadas,
    pagado:pagadoAcumulado
  };
}

// Registra el cobro de la PRÓXIMA cuota pendiente del depósito (la que sigue, no necesariamente la última).
// Funciona igual sin importar si el origen fue un alta/renovación (cuotas sobre el total)
// o una actualización IPC (cuotas sobre la diferencia): en ambos casos "pendiente" ya
// representa lo que falta cobrar, y montoCuota siempre viene calculado desde el origen.
function registrarCuotaDeposito(dep){
  const n=dep.cuotasTotales||dep.cuotas||1;
  const yaPagadas=dep.cuotasPagadas!==undefined?dep.cuotasPagadas:(dep.pagadas||0);
  if(yaPagadas>=n||(dep.pendiente||0)<=0) return dep; // ya está completo, no hay nada para cobrar
  const nuevasPagadas=yaPagadas+1;
  const restantes=n-yaPagadas;
  const montoCuota=dep.montoCuota||Math.round((dep.pendiente||0)/restantes);
  const pendiente=nuevasPagadas>=n
    ? 0 // la última cuota cierra siempre en cero, evita centavos sueltos por redondeo
    : Math.max(0,(dep.pendiente||0)-montoCuota);
  const nuevoPagado=(dep.total||0)-pendiente;
  return{
    ...dep,
    cuotasTotales:n,cuotas:n,
    cuotasPagadas:nuevasPagadas,pagadas:nuevasPagadas,
    montoCuota,
    pagadoAcumulado:nuevoPagado,pagado:nuevoPagado,
    pendiente,
    completo:pendiente===0
  };
}

// Actualización por IPC: el monto a financiar es solo la DIFERENCIA entre el depósito viejo
// (ya cancelado, por regla de negocio) y el nuevo total objetivo. A diferencia del alta,
// acá ninguna cuota se considera pagada todavía: la primera recién se cobra en el próximo cobro mensual.
function calcularDepositoActualizacionIPC(totalNuevo, difPendiente, cuotasTotales){
  const n=Math.max(1,Math.min(3,+(cuotasTotales||1)));
  const montoCuota=Math.round(difPendiente/n);
  return{
    total:totalNuevo,
    cuotasTotales:n,
    cuotasPagadas:0,
    montoCuota,
    pagadoAcumulado:totalNuevo-difPendiente,
    pendiente:difPendiente,
    completo:false,
    cuotas:n,
    pagadas:0,
    pagado:totalNuevo-difPendiente
  };
}

async function confirmarRenovacion(){
  const cid=S.contratoRenovar;
  const c=S.contratos.find(x=>x._id===cid);
  if(!c)return;
  const f=S.form;
  if(!f.inicio||!f.alquilerBase){toast("Completá fecha inicio y alquiler",false);return;}
  if(f.tieneDepositoRenov!=="si"&&f.tieneDepositoRenov!=="no"){toast("Elegí si el contrato renovado lleva depósito de garantía o no",false);return;}

  const alqBase=+(f.alquilerBase||0);
  const honMonto=f.honMonto||"medio";
  const honCuotas=+(f.honCuotas||1);
  const honTotal=honMonto==="mes"?alqBase:Math.round(alqBase/2);
  let deposito;
  if(f.tieneDepositoRenov==="no"){
    // El propietario decidió no pedir depósito en esta renovación, sin importar
    // si el contrato anterior tenía uno o no.
    deposito={total:0,cuotasTotales:1,cuotasPagadas:1,montoCuota:0,pagadoAcumulado:0,pendiente:0,completo:true,cuotas:1,pagadas:1,pagado:0};
  } else {
    const depCuotas=+(f.depCuotas||1);
    // depViejoTotal es lo que el contrato YA tenía como depósito (0 si nunca tuvo,
    // sin asumir un mes de alquiler como antes). Solo se financia la diferencia
    // contra ese valor real.
    const depViejoTotal=(c.deposito&&c.deposito.total)||0;
    const difDep=Math.max(0,alqBase-depViejoTotal);
    deposito=difDep>0
      ?calcularDepositoActualizacionIPC(alqBase,difDep,depCuotas)
      :{...calcularDeposito(alqBase,1),pendiente:0,completo:true};
  }
  const honorarios=honCuotas===0
    ?{total:0,monto:"ninguno",cuotas:0,pagadas:0,pagado:0,pendiente:0,completo:true,sinCargo:true}
    :{total:honTotal,monto:honMonto,cuotas:honCuotas,pagadas:honCuotas===1?1:0,pagado:honCuotas===1?honTotal:0,pendiente:honCuotas===1?0:honTotal,completo:honCuotas===1};

  const upd={
    inicio:f.inicio,
    fin:f.fin||"",
    alquilerBase:alqBase,
    comisionAgencia:+(f.comisionAgencia??5),
    frecActualizacion:+(f.frecActualizacion||6),
    indiceActualizacion:f.indiceActualizacion||"IPC",
    notasActualizacion:f.notasActualizacion||"",
    estado:"activo",
    deposito,
    honorarios,
    ultimaActualizacion:f.inicio,
    renovaciones:(c.renovaciones||0)+1,
    fechaRenovacion:hoy(),
    // Guardar historial del contrato anterior
    historialRenovaciones:[...(c.historialRenovaciones||[]),{
      inicio:c.inicio,fin:c.fin,alquilerBase:c.alquilerBase,
      fechaRenovacion:hoy(),renovacionN:(c.renovaciones||0)+1
    }]
  };

  await fbUpd("contratos",cid,upd);
  S.contratos=S.contratos.map(x=>x._id===cid?{...x,...upd}:x);

  // Registrar en historial de propiedad
  const pid=propId(c);
  if(pid) await fbAdd("historial_prop",{
    propiedadId:pid,
    fecha:hoy(),
    descripcion:`Contrato renovado · Nuevo alquiler: ${moneda(alqBase)} · Período: ${f.inicio} → ${f.fin||"S/F"}`,
    creadoEn:Date.now()
  });

  toast("✅ Contrato renovado");
  S.modal=null;
  S.contratoRenovar=null;
  S.contratoActivo={...c,...upd};
  S.modal="contrato_detalle";
  render();
}

function abrirEditarInquilino(nombre){
  // Buscar datos existentes del inquilino
  const inq=S.inquilinos.find(x=>x.nombre===nombre)||{nombre};
  const contrato=S.contratos.find(c=>c.inquilino===nombre)||{};
  S.modal="editar_inquilino";
  S.form={
    nombre:inq.nombre||nombre,
    dni:inq.dni||contrato.dni||"",
    telefono:inq.telefono||contrato.telefono||"",
    telefonoAlt:inq.telefonoAlt||"",
    email:inq.email||contrato.email||"",
    direccionPart:inq.direccionPart||"",
    localidad:inq.localidad||"",
    ocupacion:inq.ocupacion||"",
    garante:inq.garante||contrato.garante||"",
    telGarante:inq.telGarante||"",
    obs:inq.obs||""
  };
  render();
}

function renderModalEditarInquilino(){
  const f=S.form||{};
  const inp=(k,type)=>`<input class="inp" style="width:100%" type="${type||"text"}" data-action="setForm" data-key="${k}" value="${(f[k]||"").toString().replace(/"/g,"&quot;")}">`;
  return `<div class="overlay"><div class="modal" style="max-width:560px">
    <button class="mclose" data-action="closeModal">✕</button>
    <div class="mth"><div class="mth-ic">👤</div>Datos del inquilino — ${f.nombre||""}</div>
    <div class="fg">
      <div class="fgf"><label class="fl">Nombre completo *</label>${inp("nombre")}</div>
      <div><label class="fl">DNI / CUIL</label>${inp("dni")}</div>
      <div><label class="fl">Celular</label>${inp("telefono","tel")}</div>
      <div><label class="fl">Teléfono alternativo</label>${inp("telefonoAlt","tel")}</div>
      <div><label class="fl">Email</label>${inp("email","email")}</div>
      <div><label class="fl">Dirección particular</label>${inp("direccionPart")}</div>
      <div><label class="fl">Localidad</label>${inp("localidad")}</div>
      <div><label class="fl">Ocupación / Trabajo</label>${inp("ocupacion")}</div>
      <div><label class="fl">Garante</label>${inp("garante")}</div>
      <div><label class="fl">Tel. garante</label>${inp("telGarante","tel")}</div>
      <div style="grid-column:1/-1"><label class="fl">Observaciones</label>
        <textarea class="inp" style="width:100%;height:60px;resize:vertical" data-action="setForm" data-key="obs">${f.obs||""}</textarea>
      </div>
    </div>
    <div class="fa">
      <button class="btn" data-action="closeModal">Cancelar</button>
      <button class="btn naranja" data-action="guardarInquilino">💾 Guardar</button>
    </div>
  </div></div>`;
}

async function guardarInquilino(){
  const f=S.form||{};
  if(!f.nombre){toast("El nombre es obligatorio",false);return;}
  const data={
    nombre:f.nombre,dni:f.dni||"",telefono:f.telefono||"",
    telefonoAlt:f.telefonoAlt||"",email:f.email||"",
    direccionPart:f.direccionPart||"",localidad:f.localidad||"",
    ocupacion:f.ocupacion||"",garante:f.garante||"",
    telGarante:f.telGarante||"",obs:f.obs||""
  };
  // Buscar si ya existe en colección inquilinos
  const existente=S.inquilinos.find(x=>x.nombre===f.nombre);
  if(existente&&existente._id){
    await fbUpd("inquilinos",existente._id,data);
    S.inquilinos=S.inquilinos.map(x=>x._id===existente._id?{...x,...data}:x);
  } else {
    const id=await fbAdd("inquilinos",data);
    if(id) S.inquilinos.push({...data,_id:id});
  }
  // También actualizar teléfono/email en todos sus contratos activos
  if(f.telefono||f.email){
    const contratos=S.contratos.filter(c=>c.inquilino===f.nombre);
    await Promise.all(contratos.map(c=>fbUpd("contratos",c._id,{
      telefono:f.telefono||c.telefono||"",
      email:f.email||c.email||""
    })));
    S.contratos=S.contratos.map(c=>c.inquilino===f.nombre?{...c,telefono:f.telefono||c.telefono,email:f.email||c.email}:c);
  }
  toast("✅ Datos guardados");
  S.modal=null;
  // Actualizar inquilinoActivo si está abierto
  if(S.inquilinoActivo&&S.inquilinoActivo.nombre===f.nombre){
    S.inquilinoActivo={...S.inquilinoActivo,...data};
  }
  render();
}

// ── EDITAR DATOS PROPIETARIO ──────────────────────────────────────────────────
function abrirEditarPropietario(nombre){
  const prop=S.propietarios.find(x=>x.nombre===nombre)||{nombre};
  S.modal="editar_propietario";
  S.form={
    _id:prop._id||"",
    nombre:prop.nombre||nombre,
    dni:prop.dni||"",
    telefono:prop.telefono||"",
    telefonoAlt:prop.telefonoAlt||"",
    email:prop.email||"",
    direccionPart:prop.direccionPart||"",
    localidad:prop.localidad||"",
    cbu:prop.cbu||"",
    banco:prop.banco||"",
    comisionAgencia:prop.comisionAgencia??5,
    obs:prop.obs||""
  };
  render();
}

function renderModalEditarPropietario(){
  const f=S.form||{};
  const inp=(k,type)=>`<input class="inp" style="width:100%" type="${type||"text"}" data-action="setForm" data-key="${k}" value="${(f[k]||"").toString().replace(/"/g,"&quot;")}">`;
  return `<div class="overlay"><div class="modal" style="max-width:560px">
    <button class="mclose" data-action="closeModal">✕</button>
    <div class="mth"><div class="mth-ic">🏢</div>Datos del propietario — ${f.nombre||""}</div>
    <div class="fg">
      <div class="fgf"><label class="fl">Nombre completo *</label>${inp("nombre")}</div>
      <div><label class="fl">DNI / CUIT</label>${inp("dni")}</div>
      <div><label class="fl">Celular</label>${inp("telefono","tel")}</div>
      <div><label class="fl">Teléfono alternativo</label>${inp("telefonoAlt","tel")}</div>
      <div><label class="fl">Email</label>${inp("email","email")}</div>
      <div><label class="fl">Dirección particular</label>${inp("direccionPart")}</div>
      <div><label class="fl">Localidad</label>${inp("localidad")}</div>
      <div><label class="fl">CBU / Alias transferencia</label>${inp("cbu")}</div>
      <div><label class="fl">Banco</label>${inp("banco")}</div>
      <div><label class="fl">% Comisión agencia</label>${inp("comisionAgencia","number")}</div>
      <div style="grid-column:1/-1"><label class="fl">Observaciones</label>
        <textarea class="inp" style="width:100%;height:60px;resize:vertical" data-action="setForm" data-key="obs">${f.obs||""}</textarea>
      </div>
    </div>
    <div class="fa">
      <button class="btn" data-action="closeModal">Cancelar</button>
      <button class="btn naranja" data-action="guardarPropietario">💾 Guardar</button>
    </div>
  </div></div>`;
}

async function guardarPropietario(){
  const f=S.form||{};
  if(!f.nombre){toast("El nombre es obligatorio",false);return;}
  const normalizar=s=>(s||"").toLowerCase().trim().replace(/\s+/g," ");
  const duplicado=S.propietarios.find(x=>normalizar(x.nombre)===normalizar(f.nombre)&&x._id!==(f._id||""));
  if(duplicado){
    if(!confirm("Ya existe un propietario llamado \""+duplicado.nombre+"\".\n¿Querés guardar uno nuevo de todas formas?"))return;
  }
  const data={
    nombre:f.nombre,dni:f.dni||"",telefono:f.telefono||"",
    telefonoAlt:f.telefonoAlt||"",email:f.email||"",
    direccionPart:f.direccionPart||"",localidad:f.localidad||"",
    cbu:f.cbu||"",banco:f.banco||"",
    comisionAgencia:+(f.comisionAgencia??5),obs:f.obs||""
  };
  const propio=f._id?S.propietarios.find(x=>x._id===f._id):null;
  if(propio){
    await fbUpd("propietarios",propio._id,data);
    S.propietarios=S.propietarios.map(x=>x._id===propio._id?{...x,...data}:x);
  } else {
    const id=await fbAdd("propietarios",data);
    if(id) S.propietarios.push({...data,_id:id});
  }
  toast("✅ Datos guardados");
  S.modal=null;
  render();
}

// ── LINK TELEFONO → WhatsApp ─────────────────────────────────────────────
function telLink(tel,label){
  if(!tel)return label||"—";
  const num=(tel||"").replace(/\D/g,"").replace(/^0/,"");
  const wa="549"+num;
  const txt=label||tel;
  return '<a href="https://wa.me/'+wa+'" target="_blank" style="color:var(--celeste);text-decoration:none;display:inline-flex;align-items:center;gap:4px"><span style="font-size:13px">📱</span>'+txt+'</a>';
}

// ── PROPIEDADES / INMUEBLES ───────────────────────────────────────────────────
async function cargarPropiedadesInmuebles(force){
  if(!force&&S.propiedadesInmuebles&&S.propiedadesInmuebles.length>0) return;
  try{
    const snap=await getDocs(collection(db,"propiedades"));
    S.propiedadesInmuebles=snap.docs.map(d=>({...d.data(),_id:d.id})).filter(p=>!p._eliminado);
  }catch(e){S.propiedadesInmuebles=[];}
}

async function migrarPropiedadesDesdeContratos(){
  const existentes=new Set((S.propiedadesInmuebles||[]).map(p=>(p.propietarioNombre||"")+"||"+(p.direccion||"")));
  const nuevas=[];
  S.contratos.forEach(c=>{
    if(!c.propietarioNombre||!c.direccion)return;
    const key=(c.propietarioNombre||"")+"||"+(c.direccion||"");
    if(!existentes.has(key)){
      existentes.add(key);
      nuevas.push({propietarioNombre:c.propietarioNombre,direccion:c.direccion,tipo:c.tipo||"Casa",descripcion:"",migrado:true,creadoEn:Date.now()});
    }
  });
  for(const p of nuevas){
    const id=await fbAdd("propiedades",p);
    if(id)S.propiedadesInmuebles.push({...p,_id:id});
  }
  if(nuevas.length)console.log("Migradas "+nuevas.length+" propiedades");
}

async function migrarPropiedadIdEnContratos(dryRun=true){
  const sinDir=S.contratos.filter(c=>!c.direccion&&!c._eliminado);
  console.log("[migración] Contratos a procesar:",sinDir.length);
  let nAuto=0,nManual=0,nSinProp=0;
  const pendientes=[];
  for(const c of sinDir){
    const props=(S.propiedades||[]).filter(p=>p.propietarioNombre===c.propietarioNombre&&!p._eliminado);
    if(props.length===1){
      const p=props[0];
      if(dryRun){
        console.log("✅ AUTO",c.propietarioNombre,"|",c.inquilino,"→",p.direccion,"(id:",p._id+")");
      }else{
        try{
          await updateDoc(doc(db,"contratos",c._id),{propiedadId:p._id,direccion:p.direccion,_ts:Date.now()});
          c.propiedadId=p._id;c.direccion=p.direccion;
        }catch(e){console.error("Error en contrato",c._id,e);}
      }
      nAuto++;
    }else if(props.length>1){
      pendientes.push({propietario:c.propietarioNombre,contratoId:c._id,inquilino:c.inquilino,inicio:c.inicio,monto:c.alquilerBase,propiedades:props.map(p=>({id:p._id,direccion:p.direccion}))});
      nManual++;
    }else{
      console.warn("❌ SIN PROP",c.propietarioNombre,"|",c.inquilino);
      nSinProp++;
    }
  }
  console.log("\n=== RESUMEN ===");
  console.log("✅ Auto-vinculados"+(dryRun?" (simulado)":"")+":",nAuto);
  console.log("⚠️  Manual pendiente:",nManual);
  console.log("❌ Sin propiedad:",nSinProp);
  if(pendientes.length){
    console.log("\n=== PENDIENTES MANUALES ===");
    pendientes.forEach(r=>{
      console.log("\n👤",r.propietario);
      r.propiedades.forEach((p,i)=>console.log("  Prop "+(i+1)+":",p.direccion,"| id:",p.id));
      console.log("  Contrato:",r.contratoId,"| Inquilino:",r.inquilino,"| Inicio:",r.inicio,"| $:",r.monto);
    });
  }
  if(dryRun)console.log("\n⚠️  DRY-RUN — nada se guardó. Ejecutá migrarPropiedadIdEnContratos(false) para confirmar.");
  else{console.log("\n✅ Migración ejecutada.");render();}
  return pendientes;
}
window.migrarPropiedadIdEnContratos=migrarPropiedadIdEnContratos;

function calcularPendientesMigracion(){
  return S.contratos.filter(c=>!c.direccion&&!c._eliminado).reduce(function(acc,c){
    const props=(S.propiedades||[]).filter(p=>p.propietarioNombre===c.propietarioNombre&&!p._eliminado);
    if(props.length>=2)acc.push({propietario:c.propietarioNombre,contratoId:c._id,inquilino:c.inquilino,inicio:c.inicio,monto:c.alquilerBase,estado:c.estado||"activo",propiedades:props.map(p=>({id:p._id,direccion:p.direccion}))});
    return acc;
  },[]);
}
async function confirmarMigracionFila(contratoId){
  const propiedadId=S.migSeleccion[contratoId];
  if(!propiedadId){toast("Elegí una propiedad primero",false);return;}
  const prop=(S.propiedades||[]).find(p=>p._id===propiedadId);
  if(!prop){toast("Propiedad no encontrada",false);return;}
  try{
    await updateDoc(doc(db,"contratos",contratoId),{propiedadId:prop._id,direccion:prop.direccion,_ts:Date.now()});
    const c=S.contratos.find(x=>x._id===contratoId);
    if(c){c.propiedadId=prop._id;c.direccion=prop.direccion;}
    delete S.migSeleccion[contratoId];delete S.migEditando[contratoId];
    toast("Asignado ✓");render();
  }catch(e){toast("Error: "+e.message,false);}
}

function propiedadesDelPropietario(nombre){
  const n=normStr(nombre);
  return (S.propiedadesInmuebles||[]).filter(p=>normStr(p.propietarioNombre)===n&&!p._eliminado);
}

function normStr(s){ return (s||"").toLowerCase().trim().replace(/\s+/g," "); }
function normDireccion(s){
  return normStr(s).replace(/\bn[º°ş]?\.?\s*(?=\d)/g,"n ").replace(/\s+/g," ").trim();
}
function contratoActivoDeProp(p,nombrePropietario){
  return S.contratos.find(function(c){
    return((c.propiedadId&&c.propiedadId===p._id)||(normStr(c.propietarioNombre)===normStr(nombrePropietario)&&normDireccion(c.direccion)===normDireccion(p.direccion)))&&(c.estado==="activo"||!c.estado)&&!c._eliminado;
  });
}
function propiedadLibre(pid){
  const prop=S.propiedades.find(p=>p._id===pid);
  if(!prop) return true;
  const nDir=normDireccion(prop.direccion);
  const nProp=normStr(prop.propietarioNombre);
  return !S.contratos.some(c=>
    (c.propiedadId===pid ||
     (normDireccion(c.direccion)===nDir && (normStr(c.propietarioNombre)===nProp||nProp===""))) &&
    (c.estado==="activo"||!c.estado) &&
    !c._eliminado
  );
}

async function guardarPropiedadInmueble(data,id){
  if(id){
    await fbUpd("propiedades",id,data);
    S.propiedadesInmuebles=S.propiedadesInmuebles.map(p=>p._id===id?{...p,...data}:p);
  }else{
    const newId=await fbAdd("propiedades",{...data,creadoEn:Date.now()});
    if(newId)S.propiedadesInmuebles.push({...data,_id:newId,creadoEn:Date.now()});
  }
}

async function eliminarPropiedadInmueble(id){
  if(!propiedadLibre(id)){toast("No se puede eliminar — tiene contrato activo",false);return;}
  const prop=S.propiedadesInmuebles.find(p=>p._id===id);
  if(!prop||!confirm("Eliminar propiedad "+prop.direccion+"?"))return;
  await fbUpd("propiedades",id,{_eliminado:true});
  S.propiedadesInmuebles=S.propiedadesInmuebles.filter(p=>p._id!==id);
  toast("Propiedad eliminada");render();
}

function abrirModalPropiedad(propietarioNombre,propiedadId){
  const p=propiedadId?S.propiedadesInmuebles.find(x=>x._id===propiedadId):null;
  S.modal="editar_propiedad";S.editarPropiedadId=propiedadId||null;
  S.form={propietarioNombre,direccion:p?p.direccion:"",tipo:p?p.tipo:"Casa",descripcion:p?p.descripcion:"",superficie:p?p.superficie:"",ambientes:p?p.ambientes:""};
  render();
}

function renderModalEditarPropiedad(){
  const f=S.form||{};const esNueva=!S.editarPropiedadId;
  const inp=(k,type)=>'<input class="inp" style="width:100%" type="'+(type||"text")+'" data-action="setForm" data-key="'+k+'" value="'+((f[k]||"").toString().replace(/"/g,"&quot;"))+'">';
  return '<div class="overlay"><div class="modal" style="max-width:480px">'
    +'<button class="mclose" data-action="closeModal">x</button>'
    +'<div class="mth"><div class="mth-ic">🏠</div>'+(esNueva?"Nueva propiedad":"Editar propiedad")+" — "+(f.propietarioNombre||"")+'</div>'
    +'<div class="fg">'
    +'<div style="grid-column:1/-1"><label class="fl">Direccion *</label>'+inp("direccion")+'</div>'
    +'<div><label class="fl">Tipo</label><select class="inp" style="width:100%" data-action="setForm" data-key="tipo">'
    +["Casa","Departamento","Local comercial","Terreno","Oficina","Cochera","Otro"].map(t=>'<option value="'+t+'"'+(f.tipo===t?" selected":"")+'>'+t+'</option>').join("")
    +'</select></div>'
    +'<div><label class="fl">Superficie (m2)</label>'+inp("superficie","number")+'</div>'
    +'<div><label class="fl">Ambientes</label>'+inp("ambientes","number")+'</div>'
    +'<div style="grid-column:1/-1"><label class="fl">Descripcion / Observaciones</label>'
    +'<textarea class="inp" style="width:100%;height:60px;resize:vertical" data-action="setForm" data-key="descripcion">'+(f.descripcion||"")+'</textarea></div>'
    +'</div>'
    +'<div class="fa"><button class="btn" data-action="closeModal">Cancelar</button>'
    +'<button class="btn naranja" data-action="confirmarGuardarPropiedad">Guardar propiedad</button>'
    +'</div></div></div>';
}

// ── SISTEMA DE MORA ──────────────────────────────────────────────────────────
// Feriados cargados manualmente (YYYY-MM-DD). Se persisten en localStorage.
function cargarFeriados(){
  try{ return JSON.parse(localStorage.getItem("feriados")||"[]"); }catch(e){ return []; }
}
function guardarFeriados(lista){
  localStorage.setItem("feriados", JSON.stringify(lista));
}

function calcularFechaLimitePago(mes){
  // mes = "2026-06" → calcula el día 10 hábil de ese mes
  // Si el 10 cae sábado (6) → lunes 12
  // Si el 10 cae domingo (0) → lunes 11
  // Por cada feriado que caiga en 1-10, se corre 1 día extra
  const feriados=cargarFeriados();
  let limite=new Date(mes+"-10");
  // Correr por fin de semana
  const dow=limite.getDay();
  if(dow===6) limite=new Date(mes+"-12");      // sábado → lunes
  else if(dow===0) limite=new Date(mes+"-11"); // domingo → lunes
  // Contar feriados entre el 1 y el 10 del mes
  const feriadosDelMes=feriados.filter(f=>{
    return f.startsWith(mes) && +f.split("-")[2]>=1 && +f.split("-")[2]<=10;
  });
  // Correr un día por cada feriado hábil
  feriadosDelMes.forEach(()=>{
    limite=new Date(limite.getTime()+86400000);
    // Si el nuevo límite cae en fin de semana, seguir corriendo
    while(limite.getDay()===0||limite.getDay()===6){
      limite=new Date(limite.getTime()+86400000);
    }
  });
  return limite;
}

function calcularMora(alquiler, mes, fechaCobro){
  // Retorna {dias, monto, limite} o null si no hay mora
  if(!alquiler||!mes||!fechaCobro) return null;
  const limite=calcularFechaLimitePago(mes);
  const cobro=new Date(fechaCobro);
  if(cobro<=limite) return null; // pagó a tiempo
  // Días de mora: desde el día 1 del mes hasta la fecha de cobro
  const _mp=mes.split('-').map(Number);const inicio=new Date(_mp[0],_mp[1]-1,1);
  const diasMora=Math.round((cobro-inicio)/86400000);
  const monto=Math.round(alquiler*(diasMora*0.01)); // 1% por día
  return {dias:diasMora, monto, limite:limite.toISOString().split("T")[0]};
}

function agregarMora(){
  syncItemsFromDOM();
  const alq=+(S.form.alquiler||S.contratoActivo?.alquilerBase||0);
  const mes=S.form.mes||mesActual();
  const fecha=S.form.fechaCobro||hoy();
  const mora=calcularMora(alq, mes, fecha);
  if(!mora){
    toast("No hay mora — el pago está dentro del plazo ("
      +new Date(calcularFechaLimitePago(mes).getTime()).toLocaleDateString("es-AR")+")");
    return;
  }
  S.itemsCobro.push({
    tipo:"variable",
    desc:"Mora "+mora.dias+" dias (desde el 1/"+mes.split("-")[1]+")",
    monto:mora.monto
  });
  toast("Mora "+mora.dias+" dias = "+moneda(mora.monto)+" (1% diario s/alquiler)");
  renderParcial();
}

// Modal para administrar feriados
function abrirModalFeriados(){
  S.modal="feriados";
  render();
}

function renderModalFeriados(){
  const feriados=cargarFeriados().sort();
  const filas=feriados.map(f=>'<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--negro4)">'
    +'<span style="font-size:13px">'+new Date(f+"T12:00:00").toLocaleDateString("es-AR",{weekday:"long",year:"numeric",month:"long",day:"numeric"})+'</span>'
    +'<button class="btn sm" style="background:rgba(231,76,60,.15);color:#ff7b6b" data-action="borrarFeriado" data-fecha="'+f+'">✕</button>'
    +'</div>').join("");
  return '<div class="overlay"><div class="modal" style="max-width:480px">'
    +'<button class="mclose" data-action="closeModal">✕</button>'
    +'<div class="mth"><div class="mth-ic">📅</div>Feriados configurados</div>'
    +'<div style="font-size:11px;color:var(--gris3);margin-bottom:14px">Los feriados entre el 1 y el 10 de cada mes corren la fecha límite de pago un día hábil.</div>'
    +'<div style="display:flex;gap:8px;margin-bottom:14px">'
    +'<input id="nuevo-feriado" class="inp" type="date" style="flex:1">'
    +'<button class="btn naranja" data-action="agregarFeriado">+ Agregar feriado</button>'
    +'</div>'
    +(filas||'<div style="color:var(--gris3);font-size:12px;padding:12px 0">Sin feriados cargados</div>')
    +'<div class="fa"><button class="btn" data-action="closeModal">Cerrar</button></div>'
    +'</div></div>';
}

// ── GASTOS FIJOS CON FRECUENCIA ──────────────────────────────────────────────
// Estructura de cada gasto:
// { id, nombre, monto, frecuencia (1/2/3/6/12), mesInicio ("2026-07"), activo }

const GASTOS_DEFAULT = [
  {id:"internet", nombre:"Internet",    monto:0, frecuencia:1, mesInicio:"", activo:false},
  {id:"tgi",      nombre:"TGI",         monto:0, frecuencia:2, mesInicio:"", activo:false},
  {id:"agua",     nombre:"Agua",        monto:0, frecuencia:2, mesInicio:"", activo:false},
  {id:"gas",      nombre:"Gas",         monto:0, frecuencia:1, mesInicio:"", activo:false},
  {id:"expensas", nombre:"Expensas",    monto:0, frecuencia:1, mesInicio:"", activo:false},
  {id:"luz",      nombre:"Luz",         monto:0, frecuencia:1, mesInicio:"", activo:false},
];

function gastosDelContrato(c){
  // Devuelve los gastos configurados, con defaults para los que faltan
  const guardados=c.gastosConfig||[];
  return guardados;
}

function correspondeEsteMes(gasto, mes){
  // Determina si un gasto corresponde ser cobrado en el mes dado
  if(!gasto.activo) return false;
  const inicio=gasto.mesInicio||mes; // si no tiene inicio, asume desde el mes actual
  const [ay,am]=inicio.split("-").map(Number);
  const [by,bm]=mes.split("-").map(Number);
  const diffMeses=(by-ay)*12+(bm-am);
  if(diffMeses<0) return false; // antes del inicio
  return diffMeses%gasto.frecuencia===0;
}

function gastosQueCorresponden(c, mes){
  const gastos=gastosDelContrato(c);
  return gastos.filter(g=>correspondeEsteMes(g,mes));
}

// Modal para editar la matriz de gastos del contrato
function abrirMatrizGastos(cid){
  const c=S.contratos.find(x=>x._id===cid);
  if(!c)return;
  S.modal="matriz_gastos";
  S.matrizGastosId=cid;
  // Inicializar con los guardados o con defaults vacíos
  const guardados=c.gastosConfig||[];
  // Combinar defaults con guardados
  S.matrizTemp=GASTOS_DEFAULT.map(def=>{
    const exist=guardados.find(g=>g.id===def.id);
    return exist?{...def,...exist}:{...def};
  });
  // Agregar gastos custom que no están en defaults
  guardados.filter(g=>!GASTOS_DEFAULT.find(d=>d.id===g.id)).forEach(g=>{
    S.matrizTemp.push(g);
  });
  render();
}

function renderModalMatrizGastos(){
  const cid=S.matrizGastosId;
  const c=S.contratos.find(x=>x._id===cid);
  if(!c)return"";
  const gastos=S.matrizTemp||[];
  const mesHoy=mesActual();
  const iS="padding:4px 6px;font-size:11px;border:1px solid var(--negro4);border-radius:4px;background:var(--negro3);color:var(--blanco);width:100%";

  // Generar columnas de meses (3 anteriores + actual + 3 próximos)
  const meses=[];
  const _mhp=mesHoy.split('-').map(Number);
  for(let i=-3;i<=3;i++){
    const d=new Date(_mhp[0],_mhp[1]-1+i,1);
    meses.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));
  }

  // Pagos del contrato para determinar qué se cobró
  const pagosC=S.pagos.filter(p=>p.contratoId===cid&&p.estado==="cobrado");

  const filas=gastos.map((g,i)=>{
    const celdas=meses.map(mes=>{
      const corr=correspondeEsteMes(g,mes);
      const pago=pagosC.find(p=>p.mes===mes);
      const items=pago?(pago.itemsCobro||(pago.extras||[]).map(e=>({desc:e.desc,monto:e.monto}))):[];
      const cobrado=corr&&items.some(it=>(it.desc||"").toLowerCase().includes((g.nombre||"").toLowerCase()));
      let celda,color,title;
      if(!corr){celda="·";color="var(--gris4)";title="No corresponde";}
      else if(cobrado){celda="✓";color="#5ddb8a";title="Cobrado";}
      else if(mes<=mesHoy){celda="!";color="var(--naranja)";title="Correspondia y no se cobro";}
      else{celda="▷";color="var(--celeste)";title="Corresponde cobrar";}
      return '<td style="text-align:center;font-size:14px;color:'+color+';padding:4px" title="'+title+'">'+celda+'</td>';
    }).join("");

    const freqOpts=[1,2,3,6,12].map(v=>'<option value="'+v+'"'+(+g.frecuencia===v?" selected":"")+'>c/'+v+'m</option>').join("");
    return '<tr style="border-bottom:1px solid var(--negro4)">'
      +'<td style="padding:6px 4px;white-space:nowrap">'
      +'<input type="checkbox" '+(g.activo?"checked ":"")+'style="margin-right:6px" onchange="S.matrizTemp['+i+'].activo=this.checked;render()">'
      +'<input value="'+(g.nombre||"")+'" style="'+iS+';width:90px" oninput="S.matrizTemp['+i+'].nombre=this.value">'
      +'</td>'
      +'<td style="padding:4px;white-space:nowrap">'
      +'<input type="number" placeholder="Variable" value="'+(g.monto||"")+'" style="'+iS+';width:80px" oninput="S.matrizTemp['+i+'].monto=+(this.value||0)">'
      +'</td>'
      +'<td style="padding:4px">'
      +'<select style="'+iS+';width:60px" onchange="S.matrizTemp['+i+'].frecuencia=+this.value">'+freqOpts+'</select>'
      +'</td>'
      +'<td style="padding:4px">'
      +'<input type="month" value="'+(g.mesInicio||"")+'" style="'+iS+';width:120px" onchange="S.matrizTemp['+i+'].mesInicio=this.value">'
      +'</td>'
      +celdas
      +'</tr>';
  }).join("");

  const thMeses=meses.map(m=>'<th style="text-align:center;font-size:10px;padding:4px;min-width:28px">'+mesNombre(m).substring(0,3)+'<br>'+m.substring(2,4)+'</th>').join("");

  return '<div class="overlay"><div class="modal" style="max-width:min(900px,95vw);max-height:90vh;display:flex;flex-direction:column">'
    +'<button class="mclose" data-action="closeModal">✕</button>'
    +'<div class="mth"><div class="mth-ic">📊</div>Gastos fijos — '+(c.inquilino||"")+'<span style="font-size:11px;font-weight:400;color:var(--gris3);margin-left:8px">'+(c.direccion||"")+'</span></div>'
    +'<div style="overflow:auto;flex:1">'
    +'<table style="border-collapse:collapse;width:100%;font-size:12px">'
    +'<thead><tr style="background:var(--negro3)">'
    +'<th style="text-align:left;padding:6px 4px;white-space:nowrap">Gasto</th>'
    +'<th style="padding:6px 4px">Monto</th>'
    +'<th style="padding:6px 4px">Frec.</th>'
    +'<th style="padding:6px 4px;white-space:nowrap">Desde</th>'
    +thMeses
    +'</tr></thead>'
    +'<tbody>'+filas+'</tbody>'
    +'</table></div>'
    +'<div style="padding:8px 0;font-size:11px;color:var(--gris3);display:flex;gap:16px">'
    +'<span style="color:#5ddb8a">✓ Cobrado</span>'
    +'<span style="color:var(--naranja)">! Pendiente cobrar</span>'
    +'<span style="color:var(--celeste)">▷ Próximo</span>'
    +'<span style="color:var(--gris4)">· No corresponde</span>'
    +'</div>'
    +'<div class="fa">'
    +'<button class="btn" data-action="closeModal">Cancelar</button>'
    +'<button class="btn sm" data-action="agregarGastoCustom" style="background:rgba(75,200,232,.1);color:var(--celeste)">+ Agregar gasto</button>'
    +'<button class="btn naranja" data-action="guardarMatrizGastos">💾 Guardar</button>'
    +'</div>'
    +'</div></div>';
}

async function guardarMatrizGastos(){
  const cid=S.matrizGastosId;
  // S.matrizTemp ya tiene los valores actualizados por los handlers
  const gastosConfig=(S.matrizTemp||[]).map(g=>({
    id:g.id||("custom_"+Date.now()),
    nombre:g.nombre||"",
    monto:+(g.monto||0),
    frecuencia:+(g.frecuencia||1),
    mesInicio:g.mesInicio||"",
    activo:!!g.activo
  }));
  await fbUpd("contratos",cid,{gastosConfig});
  S.contratos=S.contratos.map(c=>c._id===cid?{...c,gastosConfig}:c);
  S.modal=null;
  S.matrizTemp=null;
  toast("Gastos fijos guardados ✓");
  render();
}

// ── GASTOS FIJOS CON FRECUENCIA ──────────────────────────────────────────────
// Cada extra del contrato ahora puede tener: {desc, monto, frecuencia, mesInicio}
// frecuencia: "mensual" | "bimestral" | "trimestral" | "semestral" | "anual"
// mesInicio: "2026-01" — mes a partir del cual empieza a contar el ciclo



function proximoMesGasto(extra, desdeMs){
  // Encuentra el próximo mes (desde desdeMs) en que corresponde este gasto
  const desde=desdeMs||mesActual();
  let cur=desde;
  for(let i=0;i<24;i++){
    if(gastoCorrespondeMes(extra,cur)) return cur;
    cur=mesPrevio(cur)<cur?sumarMeses(cur,1):cur; // avanzar un mes
  }
  return desde;
}

function sumarMeses(mes, n){
  const [y,m]=mes.split("-").map(Number);
  const d=new Date(y,m-1+n,1);
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
}

const FREC_LABELS={mensual:"Mensual",bimestral:"Bimestral",trimestral:"Trimestral",semestral:"Semestral",anual:"Anual"};

// ── GASTOS FIJOS CON FRECUENCIA ──────────────────────────────────────────────
// Cada extra ahora puede tener: {desc, monto, frecuencia, mesInicio}
// frecuencia: 1=mensual, 2=bimestral, 3=trimestral, 6=semestral, 12=anual
// mesInicio: "2026-01" -> a partir de qué mes empieza a contar

function gastoCorrespondeEnMes(extra, mesObjetivo){
  const freq=+(extra.frecuencia||1);
  if(freq<=1) return true; // mensual, siempre corresponde
  const inicio=extra.mesInicio||extra.creadoMes||mesObjetivo;
  const [yI,mI]=inicio.split("-").map(Number);
  const [yO,mO]=mesObjetivo.split("-").map(Number);
  const mesesDesdeInicio=(yO-yI)*12+(mO-mI);
  if(mesesDesdeInicio<0) return false; // todavía no empezó
  return mesesDesdeInicio%freq===0;
}

function gastosFijosDelMes(contrato, mes){
  const extras=contrato.extras||[];
  return extras.filter(e=>+(e.monto||0)>0 && gastoCorrespondeEnMes(e, mes));
}

function labelFrecuencia(freq){
  const f=+(freq||1);
  if(f===1) return "Mensual";
  if(f===2) return "Bimestral";
  if(f===3) return "Trimestral";
  if(f===6) return "Semestral";
  if(f===12) return "Anual";
  return "c/"+f+"m";
}

document.addEventListener("change",function(e){
  if(e.target.classList&&e.target.classList.contains("extras-freq")){
    const row=e.target.closest(".extra-row");
    if(!row)return;
    const freq=+e.target.value;
    let mesInput=row.querySelector(".extras-mesinicio");
    const labelSpan=row.querySelector(".extras-freq").nextElementSibling;
    if(freq>1){
      if(!mesInput){
        const span=document.createElement("span");
        span.style.fontSize="10px";span.style.color="var(--gris3)";span.textContent="desde";
        const inp=document.createElement("input");
        inp.type="month";inp.className="inp extras-mesinicio";inp.style.width="130px";inp.style.fontSize="11px";
        inp.value=new Date().toISOString().slice(0,7);
        if(labelSpan&&labelSpan.tagName==="SPAN"){labelSpan.remove();}
        e.target.parentElement.appendChild(span);
        e.target.parentElement.appendChild(inp);
      }
    } else {
      if(mesInput)mesInput.remove();
      const prevSpan=row.querySelector(".extras-freq").parentElement.querySelectorAll("span");
      prevSpan.forEach(function(s){if(s.textContent==="desde")s.remove();});
      if(!row.querySelector(".extras-freq").parentElement.querySelector("span")){
        const span2=document.createElement("span");
        span2.style.fontSize="10px";span2.style.color="var(--gris4)";span2.textContent="se cobra todos los meses";
        row.querySelector(".extras-freq").parentElement.appendChild(span2);
      }
    }
  }
});

// ── NOTAS TEMPORALES (recordatorios de corto plazo, se borran cuando ya no sirven) ──
const S_NOTAS = {};  // cache: { key: [{texto, creadoEn, docId}] }

function notaKey(tipo, id){ return tipo+"_"+id; }

const S_NOTAS_CARGANDO = {};
async function cargarNotasTemp(tipo, id){
  const key=notaKey(tipo,id);
  if(S_NOTAS[key]!==undefined) return;
  if(S_NOTAS_CARGANDO[key]) return; // evita reentradas mientras carga
  S_NOTAS_CARGANDO[key]=true;
  const campo=tipo==="contrato"?"contratoId":"propietarioNombre";
  try{
    const snap=await getDocs(query(collection(db,"notas_temp"),where(campo,"==",id)));
    S_NOTAS[key]=snap.docs.map(function(d){return{...d.data(),_id:d.id};}).filter(function(n){return !n._eliminado;});
  }catch(e){
    // Fallback: traer toda la colección y filtrar en JS (por si falta indice)
    try{
      const snap2=await getDocs(collection(db,"notas_temp"));
      S_NOTAS[key]=snap2.docs.map(function(d){return{...d.data(),_id:d.id};}).filter(function(n){return n[campo]===id&&!n._eliminado;});
    }catch(e2){ S_NOTAS[key]=[]; }
  }
  S_NOTAS_CARGANDO[key]=false;
  render();
}

async function agregarNotaTemp(tipo, id){
  const key=notaKey(tipo,id);
  const inp=document.getElementById("nota-temp-input-"+key);
  if(!inp||!inp.value.trim()){toast("Escribi un comentario",false);return;}
  const campo=tipo==="contrato"?"contratoId":"propietarioNombre";
  const data={};
  data[campo]=id;
  data.texto=inp.value.trim();
  data.creadoEn=Date.now();
  const docId=await fbAdd("notas_temp",data);
  if(!S_NOTAS[key])S_NOTAS[key]=[];
  S_NOTAS[key].push({...data,_id:docId});
  inp.value="";
  render();
}

async function borrarNotaTemp(tipo, id, notaId){
  const key=notaKey(tipo,id);
  try{ await updateDoc(doc(db,"notas_temp",notaId),{_eliminado:true}); }catch(e){}
  if(S_NOTAS[key]) S_NOTAS[key]=S_NOTAS[key].filter(function(n){return n._id!==notaId;});
  render();
}

function renderNotasTemp(tipo, id){
  const key=notaKey(tipo,id);
  if(S_NOTAS[key]===undefined){
    cargarNotasTemp(tipo,id);
    return '<div style="font-size:11px;color:var(--gris4);padding:6px 0">Cargando notas...</div>';
  }
  const notas=S_NOTAS[key]||[];
  const lista=notas.map(function(n){
    return '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;background:rgba(245,166,35,.08);border:1px solid rgba(245,166,35,.2);border-radius:6px;padding:8px 10px;margin-bottom:6px">'
      +'<span style="font-size:12px;flex:1">📝 '+n.texto+'</span>'
      +'<button class="btn sm" data-action="borrarNotaTemp" data-tipo="'+tipo+'" data-id="'+id+'" data-notaid="'+n._id+'" style="background:rgba(231,76,60,.15);color:#ff7b6b;padding:2px 6px;flex-shrink:0">x</button>'
      +'</div>';
  }).join("");
  return '<div style="margin-bottom:10px">'+lista+'</div>'
    +'<div style="display:flex;gap:8px">'
    +'<input id="nota-temp-input-'+key+'" class="inp" style="flex:1" placeholder="Escribi un comentario temporal (se borra cuando quieras)..." data-action="notaTempEnter" data-tipo="'+tipo+'" data-id="'+id+'">'
    +'<button class="btn sm naranja" data-action="agregarNotaTempBtn" data-tipo="'+tipo+'" data-id="'+id+'">+ Agregar</button>'
    +'</div>';
}
document.addEventListener("input",e=>{
  const t=e.target;
  const action=t.dataset&&t.dataset.action;
  if(!action)return;
  // Buscadores — usar renderParcial para no perder foco
  if(action==="setupBuscar"){S.setupBuscar=t.value;renderParcial();}
  else if(action==="cobranzaBuscar"){S.filtros.cobranzaBuscar=t.value;renderParcial();}
  else if(action==="manualBuscar"){S.manualBuscar=t.value;renderParcial();}
  else if(action==="setBuscar"){setFiltro("buscar",t.value);}
  // Alquiler cobro — actualizar resumen en tiempo real
  else if(action==="setAlquilerCobro"){S.form.alquiler=+(t.value||0);if(typeof updateResumen==="function")updateResumen();}
  // Campos de form modal
  else if(action==="setForm"){
    const k=t.dataset.key;
    if(k){
      S.form[k]=t.value;
      if(k==="mes"&&S.contratoActivo){
        const c=S.contratoActivo;
        const newMes=t.value;
        const guardados=(S_GPEND[c._id]&&S_GPEND[c._id].por_mes&&S_GPEND[c._id].por_mes[newMes])||[];
        S.itemsCobro=itemsParaMesConGuardados(c,newMes,guardados);
        S.form.alquiler=alquilerParaMes(c,newMes);
        render();
      }
    }
  }
  // Extras del contrato
  else if(action==="matrizNombre"){if(S.matrizTemp){const i=+t.dataset.idx;S.matrizTemp[i].nombre=t.value;}}
  else if(action==="matrizMonto"){if(S.matrizTemp){const i=+t.dataset.idx;S.matrizTemp[i].monto=+(t.value||0);}}
  else if(action==="matrizNombre"){if(S.matrizTemp){S.matrizTemp[+t.dataset.idx].nombre=t.value;}}
  else if(action==="matrizMonto"){if(S.matrizTemp){S.matrizTemp[+t.dataset.idx].monto=+(t.value||0);}}
  else if(action==="setExtraDesc"){const i=+t.dataset.idx;if(S.formExtras[i])S.formExtras[i].desc=t.value;}
  else if(action==="setExtraMonto"){const i=+t.dataset.idx;if(S.formExtras[i])S.formExtras[i].monto=+(t.value||0);}
});
document.addEventListener("keydown",e=>{
  const t=e.target;
  const action=t.dataset&&t.dataset.action;
  if(!action)return;
  if(e.key==="Enter"&&action==="hpropEnter"){e.preventDefault();agregarHistorialProp(t.dataset.pid);}
  else if(e.key==="Enter"&&action==="hinqEnter"){e.preventDefault();agregarHistorialInq(t.dataset.nombre);}
  else if(e.key==="Enter"&&action==="notaTempEnter"){e.preventDefault();agregarNotaTemp(t.dataset.tipo,t.dataset.id);}
});
document.addEventListener("change",e=>{
  const t=e.target;
  const action=t.dataset&&t.dataset.action;
  if(!action&&t.id!=="fecha-corte-input")return;
  // Filtros cobranzas
  if(action==="cobranzaFiltro"){S.filtros[t.dataset.field]=t.value;render();}
  // Fecha de corte deudores
  else if(action==="setFechaCorte"||t.id==="fecha-corte-input"){window.setFechaCorte(t.value);}
  else if(action==="setIpcMes"){S.ipcMes=t.value;render();}
  else if(action==="puntPlazo"){S_PUNT_PLAZO=+(t.value||10);render();}
  else if(action==="setDepCuotasCobro"){
    S.depCuotasCobro=+t.value;
    const dep=(S.contratoActivo||{}).deposito||{};
    const depPend=dep.pendiente||0;
    const idx=S.itemsCobro.findIndex(it=>it.tipo==="deposito");
    if(idx>=0){
      const n=S.contratos.find(x=>x._id===(S.contratoActivo||{})._id);
      const cuotasPagadas=(dep.cuotasPagadas!==undefined?dep.cuotasPagadas:(dep.pagadas||0));
      const total=dep.cuotasTotales||dep.cuotas||1;
      const prox=cuotasPagadas+1;
      if(S.depCuotasCobro===2){
        S.itemsCobro[idx]={...S.itemsCobro[idx],monto:Math.round(depPend/2),desc:"Depósito cuota "+prox+"/2 (2da cuota: próx. cobro)"};
      } else {
        S.itemsCobro[idx]={...S.itemsCobro[idx],monto:depPend,desc:"Depósito pendiente"};
      }
    }
    renderParcial();
  }
  else if(action==="migSelProp"){S.migSeleccion[t.dataset.id]=t.value;render();}
  // Selects del form modal (depósito, honorarios, período, estado)
  else if(action==="setForm"){
    const k=t.dataset.key;
    if(k){
      S.form[k]=t.value;
      // Si cambió el período y hay contrato activo, recalcular gastos que corresponden
      if(k==="mes"&&S.contratoActivo){
        const c=S.contratoActivo;
        const newMes=t.value;
        const guardados=(S_GPEND[c._id]&&S_GPEND[c._id].por_mes&&S_GPEND[c._id].por_mes[newMes])||[];
        S.itemsCobro=itemsParaMesConGuardados(c,newMes,guardados);
        S.form.alquiler=alquilerParaMes(c,newMes);
      }
      render();
    }
  }
  // Filtros de contratos
  else if(action==="setFiltroEstadoSel"){setFiltro("estado",t.value);}
  else if(action==="setFiltroTipoSel"){setFiltro("buscarPor",t.value);}
  else if(action==="setLiqMesSel"){S.liqMes=t.value;render();}
  else if(action==="matrizFreq"){if(S.matrizTemp){const i=+t.dataset.idx;S.matrizTemp[i].frecuencia=+t.value;}}
  else if(action==="matrizDesde"){if(S.matrizTemp){const i=+t.dataset.idx;S.matrizTemp[i].mesInicio=t.value;}}
  else if(action==="matrizFreq"){if(S.matrizTemp){S.matrizTemp[+t.dataset.idx].frecuencia=+t.value;}}
  else if(action==="matrizDesde"){if(S.matrizTemp){S.matrizTemp[+t.dataset.idx].mesInicio=t.value;}}
  else if(action==="setPropietario"){
    S.form.propietarioNombre=t.value;S.form.propiedadId="";S.form.direccion="";S.form.tipo="Casa";render();
  }
  else if(action==="setPropiedad"){
    const pid=t.value;S.form.propiedadId=pid;
    const propSel=(S.propiedadesInmuebles||[]).find(p=>p._id===pid);
    if(propSel){S.form.direccion=propSel.direccion||"";S.form.tipo=propSel.tipo||"Casa";S.form.descripcion=propSel.descripcion||"";}
    render();
  }
});
// legacy change listener
document.addEventListener("change_DISABLED",e=>{if(e.target.id==="fecha-corte-input"){window.setFechaCorte(e.target.value);return;}});
document.addEventListener("click",e=>{
  const t=e.target.closest("[data-action]");
  if(!t)return;
  const action=t.dataset.action;
  const id=t.dataset.id;
  if(action==="abrirContrato")abrirContrato(id);
  else if(action==="cobrar")cobrarPago(id);
  else if(action==="emitirINQ"){const p=S.pagos.find(x=>x._id===id);if(p)generarPDFInquilino(p);}
  else if(action==="emitirPROP"){const p=S.pagos.find(x=>x._id===id);if(p)generarPDFPropietario(p);}
  else if(action==="actualizarAlq")actualizarAlquiler(id);else if(action==="guardarMontoMesParcial")guardarMontoMesParcial(id);else if(action==="renovarContrato"){abrirRenovacion(id);}else if(action==="confirmarRenovacion"){confirmarRenovacion();}else if(action==="setupEditarExtras"){S.editarExtrasId=id;S._extrasTemp=null;S._extrasTempId=null;S.modal="editar_extras";render();}else if(action==="extrasAgregar"){
    // Sincronizar valores actuales del DOM antes de re-render
    const rows2=document.querySelectorAll(".extra-row");
    if(!S._extrasTemp)S._extrasTemp=[];
    rows2.forEach((row,i)=>{
      if(S._extrasTemp[i]){
        S._extrasTemp[i].desc=(row.querySelector(".extras-desc")||{}).value||"";
        S._extrasTemp[i].monto=+((row.querySelector(".extras-monto")||{}).value||0);
      }
    });
    S._extrasTemp.push({desc:"",monto:0});render();
  }else if(action==="extrasFreqChange"){
    // No re-render — solo mostrar/ocultar el campo mes inicio via JS directo
  }
  else if(action==="extrasBorrar"){
    const rows3=document.querySelectorAll(".extra-row");
    if(!S._extrasTemp)S._extrasTemp=[];
    rows3.forEach((row,i)=>{
      if(S._extrasTemp[i]){
        S._extrasTemp[i].desc=(row.querySelector(".extras-desc")||{}).value||"";
        S._extrasTemp[i].monto=+((row.querySelector(".extras-monto")||{}).value||0);
      }
    });
    const idx=+t.dataset.idx;
    S._extrasTemp.splice(idx,1);
    render();
  }else if(action==="extrasGuardar"){guardarExtrasSetup(S.editarExtrasId);}else if(action==="grillaGastos"){abrirGrillaGastos(id);}else if(action==="matrizGastos"){abrirMatrizGastos(id);}else if(action==="matrizCheck"){if(!S.matrizTemp)return;const i=+t.dataset.idx;S.matrizTemp[i].activo=t.checked;if(t.checked&&!S.matrizTemp[i].mesInicio)S.matrizTemp[i].mesInicio=mesActual();render();}else if(action==="matrizNombre"){if(!S.matrizTemp)return;const i=+t.dataset.idx;S.matrizTemp[i].nombre=t.value;}else if(action==="matrizMonto"){if(!S.matrizTemp)return;const i=+t.dataset.idx;S.matrizTemp[i].monto=+(t.value||0);}else if(action==="matrizFreq"){if(!S.matrizTemp)return;const i=+t.dataset.idx;S.matrizTemp[i].frecuencia=+t.value;}else if(action==="matrizDesde"){if(!S.matrizTemp)return;const i=+t.dataset.idx;S.matrizTemp[i].mesInicio=t.value;}else if(action==="matrizBorrar"){if(!S.matrizTemp)return;const i=+t.dataset.idx;S.matrizTemp.splice(i,1);render();}else if(action==="agregarGastoNuevoContrato"){if(!S.matrizTemp)S.matrizTemp=[];S.matrizTemp.push({id:"custom_"+Date.now(),nombre:"",monto:0,frecuencia:1,mesInicio:S.form.inicio||mesActual(),activo:true});render();}else if(action==="guardarMatrizGastos"){guardarMatrizGastos();}else if(action==="agregarGastoCustom"){if(!S.matrizTemp)S.matrizTemp=[];S.matrizTemp.push({id:"custom_"+Date.now(),nombre:"",monto:0,frecuencia:1,mesInicio:mesActual(),activo:true});render();}else if(action==="cerrarGrilla"){S.modalExtra=null;render();}else if(action==="irSetup"){S.modalExtra=null;S.sec="setup";render();}else if(action==="grillaGastos")abrirGrillaGastos(id);
  // ── handlers de inputs (change listener los maneja también) ──────────────
  else if(action==="setupBuscar"){S.setupBuscar=t.value;if(typeof renderParcial==="function")renderParcial();else render();}
  else if(action==="setupDescartar"){S.setupCambios={};render();}
  else if(action==="cobranzaBuscar"){S.filtros.cobranzaBuscar=t.value;if(typeof renderParcial==="function")renderParcial();else render();}
  else if(action==="setAlquilerCobro"){S.form.alquiler=+(t.value||0);if(typeof updateResumen==="function")updateResumen();}
  else if(action==="volverInquilinos"){S.inquilinoActivo=null;render();}else if(action==="editarInquilino"){abrirEditarInquilino(t.dataset.nombre);}else if(action==="guardarInquilino"){guardarInquilino();}else if(action==="editarPropietario"){abrirEditarPropietario(t.dataset.nombre);}else if(action==="nuevaPropiedad"){abrirModalPropiedad(t.dataset.nombre);}else if(action==="editarPropiedad"){abrirModalPropiedad(t.dataset.nombre,t.dataset.id);}else if(action==="eliminarPropiedad"){eliminarPropiedadInmueble(t.dataset.id);}else if(action==="confirmarGuardarPropiedad"){const f2=S.form;if(!f2.direccion){toast("La direccion es obligatoria",false);return;}guardarPropiedadInmueble({propietarioNombre:f2.propietarioNombre,direccion:f2.direccion,tipo:f2.tipo||"Casa",descripcion:f2.descripcion||"",superficie:f2.superficie||"",ambientes:f2.ambientes||""},S.editarPropiedadId).then(function(){S.modal=null;S.editarPropiedadId=null;toast("Propiedad guardada");render();});}else if(action==="guardarPropietario"){guardarPropietario();}else if(action==="abrirPropietario"){S.propietarioActivo=t.dataset.nombre;S.liqSeleccion={};Promise.all([cargarSaldoProp(t.dataset.nombre),cargarPropiedadesInmuebles(),cargarAjustesProp(t.dataset.nombre)]).then(()=>render());render();}else if(action==="volverPropietarios"){S.propietarioActivo=null;render();}else if(action==="toggleLiqMes"){const nm=t.dataset.nombre;const ms=t.dataset.mes;if(!S.liqSeleccion[nm])S.liqSeleccion[nm]={};S.liqSeleccion[nm][ms]=S.liqSeleccion[nm][ms]===false?true:false;render();}else if(action==="generarLiquidacion"){generarLiquidacionProp(t.dataset.nombre);}else if(action==="reimprimirLiq"){reimprimirLiquidacion(t.dataset.ref,t.dataset.nombre);}
  else if(action==="eliminarLiquidacion"){eliminarLiquidacion(t.dataset.ref,t.dataset.nombre);}
  else if(action==="serviciosMes"){S_SERVICIOS_MES=t.value;S_SERVICIOS_VALORES={};render();}
  else if(action==="serviciosMonto"){S_SERVICIOS_VALORES[t.dataset.key]=t.value;}
  else if(action==="serviciosGuardarTodos"){serviciosGuardarTodos();}
else if(action==="cerrarModalPago"){S.ultimoPago=null;S.modal=null;S.contratoActivo=null;render();}
  else if(action==="emitirPDFInqPago"){if(S.ultimoPago)generarPDFInquilino(S.ultimoPago);}
  else if(action==="ajustePropAgregar"){const _apNombre=S.propietarioActivo;const _apDesc=(document.getElementById("ajuste-desc-input")||{}).value?.trim()||"";const _apMonto=+((document.getElementById("ajuste-monto-input")||{}).value||0);if(!_apDesc){toast("Escribi una descripcion",false);return;}if(!_apMonto||isNaN(_apMonto)){toast("Ingresa un monto valido",false);return;}agregarAjusteProp(_apNombre,_apDesc,_apMonto).then(()=>toast("Ajuste agregado ✓"));}
  else if(action==="ajustePropBorrar"){if(!confirm("¿Borrar este ajuste?"))return;borrarAjusteProp(t.dataset.id,S.propietarioActivo);}
  else if(action==="hpropAgregar"){agregarHistorialProp(t.dataset.pid);}
  else if(action==="hpropEliminar"){eliminarHistorialProp(id,t.dataset.pid);}
  else if(action==="hinqAgregar"){agregarHistorialInq(t.dataset.nombre);}
  else if(action==="hinqEliminar"){eliminarHistorialInq(id,t.dataset.nombre);}
  else if(action==="setAlertaTipo"){S.alertasTipo=t.dataset.key;render();}
  else if(action==="setAlertaPlazo"){S.alertasPlazo=+t.dataset.key;render();}
  else if(action==="sortCol"){const col=t.dataset.col;S.sortDir=S.sortCol===col?S.sortDir*-1:1;S.sortCol=col;render();}
  else if(action==="eliminarPago"){eliminarPago(id);}
  else if(action==="cobranzasLimpiar"){S.filtros.cobranzaMes="";S.filtros.cobranzaProp="";S.filtros.cobranzaBuscar="";S.filtros.cobranzaEstado="todos";render();}
  else if(action==="finalizarContrato"){finalizarContrato(id);}
  else if(action==="cobrarCuotaDep")cobrarCuotaDep(id);else if(action==="cobrarCuotaHon")cobrarCuotaHon(id);else if(action==="cajaTab"){S_CAJA.tab=t.dataset.tab;render();}
  else if(action==="cajaToggleDetalle"){S_CAJA_DETALLE=!S_CAJA_DETALLE;render();}
  else if(action==="cajaDifToggle"){S_CAJA_DIF_DETALLE=!S_CAJA_DIF_DETALLE;render();}
  else if(action==="cajaEliminar"){eliminarMovCaja(id);}
  else if(action==="cajaRecuperar"){marcarRecuperado(id);}
  else if(action==="cajaMas"){cargarMasCaja();}else if(action==="cajaAbrirModal"){S.modal="caja";S.form={tipo:t.dataset.tipo,fecha:hoy(),monto:"",concepto:"",detalle:"",inquilino:"",cuotas:1,cuotaNum:1};render();}
  else if(action==="addItem"){addItemCobro(t.dataset.tipo);}else if(action==="addMora"){agregarMora();}
  else if(action==="agregarNotaTempBtn"){agregarNotaTemp(t.dataset.tipo,t.dataset.id);}
  else if(action==="borrarNotaTemp"){borrarNotaTemp(t.dataset.tipo,t.dataset.id,t.dataset.notaid);}else if(action==="abrirFeriados"){abrirModalFeriados();}else if(action==="guardarSaldoInit"){const nombre=t.dataset.nombre;const inp=document.getElementById("saldo-init-"+nombre);if(!inp)return;const monto=+(inp.value||0);guardarSaldoProp(nombre,monto).then(()=>toast("Saldo de "+nombre+" guardado ✓"));}else if(action==="agregarFeriado"){const inp=document.getElementById("nuevo-feriado");if(!inp||!inp.value){toast("Elegí una fecha",false);return;}const lista=cargarFeriados();if(!lista.includes(inp.value))lista.push(inp.value);guardarFeriados(lista);render();toast("Feriado agregado");}else if(action==="borrarFeriado"){const lista=cargarFeriados().filter(f=>f!==t.dataset.fecha);guardarFeriados(lista);render();}else if(action==="guardarGastosPend"){syncItemsFromDOM();guardarGastosPendientes(S.contratoActivo&&S.contratoActivo._id,S.form&&S.form.mes,S.itemsCobro);}else if(action==="removeItem"){removeItemCobro(+id);}else if(action==="abrirInquilino"){const nombre=t.dataset.nombre;const todos2={};S.contratos.forEach(c=>{if(!c.inquilino)return;if(!todos2[c.inquilino])todos2[c.inquilino]={nombre:c.inquilino,dni:c.dni||"",telefono:c.telefono||"",email:c.email||"",contratos:[]};todos2[c.inquilino].contratos.push(c);});S.inquilinos.forEach(i2=>{if(!todos2[i2.nombre])todos2[i2.nombre]={...i2,contratos:[]};else todos2[i2.nombre]={...todos2[i2.nombre],...i2};});S.inquilinoActivo=todos2[nombre]||{nombre,contratos:[]};render();}
  else if(action==="removeExtra")removeExtra(+id);
  else if(action==="addExtra")addExtra();
  else if(action==="closeModal")closeModal();
  else if(action==="abrirMigracion"){S.modal="migracion";S.migSeleccion={};S.migEditando={};render();}
  else if(action==="migEditar"){const _mc=S.contratos.find(x=>x._id===t.dataset.id);S.migEditando[t.dataset.id]=true;if(_mc)S.migSeleccion[t.dataset.id]=_mc.propiedadId||"";render();}
  else if(action==="migCancelarEditar"){delete S.migEditando[t.dataset.id];delete S.migSeleccion[t.dataset.id];render();}
  else if(action==="migConfirmar")confirmarMigracionFila(t.dataset.id);
  else if(action==="openContrato")openModal("contrato");
  else if(action==="openPropietario")openModal("propietario");
  else if(action==="openInquilino")openModal("inquilino");
  else if(action==="guardarContrato")guardarContrato();
  else if(action==="guardarPropietario")guardarPropietario();
  else if(action==="guardarInquilino")guardarInquilino();
  else if(action==="registrarPago")registrarPago();
  else if(action==="doLogout")window.doLogout();
  else if(action==="nav")go(t.dataset.sec);
  else if(action==="abrirManual"){S.modal="manual";S.manualTema=null;S.manualBuscar="";render();}
  else if(action==="manualVerTema"){S.manualTema=t.dataset.id;render();}
  else if(action==="setFiltroEstado")setFiltro("estado",t.value);
  else if(action==="setFiltroTipo")setFiltro("buscarPor",t.value);
  else if(action==="setLiqMes")setLiqMes(t.value);
  else if(action==="ipcMesPrev"||action==="ipcMesNext"){
    const base=S.ipcMes||mesActual();
    const [y,m]=base.split("-").map(Number);
    const d=new Date(y,action==="ipcMesPrev"?m-2:m,1);
    S.ipcMes=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
    render();
  }
});

document.addEventListener("input",e=>{
  const t=e.target;
  const action=t.dataset.action;
  const key=t.dataset.key;
  const idx=t.dataset.idx;
  if(action==="setForm"&&key)S.form[key]=t.value;
  else if(action==="setFormNum"&&key)S.form[key]=+t.value;
  else if(action==="setBuscar")setFiltro("buscar",t.value);
  else if(action==="setExtraDesc"&&idx!==undefined)S.formExtras[+idx].desc=t.value;
  else if(action==="setExtraMonto"&&idx!==undefined){S.formExtras[+idx].monto=+t.value;renderResumen();}
  else if(action==="setAlquiler"){S.form.alquiler=+t.value;renderResumen();}
  else if(action==="setFiltroEstadoSel")setFiltro("estado",t.value);
  else if(action==="setFiltroTipoSel")setFiltro("buscarPor",t.value);
  else if(action==="setLiqMesSel")setLiqMes(t.value);
  else if(action==="propBuscar"){S.propBuscar=t.value;renderParcial();}
});

function renderResumen(){
  const el=document.getElementById("rsum-content");
  if(!el||!S.contratoActivo)return;
  const c=S.contratoActivo;
  const f=S.form;
  const alq=+(f.alquiler||c.alquilerBase||0);
  const extras=(c.extras||[]);
  const totalExtras=S.itemsCobro.reduce((s,it)=>s+(it.monto||0),0);
  const totalInq=alq+totalExtras;
  const com=Math.round(alq*(c.comisionAgencia??5)/100);
  const netoP=alq-com;
  el.innerHTML=
    `<div class="rrow"><span>Alquiler</span><span>${moneda(alq)}</span></div>`+
    extras.map(e=>`<div class="rrow blue"><span>${e.desc}</span><span>${moneda(e.monto||0)}</span></div>`).join("")+
    `<div class="rrow" style="font-weight:600;font-size:13px;color:var(--naranja)"><span>Total inquilino</span><span>${moneda(totalInq)}</span></div>`+
    `<div style="height:6px"></div>`+
    `<div class="rrow red"><span>Comisión (${c.comisionAgencia??5}%)</span><span>− ${moneda(com)}</span></div>`+
    `<div class="rrow green" style="font-weight:600;font-size:13px"><span>Neto propietario</span><span>${moneda(netoP)}</span></div>`;
}

// ── ACCIONES ──────────────────────────────────────────────────────────────────
window.go=s=>{S.sec=s;S.modal=null;S.modalExtra=null;S.contratoActivo=null;S.inquilinoActivo=null;S.propietarioActivo=null;S.liqSeleccion={};S.filtros={buscar:"",buscarPor:"inquilino",estado:"activo",cobranzaMes:"",cobranzaProp:"",cobranzaBuscar:"",cobranzaEstado:"todos"};render();};
function go(s){window.go(s);}
function setFiltro(k,v){S.filtros[k]=v;renderParcial();}
function setLiqMes(v){S.liqMes=v;render();}
function openModal(t){S.modal=t;S.form={comisionAgencia:5,estado:"activo",tipo:"Casa",frecActualizacion:6,indiceActualizacion:"IPC",depCuotas:1,honMonto:"medio",honCuotas:1};S.formExtras=[];render();}
window.closeModal=function(){S.modal=null;S.contratoActivo=null;S.ultimoPago=null;render();};
function addExtra(){S.formExtras.push({desc:"",monto:0});render();}
function removeExtra(i){S.formExtras.splice(i,1);render();}

function saldosPendientesFuturos(c){
  const gp=S_GPEND[c._id];
  if(!gp||!gp.por_mes)return 0;
  let total=0;
  Object.values(gp.por_mes).forEach(items=>{
    (items||[]).forEach(it=>{if(it.tipo==="saldo")total+=(it.monto||0);});
  });
  return total;
}

function diferenciaUltimoPago(c){
  const ultimo=S.pagos.filter(p=>p.contratoId===c._id&&!p._eliminado&&p.estado==="cobrado")
    .sort((a,b)=>(b.mes||"").localeCompare(a.mes||""))[0];
  if(!ultimo)return 0;
  const totalCobrado=ultimo.totalInquilino||ultimo.total||ultimo.monto||0;
  const itemsPrev=ultimo.itemsCobro||(ultimo.extras||[]).map(e=>({monto:+(e.monto||0)}));
  const totalEsperado=(ultimo.alquiler||0)+itemsPrev.reduce((s,it)=>s+(it.monto||0),0);
  const dif=totalCobrado-totalEsperado;
  return Math.abs(dif)>1?dif:0;
}

function itemsAutomaticosParaMes(c,mesACobrar){
  const cid=c._id;
  const mesPrev=mesPrevio(mesACobrar);
  const pagoPrev=S.pagos.filter(p=>p.contratoId===cid&&p.mes===mesPrev&&!p._eliminado)
    .sort((a,b)=>(b.fechaCobro||"").localeCompare(a.fechaCobro||""))[0];
  const itemsSaldo=[];
  if(pagoPrev){
    const totalCobrado=pagoPrev.totalInquilino||pagoPrev.total||pagoPrev.monto||0;
    const totalEsperado=pagoPrev.alquiler||0;
    const itemsPrev=pagoPrev.itemsCobro||(pagoPrev.extras||[]).map(e=>({monto:+(e.monto||0)}));
    const totalEsperadoConItems=totalEsperado+itemsPrev.reduce((s,it)=>s+(it.monto||0),0);
    const diferencia=totalCobrado-totalEsperadoConItems;
    if(Math.abs(diferencia)>1){
      const signo=diferencia>0?"a favor del inquilino":"a favor de la agencia";
      itemsSaldo.push({
        tipo:"saldo",
        desc:"Saldo "+mesNombre(mesPrev)+" ("+signo+")",
        monto:diferencia>0?-diferencia:Math.abs(diferencia)*-1
      });
    }
  }
  const dep=c.deposito||{};
  const depPend=dep.pendiente||0;
  const itemsDeposito=[];
  if(depPend>0){
    const n=dep.cuotasTotales||dep.cuotas||1;
    const yaPagadas=dep.cuotasPagadas!==undefined?dep.cuotasPagadas:(dep.pagadas||0);
    const proximaCuota=yaPagadas+1;
    const esUltimaCuota=proximaCuota===n;
    const montoEstaCuota=esUltimaCuota?depPend:Math.min(depPend,dep.montoCuota||depPend);
    itemsDeposito.push({tipo:"deposito",desc:"Depósito cuota "+proximaCuota+"/"+n,monto:montoEstaCuota});
  }
  const hon=c.honorarios||{};
  const itemsHonorarios=[];
  if((hon.pendiente||0)>0){
    const nHon=hon.cuotas||1;
    const pagadasHon=hon.pagadas||0;
    const restantesHon=Math.max(1,nHon-pagadasHon);
    const proximaCuotaHon=pagadasHon+1;
    const montoEstaCuotaHon=Math.min(hon.pendiente,Math.round((hon.pendiente||0)/restantesHon));
    itemsHonorarios.push({tipo:"honorario",desc:"Honorarios cuota "+proximaCuotaHon+"/"+nHon,monto:montoEstaCuotaHon});
  }
  return [...itemsDeposito,...itemsHonorarios,...itemsSaldo];
}

function calcularItemsParaMes(c,mesACobrar){
  const itemsFijos=gastosQueCorresponden(c,mesACobrar)
    .map(g=>({tipo:"fijo",desc:g.nombre,monto:+(g.monto||0)}));
  return [...itemsFijos,...itemsAutomaticosParaMes(c,mesACobrar)];
}

function itemsParaMesConGuardados(c,mesACobrar,guardados){
  if(!guardados||guardados.length===0) return calcularItemsParaMes(c,mesACobrar);
  const obligatorios=itemsAutomaticosParaMes(c,mesACobrar)
    .filter(auto=>auto.tipo==="deposito"||auto.tipo==="honorario"||auto.tipo==="saldo");
  const tiposObligatorios=new Set(obligatorios.map(o=>o.tipo));
  const guardadosFiltrados=guardados.filter(g=>!tiposObligatorios.has(g.tipo));
  return [...obligatorios,...guardadosFiltrados];
}

function alquilerParaMes(c,mes){
  const base=c.alquilerBase||0;
  if(!c.inicio||mes!==c.inicio.substring(0,7))return base;
  if(c.montoMedioMesForzado>0) return c.montoMedioMesForzado;
  const[_y,_m,_d]=c.inicio.split('-').map(Number);
  if(_d<=1)return base;
  const diasEnMes=new Date(_y,_m,0).getDate();
  const diasVividos=diasEnMes-_d+1;
  return Math.round(base*diasVividos/diasEnMes);
}

function abrirContrato(cid){
  S.contratoActivo=S.contratos.find(x=>x._id===cid);
  if(!S.contratoActivo)return;
  const c=S.contratoActivo;
  S.modal="contrato_detalle";
  S.depCuotasCobro=1;
  S.form={mes:mesActual(),alquiler:alquilerParaMes(c,mesActual()),fechaCobro:hoy(),comprobante:"",estado:"cobrado"};
  // Cargar gastos pendientes de Firebase (cargados durante el mes)
  S.itemsCobro=[];  // limpiar mientras carga
  // Gastos que corresponden este mes según frecuencia configurada
  const mesACobrar=S.form.mes||mesActual();
  // Cargar gastos pendientes (sobrescriben si existen, sino calcular para este mes)
  cargarGastosPendientes(cid).then(()=>{
    const itemsPend=(S_GPEND[cid]&&S_GPEND[cid].por_mes&&S_GPEND[cid].por_mes[mesACobrar])||[];
    S.itemsCobro=itemsParaMesConGuardados(c,mesACobrar,itemsPend);
    render();
  });
}

// ── GASTOS PENDIENTES POR CONTRATO (persisten entre sesiones) ──────────────
const S_GPEND = {};
const S_GPEND_PROMISE = {};
let S_GPEND_TODOS=false;
let S_SERVICIOS_MES=mesActual();
let S_SERVICIOS_VALORES={};
async function cargarTodosGastosPendientes(){
  if(S_GPEND_TODOS)return;
  S_GPEND_TODOS=true;
  try{
    const snap=await getDocs(collection(db,"gastos_pendientes"));
    snap.docs.forEach(d=>{
      const data=d.data();
      if(data.contratoId)
        S_GPEND[data.contratoId]={por_mes:data.por_mes||{},_docId:d.id};
    });
  }catch(e){S_GPEND_TODOS=false;}
  render();
}
function cargarGastosPendientes(cid){
  if(S_GPEND[cid]!==undefined) return Promise.resolve();
  if(S_GPEND_PROMISE[cid]) return S_GPEND_PROMISE[cid];
  S_GPEND_PROMISE[cid]=(async()=>{
    try{
      const snap=await getDocs(query(collection(db,"gastos_pendientes"),where("contratoId","==",cid)));
      const docs=snap.docs.map(d=>({...d.data(),_id:d.id}));
      S_GPEND[cid]={por_mes:(docs[0]&&docs[0].por_mes)||{},_docId:(docs[0]&&docs[0]._id)||null};
    }catch(e){
      try{
        const snap2=await getDocs(collection(db,"gastos_pendientes"));
        const docs2=snap2.docs.map(d=>({...d.data(),_id:d.id})).filter(d=>d.contratoId===cid);
        S_GPEND[cid]={por_mes:(docs2[0]&&docs2[0].por_mes)||{},_docId:(docs2[0]&&docs2[0]._id)||null};
      }catch(e2){ S_GPEND[cid]={por_mes:{},_docId:null}; }
    }
    delete S_GPEND_PROMISE[cid];
  })();
  return S_GPEND_PROMISE[cid];
}
async function guardarGastosPendientes(cid, mes, items){
  if(!cid||!mes) return;
  const limpio=(items||[]).filter(it=>(it.desc||"").trim()||+(it.monto||0)!==0);
  if(!S_GPEND[cid]) S_GPEND[cid]={por_mes:{},_docId:null};
  const por_mes={...S_GPEND[cid].por_mes};
  if(limpio.length) por_mes[mes]=limpio; else delete por_mes[mes];
  if(S_GPEND[cid]._docId){
    await fbUpd("gastos_pendientes",S_GPEND[cid]._docId,{contratoId:cid,por_mes});
  } else {
    const docId=await fbAdd("gastos_pendientes",{contratoId:cid,por_mes});
    S_GPEND[cid]._docId=docId;
  }
  S_GPEND[cid].por_mes=por_mes;
}
async function limpiarGastosPendientes(cid, mes){
  if(!cid||!mes||!S_GPEND[cid]) return;
  const por_mes={...S_GPEND[cid].por_mes};
  delete por_mes[mes];
  S_GPEND[cid].por_mes=por_mes;
  if(S_GPEND[cid]._docId){
    await fbUpd("gastos_pendientes",S_GPEND[cid]._docId,{contratoId:cid,por_mes});
  }
}

// ── SALDO DE PROPIETARIO ENTRE LIQUIDACIONES ────────────────────────────────
const S_SALDO_PROP = {};
const S_SALDO_PROP_CARGANDO = {};
let S_SALDO_PROP_TODOS=false;
async function cargarSaldoProp(nombre){
  if(S_SALDO_PROP[nombre]!==undefined) return;
  if(S_SALDO_PROP_CARGANDO[nombre]) return;
  S_SALDO_PROP_CARGANDO[nombre]=true;
  try{
    const snap=await getDocs(query(collection(db,"saldos_prop"),where("propietarioNombre","==",nombre)));
    const docs=snap.docs.map(d=>({...d.data(),_id:d.id}));
    S_SALDO_PROP[nombre]={monto:(docs[0]&&docs[0].monto)||0,_docId:(docs[0]&&docs[0]._id)||null};
  }catch(e){
    try{
      const snap2=await getDocs(collection(db,"saldos_prop"));
      const docs2=snap2.docs.map(d=>({...d.data(),_id:d.id})).filter(d=>d.propietarioNombre===nombre);
      S_SALDO_PROP[nombre]={monto:(docs2[0]&&docs2[0].monto)||0,_docId:(docs2[0]&&docs2[0]._id)||null};
    }catch(e2){ S_SALDO_PROP[nombre]={monto:0,_docId:null}; }
  }
  S_SALDO_PROP_CARGANDO[nombre]=false;
  render();
}
async function cargarTodosSaldosProp(){
  if(S_SALDO_PROP_TODOS)return;
  S_SALDO_PROP_TODOS=true;
  try{
    const snap=await getDocs(collection(db,"saldos_prop"));
    snap.docs.forEach(d=>{
      const data=d.data();
      if(data.propietarioNombre)S_SALDO_PROP[data.propietarioNombre]={monto:data.monto||0,_docId:d.id};
    });
  }catch(e){S_SALDO_PROP_TODOS=false;}
  render();
}
async function guardarSaldoProp(nombre, monto){
  if(!nombre) return;
  if(S_SALDO_PROP[nombre]&&S_SALDO_PROP[nombre]._docId){
    await fbUpd("saldos_prop",S_SALDO_PROP[nombre]._docId,{propietarioNombre:nombre,monto:+(monto||0)});
  } else {
    const docId=await fbAdd("saldos_prop",{propietarioNombre:nombre,monto:+(monto||0)});
    S_SALDO_PROP[nombre]={monto:+(monto||0),_docId:docId};
    return;
  }
  S_SALDO_PROP[nombre].monto=+(monto||0);
}

const S_AJUSTES_PROP={};
async function cargarAjustesProp(nombre){
  if(S_AJUSTES_PROP[nombre]!==undefined)return;
  S_AJUSTES_PROP[nombre]=[];
  try{
    const snap=await getDocs(query(collection(db,"ajustes_prop"),where("propietarioNombre","==",nombre)));
    S_AJUSTES_PROP[nombre]=snap.docs.map(d=>({...d.data(),_id:d.id})).filter(d=>!d._eliminado);
  }catch(e){ S_AJUSTES_PROP[nombre]=[]; }
  render();
}
async function agregarAjusteProp(nombre,desc,monto){
  if(!nombre||!desc||isNaN(monto)||monto===0)return;
  const data={propietarioNombre:nombre,fecha:hoy(),descripcion:desc,monto:+monto,liquidacionRef:null,_eliminado:false};
  const id=await fbAdd("ajustes_prop",data);
  if(!S_AJUSTES_PROP[nombre])S_AJUSTES_PROP[nombre]=[];
  S_AJUSTES_PROP[nombre].unshift({...data,_id:id});
  render();
}
async function borrarAjusteProp(id,nombre){
  try{
    await updateDoc(doc(db,"ajustes_prop",id),{_eliminado:true});
    if(S_AJUSTES_PROP[nombre])S_AJUSTES_PROP[nombre]=S_AJUSTES_PROP[nombre].filter(a=>a._id!==id);
    render();
  }catch(e){toast("Error al borrar",false);}
}

function mesPrevio(mes){
  if(!mes)return"";
  const[y,m]=mes.split("-").map(Number);
  const d=new Date(y,m-2,1);
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
}

async function cobrarPago(pid){
  const p=S.pagos.find(x=>x._id===pid);if(!p)return;
  const upd={estado:"cobrado",fechaCobro:hoy()};
  await fbUpd("pagos",pid,upd);
  S.pagos=S.pagos.map(x=>x._id===pid?{...x,...upd}:x);render();
}

async function registrarPago(){
  const c=S.contratoActivo;if(!c)return;
  const f=S.form;
  if(!f.mes)return toast("Ingresá el período",false);
  syncItemsFromDOM();
  const alq=+(S.form.alquiler||c.alquilerBase||0);
  const items=S.itemsCobro.map(it=>({tipo:it.tipo,desc:it.desc,monto:+(it.monto||0)}));
  const totalItems=items.reduce((s,it)=>s+(it.monto||0),0);
  const totalInq=alq+totalItems;
  const com=Math.round(alq*(c.comisionAgencia??5)/100);
  const neto=alq-com;
  const nro=f.comprobante||nroRecibo();
  const data={contratoId:c._id,inquilino:c.inquilino||"",direccion:c.direccion||"",propietarioNombre:c.propietarioNombre||"",mes:f.mes,alquiler:alq,itemsCobro:items,extras:items.filter(i=>i.tipo==="fijo"),totalExtras:totalItems,totalInquilino:totalInq,comision:com,netoPropiertario:neto,total:totalInq,fechaCobro:f.fechaCobro||hoy(),estado:f.estado||"cobrado",comprobante:nro,comisionAgencia:c.comisionAgencia??5};
  const id=await fbAdd("pagos",data);
  if(id){
    S.pagos.unshift({...data,_id:id});
    // Limpiar gastos pendientes después de registrar el pago
    if(c._id) limpiarGastosPendientes(c._id, f.mes);
    // Si el cobrador dejó el item de depósito en el cobro, avanzar la cuota en el contrato.
    // Si lo borró a mano (decidió no cobrarla este mes), no se toca el contrato.
    const itemDep=items.find(it=>it.tipo==="deposito");
    if(itemDep){
      const depActual=c.deposito||{};
      const montoPagado=+(itemDep.monto||0);
      const nuevoPendiente=Math.max(0,(depActual.pendiente||0)-montoPagado);
      const nuevoPagado=(depActual.total||0)-nuevoPendiente;
      const yasPagadas=(depActual.cuotasPagadas!==undefined?depActual.cuotasPagadas:(depActual.pagadas||0));
      const nuevoDeposito={
        ...depActual,
        pagado:nuevoPagado,pagadoAcumulado:nuevoPagado,
        pendiente:nuevoPendiente,completo:nuevoPendiente===0,
        cuotasPagadas:yasPagadas+1,pagadas:yasPagadas+1
      };
      await fbUpd("contratos",c._id,{deposito:nuevoDeposito});
      S.contratos=S.contratos.map(x=>x._id===c._id?{...x,deposito:nuevoDeposito}:x);
    }
    const itemHon=items.find(it=>it.tipo==="honorario");
    if(itemHon){
      const honActual=c.honorarios||{};
      const montoHonPagado=+(itemHon.monto||0);
      const honNuevoPendiente=Math.max(0,(honActual.pendiente||0)-montoHonPagado);
      const honNuevoPagado=(honActual.pagado||0)+montoHonPagado;
      const cuotaNum=(honActual.pagadas||0)+1;
      const nuevoHon={...honActual,pagado:honNuevoPagado,pendiente:honNuevoPendiente,completo:honNuevoPendiente===0,pagadas:cuotaNum};
      await fbUpd("contratos",c._id,{honorarios:nuevoHon});
      S.contratos=S.contratos.map(x=>x._id===c._id?{...x,honorarios:nuevoHon}:x);
      const cajaData={tipo:"honorario",fecha:f.fechaCobro||hoy(),monto:montoHonPagado,concepto:"Honorarios — "+(c.inquilino||"")+(c.direccion?" ("+c.direccion+")":""),detalle:"Generado automáticamente al registrar cobro de "+mesNombre(f.mes),inquilino:c.inquilino||"",cuotas:honActual.cuotas||1,cuotaNum,recuperado:false};
      const cajaId=await fbAdd("caja",cajaData);
      if(cajaId) S_CAJA.movimientos.unshift({...cajaData,_id:cajaId});
    }
    toast("Pago registrado ✓");
    S.ultimoPago={...data,_id:id};
    renderParcial();
  }
}

async function actualizarAlquiler(cid){
  const c=S.contratos.find(x=>x._id===cid);if(!c)return;
  const pct=prompt("% de aumento "+(c.indiceActualizacion||"IPC")+" para:\n"+c.inquilino+" — "+(c.direccion||"")+"\n\nEjemplo: 12.5");
  if(!pct||isNaN(+pct))return;
  const nuevo=Math.round(c.alquilerBase*(1+(+pct/100)));
  const upd={alquilerBase:nuevo,ultimaActualizacion:hoy(),pctUltimaActualizacion:+pct};
  await fbUpd("contratos",cid,upd);
  S.contratos=S.contratos.map(x=>x._id===cid?{...x,...upd}:x);
  toast("Alquiler actualizado a "+moneda(nuevo));render();
}

async function guardarMontoMesParcial(cid){
  const c=S.contratos.find(x=>x._id===cid);if(!c)return;
  const inp=document.getElementById("monto-mes-parcial-"+cid);
  if(!inp)return;
  const monto=+(inp.value||0)||null;
  const upd={montoMedioMesForzado:monto};
  await fbUpd("contratos",cid,upd);
  S.contratos=S.contratos.map(x=>x._id===cid?{...x,...upd}:x);
  toast(monto?"Monto del mes parcial guardado: "+moneda(monto):"Monto del mes parcial borrado, vuelve a prorratear por días");
  render();
}

async function guardarContrato(){
  const f=S.form;
  if(!f.inquilino||!f.direccion||!f.inicio)return toast("Completá: Inquilino, Dirección e Inicio",false);
  if(f.tieneDeposito!=="si"&&f.tieneDeposito!=="no")return toast("Elegí si el contrato lleva depósito de garantía o no",false);
  let propId="";
  if(f.propietarioNombre){
    let p=S.propietarios.find(x=>x.nombre===f.propietarioNombre);
    if(!p){const id=await fbAdd("propietarios",{nombre:f.propietarioNombre,telefono:"",email:""});if(id){p={nombre:f.propietarioNombre,_id:id};S.propietarios.push(p);}}
    let pr=S.propiedades.find(x=>x.direccion===f.direccion&&x.propietarioNombre===f.propietarioNombre);
    if(!pr){const id=await fbAdd("propiedades",{direccion:f.direccion,tipo:f.tipo||"Casa",descripcion:f.descripcion||"",propietarioNombre:f.propietarioNombre,propietarioId:p?._id||""});if(id){pr={direccion:f.direccion,_id:id};S.propiedades.push(pr);}}
    propId=pr?._id||"";
  }
  const alqBase=+(f.alquilerBase||0);
  const honMonto=f.honMonto||"medio";
  const honCuotas=+(f.honCuotas||1);
  const honTotal=honMonto==="mes"?alqBase:Math.round(alqBase/2);
  const deposito=f.tieneDeposito==="si"
    ?calcularDeposito(alqBase,+(f.depCuotas||1))
    :{total:0,cuotasTotales:1,cuotasPagadas:1,montoCuota:0,pagadoAcumulado:0,pendiente:0,completo:true,cuotas:1,pagadas:1,pagado:0};
  const honorarios=honCuotas===0
    ?{total:0,monto:"ninguno",cuotas:0,pagadas:0,pagado:0,pendiente:0,completo:true,sinCargo:true}
    :{total:honTotal,monto:honMonto,cuotas:honCuotas,pagadas:honCuotas===1?1:0,pagado:honCuotas===1?honTotal:0,pendiente:honCuotas===1?0:honTotal,completo:honCuotas===1};
  const gastosConfig=(S.matrizTemp||GASTOS_DEFAULT).map(g=>({...g,mesInicio:g.mesInicio||f.inicio||mesActual()}));
S.matrizTemp=null;  // limpiar después de guardar
  const data={propiedadId:propId,propietarioNombre:f.propietarioNombre||"",inquilino:f.inquilino,dni:f.dni||"",telefono:f.telefono||"",email:f.email||"",garante:f.garante||"",direccion:f.direccion||"",inicio:f.inicio,fin:f.fin||"",alquilerBase:alqBase,comisionAgencia:+(f.comisionAgencia??5),estado:"activo",extras:S.formExtras.filter(e=>e.desc),frecActualizacion:+(f.frecActualizacion||6),indiceActualizacion:f.indiceActualizacion||"IPC",notasActualizacion:f.notasActualizacion||"",deposito,honorarios,montoMedioMesForzado:+(f.montoMedioMesForzado||0)||null};
  const id=await fbAdd("contratos",data);
  if(id){S.contratos.unshift({...data,_id:id});closeModal();}
}





// ── HELPER PROX ACTUALIZACIÓN ─────────────────────────────────────────────────
function getProxActualizacion(c){
  if(!c.frecActualizacion||!c.inicio)return null;
  const baseStr=c.ultimaActualizacion||c.inicio;
  const [y,m,d]=baseStr.split('-').map(Number);
  return new Date(y,m-1+(+(c.frecActualizacion||6)),d);
}

// ── RENDERS ────────────────────────────────────────────────────────────────────
function renderLogin(){
  $("root").innerHTML=`<div class="login-wrap"><div class="login-card">
    <div class="login-logo"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAABGCAYAAAAHFFAPAAAZpklEQVR42u18eZRdZZXvb+/vTPfWmMiQkDCEhGAnISAJgihUSkSQQWift7RbGmQwiC3QDDa07fPmOkAzRXxiKxBksu1+dVfbzynQmn5VpSDKgxalExmSkJBASAJUVXLrTuf79u4/zq2kMqdyb3wUi7PWXlmpVTnZ59tn/77f/u39HcLb6FIFYQGIchAAqN436URlc54STgHrNCEap8SGPRSZ6RUy9LQyHinCLR7356sHAEC7YagL7u2yJvS2CW4WPBzY8ncmnUUBXytARxSxpwCsKhwIAIF9wPcYFCR/tyqrlPn+4mD1W+2fern/7RTkt0WAhwPy6jcnHDg+8r4VBvwJMFCsKpTgYIiIQcREIAIZqBKBGAJiCkMwNRu4iqy2Vq+Kzl3x47dLkPntEtw3bjt41rsC/nUY0icKJXGFkjgAIIIhgGnbl5mSUMMQgSuxamXAWgMcHqb4R+WfTf076oLr6enw3sngtwAsD37jkKPDAH2+TwcPVRGzIR8MEFPyCjOBan/WMjj5GQFgBlhBTFCCkIEG7b6JB6tfDs5e+VXt6fCos8++k8H/PwgVAF30rhbD+qPA0MGFsloi8nfyu6Ja24YVTgFb25Z1m7edwCrE8aC1fqv/Ffvo9E9QZ5/Vbph3AvynvvK17O3372hK89GFssZM8LYLrKpCmiLidDN76TSbVIpMqom9KM2eYZBi232WCKQAu7KIGtw9tOSoSchANDs212pMOq2ZZN8dun3inCjgywoFcUTYJnNFoZ4hakoxl2P9f6Uh+XKxJB+rlOWsckHmV0ryz0JUilJsdggyiF1VxGsybb7DV4igmJkZk9vZmHR6mFgN3j7hf7emTdemilhm8pL9lqGARhGREvU7xVXpS1/+/k7v88Mp02PmO/2IPlIpqyOGAVGyH7OqMawwiGOLP0ud8cJLI0uxdzJ4P13ZLJi64Aq3HjiBgbOLZQFh6x6pqhr4pArtj8t0WvrSl7+vWbD2wNNuGO2G0Sw8zcKjj730QnD+irPikvuXMG2M6tZMJoCcUzFNHBqjfwEAmNcx5tZrzDm8oOazEs9rjqgpFrjtkEgDn7hUlc82f27177QbAeUg1AlLXXDUBUc5WMrBajeMKuiVAbk4LssLfkCsUBlRSxGsKimdCQDo7ZN3AvyngmnBiSAo0VYmrIBripiHivLb9ite7e7JwqMuVHe5P3XBobfDTLl4dVmdfo0DouQ2W+7HqCopYYb+4sg2ykGG2ftYucZeIT9zOAA6FQLCNguuyh6ACnXr3vKLeX1OAUKzv7haqG7yfW61Ck0qZpB1CiIaX1FzCIDBGlroOxm8v66lyeKqol13WGZitQAYzxKgW1+G3bBMghKgdPpzbyjwEvsE6NY7q0A9n4g9r7VWno2pDB67dTDtPHgiCnVa2RfRBIQyktTd8d7xO0LHnwqia8GgN2l77xVqPIJHNFEVhKV7zjZNdGnVp+b4EJoAm/xsywIxKI5VhewmAEBm7MDzWIVoAgBSXV7r/m1dcEpy0UE+RLSXgegGaxZcXTs4ywR0aDUWrSnXUECNIQDoD/30uq3vxDsB3v8ITfokBNiGZCmZclnV8ylTuOvwCVgAtycdeSlmGMpBxOnVXkgMbFMLC3wCAS9S5+8HVJNsfyfA+/cSAGCVxzeXpWQYZjiriECxU4kCboPvvksERRdEe+CNLG80yXXWp+b4s7qWVQv5Kef4EV9YHRIByBspmsAnheKxpA7uGHNNhzEXYMolwn/TDW+8qorHmkJSVYwUJ0yhKK4pzeeV7zv0PnxzWkCdsMOZpwoiQIkgNPfpuPyvUz8ahvQv4hSyXY1LREkdbOQnAICNfTrW1musNrQZgCj4ARCdvv22SARTGBLX3GwuqXBlbuXBw2+pUnlJy4XrNxBB9f7Do7iVjyGiy9nQpU4V4lTZ2ybLJQiJ4pIsf2EweKIGz2NuwmNsNhtqfr+anZhqbtXnooAnVwRKDAZzrbkPgMilU2TIZxQrboCIVoGoCkMH+QEf4aUI5SIUrGBDVPs3tea/2KA98OLN9ovBGS/ePFYb/2N2okOz8CgHu3nhhGuam8zCzWW1xPBGBjjpCkFApEEA4we8RdkoO4AIjpjN8ETHcIBBpBwAUNpUhp3efMbKjUk9BR2LUDc2rwVw2Sy4OOjuLZTcmtAjo9ixlUcAE8HEFlosqxTL6sqxSlJh7Yphq/OamCC4q+WMlRugGR6LwR3jZRJ0wUzQwbmNBVF8KUgaBbKb3yeiJNi02+dW8QJmu9mt91z5jmSSIy9jdZ3G9FQldSV1bus1rz1cGJJfNUfkqWp9REghHBGL4It0zsv9mJmhsZq9Yz7ANaVCCVCIu6ISa9UzhO2H6fa6wFa4oNl41U3SG561/HvJ5Eh+TM9Gj/kAUw7Sk4XXcu36pWWLL6VSbIDRlzOqUM8j2IoMiZPPKEBjTXd+e2YwgHm5BKrHXfXqbZsLbklzmj2RUQfZeSk2UnFXpc5bsRzdYCLIOwHe+3Jsf9jwzRVLoaogrpoLK1V5LQyIRfcuQCpqw1bjVQbtQ+H5L31Pezq8EcdWaH/7P7brYFUCke7nZ0hkyNq0Zf+3J3WmU/wfzkGEwJScTdrpyQYhcqlmNnEV/+m3xu/HxtUxMhAi6J/S97EZ4K0L5M2Zfzfh6aeBOfXftvn5iVo4eh09fc898S4FkO9O/uvmVnNXqSyxEvk7C7ACEkTMQlhvq+7E9MdXrVbdAs0EQKcBIa68EnixgetyFLD8W9+qjO0M7u426OpyU7777+fyU7+8U1c+pwhDhjbghVVSYiIArzRZOvMPJ08tIZfTLZncA486YTfdM/nOlnZzdXFIY2L4IwOsRGJ8Iva4UqzEH2zrWv3ElhOFNd+P/PYjZ9PvHv+2vrxc4IemIb4ThJhZRVe5As5YPe+I6kjfx0aAs1kGFuCw6Gdt/jj/v7hUPER+8cMtikOD0AEchIjLxbtWPfqDK9HR4aEv0YoVIGRhKAdbvO+w7lQrZ4pDLibDfk2qVOOTmoCoWpTzm/5y1Y+HXwqoEhaApo1/xNeA/8CV0nT3Hz8CUW0MrxFhUAEHEeJK8Y5VP33o+pG+jxGSNY+RIzHNspDD8BDX3BTrjPcIqhVJxtikfoOKVMvW84PPTz3rwk709VlkMmYL6VoAp1lwyh74qdKQLEk3G1+SA2hqDDQIiOOy/lUS3I4kuACQByNH4oz7PEfRdNfUFOPoYxTVcgN9h7i4Yj0vuPbIcy96/0jf3/oB7u42yHXaI+/6yVmmueXTrlR0sLGPo2ayTpzMai0rG1bi+g3ESqRKdO/Bp1/QNBKVtqhPlz9tBzdWzq+U5LGmJvbYwAUBc7ksF6U/+dI/JZlby55slpGBHH7XTyew739J4oogjj06aibpwZMS341hZa7bALAyEZi/NzlzTWp/IWpjA6xKWJrRaQ//ppUC/zvqnIJBNckfOO4kIAhr/zMPd2723QyzOhETRlPTId+MfN6hY+vUBeUgyIImfmH9UOHN4OxKSZ+IUuwNFd2n0p9c9dAWWB6+Zs4kEKlh+hqnm9pVnICIlBk45gTAD2obANVvzCzOWQ5T0/3K4E3b+/7WDPCCXoMciQy9eTunWw5TGwsxMxkGOQcafwBo5ntALgYx12/EIMPG2aozfnjl1I9uC9XDQdYs+ICrl2+qUuWjhYLrbLlg9Q+0G2ab4NaI1dS7HzmeotSnXanoiNgQ13x/14Ggd88GrAWMaUiQmdmTOHYmCP7miI9dcur+gGqvodDc1Wmn3Pvo6RymPuOKBUdMW51lAuIqcNQM6PpXgA3rkozQhrAWUoIKe/dMPGf+sevQXxlZYw4fOSFa9zqA3lop5HZ+Jyw0vmdcXHXg2swm1XyfNgPYuA54fT3g+XX7rlt8JzB59048Z/57tvf9rZHBqoRMRmd09zQzm7uhyTdOks8jjLAEmkDHvXcEVDcA7ohZxTkvSE2LjL0Z+bzr2A7uiBKlS7thdpAgu9Wgq8tNW/TzjNfU2iHlkiPDBrSd74ZBs4ehGo2BamIWsZaDaHrkSw2qs+YtBdEdC3oNiKQyWLnFa26ZgmpFmJl3fBYCOQsafyB4xrGAjUFssMOLsA9GbIyLq84E4VVTz7t0Xt9O4I4IusOXc1QJS6ET7/5xGkS3wMVKTLRL38cdAH737MR30xjfmY0RW7UmjK6elvlMB/pyDYPqugOc6e42fblOe/SiRzuDdNPnMFRwxrBJOuu8ozHDxFWY6TNBEyZDbdwQwqVEBAIpkYpv7pl4zvz03jDTTK0savXDa4OWtikUV8Uw8y59t1WYo/4MPGES1FpQo3wHGEQQ8u6bfcF1TY1i1Vw3NAOYc/dTafb8exhQJiVm2s0LS+CERMI/7gTADxsHd8yszooXpI6KQuwZ7rJZzmcgM7/36KHs+TegMiTMzIl/u/KdwMzwZs8FfD85p9Yg352zjsPU1E3VoX9oFFRzvdCc7+pypaD/pqClbZrGFcdsmImxW2MDdhbe+APhzzwWsBZkTGOYtTEJqw7Cq4/IXLFbuMvUyiKQf5OfbmmGFWVm2r3vnPg+7gD4M46FOgtwY1g1MRuxFecF4eendl3R2QiopnqgOd/V5WY/2PMBDoNfSrUqgPKo72kMSr9aArvxNZAfAFJnC5YIUBHyfBbnXowlPHYt1laRz8tIZjrs/6wHe99nQv9xTfwf1WKSMSj9umer7w2oCFRV2PNInKxsZv/YP1ReLm/v+/7P4Bo0d9zfExnD9xpmYlIyxGSIMBrziJE+7oRkgYYFkHqMCGDDIs6ZMHWUz+VdQ7UqeSQLPc8jBjBa35kIqdlzgSCEqCafG6jTEqh2jqNo6iZXuaVeqN6nf9gxb563+Jxz3PjMRTeFLe3nudKQNcwmQRoananAa2kDEaG6bi3YD0Z/j50ak4oT4wcnt846vmfgp7e/hEzGYNkyzXSryXfNcnOPmvdXfkvblTJUcMaQ2Sffm1tAbFB9bW1SGzeGT7A6Z00QnjRu5tzH+n9y64ph3/c7RA9D23sf7jkJqdTjGscKFa6b8RmDwV8uQXXjesdBYBoHdz6rsy9Uq+a4tVhbxYwZCizAyYc+3hQ3yTIy3iS1sdbDR8gYDP66F9UNr4F8vzHijaqQ55OKWxU1V2Yv27ixhHy3AKMbQOB9geZpixeHFHj3eoaZIWSYyDBhn60Gea3vOQFea5tRVVXmhsCdiLUcpacHgXwd+bybNn68jxyJpN0NYUvbZLLWGWaux3cmQsuxc0BBoKoqjaiNYQyLOOEoNaW0KbwtgeoFZr9mcEdPj9fX2Wnf94O+r/vt474YbxqwRNQYuVNVKQhs/29+tbj86ivngYcPi9SdDQoiIWMMgeYtv/+2vhMe/MX0oKn5GVUJ4VyCt3X2pskPMPTScgz+1zPJDxrWPIZlL/CkXPnwS99f+AtkMgb5vR/l5dFAc19npz05/9hcL526wRULznAiaNRrAGzQNo5g4weW3fqF8+GZJymISImcsoEy12GGFCCwgVNdNO3MK8Mgnf6Kn0qnyA2XRfX5T0TKRNp85NS15Pm/ZT8gkMqWhkgdBgIDqhSYe46+5AstyRaj1OAAbxE0fANaZIxnOFHsG7A4ED+MjBQLL1OMG6BK5JlLRLVCxoCItL7amEDGsDinAKb5Myc94gfBeVIs6LDiVpcxgYjEb2oizwu+tuG55ecKUxGer0KkwoR6TNmwE+cQpY8oK25DLiejgWreO2hOBI3m8aW/D9vaj0W5bE2iaKBeM2zE830iF1/+2KdO6Z921f8KViy6dak6m6UoZYTglBqyHxMIWils6qxsWB8Z36fhH9djBEiQSrPbPPjH8osrHio8lt/onPtbBJERwAkxhKguU2bPVsuWoujyQy+58cOjEUBob1lzx789dpzvpZ4UZxnSANacEEUXtLab6qaB+3r+x/svq+3xDpluxoyletja8uMcBCdpteJAZOrciQEiSFyVsK2dD5t3ekOacgo4P9Vk4qFNZ/d8/AOLZ2SzwbJcrnr4ZTcu4TA6TaplB5BpIKte44f+McvHo4AFC3RPY728Z9acQaZbTUjeIt/3fKOKulkzEwxBgijFUiysMa3hdVlV7ps3zwFQzFiqyOVESS9T0QqMB4C0Pq03GSwxYcTlwQG8+dxSBEEIA+zzMzDBpZpbjBQ3P9Lz8Q8sznR3m2XLljkApD7mi3MFeD5ApIkAX4cZZhErHKUOq1QqdyCXEyzYM1TvNsAdvb0m30Vus/ebG6PW9jlaKluPyYxW8dmpMavv++Q5uXzJ6XMHl+XzW4fMczlBNuutWXTrUqhbwFHKgMklSlV95YcS4EUR3lz5Ioob1iMIgyTIo/UfpL4xhLhaDcLoOkBpRiajw8rTy9/5h5UiNoFqohpU12fKxthqxXKYvmzy/L8/E7mcRabb7BNEZ1U5RyRn/+TJWeT5T6uIgXP1Q3MiFbugdZypDvTfv/jPT7pkuPza4TdrUH3oa/bXHIQnSiOguvYA4hyi1lYc3XFaraLRUT6DurCt3VQG3rxz8fnvuyajavJEbkSnykMuZydf8aWfmzB1ulRKDsR1CjgEQBKodm5NaGiPUL2rDKZleVA2q8zAoiAIAxaB4dFrzdsag0EShCmW4tCapuYDr8mqcl9vr+x8e8sn2WzoUhGtwPMSuKu//woOAhQHB/Da839EEARgIOn37o0GDZIgjMgNFTbYSL+azWY5v+PhcwFARsx8cXYzjE8KaH0lX8KqxVlHqfRhJScL9wTVvAtBw+S7yD0z97fXp9rHnyilovUSsadO1gl4zOIHAZG4z+ZPn5pAcy638xZSPu+QzXpr/vFrS0XiHEUpowS39WH31RgCwIQR1q14EZs3rkcQhmBosrfulvUzmKBBOs2k8uWfn3nym72YxztkUC4n6O7m1XfnVonI9RpFLMSuXkYtRBA2nq2ULUWpSyd8LnvW7qCadgXNH3v0D+82TL+Dii/OciOOJKiKC1vbTXmg/4F/O/eEi3cBzdgVVB/yJj3BfvDeLVBdJwMmIjhn0dTahuNO7RwB1bQb1qzOj9ImLhefMYXj5wJ55Lu6dt3Oq01rHvL5Bf/OUerDUik5Im4Iq4bnkYq84sMes7odm3YG1bwDNAMEVfLU3huEQURiE2hmoB5jggRRxFIsrJVm75oRrHnPlUiNVTvSS1W0SsZrgACSvLOeH2DzwADWPP8coi1QvWvzmBMWrXpdvmvLnrvrV23pUgVAEpr56uxmMgElX7mufwIEzomJUpOryt/YFVSb7bXmxVOmuE++7/y/SbWPm28Lmy0ze42QI5nYBVHKSKX0l/96+pxnD5o5k5fNmrV33f2+PkU26w3dmnut9b0dwummD0lsHXGi5dVdOnkeBt58A+PfdQBaWtugIrUJju2eAXBRS6uxxcIPu8+ac8uwRrA3vhduzvY3nzRvI0Wp88Q6p0TcgP5xbXg+Oj4955Snh25d8Bwy3QbL8roDRNegWf/i5/85zfOjZ6ASirUMqlfQIKiIi9raTWlT/wP//OHj9xaad7xRdzcjD0yc9MITFEQnaLXcEFYNIjhr0dLahpNO7dgK1bQtNtdOy1QZOuuhD85amQUoR7R3L2mNVR98zdcXmyj1ESmXGuO7QsgzpCKvhjaatbp9YBuo3gLRvb29DEANzD1+GKbVOexxPmkvjADxo4jj4tArgT9uNNC846MsXarIdzlH3qWqUoXnAVy/iKAEeEGAgcEBrHjxeYRBUDtts+1zhK1trC7+xkOnHbMiA/BeB3cLq1YyFF4u1g6S5ydQXbcAQqzihFPpSWVTvHN7qOaRbcALlvz+r1Pjxs2zxSFrzPCERn0IyMzihSHB2c8+2DllYBtBY7RXTQDZ8I0bn3XOfgWptBHULyIoMRwAPwyxcsVyvPH6xiTItfUnSl5SW9j0SpiObs6q7qws2rPv3Xl+deH1a1Ti64ZZdSN0dmU2rly2lGq66KBrb/oocjmL7oRVU1aVc4BevOTZKZQKf68iabW2/h4pEkEjah9nygP9Dz542uxP7yM075xVZ4CDnlr5G/KjuYlWjQYIIATrLNra2nDqKR0jW9Uuam0zpcHBix467ZiHdhA1RnPVoPqgv731ZxSlztJSsbFQrbouqNAxa1s3DQAA9/b2MoiUfL47iKJmclaZiepFDqqxZjtUeCUdYHeCxj7o+3mgq8uB/EugWt3SVqy790rwgwD9AwN44YXnEYUBCOKi5mYTbx787YMfnPVwprt734M7DNWq5Fn+LGw8QJ5PSUWQfAR1n80krJqj1CEVX75Z0xaY+zo77WX/99lLU+3jPhQPFWwyvUJaB2NWTo5gqh9FBLFXfOeU2f3L8ti1oDHaqyaAbLjlumeds19FU7MRsBNm1Nt/TaA6wvMrVmDj669rFEWACAx711IjPshS2yNfXXj9GnFyjaZSNQGEtWb7uNWQijHsymVL6fQFB9x4+znI5Sxd8tgfj/aYn2RjWiWO69YzErXUadQ2jsoDbzxw76nHXNwgaN45qwZwwDNrH6cwOlHLZR0eEalXAImtRXtLi5x99jlc2Tz48KJTZlyYTGNSY758V4PqA/7ujv9D6abztFRUMNd/AFwV5PkQZ9fBVOZ6vuqtJvA9VyoNJnWl1nt/9YIQ8dDmDUFors9ms4zeXulDwy9FPp9k8xcXfg6KJeSZQFWpAXsAgiDQ/s2b6dlnf1/oOvsj/xOqNKOxH0oRAORYrzQ2Ph7Ga4M41M19iKC2KuSH7RrLV/8bdWAJDYuVSZoAAAAASUVORK5CYII=" style="height:48px;width:auto"></div>
    <div class="login-title">ECKERDT</div>
    <div class="login-sub">Gestión de alquileres</div>
    <div class="login-sub">URDINARRAIN · ENTRE RÍOS</div>
    <div class="login-form">
      <div><label class="lf-label">Usuario</label><input id="l-email" class="lf-inp" type="email" placeholder="usuario@ie.com" autocomplete="email"></div>
      <div><label class="lf-label">Contraseña</label><input id="l-pass" class="lf-inp" type="password" placeholder="••••••••"></div>
      <div class="lf-err" id="l-err"></div>
      <button class="lf-btn" id="l-btn" onclick="doLogin()">Ingresar</button>
    </div>
    <div class="lf-foot">Acceso restringido · Solo usuarios autorizados</div>
  </div></div>`;
  setTimeout(()=>{const p=$("l-pass");if(p)p.addEventListener("keydown",e=>{if(e.key==="Enter")window.doLogin();});},100);
}

function renderDashboard(){
  const activos=S.contratos.filter(c=>c.estado==="activo"||!c.estado);
  const hoyD=new Date();const mesHoy=mesActual();
  const proxMesI=new Date(hoyD.getFullYear(),hoyD.getMonth()+1,1);
  const proxMesF=new Date(hoyD.getFullYear(),hoyD.getMonth()+2,0);
  const pagosMes=S.pagos.filter(p=>p.mes===mesHoy&&p.estado==="cobrado");
  const inqPag=new Set(pagosMes.map(p=>p.contratoId));
  const propCob=new Set(pagosMes.map(p=>p.propietarioNombre).filter(Boolean));
  const propTotal=new Set(activos.map(c=>c.propietarioNombre).filter(Boolean)).size;
  const comMes=pagosMes.reduce((s,p)=>s+(p.comision||Math.round((p.alquiler||0)*(p.comisionAgencia??5)/100)),0);
  const comObj=activos.reduce((s,c)=>s+Math.round((c.alquilerBase||0)*(c.comisionAgencia??5)/100),0);
  // Propietarios con cobros registrados pero sin liquidar
  const pagosNoLiq=S.pagos.filter(p=>p.estado==="cobrado"&&!p.liquidadoProp&&!p._eliminado);
  const propSinLiq=new Set(pagosNoLiq.map(p=>p.propietarioNombre).filter(Boolean));
  const montoPendLiq=pagosNoLiq.reduce((s,p)=>s+(p.alquiler||0),0);
  const pct=comObj>0?Math.round(comMes/comObj*100):0;
  const todas=[];
  activos.forEach(c=>{
    let diasParaFin=null;
    if(c.fin){diasParaFin=diasPara(c.fin);todas.push({tipo:"renovacion",col:diasParaFin<0?"var(--rojo)":diasParaFin<=60?"var(--naranja)":"var(--celeste)",ic:"📋",t:(diasParaFin<0?"Contrato VENCIDO: ":"Renovación: ")+(c.direccion||""),s:c.inquilino+" · "+(diasParaFin<0?"Venció":"Vence")+" el "+c.fin+(diasParaFin>=0?" (en "+diasParaFin+" días)":""),dias:diasParaFin});}
    // Si el contrato vence pronto (misma zona naranja/roja que la alerta de Renovación,
    // es decir <=60 días o ya vencido), no tiene sentido avisar de una actualización IPC:
    // lo que corresponde primero es resolver la renovación o finalización del contrato.
    // La cadencia de actualización se vuelve a definir en el contrato nuevo/renovado.
    const contratoProximoAVencer=diasParaFin!==null&&diasParaFin<=60;
    if(!contratoProximoAVencer){
      const prox=getProxActualizacion(c);
      if(prox){const du=Math.round((prox-hoyD)/86400000);
        if(du<0)todas.push({tipo:"ipc",col:"var(--rojo)",ic:"🔄",t:"Actualización VENCIDA: "+(c.direccion||""),s:c.inquilino+" · Hace "+Math.abs(du)+" días",dias:du});
        else if(prox>=proxMesI&&prox<=proxMesF)todas.push({tipo:"ipc",col:"var(--amarillo)",ic:"🔄",t:"Actualizar próximo mes: "+(c.direccion||""),s:c.inquilino+" · "+prox.toLocaleDateString("es-AR"),dias:du});
        else todas.push({tipo:"ipc",col:"var(--celeste)",ic:"🔄",t:"Actualización próxima: "+(c.direccion||""),s:c.inquilino+" · "+prox.toLocaleDateString("es-AR")+" (en "+du+" días)",dias:du});}
    }
  });
  // Alertas depósito y honorarios pendientes
  S.contratos.filter(c=>c.estado==="activo"||!c.estado).forEach(c=>{
    const dep=c.deposito||{};
    const hon=c.honorarios||{};
    if((dep.pendiente||0)>0){
      todas.push({tipo:"deposito",col:"var(--rojo)",ic:"🏦",
        t:"Depósito pendiente: "+(c.direccion||""),
        s:c.inquilino+" · 2da cuota: "+moneda(dep.pendiente),dias:-1});
    }
    if((hon.pendiente||0)>0){
      todas.push({tipo:"honorario",col:"var(--rojo)",ic:"💼",
        t:"Honorarios pendientes: "+(c.direccion||""),
        s:c.inquilino+" · 2da cuota: "+moneda(hon.pendiente),dias:-1});
    }
  });
  S.pagos.filter(p=>p.estado==="vencido").forEach(p=>{todas.push({tipo:"pago",col:"var(--rojo)",ic:"💸",t:"Pago vencido: "+(p.direccion||""),s:(p.inquilino||"")+" · "+mesNombre(p.mes)+" · "+moneda(p.total||p.monto||0),dias:-1});});
  const tipoF=S.alertasTipo||"todas";const plazoF=+(S.alertasPlazo||30);
  const fil=todas.filter(a=>{if(tipoF!=="todas"&&a.tipo!==tipoF)return false;if(a.dias<0)return true;return plazoF===0||a.dias<=plazoF;}).sort((a,b)=>a.dias-b.dias);
  const cnt={};todas.forEach(a=>{cnt[a.tipo]=(cnt[a.tipo]||0)+1;});
  const tipoOpts=[{k:"todas",l:"Todas",n:todas.length},{k:"ipc",l:"🔄 IPC",n:cnt.ipc||0},{k:"renovacion",l:"📋 Renovaciones",n:cnt.renovacion||0},{k:"pago",l:"💸 Pagos venc.",n:cnt.pago||0},{k:"deposito",l:"🏦 Depósitos",n:cnt.deposito||0},{k:"honorario",l:"💼 Honorarios",n:cnt.honorario||0}];
  const plazoOpts=[{k:0,l:"Todos"},{k:30,l:"30d"},{k:60,l:"60d"},{k:90,l:"90d"}];
  const filtrosH=`<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px">
    ${tipoOpts.map(o=>`<button class="btn sm" style="${tipoF===o.k?"background:var(--celeste);color:var(--negro)":"background:var(--negro3);color:var(--gris3)"}" data-action="setAlertaTipo" data-key="${o.k}">${o.l} (${o.n})</button>`).join("")}
    <span style="margin-left:8px;font-size:11px;color:var(--gris3)">Plazo:</span>
    ${plazoOpts.map(o=>`<button class="btn sm" style="${plazoF===o.k?"background:var(--naranja);color:var(--negro)":"background:var(--negro3);color:var(--gris3)"}" data-action="setAlertaPlazo" data-key="${o.k}">${o.l}</button>`).join("")}
  </div>`;
  const ultP=S.pagos.filter(p=>p.estado==="cobrado").slice(0,6).map(p=>`<tr><td class="tdm">${p.inquilino||""}</td><td>${p.direccion||""}</td><td>${mesNombre(p.mes)}</td><td>${moneda(p.alquiler||0)}</td><td><strong>${moneda(p.totalInquilino||p.total||p.monto||0)}</strong></td><td>${badge(p.estado)}</td></tr>`).join("");
  return `<div class="kgrid" style="grid-template-columns:repeat(3,1fr);margin-bottom:10px">
    <div class="kcard" style="border-top-color:var(--celeste)"><div class="klbl">Contratos activos</div><div class="kval">${activos.length}</div><div class="ksub">de ${S.contratos.length} totales</div></div>
    <div class="kcard" style="border-top-color:var(--verde)"><div class="klbl">Inquilinos pagaron</div><div class="kval">${inqPag.size} <span style="font-size:13px;color:var(--gris3)">/ ${activos.length}</span></div><div class="ksub" style="color:${inqPag.size===activos.length?"var(--verde)":"var(--naranja)"}">${mesNombre(mesHoy)}</div></div>
    <div class="kcard" style="border-top-color:var(--celeste)"><div class="klbl">Propietarios cobrados</div><div class="kval">${propCob.size} <span style="font-size:13px;color:var(--gris3)">/ ${propTotal}</span></div><div class="ksub" style="color:${propCob.size===propTotal?"var(--verde)":"var(--naranja)"}">${mesNombre(mesHoy)}</div></div>
  </div>
  <div class="kgrid" style="grid-template-columns:repeat(4,1fr)">
    <div class="kcard" style="border-top-color:var(--naranja)"><div class="klbl">Comisiones cobradas</div><div class="kval" style="font-size:17px">${moneda(comMes)}</div><div class="ksub">${pct}% del objetivo</div></div>
    <div class="kcard" style="border-top-color:var(--gris4)"><div class="klbl">Objetivo comisiones</div><div class="kval" style="font-size:17px">${moneda(comObj)}</div><div class="ksub">si cobran todos</div></div>
    ${(()=>{
      const hayPend=propSinLiq.size>0;
      const color=hayPend?"var(--rojo)":"#5ddb8a";
      const borderColor=hayPend?"var(--rojo)":"var(--verde)";
      return "<div class=\"kcard\" style=\"border-top-color:"+borderColor+";"+( hayPend?"cursor:pointer":"")+"\""+(hayPend?" data-action=\"nav\" data-sec=\"propietarios\"":" ")+">"
        +"<div class=\"klbl\">Prop. sin liquidar</div>"
        +"<div class=\"kval\" style=\"color:"+color+"\">"+propSinLiq.size+"</div>"
        +"<div class=\"ksub\" style=\"color:"+(hayPend?"var(--naranja)":"var(--gris3)")+"\">"+(hayPend?moneda(montoPendLiq)+" pendiente":"Al dia")+"</div>"
        +"</div>";
    })()}
    ${(()=>{
      const totalProps=S.propiedades.filter(p=>!p._eliminado);
      const dispCount=totalProps.filter(p=>propiedadLibre(p._id)).length;
      const color=dispCount>0?"var(--naranja)":"var(--gris3)";
      return "<div class=\"kcard\" style=\"border-top-color:"+color+";cursor:pointer\" data-action=\"nav\" data-sec=\"propietarios\">"
        +"<div class=\"klbl\">Inmuebles disponibles</div>"
        +"<div class=\"kval\" style=\"color:"+color+"\">"+dispCount+"</div>"
        +"<div class=\"ksub\" style=\"color:var(--gris3)\">de "+totalProps.length+" en total</div>"
        +"</div>";
    })()}
  </div>
  <div class="stitle" style="margin-top:20px">Alertas</div>${filtrosH}
  <div class="alerts">${fil.map(a=>`<div class="alert" style="border-left-color:${a.col}"><span style="font-size:16px">${a.ic}</span><div><strong>${a.t}</strong><span>${a.s}</span></div></div>`).join("")||`<div class="empty">Sin alertas para este filtro</div>`}</div>
  <div class="stitle">Últimos cobros</div>
  <div class="tw"><table><thead><tr><th>Inquilino</th><th>Propiedad</th><th>Período</th><th>Alquiler</th><th>Total</th><th>Estado</th></tr></thead>
  <tbody>${ultP||`<tr><td colspan=6><div class="empty">Sin movimientos</div></td></tr>`}</tbody></table></div>`;
}


function renderContratos(){
  const f=S.filtros;
  const col=S.sortCol||"inquilino";const dir=S.sortDir||1;
  let lista=S.contratos.filter(c=>{
    let ok=true;
    if(f.buscar){const q=f.buscar.toLowerCase();
      if(f.buscarPor==="inquilino")ok=(c.inquilino||"").toLowerCase().includes(q);
      else if(f.buscarPor==="propietario")ok=(c.propietarioNombre||"").toLowerCase().includes(q);
      else if(f.buscarPor==="domicilio")ok=(c.direccion||"").toLowerCase().includes(q);}
    return ok&&(f.estado==="todos"||c.estado===f.estado||(f.estado==="activo"&&!c.estado));
  });
  lista=lista.slice().sort((a,b)=>{
    let va,vb;
    if(col==="alquiler"){va=a.alquilerBase||0;vb=b.alquilerBase||0;}
    else if(col==="vigencia"){va=a.fin||"";vb=b.fin||"";}
    else if(col==="actualizacion"){const pa=getProxActualizacion(a),pb=getProxActualizacion(b);va=pa?pa.toISOString():"zzz";vb=pb?pb.toISOString():"zzz";}
    else if(col==="propiedad"){va=(a.direccion||"").toLowerCase();vb=(b.direccion||"").toLowerCase();}
    else if(col==="estado"){va=a.estado||"";vb=b.estado||"";}
    else{va=(a.inquilino||"").toLowerCase();vb=(b.inquilino||"").toLowerCase();}
    return va<vb?-dir:va>vb?dir:0;
  });
  function th(c,label){const on=col===c;return `<th style="cursor:pointer;user-select:none" data-action="sortCol" data-col="${c}">${label}${on?(dir===1?" ↑":" ↓"):" ↕"}</th>`;}
  const rows=lista.map(c=>{
    const d=c.fin?diasPara(c.fin):999;
    const dc=d<0?"var(--rojo)":d<=60?"var(--naranja)":"var(--gris3)";
    const prox=getProxActualizacion(c);
    const proxStr=prox?prox.toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit",year:"2-digit"}):"—";
    const du=prox?Math.round((prox-new Date())/86400000):null;
    const pc=du===null?"var(--gris3)":du<0?"var(--rojo)":du<=30?"var(--naranja)":"var(--gris3)";
    const dep=c.deposito||{};const hon=c.honorarios||{};
    const alerts=(dep.pendiente>0||hon.pendiente>0)?`<span style="color:var(--rojo);font-size:10px"> ⚠️</span>`:"";
    return `<tr class="cl" data-action="abrirContrato" data-id="${c._id}">
      <td class="tdm">${c.inquilino||""}${alerts}<br><span class="tds">${c.dni||""}</span></td>
      <td>${c.direccion||""}<br><span class="tds">${c.propietarioNombre||""}</span></td>
      <td>${moneda(c.alquilerBase)}</td>
      <td style="font-size:11px;color:${dc}">${c.inicio||""} → ${c.fin||"S/F"}</td>
      <td style="font-size:11px;color:${pc}">${c.frecActualizacion||6}m · ${proxStr}</td>
      <td>${badge(c.estado||"activo")}</td>
    </tr>`;
  }).join("");
  const estOpts=[["todos","Todos"],["activo","Activos"],["vencido","Vencidos"],["finalizado","Finalizados"]].map(([v,l])=>`<option value="${v}"${f.estado===v?" selected":""}>${l}</option>`).join("");
  const bpOpts=[["inquilino","Inquilino"],["propietario","Propietario"],["domicilio","Domicilio"]].map(([v,l])=>`<option value="${v}"${(f.buscarPor||"inquilino")===v?" selected":""}>${l}</option>`).join("");
  return `<div class="filters">
    <div class="sc"><select data-action="setFiltroTipoSel">${bpOpts}</select><input placeholder="Buscar..." data-action="setBuscar" value="${f.buscar}"></div>
    <select class="inp" data-action="setFiltroEstadoSel">${estOpts}</select>
    <button class="btn primary" data-action="openContrato">+ Nuevo contrato</button>
    <span style="font-size:11px;color:var(--gris3)">${lista.length} contrato(s)</span>
  </div>
  <div class="tw"><table><thead><tr>${th("inquilino","Inquilino")}${th("propiedad","Propiedad/Prop.")}${th("alquiler","Alquiler")}${th("vigencia","Vigencia")}${th("actualizacion","Actualiz.")}${th("estado","Estado")}</tr></thead>
  <tbody>${rows||`<tr><td colspan=6><div class="empty">Sin resultados</div></td></tr>`}</tbody></table></div>`;
}


function renderCobranzas(){
  const meses=[...new Set(S.pagos.map(p=>p.mes).filter(Boolean))].sort().reverse();
  const propietarios=[...new Set(S.pagos.map(p=>p.propietarioNombre).filter(Boolean))].sort();
  const fMes=S.filtros.cobranzaMes||"";
  const fProp=S.filtros.cobranzaProp||"";
  const fBuscar=(S.filtros.cobranzaBuscar||"").toLowerCase();
  const fEstado=S.filtros.cobranzaEstado||"todos";

  let pagos=S.pagos.filter(p=>!p._eliminado);
  if(fMes) pagos=pagos.filter(p=>p.mes===fMes);
  if(fProp) pagos=pagos.filter(p=>p.propietarioNombre===fProp);
  if(fEstado!=="todos") pagos=pagos.filter(p=>p.estado===fEstado);
  if(fBuscar) pagos=pagos.filter(p=>
    (p.inquilino||"").toLowerCase().includes(fBuscar)||
    (p.direccion||"").toLowerCase().includes(fBuscar)
  );
  pagos=pagos.sort((a,b)=>(b.mes||"").localeCompare(a.mes||"")||(a.inquilino||"").localeCompare(b.inquilino||""));

  // KPIs del filtro actual
  const cobrados=pagos.filter(p=>p.estado==="cobrado");
  const totalCobrado=cobrados.reduce((s,p)=>s+(p.totalInquilino||p.total||p.monto||0),0);
  const totalCom=cobrados.reduce((s,p)=>s+(p.comision||0),0);

  const mesOpts=`<option value="">Todos los meses</option>`+
    meses.map(m=>`<option value="${m}"${fMes===m?" selected":""}>${mesNombre(m)}</option>`).join("");
  const propOpts=`<option value="">Todos los propietarios</option>`+
    propietarios.map(p=>`<option value="${p}"${fProp===p?" selected":""}>${p}</option>`).join("");
  const estOpts=[["todos","Todos"],["cobrado","Cobrados"],["pendiente","Pendientes"],["vencido","Vencidos"]]
    .map(([v,l])=>`<option value="${v}"${fEstado===v?" selected":""}>${l}</option>`).join("");

  const rows=pagos.map(p=>{
    const items=p.itemsCobro||(p.extras||[]).map(e=>({desc:e.desc,monto:e.monto}));
    const hasItems=items.length>0;
    const btnPDF=p.estado==="cobrado"
      ?`<button class="btn sm" data-action="emitirINQ" data-id="${p._id}">📄 Inq</button>
        `
      :"";
    const btnElim=`<button class="btn sm" style="background:rgba(231,76,60,.15);color:#ff7b6b" data-action="eliminarPago" data-id="${p._id}">🗑️</button>`;
    return `<tr>
      <td class="tdm">${p.inquilino||""}<br><span class="tds">${p.direccion||""}</span></td>
      <td style="font-size:11px;color:var(--gris3)">${p.propietarioNombre||"—"}</td>
      <td>${mesNombre(p.mes)}</td>
      <td>${moneda(p.alquiler||0)}${hasItems?`<div style="font-size:10px;color:var(--gris3)">${items.map(it=>it.desc).join(", ")}</div>`:""}</td>
      <td style="font-weight:600">${moneda(p.totalInquilino||p.total||p.monto||0)}</td>
      <td>${badge(p.estado)}</td>
      <td>${p.fechaCobro||"—"}</td>
      <td style="display:flex;gap:4px;flex-wrap:wrap">${btnPDF}${btnElim}</td>
    </tr>`;
  }).join("");

  return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
    <div class="kcard" style="border-top-color:var(--celeste)"><div class="klbl">Pagos en filtro</div><div class="kval">${pagos.length}</div></div>
    <div class="kcard" style="border-top-color:#5ddb8a"><div class="klbl">Total cobrado</div><div class="kval" style="font-size:17px;color:#5ddb8a">${moneda(totalCobrado)}</div></div>
    <div class="kcard" style="border-top-color:var(--naranja)"><div class="klbl">Comisiones</div><div class="kval" style="font-size:17px;color:var(--naranja)">${moneda(totalCom)}</div></div>
  </div>
  <div class="filters" style="flex-wrap:wrap;gap:8px;margin-bottom:14px">
    <select class="inp" style="width:160px" id="cob-mes" data-action="cobranzaFiltro" data-field="cobranzaMes">${mesOpts}</select>
    <select class="inp" style="width:180px" id="cob-prop" data-action="cobranzaFiltro" data-field="cobranzaProp">${propOpts}</select>
    <select class="inp" style="width:130px" id="cob-estado" data-action="cobranzaFiltro" data-field="cobranzaEstado">${estOpts}</select>
    <input class="inp" placeholder="Buscar inquilino o dirección..." value="${S.filtros.cobranzaBuscar||""}"
      id="cob-buscar" data-action="cobranzaBuscar" style="min-width:200px">
    <button class="btn" data-action="cobranzasLimpiar"
      style="background:var(--negro3);color:var(--gris3)">✕ Limpiar</button>
    <span style="font-size:11px;color:var(--gris3);align-self:center">${pagos.length} resultado(s)</span>
  </div>
  <div class="tw"><table>
    <thead><tr><th>Inquilino / Dirección</th><th>Propietario</th><th>Período</th><th>Alquiler / Items</th><th>Total</th><th>Estado</th><th>Fecha cobro</th><th></th></tr></thead>
    <tbody>${rows||`<tr><td colspan=8><div class="empty">Sin resultados para este filtro</div></td></tr>`}</tbody>
  </table></div>`;
}


function renderLiquidaciones(){
  const meses=[...new Set(S.pagos.map(p=>p.mes))].sort().reverse();
  const mes=S.liqMes||meses[0]||mesActual();
  const pagosMes=S.pagos.filter(p=>p.mes===mes&&p.estado==="cobrado");
  const cards=pagosMes.map(p=>{
    const alq=p.alquiler||p.monto||0;
    const com=p.comision||Math.round(alq*(p.comisionAgencia??5)/100);
    const neto=p.netoPropiertario||(alq-com);
    const items=p.itemsCobro||(p.extras||[]).map(e=>({tipo:'fijo',desc:e.desc,monto:+(e.monto||0)}));
    const extH=items.filter(it=>(it.monto||0)!==0).map(it=>{const neg=(it.monto||0)<0;return '<div class="lrow '+(neg?'lrow-red':'lrow-blue')+'"><span>'+(it.desc||it.tipo)+'</span><span>'+(neg?'':'')+moneda(it.monto||0)+'</span></div>';}).join("");
    return `<div class="lcard">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
        <div><div style="font-size:14px;font-weight:600">${p.direccion||""}</div>
        <div style="font-size:11px;color:var(--gris3);margin-top:2px">Prop: ${p.propietarioNombre||""} · Inq: ${p.inquilino||""}</div></div>
        ${badge("cobrado")}
      </div>
      <div class="lrow"><span>Alquiler</span><span>${moneda(alq)}</span></div>
      ${extH}
      <div class="lrow"><span><strong>Total cobrado al inquilino</strong></span><span><strong>${moneda(p.totalInquilino||alq+((p.extras||[]).reduce((s,e)=>s+(+(e.monto||0)),0)))}</strong></span></div>
      <div class="lrow lrow-red"><span>Comisión agencia (${p.comisionAgencia??5}%)</span><span>− ${moneda(com)}</span></div>
      <div class="lrow tot"><span>A transferir al propietario</span><span class="lrow-green">${moneda(neto)}</span></div>
      <div style="margin-top:10px;display:flex;gap:6px">
        <button class="btn sm" data-action="emitirPROP" data-id="${p._id}">📄 PDF Propietario</button>
        <button class="btn sm" data-action="emitirINQ" data-id="${p._id}">📄 PDF Inquilino</button>
      </div>
    </div>`;
  }).join("");
  const totAlq=pagosMes.reduce((s,p)=>s+(p.alquiler||p.monto||0),0);
  const totCom=pagosMes.reduce((s,p)=>s+(p.comision||Math.round((p.alquiler||p.monto||0)*(p.comisionAgencia??5)/100)),0);
  const totExtras=pagosMes.reduce((s,p)=>{const items=p.itemsCobro||(p.extras||[]).map(e=>({monto:+(e.monto||0)}));return s+items.reduce((si,it)=>si+(it.monto||0),0);},0);
  const resumen=pagosMes.length>1?`<div class="lcard" style="border-color:var(--celeste);background:rgba(75,200,232,.04)">
    <div class="lrow"><span>Total alquileres</span><span>${moneda(totAlq)}</span></div>
    <div class="lrow lrow-blue"><span>Total extras</span><span>${moneda(totExtras)}</span></div>
    <div class="lrow"><span><strong>Total cobrado a inquilinos</strong></span><span><strong>${moneda(totAlq+totExtras)}</strong></span></div>
    <div class="lrow lrow-red"><span>Total comisiones agencia</span><span>− ${moneda(totCom)}</span></div>
    <div class="lrow tot"><span>Total a transferir propietarios</span><span class="lrow-green">${moneda(totAlq-totCom)}</span></div>
  </div>`:"";
  return `<div class="filters">
    <select class="inp" data-action="setLiqMesSel">${meses.map(m=>`<option value="${m}"${m===mes?" selected":""}>${mesNombre(m)}</option>`).join("")}</select>
    <span style="font-size:11px;color:var(--gris3)">${pagosMes.length} liquidación(es) · <span style="color:var(--naranja)">Ingresos agencia: ${moneda(totCom)}</span></span>
  </div>
  ${cards||`<div class="empty">Sin pagos cobrados en este período</div>`}${resumen}`;
}

function renderInquilinos(){
  const todos={};
  S.contratos.forEach(c=>{
    if(!c.inquilino)return;
    if(!todos[c.inquilino])todos[c.inquilino]={nombre:c.inquilino,dni:c.dni||"",telefono:c.telefono||"",email:c.email||"",contratos:[]};
    todos[c.inquilino].contratos.push(c);
  });
  S.inquilinos.forEach(i=>{
    if(!todos[i.nombre])todos[i.nombre]={...i,contratos:[]};
    else todos[i.nombre]={...todos[i.nombre],...i};
  });
  const lista=Object.values(todos);
  const fq=S.filtros.buscar.toLowerCase();
  const filtrados=fq?lista.filter(i=>(i.nombre||"").toLowerCase().includes(fq)):lista;

  // Ficha individual
  if(S.inquilinoActivo){
    const inq=S.inquilinoActivo;
    const contratos=inq.contratos||[];
    const activos=contratos.filter(c=>c.estado==="activo"||!c.estado);
    const historicos=contratos.filter(c=>c.estado!=="activo");
    const pagosInq=S.pagos.filter(p=>p.inquilino===inq.nombre).sort((a,b)=>(b.mes||"").localeCompare(a.mes||""));
    const totalCob=pagosInq.filter(p=>p.estado==="cobrado").reduce((s,p)=>s+(p.totalInquilino||p.total||p.monto||0),0);
    const pend=pagosInq.filter(p=>p.estado==="pendiente"||p.estado==="vencido").reduce((s,p)=>s+(p.total||p.monto||0),0);

    // Cards depósito y honorarios por contrato activo
    const depHonCards=activos.map(c=>{
      const dep=c.deposito||{};
      const hon=c.honorarios||{};
      const depComp=dep.completo||false;
      const honComp=hon.completo||false;
      const depPend=dep.pendiente||0;
      const honPend=hon.pendiente||0;
      const honCardHtml=hon.sinCargo
        ?'<div style="background:var(--negro3);border:1px solid var(--negro4);border-radius:8px;padding:10px">'
          +'<div style="font-size:10px;color:var(--gris3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Honorarios</div>'
          +'<div style="font-size:13px;font-weight:600;color:var(--gris3)">Sin cargo — no se cobran honorarios</div>'
          +'</div>'
        :'<div style="background:'+(honComp?'rgba(39,174,96,.08)':honPend>0?'rgba(231,76,60,.08)':'var(--negro3)')
          +';border:1px solid '+(honComp?'rgba(39,174,96,.25)':honPend>0?'rgba(231,76,60,.25)':'var(--negro4)')
          +';border-radius:8px;padding:10px">'
          +'<div style="font-size:10px;color:var(--gris3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Honorarios ('+(hon.monto==="mes"?'1 mes':'½ mes')+')</div>'
          +'<div style="font-size:13px;font-weight:600">'+moneda(hon.total||Math.round(c.alquilerBase/2))+'</div>'
          +'<div style="font-size:11px;margin-top:3px;color:'+(honComp?'#5ddb8a':honPend>0?'#ff7b6b':'var(--gris3)')+'">'+
          (honComp?'✓ Completo':honPend>0?'⚠️ Falta '+moneda(honPend):'Pagado: '+moneda(hon.pagado||0))+'</div>'
          +(honPend>0?'<button class="btn sm" style="margin-top:6px;background:rgba(39,174,96,.15);color:#5ddb8a" data-action="cobrarCuotaHon" data-id="'+c._id+'">✓ Cobrar 2da cuota</button>':'')
          +'</div>';
      return `<div class="lcard" style="padding:12px;margin-bottom:8px">
        <div style="font-weight:600;font-size:12px;margin-bottom:8px">${c.direccion||""} <span style="font-weight:400;color:var(--gris3)">· ${moneda(c.alquilerBase)}/mes</span></div>
        <div class="fg">
          <div style="background:${depComp?"rgba(39,174,96,.08)":depPend>0?"rgba(231,76,60,.08)":"var(--negro3)"};border:1px solid ${depComp?"rgba(39,174,96,.25)":depPend>0?"rgba(231,76,60,.25)":"var(--negro4)"};border-radius:8px;padding:10px">
            <div style="font-size:10px;color:var(--gris3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Depósito garantía</div>
            ${dep.total?`<div style="font-size:13px;font-weight:600">${moneda(dep.total)}</div>
            <div style="font-size:11px;margin-top:3px;color:${depComp?"#5ddb8a":depPend>0?"#ff7b6b":"var(--gris3)"}">
              ${depComp?"✓ Completo":depPend>0?`⚠️ Falta ${moneda(depPend)}`:`Pagado: ${moneda(dep.pagado||0)}`}
            </div>`:`<div style="font-size:13px;font-weight:600;color:var(--gris4)">Sin depósito</div>`}
            ${depPend>0?`<button class="btn sm" style="margin-top:6px;background:rgba(39,174,96,.15);color:#5ddb8a" data-action="cobrarCuotaDep" data-id="${c._id}">✓ Cobrar cuota ${(dep.cuotasPagadas!==undefined?dep.cuotasPagadas:(dep.pagadas||0))+1} de ${dep.cuotasTotales||dep.cuotas||1}</button>`:""}
          </div>
          ${honCardHtml}
        </div>
      </div>`;
    }).join("");

    const pagosH=pagosInq.slice(0,12).map(p=>`<tr>
      <td>${p.direccion||""}</td>
      <td>${mesNombre(p.mes)}</td>
      <td>${moneda(p.totalInquilino||p.total||p.monto||0)}</td>
      <td>${badge(p.estado)}</td>
      <td>${p.fechaCobro||"—"}</td>
    </tr>`).join("");

    return `<div style="display:flex;gap:8px;margin-bottom:16px;align-items:center;flex-wrap:wrap">
      <button class="btn sm" data-action="volverInquilinos">← Volver</button>
      <button class="btn sm" data-action="editarInquilino" data-nombre="${inq.nombre}" style="background:rgba(75,200,232,.12);color:var(--celeste)">✏️ Editar datos</button>
    </div>
    <div class="fg" style="margin-bottom:16px">
      <div class="lcard">
        <div style="font-size:18px;font-weight:700;margin-bottom:8px">${inq.nombre||""}</div>
        ${inq.telefono?`<div style="font-size:12px;margin-bottom:4px">${telLink(inq.telefono)}${inq.telefonoAlt?" · "+telLink(inq.telefonoAlt):""}</div>`:""}
        ${inq.email?`<div style="font-size:12px;margin-bottom:4px">✉️ <a href="mailto:${inq.email}" style="color:var(--celeste)">${inq.email}</a></div>`:""}
        ${inq.dni?`<div style="font-size:12px;margin-bottom:4px">📋 DNI/CUIL: <strong>${inq.dni}</strong></div>`:""}
        ${inq.direccionPart?`<div style="font-size:12px;margin-bottom:4px">🏠 ${inq.direccionPart}${inq.localidad?" · "+inq.localidad:""}</div>`:""}
        ${inq.ocupacion?`<div style="font-size:12px;margin-bottom:4px">💼 ${inq.ocupacion}</div>`:""}
        ${inq.garante?`<div style="font-size:12px;margin-bottom:4px">🛡️ Garante: <strong>${inq.garante}</strong>${inq.telGarante?" · "+inq.telGarante:""}</div>`:""}
        ${inq.obs?`<div style="font-size:11px;color:var(--gris3);margin-top:6px;font-style:italic">${inq.obs}</div>`:""}
        ${!inq.telefono&&!inq.email&&!inq.dni?`<div style="font-size:12px;color:var(--gris3)">Sin datos de contacto · <button class="btn sm" data-action="editarInquilino" data-nombre="${inq.nombre}" style="margin-left:4px">✏️ Cargar datos</button></div>`:""}
      </div>
      <div class="kgrid" style="margin:0;gap:8px;grid-template-columns:1fr 1fr">
        <div class="kcard" style="border-top-color:var(--verde)"><div class="klbl">Total cobrado</div><div class="kval" style="font-size:17px">${moneda(totalCob)}</div></div>
        <div class="kcard" style="border-top-color:var(--rojo)"><div class="klbl">Pendiente</div><div class="kval" style="font-size:17px">${moneda(pend)}</div></div>
        <div class="kcard" style="border-top-color:var(--celeste)"><div class="klbl">Contratos activos</div><div class="kval">${activos.length}</div></div>
        <div class="kcard" style="border-top-color:var(--gris4)"><div class="klbl">Históricos</div><div class="kval">${historicos.length}</div></div>
      </div>
    </div>
    ${depHonCards?`<div class="stitle">Depósito y honorarios</div>${depHonCards}`:""}
    <div class="stitle">Contratos</div>
    ${activos.concat(historicos).map(c=>`<div class="lcard" style="margin-bottom:8px;padding:12px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:600">${c.direccion||""}</div>
          <div style="font-size:11px;color:var(--gris3);margin-top:2px">Prop: ${c.propietarioNombre||"—"} · ${moneda(c.alquilerBase)} · c/${c.frecActualizacion||6}m · ${c.inicio||""} → ${c.fin||"S/F"}</div>
        </div>
        ${badge(c.estado||"activo")}
      </div>
    </div>`).join("")}
    ${renderSeccionHistorialInq(inq.nombre)}
    ${pagosInq.length?`<div class="stitle" style="margin-top:16px">Historial de pagos</div>
    <div class="tw"><table><thead><tr><th>Propiedad</th><th>Período</th><th>Total</th><th>Estado</th><th>Fecha cobro</th></tr></thead>
    <tbody>${pagosH}</tbody></table></div>`:""}`;
  }

  const rows=filtrados.map(i=>{
    const ca=i.contratos.filter(c=>c.estado==="activo"||!c.estado);
    // Alertas de depósito/honorarios pendientes
    const pendDep=ca.some(c=>(c.deposito||{}).pendiente>0);
    const pendHon=ca.some(c=>(c.honorarios||{}).pendiente>0);
    const alertaChip=(pendDep||pendHon)?`<span style="background:rgba(231,76,60,.15);color:#ff7b6b;font-size:9px;padding:2px 6px;border-radius:10px;margin-left:4px">${[pendDep?"dep.":"",pendHon?"hon.":""].filter(Boolean).join("/")} pend.</span>`:"";
    return `<tr class="cl" data-action="abrirInquilino" data-nombre="${i.nombre||""}">
      <td class="tdm">${i.nombre||""}${alertaChip}</td>
      <td>${i.dni||"—"}</td>
      <td>${i.telefono||"—"}</td>
      <td style="color:var(--celeste)">${i.email||"—"}</td>
      <td>${ca.map(c=>`<span style="display:block;font-size:11px">${c.direccion||""}</span>`).join("")||"—"}</td>
      <td>${ca.length?`<span class="badge bg">${ca.length} activo${ca.length>1?"s":""}</span>`:`<span class="badge bgr">Sin contrato</span>`}</td>
    </tr>`;
  }).join("");

  return `<div class="filters">
    <input class="inp" placeholder="Buscar inquilino..." data-action="setBuscar" value="${S.filtros.buscar}" style="min-width:200px">
    <button class="btn primary" data-action="openInquilino">+ Nuevo inquilino</button>
  </div>
  <p style="font-size:11px;color:var(--gris3);margin-bottom:10px">Clic en un inquilino para ver su ficha con depósito y honorarios</p>
  <div class="tw"><table><thead><tr><th>Nombre</th><th>DNI</th><th>Teléfono</th><th>Email</th><th>Propiedades</th><th>Estado</th></tr></thead>
  <tbody>${rows||`<tr><td colspan=6><div class="empty">Sin inquilinos</div></td></tr>`}</tbody></table></div>`;
}

function renderPropietarios(){
  // Si todavía no se cargaron las propiedades, dispararla en background (no bloquea el render actual,
  // pero el próximo render ya va a tener los datos para calcular disponibles/ocupadas).
  if(!S.propiedadesInmuebles||S.propiedadesInmuebles.length===0){
    cargarPropiedadesInmuebles().then(()=>render());
  }
  // Armar lista de propietarios únicos desde contratos
  const nombresEliminados=new Set(S.propietarios.filter(p=>p._eliminado).map(p=>p.nombre));
  const propMap={};
  S.contratos.forEach(c=>{
    if(!c.propietarioNombre||nombresEliminados.has(c.propietarioNombre))return;
    const n=c.propietarioNombre;
    if(!propMap[n])propMap[n]={nombre:n,contratos:[]};
    propMap[n].contratos.push(c);
  });
  S.propietarios.filter(p=>!p._eliminado).forEach(p=>{
    if(!propMap[p.nombre])propMap[p.nombre]={...p,contratos:[]};
    else propMap[p.nombre]={...propMap[p.nombre],...p};
  });
  const lista=Object.values(propMap).sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||""));
  const listaFiltrada=S.propBuscar?lista.filter(p=>normStr(p.nombre).includes(normStr(S.propBuscar))):lista;

  // ── FICHA DE PROPIETARIO ──────────────────────────────────────────────────
  if(S.propietarioActivo){
    return renderFichaPropietario(S.propietarioActivo, propMap[S.propietarioActivo]||{nombre:S.propietarioActivo,contratos:[]});
  }

  // ── LISTA DE PROPIETARIOS ─────────────────────────────────────────────────
  const mesHoy=mesActual();
  const rows=listaFiltrada.map(prop=>{
    const activos=prop.contratos.filter(c=>c.estado==="activo"||!c.estado);
    const propsTotales=propiedadesDelPropietario(prop.nombre).filter(p=>!p._eliminado);
    const disponibles=propsTotales.filter(p=>!contratoActivoDeProp(p,prop.nombre));
    const pagosDelMes=S.pagos.filter(p=>p.propietarioNombre===prop.nombre&&p.mes===mesHoy&&p.estado==="cobrado");
    const pendientes=activos.filter(c=>!pagosDelMes.some(p=>p.contratoId===c._id));
    // Meses sin liquidar (cobros de inquilinos registrados pero no liquidados al prop)
    const totalPendiente=S.pagos.filter(p=>
      p.propietarioNombre===prop.nombre&&
      p.estado==="cobrado"&&
      !p.liquidadoProp
    ).reduce((s,p)=>s+(p.alquiler||0),0);
    const comision=Math.round(totalPendiente*(prop.comisionAgencia??5)/100);
    const neto=totalPendiente-comision;
    const n=activos.length;
    const x=n-pendientes.length;
    const sufijoLiq=totalPendiente>0?'<br><span style="font-size:9px;color:var(--naranja)">💰 '+moneda(neto)+' p/liquidar</span>':'';
    let estadoChip;
    if(n===0){
      estadoChip='<span style="color:var(--gris3);font-size:10px">—</span>';
    }else if(x===0){
      estadoChip='<span style="background:rgba(231,76,60,.15);color:#ff7b6b;font-size:10px;padding:3px 8px;border-radius:10px">🔴 0 de '+n+' pagaron</span>'+sufijoLiq;
    }else if(x<n){
      estadoChip='<span style="background:rgba(245,166,35,.15);color:var(--naranja);font-size:10px;padding:3px 8px;border-radius:10px">🟠 '+x+' de '+n+' pagaron</span>'+sufijoLiq;
    }else if(totalPendiente>0){
      estadoChip='<span style="background:rgba(39,174,96,.15);color:#5ddb8a;font-size:10px;padding:3px 8px;border-radius:10px">🟢 '+n+' de '+n+' · Listo p/liquidar ('+moneda(neto)+')</span>';
    }else{
      estadoChip='<span style="background:rgba(39,174,96,.1);color:#5ddb8a;font-size:10px;padding:3px 8px;border-radius:10px">✓ Al día</span>';
    }
    return `<tr class="cl" data-action="abrirPropietario" data-nombre="${prop.nombre}">
      <td class="tdm">${prop.nombre}${prop.telefono?`<br><span class="tds">${telLink(prop.telefono)}</span>`:""}</td>
      <td>${activos.length} propiedad${activos.length!==1?"es":""} activa${activos.length!==1?"s":""}${disponibles.length>0?`<br><span class="tds" style="color:var(--naranja)">⚠️ ${disponibles.length} disponible${disponibles.length!==1?"s":""} p/alquilar</span>`:""}</td>
      <td>${estadoChip}</td>
      <td><button class="btn sm primary" data-action="abrirPropietario" data-nombre="${prop.nombre}">Ver ficha →</button></td>
    </tr>`;
  }).join("");

  const _migBtn=(()=>{const _mig=calcularPendientesMigracion();const _act=_mig.filter(r=>r.estado==="activo").length;const _tot=_mig.length;return _tot?'<button class="btn sm" style="background:rgba(231,174,60,.15);color:var(--naranja)" data-action="abrirMigracion">⚠️ '+_act+' activos sin asignar'+(_tot>_act?' ('+(_tot-_act)+' finaliz.)':'')+' </button>':''})();
  const _emptyMsg=S.propBuscar?'<tr><td colspan=4><div class="empty">Sin resultados para "'+S.propBuscar+'"</div></td></tr>':`<tr><td colspan=4><div class="empty">Sin propietarios</div></td></tr>`;
  return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px"><p style="font-size:11px;color:var(--gris3);margin:0">Clic en un propietario para ver su ficha y generar liquidaciones</p><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><input class="inp" placeholder="Buscar propietario..." data-action="propBuscar" value="${S.propBuscar||""}" style="min-width:180px">${_migBtn}<button class="btn sm" style="background:rgba(75,200,232,.1);color:var(--celeste)" data-action="openPropietario">+ Nuevo propietario</button></div></div>
  <div class="tw"><table><thead><tr><th>Propietario</th><th>Propiedades</th><th>Estado cobro</th><th></th></tr></thead>
  <tbody>${rows||_emptyMsg}</tbody></table></div>`;
}

function renderFichaPropietario(nombre, prop){
  const activos=prop.contratos.filter(c=>c.estado==="activo"||!c.estado);
  const pagos=S.pagos.filter(p=>p.propietarioNombre===nombre&&p.estado==="cobrado"&&!p._eliminado)
    .sort((a,b)=>(b.mes||"").localeCompare(a.mes||""));
  const pendLiq=pagos.filter(p=>!p.liquidadoProp);
  const pendPorMes={};
  pendLiq.forEach(p=>{if(!pendPorMes[p.mes])pendPorMes[p.mes]=[];pendPorMes[p.mes].push(p);});
  const mesesPend=Object.keys(pendPorMes).sort().reverse();
  const totalPendBruto=pendLiq.reduce((s,p)=>s+(p.alquiler||0),0);
  const totalExtrasPend=pendLiq.reduce((s,p)=>{
    const items=p.itemsCobro||(p.extras||[]).map(e=>({tipo:"fijo",desc:e.desc,monto:+(e.monto||0)}));
    return s+items.reduce((si,it)=>(it.tipo==="gestion"||it.tipo==="honorario"||it.tipo==="saldo")?si:si+(it.monto||0),0);
  },0);
  const comPct=prop.comisionAgencia??5;
  const comBase=Math.round(totalPendBruto*comPct/100);
  const neto=totalPendBruto+totalExtrasPend-comBase;
  const seleccion=S.liqSeleccion[nombre]||{};
  const mesesCards=mesesPend.map(function(mes){
    const pagosMes=pendPorMes[mes];
    const totalMes=pagosMes.reduce(function(s,p){return s+(p.alquiler||0);},0);
    const sel=seleccion[mes]!==false;
    return '<div style="display:flex;align-items:center;gap:10px;background:'+(sel?"rgba(75,200,232,.06)":"var(--negro3)")+';border:1px solid '+(sel?"rgba(75,200,232,.25)":"var(--negro4)")+';border-radius:8px;padding:10px 14px;cursor:pointer" data-action="toggleLiqMes" data-nombre="'+nombre+'" data-mes="'+mes+'">'
      +'<input type="checkbox" '+(sel?"checked ":"")+'style="width:16px;height:16px" onclick="event.stopPropagation()">'
      +'<div style="flex:1"><div style="font-weight:600;font-size:13px">'+mesNombre(mes)+'</div>'
      +'<div style="font-size:11px;color:var(--gris3)">'+pagosMes.length+' prop · '+moneda(totalMes)+'</div></div>'
      +'<div style="font-size:14px;font-weight:700;color:var(--celeste)">'+moneda(totalMes)+'</div></div>';
  }).join("");
  const seleccionados=mesesPend.filter(function(m){return seleccion[m]!==false;});
  const pagosSel=seleccionados.reduce(function(a,m){return a.concat(pendPorMes[m]||[]);}, []);
  const totalSelBruto=pagosSel.reduce(function(s,p){return s+(p.alquiler||0);},0);
  const totalSelExtras=pagosSel.reduce(function(s,p){
    const items=p.itemsCobro||(p.extras||[]).map(function(e){return{tipo:"fijo",desc:e.desc,monto:+(e.monto||0)};});
    return s+items.reduce(function(si,it){return(it.tipo==="gestion"||it.tipo==="honorario"||it.tipo==="saldo")?si:si+(it.monto||0);},0);
  },0);
  const comSel=Math.round(totalSelBruto*comPct/100);
  const netoSel=totalSelBruto+totalSelExtras-comSel;
  // Historial liquidaciones
  const liquidadas=pagos.filter(function(p){return p.liquidadoProp;});
  const liqPorRef={};
  liquidadas.forEach(function(p){const ref=p.liquidacionRef||"sin-ref";if(!liqPorRef[ref])liqPorRef[ref]={ref,meses:new Set(),total:0,fecha:p.fechaLiquidacion||""};liqPorRef[ref].meses.add(p.mes);liqPorRef[ref].total+=(p.alquiler||0);});
  const histLiq=Object.values(liqPorRef).sort(function(a,b){return(b.fecha||"").localeCompare(a.fecha||"");});
  const histHtml=histLiq.slice(0,8).map(function(liq){
    const mesesStr=[...liq.meses].sort().reverse().map(m=>mesNombre(m)).join(", ");
    const com=Math.round(liq.total*comPct/100);
    return '<tr><td style="font-size:11px;color:var(--gris3)">'+(liq.fecha||"—")+'</td><td style="font-size:12px">'+mesesStr+'</td><td>'+moneda(liq.total)+'</td><td style="color:#5ddb8a;font-weight:600">'+moneda(liq.total-com)+'</td><td style="display:flex;gap:6px"><button class="btn sm" data-action="reimprimirLiq" data-ref="'+liq.ref+'" data-nombre="'+nombre+'">Reimprimir</button><button class="btn sm" data-action="eliminarLiquidacion" data-ref="'+liq.ref+'" data-nombre="'+nombre+'" style="background:rgba(231,76,60,.15);color:#ff7b6b">✕</button></td></tr>';
  }).join("");
  // Propiedades e historial
  const propsInmuebles=propiedadesDelPropietario(nombre).filter(function(p){return !p._eliminado;});
  const propCards=propsInmuebles.map(function(p){
    const pid=(p.direccion||"").toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");
    if(!S_HIST[pid]){cargarHistorialProp(pid).then(function(){renderHistPropInline(pid);});}
    const entradas=(S_HIST[pid]||[]).filter(function(e){return !e._eliminado;});
    const cActivo=contratoActivoDeProp(p,nombre);
    const chip=cActivo
      ?'<span style="background:rgba(39,174,96,.15);color:#5ddb8a;font-size:10px;padding:2px 8px;border-radius:10px">Ocupada: '+(cActivo.inquilino||"")+'</span>'
      :'<span style="background:rgba(75,200,232,.12);color:var(--celeste);font-size:10px;padding:2px 8px;border-radius:10px">Disponible</span>';
    const tablaH=entradas.length
      ?'<div class="tw"><table><thead><tr><th style="width:110px">Fecha</th><th>Descripcion</th><th style="width:40px"></th></tr></thead><tbody>'
        +entradas.slice(0,10).map(function(e){return '<tr><td style="font-size:11px;color:var(--gris3)">'+(e.fecha||"—")+'</td><td style="font-size:12px">'+(e.descripcion||"")+'</td><td><button class="btn sm" style="background:rgba(231,76,60,.15);color:#ff7b6b;padding:2px 6px" data-action="hpropEliminar" data-id="'+e._id+'" data-pid="'+pid+'">x</button></td></tr>';}).join("")
        +'</tbody></table></div>'
      :'<p style="font-size:11px;color:var(--gris4);padding:4px 0">Sin registros todavia.</p>';
    return '<div class="lcard" style="margin-bottom:10px">'
      +'<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:8px">'
      +'<div><div style="font-weight:600;font-size:13px">'+(p.direccion||"")+'</div>'
      +'<div style="font-size:11px;color:var(--gris3)">'+(p.tipo||"")+(p.superficie?" · "+p.superficie+"m2":"")+(p.ambientes?" · "+p.ambientes+" amb.":"")+'</div>'
      +(p.descripcion?'<div style="font-size:11px;color:var(--gris4)">'+p.descripcion+'</div>':"")+'</div>'
      +'<div style="display:flex;gap:6px;align-items:center">'+chip
      +'<button class="btn sm" data-action="editarPropiedad" data-nombre="'+nombre+'" data-id="'+p._id+'" style="padding:3px 8px">Editar</button>'
      +(!cActivo?'<button class="btn sm" data-action="eliminarPropiedad" data-id="'+p._id+'" style="background:rgba(231,76,60,.15);color:#ff7b6b;padding:3px 8px">x</button>':"")
      +'</div></div>'
      +'<div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin-bottom:8px">'
      +'<div><label class="fl">Fecha</label><input id="hp-fecha-'+pid+'" class="inp" type="date" value="'+hoy()+'" style="width:150px"></div>'
      +'<div style="flex:1;min-width:180px"><label class="fl">Descripcion del evento</label>'
      +'<input id="hp-desc-'+pid+'" class="inp" style="width:100%" placeholder="Ej: Gasista, arreglo..." data-action="hpropEnter" data-pid="'+pid+'"></div>'
      +'<button class="btn sm naranja" style="height:36px" data-action="hpropAgregar" data-pid="'+pid+'">+ Agregar</button>'
      +'</div><div id="hp-tabla-'+pid+'">'+tablaH+'</div></div>';
  }).join("");
  // Ajustes cuenta corriente
  const _ajustesAll=(S_AJUSTES_PROP[nombre]||[]);
  const ajustesPendFicha=_ajustesAll.filter(function(a){return !a.liquidacionRef&&!a._eliminado;});
  const ajustesHistFicha=_ajustesAll.filter(function(a){return a.liquidacionRef&&!a._eliminado;});
  const totalAjustesPendFicha=ajustesPendFicha.reduce(function(s,a){return s+(a.monto||0);},0);
  // Saldo anterior
  const saldoAnterior=(S_SALDO_PROP[nombre]&&S_SALDO_PROP[nombre].monto)||0;
  const netoConSaldo=netoSel+saldoAnterior+totalAjustesPendFicha;
  const saldoInfoHtml=(function(){
    var rows='';
    if(saldoAnterior!==0){
      rows+='<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:'+(saldoAnterior>0?"#5ddb8a":"#ff7b6b")+'">'
        +'<span>Saldo anterior ('+(saldoAnterior>0?"a favor":"deuda")+')</span>'
        +'<span style="font-weight:600">'+(saldoAnterior>0?"+":"")+moneda(saldoAnterior)+'</span></div>';
    }
    if(totalAjustesPendFicha!==0){
      rows+='<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:'+(totalAjustesPendFicha>0?"#5ddb8a":"#ff7b6b")+'">'
        +'<span>Ajustes cta. cte. pendientes</span>'
        +'<span style="font-weight:600">'+(totalAjustesPendFicha>0?"+":"")+moneda(totalAjustesPendFicha)+'</span></div>';
    }
    if(rows){
      rows+='<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;font-weight:700;border-top:1px solid var(--negro4);margin-top:4px">'
        +'<span>Total a entregar</span><span style="color:#5ddb8a">'+moneda(netoConSaldo)+'</span></div>';
    }
    return rows;
  })();
  // Ensamblar
  let html='<div style="display:flex;gap:8px;margin-bottom:16px;align-items:center;flex-wrap:wrap">'
    +'<button class="btn sm" data-action="volverPropietarios">← Volver</button>'
    +'<div style="font-size:18px;font-weight:700">'+nombre+'</div>'
    +'<button class="btn sm" data-action="editarPropietario" data-nombre="'+nombre+'" style="background:rgba(75,200,232,.12);color:var(--celeste)">Editar datos</button>'
    +(prop.telefono?telLink(prop.telefono):"")
    +(prop.telefonoAlt?telLink(prop.telefonoAlt):"")
    +(prop.cbu?'<span style="font-size:12px;color:var(--gris3)">CBU: '+prop.cbu+(prop.banco?" ("+prop.banco+")":"")+'</span>':"")
    +'</div>';
  html+=(function(){
    const todasLasProps=propiedadesDelPropietario(nombre).filter(function(p){return !p._eliminado;});
    const disponibles=todasLasProps.filter(function(p){
      return !contratoActivoDeProp(p,nombre);
    });
    return '<div class="kgrid" style="grid-template-columns:repeat(6,1fr);margin-bottom:20px">'
      +'<div class="kcard" style="border-top-color:var(--celeste)"><div class="klbl">Propiedades activas</div><div class="kval">'+activos.length+'</div></div>'
      +'<div class="kcard" style="border-top-color:'+(disponibles.length>0?"var(--naranja)":"var(--gris4)")+'"><div class="klbl">Disponibles p/alquilar</div><div class="kval" style="color:'+(disponibles.length>0?"var(--naranja)":"var(--gris4)")+'">'+disponibles.length+'</div></div>'
      +'<div class="kcard" style="border-top-color:var(--celeste)"><div class="klbl">Alquileres a liquidar</div><div class="kval" style="font-size:17px;color:var(--celeste)">'+moneda(totalPendBruto)+'</div></div>'
      +'<div class="kcard" style="border-top-color:var(--naranja)"><div class="klbl">Gastos extra (TGI, agua, etc.)</div><div class="kval" style="font-size:17px;color:var(--naranja)">'+moneda(totalExtrasPend)+'</div></div>'
      +'<div class="kcard" style="border-top-color:var(--rojo)"><div class="klbl">Comision</div><div class="kval" style="font-size:17px;color:#ff7b6b">-'+moneda(comBase)+'</div></div>'
      +'<div class="kcard" style="border-top-color:#5ddb8a"><div class="klbl">Neto estimado</div><div class="kval" style="font-size:17px;color:#5ddb8a">'+moneda(neto)+'</div></div>'
      +'</div>';
  })();
  html+='<div class="lcard" style="margin-bottom:16px">'
    +'<div style="font-size:11px;font-weight:600;color:var(--gris3);margin-bottom:8px;text-transform:uppercase">📝 Comentarios temporales</div>'
    +renderNotasTemp("propietario",nombre)
    +'</div>';
  html+=(function(){
    var colorSaldo=totalAjustesPendFicha>0?"#5ddb8a":totalAjustesPendFicha<0?"#ff7b6b":"var(--gris3)";
    var rowsPend=ajustesPendFicha.map(function(a){
      var c=(a.monto||0)>=0?"#5ddb8a":"#ff7b6b";
      return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--negro4)">'
        +'<span style="font-size:11px;color:var(--gris3);min-width:80px">'+(a.fecha||"")+'</span>'
        +'<span style="flex:1;font-size:12px">'+(a.descripcion||"")+'</span>'
        +'<span style="font-weight:600;color:'+c+';min-width:80px;text-align:right">'+((a.monto||0)>0?"+":"")+moneda(a.monto||0)+'</span>'
        +'<button class="btn sm" data-action="ajustePropBorrar" data-id="'+a._id+'" style="background:rgba(231,76,60,.15);color:#ff7b6b;padding:2px 7px;font-size:11px">x</button>'
        +'</div>';
    }).join("");
    var rowsHist=ajustesHistFicha.slice(0,5).map(function(a){
      var c=(a.monto||0)>=0?"#5ddb8a":"#ff7b6b";
      var refLabel=(a.liquidacionRef||"").split("_").slice(1,-1).join(" ");
      return '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--negro4);opacity:.6">'
        +'<span style="font-size:11px;color:var(--gris3);min-width:80px">'+(a.fecha||"")+'</span>'
        +'<span style="flex:1;font-size:12px">'+(a.descripcion||"")+'</span>'
        +'<span style="font-weight:600;color:'+c+';min-width:80px;text-align:right">'+((a.monto||0)>0?"+":"")+moneda(a.monto||0)+'</span>'
        +'<span style="font-size:10px;color:var(--gris4);white-space:nowrap">'+refLabel+'</span>'
        +'<button class="btn sm" data-action="ajustePropBorrar" data-id="'+a._id+'" style="background:rgba(231,76,60,.1);color:#ff7b6b;padding:2px 7px;font-size:11px">x</button>'
        +'</div>';
    }).join("");
    return '<div class="lcard" style="margin-bottom:16px">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'
      +'<div style="font-size:11px;font-weight:600;color:var(--gris3);text-transform:uppercase">💰 Cuenta corriente</div>'
      +'<div style="font-size:12px;font-weight:700;color:'+colorSaldo+'">Pendiente: '+(totalAjustesPendFicha>0?"+":"")+moneda(totalAjustesPendFicha)+'</div>'
      +'</div>'
      +'<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">'
      +'<input id="ajuste-desc-input" class="inp" placeholder="Descripcion del ajuste" style="flex:1;min-width:160px">'
      +'<input id="ajuste-monto-input" class="inp" type="number" placeholder="Monto (+/-)" style="width:120px">'
      +'<button class="btn sm naranja" data-action="ajustePropAgregar">+ Agregar</button>'
      +'</div>'
      +(ajustesPendFicha.length
        ?'<div style="font-size:10px;font-weight:600;color:var(--gris3);text-transform:uppercase;margin-bottom:4px">Pendientes — se incluyen en la próxima liquidación</div>'+rowsPend
        :'<div style="font-size:11px;color:var(--gris4);padding:4px 0">Sin ajustes pendientes.</div>')
      +(ajustesHistFicha.length
        ?'<div style="font-size:10px;font-weight:600;color:var(--gris3);text-transform:uppercase;margin:10px 0 4px">Histórico</div>'+rowsHist
        :"")
      +'</div>';
  })();
  html+='<div class="stitle" style="display:flex;justify-content:space-between;align-items:center">'
    +'<span>Propiedades e historial</span>'
    +'<button class="btn sm" style="background:rgba(75,200,232,.1);color:var(--celeste)" data-action="nuevaPropiedad" data-nombre="'+nombre+'">+ Agregar propiedad</button>'
    +'</div>';
  html+=propCards||'<div class="empty" style="padding:20px 0">Sin propiedades. Usa + Agregar propiedad.</div>';
  if(mesesPend.length){
    html+='<div class="stitle" style="margin-top:20px">Selecciona los meses a liquidar</div>'
      +'<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">'+mesesCards+'</div>'
      +'<div style="background:var(--negro3);border:1px solid var(--negro4);border-radius:10px;padding:14px;margin-bottom:12px">'
      +'<div style="font-size:11px;font-weight:600;color:var(--gris3);margin-bottom:8px;text-transform:uppercase">Ajuste de saldo</div>'
      +saldoInfoHtml
      +'<div style="margin-top:10px"><label class="fl">Monto que entrega el propietario (dejar vacio si es exacto)</label>'
      +'<input type="number" id="pago-prop-input" class="inp" style="width:100%;max-width:280px" placeholder="'+moneda(netoConSaldo)+'"></div>'
      +'<div style="font-size:11px;color:var(--gris3);margin-top:6px">Neto calculado: <strong>'+moneda(netoSel)+'</strong></div></div>'
      +'<button class="btn naranja" style="width:100%;padding:12px;font-size:14px;margin-bottom:20px" data-action="generarLiquidacion" data-nombre="'+nombre+'">Generar liquidacion y PDF</button>';
  } else {
    html+='<div class="empty" style="padding:30px 0;margin-bottom:20px">Sin meses pendientes de liquidar</div>';
  }
  if(histLiq.length){
    html+='<div class="stitle">Historial de liquidaciones</div>'
      +'<div class="tw"><table><thead><tr><th>Fecha</th><th>Periodos</th><th>Total alquileres</th><th>Neto transferido</th><th></th></tr></thead>'
      +'<tbody>'+histHtml+'</tbody></table></div>';
  }
  return html;
}

// ── LIQUIDACIÓN A PROPIETARIO (agrupada por propiedad, con subtotales) ──────
// El propietario se lleva, por cada propiedad: alquiler + todos los extras que
// el inquilino dejó para él (TGI, agua, internet, diferencia de depósito, etc.).
// La comisión de la agencia (5%) se calcula UNICAMENTE sobre la suma de alquileres,
// nunca sobre los extras — esos ya son plata del propietario, no de la agencia.
async function generarLiquidacionProp(nombre){
  const seleccion=S.liqSeleccion[nombre]||{};
  const pagos=S.pagos.filter(p=>p.propietarioNombre===nombre&&p.estado==="cobrado"&&!p.liquidadoProp&&!p._eliminado);
  const pendPorMes={};
  pagos.forEach(p=>{if(!pendPorMes[p.mes])pendPorMes[p.mes]=[];pendPorMes[p.mes].push(p);});
  const mesesPend=Object.keys(pendPorMes).sort();
  const mesesSel=mesesPend.filter(m=>seleccion[m]!==false);
  const pagosSel=mesesSel.reduce((a,m)=>a.concat(pendPorMes[m]||[]),[]);
  if(!pagosSel.length){toast("No hay meses seleccionados para liquidar",false);return;}

  const prop=S.propietarios.find(x=>x.nombre===nombre)||{};
  const comPct=prop.comisionAgencia??5;

  // Agrupar por propiedad (dirección), no por mes — así sale el formato pedido:
  // una propiedad, todo lo que dejó ese inquilino, subtotal; siguiente propiedad, etc.
  const porPropiedad={};
  pagosSel.forEach(p=>{
    const dir=p.direccion||"Sin dirección";
    if(!porPropiedad[dir])porPropiedad[dir]={direccion:dir,inquilino:p.inquilino||"",pagos:[]};
    porPropiedad[dir].pagos.push(p);
  });
  const propiedades=Object.values(porPropiedad).sort((a,b)=>a.direccion.localeCompare(b.direccion));

  // Totales generales: bruto = todo lo que el propietario se lleva (alquiler + extras).
  // La comisión solo descuenta sobre el total de alquileres puros.
  let totalAlquileres=0, totalExtras=0;
  propiedades.forEach(prop2=>{
    prop2.pagos.forEach(p=>{
      totalAlquileres+=(p.alquiler||0);
      const items=p.itemsCobro||(p.extras||[]).map(e=>({tipo:"fijo",desc:e.desc,monto:+(e.monto||0)}));
      items.forEach(it=>{ if(it.tipo==="gestion"||it.tipo==="honorario"||it.tipo==="saldo")return; if((it.monto||0)!==0) totalExtras+=(it.monto||0); });
    });
  });
  const totalBruto=totalAlquileres+totalExtras;
  const comision=Math.round(totalAlquileres*comPct/100);
  const netoSinSaldo=totalBruto-comision;

  // Saldo del mes anterior (a favor o en contra del propietario, ya cargado en memoria).
  await cargarSaldoProp(nombre);
  const saldoAnterior=(S_SALDO_PROP[nombre]&&S_SALDO_PROP[nombre].monto)||0;
  // Ajustes de cuenta corriente pendientes
  await cargarAjustesProp(nombre);
  const ajustesPendLiq=(S_AJUSTES_PROP[nombre]||[]).filter(function(a){return !a.liquidacionRef&&!a._eliminado;});
  const totalAjustesPendLiq=ajustesPendLiq.reduce(function(s,a){return s+(a.monto||0);},0);
  const netoAEntregar=netoSinSaldo+saldoAnterior+totalAjustesPendLiq;

  // El cobrador puede ajustar manualmente cuánto entregó realmente (cambio exacto,
  // redondeo de billetes, etc.) — la diferencia queda como nuevo saldo para el mes que viene.
  const inputMonto=document.getElementById("pago-prop-input");
  const montoEntregado=inputMonto&&inputMonto.value!==""?+inputMonto.value:netoAEntregar;
  const nuevoSaldo=montoEntregado-netoAEntregar;
  await guardarSaldoProp(nombre,nuevoSaldo);

  // ── PDF ──────────────────────────────────────────────────────────────────
  const{jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:"mm",format:"a4"});
  let y=14;
  doc.setFont("helvetica","bold");doc.setFontSize(14);doc.setTextColor(20,20,20);
  doc.text("LIQUIDACION A PROPIETARIO",105,y,{align:"center"});y+=6;
  doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(120,120,120);
  doc.text("Documento no valido como factura",105,y,{align:"center"});y+=8;
  doc.setDrawColor(180,180,180);doc.line(12,y,198,y);y+=7;

  doc.setFont("helvetica","bold");doc.setFontSize(11);doc.setTextColor(20,20,20);
  doc.text(nombre.toUpperCase(),12,y);
  doc.setFont("helvetica","normal");doc.setFontSize(9);
  doc.text("Periodo: "+mesesSel.map(mesNombreMay).join(", "),198,y,{align:"right"});y+=8;

  propiedades.forEach(prop2=>{
    if(y>260){doc.addPage();y=18;}
    doc.setFillColor(240,240,240);doc.rect(12,y-4,186,7,"F");
    doc.setFont("helvetica","bold");doc.setFontSize(9.5);doc.setTextColor(30,30,30);
    doc.text(prop2.direccion+"  ("+prop2.inquilino+")",14,y);y+=7;

    let subtotal=0;
    prop2.pagos.sort((a,b)=>(a.mes||"").localeCompare(b.mes||"")).forEach(p=>{
      doc.setFont("helvetica","normal");doc.setFontSize(9);doc.setTextColor(60,60,60);
      doc.text("Alquiler "+mesNombre(p.mes),16,y);
      doc.text(moneda(p.alquiler||0),198,y,{align:"right"});y+=5.5;
      subtotal+=(p.alquiler||0);
      const items=p.itemsCobro||(p.extras||[]).map(e=>({tipo:"fijo",desc:e.desc,monto:+(e.monto||0)}));
      items.forEach(it=>{
        if(it.tipo==="gestion"||it.tipo==="honorario"||it.tipo==="saldo")return;
        if((it.monto||0)===0)return;
        const neg=(it.monto||0)<0;
        doc.setTextColor(neg?180:60,neg?60:60,60);
        doc.text("  "+(it.desc||it.tipo),16,y);
        doc.text((neg?"- ":"")+moneda(Math.abs(it.monto||0)),198,y,{align:"right"});y+=5.5;
        subtotal+=(it.monto||0);
        doc.setTextColor(60,60,60);
      });
      if(y>270){doc.addPage();y=18;}
    });
    doc.setDrawColor(200,200,200);doc.line(14,y,198,y);y+=1;
    doc.setFont("helvetica","bold");doc.setFontSize(9.5);doc.setTextColor(20,20,20);
    doc.text("Subtotal "+prop2.direccion,14,y+4);
    doc.text(moneda(subtotal),198,y+4,{align:"right"});y+=10;
  });

  if(y>250){doc.addPage();y=18;}
  doc.setDrawColor(20,20,20);doc.setLineWidth(0.4);doc.line(12,y,198,y);y+=6;
  doc.setFont("helvetica","normal");doc.setFontSize(9.5);doc.setTextColor(40,40,40);
  doc.text("Total general (alquileres + gastos)",12,y);doc.text(moneda(totalBruto),198,y,{align:"right"});y+=6;
  doc.setTextColor(180,30,30);
  doc.text("Comision agencia ("+comPct+"% s/ alquileres)",12,y);doc.text("- "+moneda(comision),198,y,{align:"right"});y+=6;
  if(saldoAnterior!==0){
    doc.setTextColor(saldoAnterior>0?20:180,saldoAnterior>0?120:30,saldoAnterior>0?60:30);
    doc.text("Saldo mes anterior ("+(saldoAnterior>0?"a favor":"en contra")+")",12,y);
    doc.text((saldoAnterior>0?"+ ":"- ")+moneda(Math.abs(saldoAnterior)),198,y,{align:"right"});y+=6;
  }
  ajustesPendLiq.forEach(function(a){
    if(y>265){doc.addPage();y=18;}
    var neg=(a.monto||0)<0;
    doc.setTextColor(neg?180:20,neg?30:120,neg?30:60);
    doc.text((a.descripcion||"Ajuste").substring(0,65),12,y);
    doc.text((neg?"- ":"+ ")+moneda(Math.abs(a.monto||0)),198,y,{align:"right"});y+=6;
  });
  doc.setDrawColor(20,20,20);doc.setLineWidth(0.6);doc.line(12,y,198,y);y+=7;
  doc.setFont("helvetica","bold");doc.setFontSize(12);doc.setTextColor(20,20,20);
  doc.text("NETO A ENTREGAR",12,y);
  doc.setTextColor(20,120,60);doc.text(moneda(netoAEntregar),198,y,{align:"right"});y+=6;
  doc.setFont("helvetica","italic");doc.setFontSize(8);doc.setTextColor(90,90,90);
  doc.text("("+numeroALetras(netoAEntregar)+" pesos)",12,y);y+=10;

  if(nuevoSaldo!==0){
    doc.setFont("helvetica","normal");doc.setFontSize(8.5);
    doc.setTextColor(nuevoSaldo>0?20:180,nuevoSaldo>0?120:30,nuevoSaldo>0?60:30);
    doc.text("Entregado: "+moneda(montoEntregado)+" — Queda "+(nuevoSaldo>0?"a favor":"en contra")+" del propietario: "+moneda(Math.abs(nuevoSaldo))+" para el proximo mes",12,y);y+=8;
  }
  doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(90,90,90);
  doc.text("Eckerdt Negocios Inmobiliarios",12,y+10);

  doc.save("Liquidacion-"+nombre.replace(/ /g,"_")+"-"+mesesSel[mesesSel.length-1]+".pdf");

  // ── Marcar pagos como liquidados y registrar la referencia ───────────────
  const ref=nombre+"_"+mesesSel.join("-")+"_"+Date.now();
  const fechaLiq=hoy();
  await Promise.all(pagosSel.map(p=>fbUpd("pagos",p._id,{liquidadoProp:true,liquidacionRef:ref,fechaLiquidacion:fechaLiq})));
  S.pagos=S.pagos.map(p=>pagosSel.some(ps=>ps._id===p._id)?{...p,liquidadoProp:true,liquidacionRef:ref,fechaLiquidacion:fechaLiq}:p);
  if(ajustesPendLiq.length){
    await Promise.all(ajustesPendLiq.map(function(a){return fbUpd("ajustes_prop",a._id,{liquidacionRef:ref,fechaLiquidacion:fechaLiq});}));
    if(S_AJUSTES_PROP[nombre])S_AJUSTES_PROP[nombre]=S_AJUSTES_PROP[nombre].map(function(a){
      return ajustesPendLiq.some(function(ap){return ap._id===a._id;})?{...a,liquidacionRef:ref,fechaLiquidacion:fechaLiq}:a;
    });
  }

  toast("Liquidacion generada — Neto: "+moneda(netoAEntregar));
  render();
}

async function reimprimirLiquidacion(ref, nombre){
  const pagosSel=S.pagos.filter(p=>p.liquidacionRef===ref&&!p._eliminado);
  if(!pagosSel.length){toast("No se encontraron pagos de esa liquidacion",false);return;}
  const prop=S.propietarios.find(x=>x.nombre===nombre)||{};
  const comPct=prop.comisionAgencia??5;
  const porPropiedad={};
  pagosSel.forEach(p=>{
    const dir=p.direccion||"Sin direccion";
    if(!porPropiedad[dir])porPropiedad[dir]={direccion:dir,inquilino:p.inquilino||"",pagos:[]};
    porPropiedad[dir].pagos.push(p);
  });
  const propiedades=Object.values(porPropiedad).sort((a,b)=>a.direccion.localeCompare(b.direccion));
  const mesesSel=[...new Set(pagosSel.map(p=>p.mes).filter(Boolean))].sort();
  let totalAlquileres=0,totalExtras=0;
  propiedades.forEach(prop2=>{
    prop2.pagos.forEach(p=>{
      totalAlquileres+=(p.alquiler||0);
      const items=p.itemsCobro||(p.extras||[]).map(e=>({tipo:"fijo",desc:e.desc,monto:+(e.monto||0)}));
      items.forEach(it=>{if(it.tipo==="gestion"||it.tipo==="honorario"||it.tipo==="saldo")return;if((it.monto||0)!==0)totalExtras+=(it.monto||0);});
    });
  });
  const totalBruto=totalAlquileres+totalExtras;
  const comision=Math.round(totalAlquileres*comPct/100);
  const netoAEntregar=totalBruto-comision;
  const{jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:"mm",format:"a4"});
  let y=14;
  doc.setFont("helvetica","bold");doc.setFontSize(14);doc.setTextColor(20,20,20);
  doc.text("LIQUIDACION A PROPIETARIO",105,y,{align:"center"});y+=6;
  doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(120,120,120);
  doc.text("Documento no valido como factura",105,y,{align:"center"});y+=8;
  doc.setDrawColor(180,180,180);doc.line(12,y,198,y);y+=7;
  doc.setFont("helvetica","bold");doc.setFontSize(11);doc.setTextColor(20,20,20);
  doc.text(nombre.toUpperCase(),12,y);
  doc.setFont("helvetica","normal");doc.setFontSize(9);
  doc.text("Periodo: "+mesesSel.map(mesNombreMay).join(", "),198,y,{align:"right"});y+=8;
  propiedades.forEach(prop2=>{
    if(y>260){doc.addPage();y=18;}
    doc.setFillColor(240,240,240);doc.rect(12,y-4,186,7,"F");
    doc.setFont("helvetica","bold");doc.setFontSize(9.5);doc.setTextColor(30,30,30);
    doc.text(prop2.direccion+"  ("+prop2.inquilino+")",14,y);y+=7;
    let subtotal=0;
    prop2.pagos.sort((a,b)=>(a.mes||"").localeCompare(b.mes||"")).forEach(p=>{
      doc.setFont("helvetica","normal");doc.setFontSize(9);doc.setTextColor(60,60,60);
      doc.text("Alquiler "+mesNombre(p.mes),16,y);
      doc.text(moneda(p.alquiler||0),198,y,{align:"right"});y+=5.5;
      subtotal+=(p.alquiler||0);
      const items=p.itemsCobro||(p.extras||[]).map(e=>({tipo:"fijo",desc:e.desc,monto:+(e.monto||0)}));
      items.forEach(it=>{
        if(it.tipo==="gestion"||it.tipo==="honorario"||it.tipo==="saldo")return;
        if((it.monto||0)===0)return;
        const neg=(it.monto||0)<0;
        doc.setTextColor(neg?180:60,neg?60:60,60);
        doc.text("  "+(it.desc||it.tipo),16,y);
        doc.text((neg?"- ":"")+moneda(Math.abs(it.monto||0)),198,y,{align:"right"});y+=5.5;
        subtotal+=(it.monto||0);
        doc.setTextColor(60,60,60);
      });
      if(y>270){doc.addPage();y=18;}
    });
    doc.setDrawColor(200,200,200);doc.line(14,y,198,y);y+=1;
    doc.setFont("helvetica","bold");doc.setFontSize(9.5);doc.setTextColor(20,20,20);
    doc.text("Subtotal "+prop2.direccion,14,y+4);
    doc.text(moneda(subtotal),198,y+4,{align:"right"});y+=10;
  });
  if(y>250){doc.addPage();y=18;}
  doc.setDrawColor(20,20,20);doc.setLineWidth(0.4);doc.line(12,y,198,y);y+=6;
  doc.setFont("helvetica","normal");doc.setFontSize(9.5);doc.setTextColor(40,40,40);
  doc.text("Total general (alquileres + gastos)",12,y);doc.text(moneda(totalBruto),198,y,{align:"right"});y+=6;
  doc.setTextColor(180,30,30);
  doc.text("Comision agencia ("+comPct+"% s/ alquileres)",12,y);doc.text("- "+moneda(comision),198,y,{align:"right"});y+=6;
  doc.setDrawColor(20,20,20);doc.setLineWidth(0.6);doc.line(12,y,198,y);y+=7;
  doc.setFont("helvetica","bold");doc.setFontSize(12);doc.setTextColor(20,20,20);
  doc.text("NETO A ENTREGAR",12,y);
  doc.setTextColor(20,120,60);doc.text(moneda(netoAEntregar),198,y,{align:"right"});y+=6;
  doc.setFont("helvetica","italic");doc.setFontSize(8);doc.setTextColor(90,90,90);
  doc.text("("+numeroALetras(netoAEntregar)+" pesos)",12,y);y+=10;
  doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(90,90,90);
  doc.text("Eckerdt Negocios Inmobiliarios",12,y+10);
  doc.save("Liquidacion-"+nombre.replace(/ /g,"_")+"-"+mesesSel[mesesSel.length-1]+".pdf");
}

async function eliminarLiquidacion(ref, nombre){
  if(!confirm('¿Eliminar esta liquidación? Los pagos volverán a estado pendiente de liquidar.'))return;
  const pagosRef=S.pagos.filter(p=>p.liquidacionRef===ref);
  const ajustesRef=(S_AJUSTES_PROP[nombre]||[]).filter(a=>a.liquidacionRef===ref);
  try{
    await Promise.all(pagosRef.map(p=>fbUpd("pagos",p._id,{liquidadoProp:false,liquidacionRef:null,fechaLiquidacion:null})));
    await Promise.all(ajustesRef.map(a=>fbUpd("ajustes_prop",a._id,{liquidacionRef:null,fechaLiquidacion:null})));
    S.pagos=S.pagos.map(p=>p.liquidacionRef===ref?{...p,liquidadoProp:false,liquidacionRef:null,fechaLiquidacion:null}:p);
    if(S_AJUSTES_PROP[nombre])S_AJUSTES_PROP[nombre]=S_AJUSTES_PROP[nombre].map(a=>a.liquidacionRef===ref?{...a,liquidacionRef:null,fechaLiquidacion:null}:a);
    toast('Liquidación eliminada — pagos vueltos a pendiente ✓');
  }catch(e){toast('Error al eliminar: '+e.message,false);}
  render();
}

function renderModalDetalle(){
  const c=S.contratoActivo;if(!c)return"";
  if(S.ultimoPago&&S.ultimoPago.contratoId===c._id){
    const p=S.ultimoPago;
    return '<div class="overlay"><div class="modal" style="max-width:520px">'
      +'<button class="mclose" data-action="cerrarModalPago">✕</button>'
      +'<div style="text-align:center;padding:32px 24px 16px">'
      +'<div style="font-size:40px;margin-bottom:12px">✅</div>'
      +'<div style="font-size:18px;font-weight:700;color:#5ddb8a;margin-bottom:8px">Pago registrado</div>'
      +'<div style="font-size:13px;color:var(--gris3)">'+p.inquilino+' — '+mesNombre(p.mes)+'</div>'
      +'<div style="font-size:22px;font-weight:700;margin-top:8px">'+moneda(p.totalInquilino||p.alquiler||0)+'</div>'
      +'</div>'
      +'<div class="fa" style="justify-content:center;gap:12px;padding-bottom:24px">'
      +'<button class="btn" style="background:rgba(75,200,232,.12);color:var(--celeste);border-color:rgba(75,200,232,.3)" data-action="emitirPDFInqPago">📄 PDF Inquilino</button>'
      +'<button class="btn" data-action="cerrarModalPago">Cerrar</button>'
      +'</div>'
      +'</div></div>';
  }
  const f=S.form;
  const alq=+(f.alquiler||c.alquilerBase||0);
  const extras=(c.extras||[]);
  const totalExtras=S.itemsCobro.reduce((s,it)=>s+(it.monto||0),0);
  const totalInq=alq+totalExtras;
  const com=Math.round(alq*(c.comisionAgencia??5)/100);
  const netoP=alq-com;
  const prox=getProxActualizacion(c);
  const proxStr=prox?prox.toLocaleDateString("es-AR"):"—";
  const pagosContrato=S.pagos.filter(p=>p.contratoId===c._id).slice(0,8);
  const pagosHtml=pagosContrato.map(p=>{
    const btns=p.estado==="cobrado"?`<button class="btn sm" data-action="emitirINQ" data-id="${p._id}">📄 Inq</button>`:"";
    return `<tr><td>${mesNombre(p.mes)}</td><td>${moneda(p.alquiler||0)}</td><td>${badge(p.estado)}</td><td>${p.fechaCobro||"—"}</td><td style="display:flex;gap:4px">${btns}</td></tr>`;
  }).join("");
  const pagoDelMes=S.pagos.filter(p=>p.contratoId===c._id&&p.mes===(f.mes||mesActual())).sort((a,b)=>(b.fechaCobro||"").localeCompare(a.fechaCobro||""))[0];
  const pagosDupMes=S.pagos.filter(p=>p.contratoId===c._id&&p.mes===(f.mes||mesActual())).length;
  let historicalViewHtml="";
  if(pagoDelMes){
    const ph=pagoDelMes;
    const pItems=ph.itemsCobro||[];
    const bColor={deposito:"#5ddb8a",honorario:"#5ddb8a",fijo:"var(--celeste)",variable:"var(--naranja)",saldo:"#ff7b6b",gestion:"#b48ef0"};
    const bLabel={deposito:"DEP",honorario:"HON",fijo:"FIJO",variable:"VAR",saldo:"SALDO",gestion:"GEST"};
    const alqP=ph.alquiler||0;
    const totalInqP=ph.totalInquilino||ph.total||0;
    const comP=ph.comision||Math.round(alqP*(ph.comisionAgencia??5)/100);
    const netoPropP=ph.netoPropiertario||(alqP-comP);
    const dupAlert=pagosDupMes>1?'<div style="background:rgba(245,166,35,.1);border:1px solid rgba(245,166,35,.3);border-radius:6px;padding:8px 12px;margin-bottom:10px;font-size:11px;color:var(--naranja)">⚠️ '+pagosDupMes+' pagos registrados para este mes — mostrando el más reciente</div>':'';
    const alqRow='<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--negro4)"><span style="font-size:12px;color:var(--gris3)">Alquiler</span><span style="font-size:12px;font-weight:600">'+moneda(alqP)+'</span></div>';
    let itemRowsHtml="";
    pItems.forEach(function(it){
      const neg=(it.monto||0)<0;
      const bc=bColor[it.tipo]||'var(--gris3)';
      const bl=bLabel[it.tipo]||(it.tipo||"").toUpperCase().slice(0,4);
      itemRowsHtml+='<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--negro4)">'
        +'<span style="font-size:9px;font-weight:700;color:'+bc+';min-width:44px">'+bl+'</span>'
        +'<span style="flex:1;font-size:12px;color:var(--gris3)">'+(it.desc||it.tipo||"")+'</span>'
        +'<span style="font-size:12px;font-weight:600;color:'+(neg?"#ff7b6b":"var(--blanco)")+'">'+moneda(it.monto||0)+'</span>'
        +'</div>';
    });
    historicalViewHtml='<div class="fsec"><div class="fsec-t">Pago del período</div>'
      +'<div class="fg" style="margin-bottom:12px"><div><label class="fl">Período</label><input class="inp" style="width:100%" type="month" value="'+(f.mes||mesActual())+'" data-action="setForm" data-key="mes"></div></div>'
      +dupAlert
      +'<div style="background:rgba(39,174,96,.06);border:1px solid rgba(39,174,96,.2);border-radius:10px;padding:14px">'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">'
      +'<span style="font-size:20px">✅</span>'
      +'<div><div style="font-weight:600;color:#5ddb8a;font-size:13px">Cobrado</div>'
      +'<div style="font-size:11px;color:var(--gris3)">'+(ph.fechaCobro||"—")+(ph.comprobante?" · Cpto. #"+ph.comprobante:"")+'</div>'
      +'</div></div>'
      +alqRow
      +itemRowsHtml
      +'<div style="display:flex;justify-content:space-between;padding:8px 0 4px;margin-top:2px;border-top:1px solid var(--negro4)">'
      +'<span style="font-size:13px;font-weight:700">Total inquilino</span>'
      +'<span style="font-size:13px;font-weight:700">'+moneda(totalInqP)+'</span></div>'
      +'<div style="display:flex;justify-content:space-between;padding:2px 0;color:#ff7b6b">'
      +'<span style="font-size:11px">Comisión ('+(ph.comisionAgencia??5)+'%)</span>'
      +'<span style="font-size:11px">− '+moneda(comP)+'</span></div>'
      +'<div style="display:flex;justify-content:space-between;padding:2px 0">'
      +'<span style="font-size:12px;font-weight:600;color:#5ddb8a">Neto propietario</span>'
      +'<span style="font-size:12px;font-weight:600;color:#5ddb8a">'+moneda(netoPropP)+'</span></div>'
      +'</div>'
      +'<div class="fa" style="margin-top:12px;justify-content:flex-end">'
      +'<button class="btn" style="background:rgba(75,200,232,.12);color:var(--celeste);border-color:rgba(75,200,232,.3)" data-action="emitirINQ" data-id="'+ph._id+'">📄 PDF Inquilino</button>'
      +'</div>'
      +'</div>';
  }
  return `<div class="overlay"><div class="modal">
    <button class="mclose" data-action="closeModal">✕</button>
    <div class="mth"><div class="mth-ic">📋</div>${c.inquilino||""} — ${c.direccion||""}<button class="btn sm" style="background:rgba(75,200,232,.1);color:var(--celeste);margin-left:auto;font-size:12px" data-action="matrizGastos" data-id="${c._id}">📊 Gastos fijos</button></div>
    <div class="fsec">
      <div class="fsec-t">Datos del contrato</div>
      <div class="fc-grid">
        <div class="fc"><div class="fc-l">Propietario</div><div class="fc-v">${c.propietarioNombre||"—"}</div></div>
        <div class="fc"><div class="fc-l">Alquiler actual</div><div class="fc-v big">${moneda(c.alquilerBase)}</div></div>
        <div class="fc"><div class="fc-l">Comisión agencia</div><div class="fc-v">${c.comisionAgencia??5}%</div></div>
        <div class="fc"><div class="fc-l">Vigencia</div><div class="fc-v">${c.inicio||""} → ${c.fin||"S/F"}</div></div>
        <div class="fc"><div class="fc-l">Próx. actualización ${c.indiceActualizacion||"IPC"}</div><div class="fc-v">${proxStr}</div></div>
        <div class="fc"><div class="fc-l">Garante</div><div class="fc-v">${c.garante||"—"}</div></div>
        ${extras.length?`<div class="fc" style="grid-column:1/-1"><div class="fc-l">Gastos inquilino</div><div class="fc-v">${extras.map(e=>`<span class="tag">${e.desc}: ${moneda(e.monto)}</span>`).join("")}</div></div>`:""}
      </div>
      <button class="btn sm" data-action="actualizarAlq" data-id="${c._id}">⟳ Aplicar aumento ${c.indiceActualizacion||"IPC"}</button>
      ${(()=>{
        if(!c.inicio) return '';
        const _p=c.inicio.split('-').map(Number);
        if(!_p[2]||_p[2]<=1) return '';
        if(mesActual()!==c.inicio.substring(0,7)) return '';
        return '<div style="margin-top:10px;background:var(--negro3);border:1px solid var(--negro4);border-radius:8px;padding:10px 14px">'
          +'<div style="font-size:12px;font-weight:600;margin-bottom:6px">Monto acordado para el mes parcial de ingreso</div>'
          +'<div style="display:flex;gap:8px;align-items:center">'
          +'<input class="inp" type="number" id="monto-mes-parcial-'+c._id+'" placeholder="Dejar vacío para prorratear por días" value="'+(c.montoMedioMesForzado||"")+'" style="max-width:220px">'
          +'<button class="btn sm primary" data-action="guardarMontoMesParcial" data-id="'+c._id+'">Guardar</button>'
          +'</div>'
          +'<div style="font-size:11px;color:var(--gris3);margin-top:4px">Se usa para prellenar el campo Alquiler ($) al registrar el pago de este mes; no afecta pagos ya cobrados.</div>'
          +'</div>';
      })()}
    </div>
    <div class="fsec">
      <div class="fsec-t">Depósito y honorarios</div>
      ${(()=>{
        const dep=c.deposito||{};
        const hon=c.honorarios||{};
        const alq=c.alquilerBase||0;
        const depPag=dep.pagado||0;
        const depPend=dep.pendiente||0;
        const depComp=dep.completo||false;
        const honTotal=hon.total||Math.round(alq/2);
        const honPag=hon.pagado||0;
        const honPend=hon.pendiente||0;
        const honComp=hon.completo||false;
        let html='<div class="fg">';
        html+=`<div class="fc" style="border-left:3px solid ${depComp?"var(--verde)":depPend>0?"var(--rojo)":"var(--gris4)"}">
          <div class="fc-l">Depósito garantía</div>
          <div class="fc-v">${dep.total?moneda(dep.total)+" total &nbsp;·&nbsp; Pagado: "+moneda(depPag):"Sin depósito de garantía"}</div>
          ${depPend>0?`<div style="color:var(--rojo);font-size:11px;margin-top:4px">⚠️ Cuota ${(dep.cuotasPagadas!==undefined?dep.cuotasPagadas:(dep.pagadas||0))+1} de ${dep.cuotasTotales||dep.cuotas||1} pendiente: ${moneda(Math.min(depPend,dep.montoCuota||depPend))}</div>
          <button class="btn sm" style="margin-top:6px;background:rgba(39,174,96,.15);color:#5ddb8a" data-action="cobrarCuotaDep" data-id="${c._id}">✓ Registrar cuota ${(dep.cuotasPagadas!==undefined?dep.cuotasPagadas:(dep.pagadas||0))+1} de depósito</button>`:""}
          ${depComp&&dep.total?`<div style="color:var(--verde);font-size:11px;margin-top:4px">✓ Depósito completo</div>`:""}
        </div>`;
        if(hon.sinCargo){
          html+='<div class="fc" style="border-left:3px solid var(--gris4)">'
            +'<div class="fc-l">Honorarios inmobiliaria</div>'
            +'<div class="fc-v" style="color:var(--gris3)">Sin cargo — no se cobran honorarios</div>'
            +'</div>';
        }else{
          html+=`<div class="fc" style="border-left:3px solid ${honComp?"var(--verde)":honPend>0?"var(--rojo)":"var(--gris4)"}">
            <div class="fc-l">Honorarios inmobiliaria</div>
            <div class="fc-v">${moneda(honTotal)} (${hon.monto==="mes"?"1 mes":"½ mes"}) &nbsp;·&nbsp; Pagado: ${moneda(honPag)}</div>
            ${honPend>0?`<div style="color:var(--rojo);font-size:11px;margin-top:4px">⚠️ Cuota pendiente: ${moneda(honPend)}</div>
            <button class="btn sm" style="margin-top:6px;background:rgba(39,174,96,.15);color:#5ddb8a" data-action="cobrarCuotaHon" data-id="${c._id}">✓ Registrar 2da cuota honorarios</button>`:""}
            ${honComp?`<div style="color:var(--verde);font-size:11px;margin-top:4px">✓ Honorarios completos</div>`:""}
          </div>`;
        }
        html+='</div>';
        return html;
      })()}
    </div>
    ${historicalViewHtml}
    <div class="fsec" style="${pagoDelMes?'display:none':''}">
      <div class="fsec-t">Registrar pago del mes</div>
      <div class="fg">
        <div><label class="fl">Período *</label><input class="inp" style="width:100%" type="month" value="${f.mes||mesActual()}" data-action="setForm" data-key="mes"></div>
        <div><label class="fl">Alquiler ($)</label><input id="cobro-alquiler" class="inp" style="width:100%" type="number" value="${f.alquiler||c.alquilerBase||""}" data-action="setAlquilerCobro">${(()=>{if(!c.inicio||f.mes!==c.inicio.substring(0,7))return"";const[_y,_m,_d]=c.inicio.split('-').map(Number);if(_d<=1)return"";const diasEnMes=new Date(_y,_m,0).getDate();const diasVividos=diasEnMes-_d+1;return'<div style="font-size:11px;color:var(--naranja);margin-top:4px">📅 Mes parcial: '+diasVividos+' de '+diasEnMes+' días (ingreso día '+_d+')</div>';})()}</div>
        <div><label class="fl">Fecha cobro</label><input class="inp" style="width:100%" type="date" value="${f.fechaCobro||hoy()}" data-action="setForm" data-key="fechaCobro"></div>
        <div><label class="fl">N° Comprobante</label><input class="inp" style="width:100%" placeholder="Auto" data-action="setForm" data-key="comprobante"></div>
      </div>

      <div style="margin-top:14px">
        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px">
            <label class="fl" style="margin:0">Items del cobro</label>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn sm" data-action="addItem" data-tipo="fijo" style="background:rgba(75,200,232,.12);color:var(--celeste)">+ Fijo</button>
              <button class="btn sm" data-action="addItem" data-tipo="variable" style="background:rgba(245,166,35,.12);color:var(--naranja)">+ Variable</button>
              <button class="btn sm" data-action="addItem" data-tipo="saldo" style="background:rgba(231,76,60,.12);color:#ff7b6b">± Saldo</button><button class="btn sm" data-action="addMora" style="background:rgba(245,166,35,.15);color:var(--naranja)">⏰ Mora</button><button class="btn sm" data-action="addItem" data-tipo="gestion" style="background:rgba(160,120,220,.12);color:#b48ef0">🏢 Gestión</button>
            </div>
          </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${S.itemsCobro.map((it,i)=>{
            if(it.tipo==="deposito"){
              const depObj=(S.contratoActivo||{}).deposito||{};
              const depCuotasPag=depObj.cuotasPagadas!==undefined?depObj.cuotasPagadas:(depObj.pagadas||0);
              const cuotasSel=S.depCuotasCobro||1;
              const opt1=cuotasSel===1?" selected":"";
              const opt2=cuotasSel===2?" selected":"";
              const depMontoStr=moneda(it.monto||0);
              const selectorHtml=depCuotasPag===0
                ?'<select class="inp" data-action="setDepCuotasCobro" style="font-size:10px;padding:2px 4px;width:90px"><option value="1"'+opt1+'>1 cuota</option><option value="2"'+opt2+'>2 cuotas</option></select>'
                :'';
              return '<div class="item-cobro-row" style="display:flex;align-items:center;gap:8px;background:rgba(39,174,96,.08);border-radius:6px;padding:7px 10px">'
                +'<span style="font-size:10px;font-weight:600;color:#5ddb8a;min-width:48px;text-transform:uppercase">DEP</span>'
                +'<span style="flex:1;font-size:12px;color:var(--blanco)">'+it.desc+'</span>'
                +selectorHtml
                +'<span style="width:90px;text-align:right;font-weight:600;font-size:12px;color:#5ddb8a">'+depMontoStr+'</span>'
                +'<button class="btn sm" data-action="removeItem" data-id="'+i+'" style="background:rgba(231,76,60,.15);color:#ff7b6b;padding:3px 8px">✕</button>'
                +'</div>';
            }
            const colors={fijo:"rgba(75,200,232,.08)",variable:"rgba(245,166,35,.08)",saldo:"rgba(231,76,60,.08)",gestion:"rgba(160,120,220,.08)",honorario:"rgba(39,174,96,.08)"};
            const labels={fijo:"Fijo",variable:"Variable",saldo:"Saldo",gestion:"Gestión",honorario:"Honor."};
            return `<div class="item-cobro-row" style="display:flex;align-items:center;gap:8px;background:${colors[it.tipo]||colors.variable};border-radius:6px;padding:7px 10px">
              <span style="font-size:10px;font-weight:600;color:var(--gris3);min-width:48px;text-transform:uppercase">${labels[it.tipo]||it.tipo}</span>
              <input class="item-desc inp" value="${it.desc||""}" placeholder="Descripción" style="flex:1">
              <input class="item-monto inp" value="${it.monto||""}" type="number" placeholder="$" style="width:110px">
              <button class="btn sm" data-action="removeItem" data-id="${i}" style="background:rgba(231,76,60,.15);color:#ff7b6b;padding:3px 8px">✕</button>
            </div>`;
          }).join("")}
          ${S.itemsCobro.length===0?`<p style="font-size:11px;color:var(--gris3);padding:4px 0">Sin items extra. Podés agregar TGI, agua, gastos variables o saldo del mes anterior.</p>`:""}
        </div>
          <button class="btn" data-action="guardarGastosPend" style="width:100%;margin-top:10px;background:rgba(39,174,96,.1);color:#5ddb8a;border:1px solid rgba(39,174,96,.3);font-size:12px;padding:9px">💾 Guardar gastos para cobrar después</button>
        </div>
        <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--negro4)">
          <div style="font-size:11px;font-weight:600;color:var(--gris3);margin-bottom:8px;text-transform:uppercase">📝 Comentarios temporales</div>
          ${renderNotasTemp("contrato", c._id)}
        </div>
      </div>

      <div class="rsum" style="margin-top:14px">
        <div style="font-size:11px;font-weight:600;color:var(--celeste);margin-bottom:8px;letter-spacing:.5px">RESUMEN DEL COBRO</div>
        <div id="cobro-resumen">
          <div class="rrow"><span>Alquiler</span><span>${moneda(alq)}</span></div>
          ${S.itemsCobro.map(it=>{const neg=(it.monto||0)<0;const col=neg?"#ff7b6b":it.tipo==="saldo"?"var(--naranja)":"var(--celeste)";return `<div class="rrow" style="color:${col}"><span>${it.desc||it.tipo}</span><span>${neg?"":"+"}${moneda(it.monto||0)}</span></div>`;}).join("")}
          <div class="rrow" style="font-weight:600;font-size:13px;border-top:1px solid var(--negro4);margin-top:4px;padding-top:8px;color:var(--naranja)"><span>Total inquilino</span><span>${moneda(totalInq)}</span></div>
          <div style="height:6px"></div>
          <div class="rrow red"><span>Comisión (${c.comisionAgencia??5}%)</span><span>− ${moneda(com)}</span></div>
          <div class="rrow green" style="font-weight:600;font-size:13px"><span>Neto propietario</span><span>${moneda(netoP)}</span></div>
        </div>
      </div>
    </div>
    ${pagosContrato.length?`<div class="fsec" style="border:none;margin:0;padding-bottom:0">
      <div class="fsec-t">Historial de pagos</div>
      <div class="tw"><table><thead><tr><th>Período</th><th>Monto</th><th>Estado</th><th>Fecha cobro</th><th>Comprobantes</th></tr></thead>
      <tbody>${pagosHtml}</tbody></table></div>
    </div>`:""}
    ${(()=>{const dc=c.fin?diasPara(c.fin):null;if(dc===null)return"";if(dc<0)return`<div style="background:rgba(231,76,60,.08);border:1px solid rgba(231,76,60,.3);border-radius:10px;padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;gap:10px"><span style="font-size:20px">⚠️</span><div><div style="font-weight:600;color:var(--rojo)">Contrato vencido hace ${Math.abs(dc)} día${Math.abs(dc)!==1?"s":""}</div><div style="font-size:11px;color:var(--gris3);margin-top:2px">Renovar o finalizar</div></div></div>`;if(dc<=60)return`<div style="background:rgba(245,166,35,.08);border:1px solid rgba(245,166,35,.3);border-radius:10px;padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;gap:10px"><span style="font-size:20px">📅</span><div><div style="font-weight:600;color:var(--naranja)">Vence en ${dc} día${dc!==1?"s":""} — ${c.fin}</div><div style="font-size:11px;color:var(--gris3);margin-top:2px">Recordá gestionar la renovación</div></div></div>`;return"";})()}<div class="fa">
      <button class="btn" data-action="closeModal">Cerrar</button>
      <button class="btn" style="background:rgba(39,174,96,.12);color:#5ddb8a;border-color:rgba(39,174,96,.3)" data-action="renovarContrato" data-id="${S.contratoActivo._id}">🔄 Renovar contrato</button><button class="btn" style="background:rgba(231,76,60,.1);color:#ff7b6b;border-color:rgba(231,76,60,.3)" data-action="finalizarContrato" data-id="${S.contratoActivo._id}">⛔ Finalizar</button>${pagoDelMes?'':'<button class="btn" data-action="registrarPago" style="background:#F5A623;color:#000;font-weight:700;font-size:13px;padding:10px 18px;border:2px solid #d4891c">💰 Registrar pago y emitir comprobantes</button>'}
    </div>
  </div></div>`;
}

function calcularConfirmadosMigracion(){
  return S.contratos.filter(c=>c.direccion&&!c._eliminado).reduce(function(acc,c){
    const props=(S.propiedades||[]).filter(p=>p.propietarioNombre===c.propietarioNombre&&!p._eliminado);
    if(props.length>=2)acc.push({propietario:c.propietarioNombre,contratoId:c._id,inquilino:c.inquilino,inicio:c.inicio,monto:c.alquilerBase,direccionActual:c.direccion,propiedadIdActual:c.propiedadId,propiedades:props.map(p=>({id:p._id,direccion:p.direccion}))});
    return acc;
  },[]);
}
function renderModalMigracion(){
  const pendientes=calcularPendientesMigracion();
  const confirmados=calcularConfirmadosMigracion();
  const TH='<thead><tr><th>Propietario</th><th>Inquilino</th><th>Inicio</th><th>Monto</th><th style="min-width:220px">Propiedad</th><th></th></tr></thead>';
  const WRAP='overflow-x:auto;border:1px solid var(--negro4);border-radius:10px;margin-bottom:14px';
  pendientes.sort(function(a,b){const aF=a.estado==="activo"?0:1;const bF=b.estado==="activo"?0:1;return aF-bF;});
  const rowsPend=pendientes.map(function(r){
    const esActivo=r.estado==="activo";
    const badge=esActivo
      ?'<span style="background:rgba(39,174,96,.15);color:#5ddb8a;font-size:9px;font-weight:600;padding:1px 5px;border-radius:3px;margin-left:5px;vertical-align:middle">ACTIVO</span>'
      :'<span style="background:rgba(255,80,80,.12);color:#f87171;font-size:9px;font-weight:600;padding:1px 5px;border-radius:3px;margin-left:5px;vertical-align:middle">FINALIZADO</span>';
    const rowBg=esActivo?'':'background:rgba(255,80,80,.03)';
    const sel=S.migSeleccion[r.contratoId]||"";
    const opts=r.propiedades.map(p=>'<option value="'+p.id+'"'+(sel===p.id?' selected':'')+'>'+p.direccion+'</option>').join('');
    return '<tr style="'+rowBg+'">'
      +'<td style="font-size:12px">'+r.propietario+'</td>'
      +'<td style="font-size:12px">'+(r.inquilino||'—')+badge+'</td>'
      +'<td style="font-size:11px;color:var(--gris3)">'+(r.inicio||'—')+'</td>'
      +'<td style="font-size:11px;color:var(--gris3)">'+moneda(r.monto||0)+'</td>'
      +'<td><select data-action="migSelProp" data-id="'+r.contratoId+'" style="width:100%;font-size:11px;padding:3px 6px;background:var(--negro3);color:var(--blanco);border:1px solid var(--negro4);border-radius:4px"><option value="">— elegí propiedad —</option>'+opts+'</select></td>'
      +'<td><button class="btn sm" style="background:rgba(75,200,232,.15);color:var(--celeste);opacity:'+(sel?'1':'.4')+'" data-action="migConfirmar" data-id="'+r.contratoId+'"'+(sel?'':' disabled')+'>✓</button></td>'
    +'</tr>';
  }).join('');
  const rowsConf=confirmados.map(function(r){
    const editando=S.migEditando&&S.migEditando[r.contratoId];
    if(editando){
      const sel=S.migSeleccion[r.contratoId]||r.propiedadIdActual||"";
      const opts=r.propiedades.map(p=>'<option value="'+p.id+'"'+(sel===p.id?' selected':'')+'>'+p.direccion+'</option>').join('');
      return '<tr style="background:rgba(75,200,232,.04)">'
        +'<td style="font-size:12px">'+r.propietario+'</td>'
        +'<td style="font-size:12px">'+(r.inquilino||'—')+'</td>'
        +'<td style="font-size:11px;color:var(--gris3)">'+(r.inicio||'—')+'</td>'
        +'<td style="font-size:11px;color:var(--gris3)">'+moneda(r.monto||0)+'</td>'
        +'<td><select data-action="migSelProp" data-id="'+r.contratoId+'" style="width:100%;font-size:11px;padding:3px 6px;background:var(--negro3);color:var(--blanco);border:1px solid var(--negro4);border-radius:4px">'+opts+'</select></td>'
        +'<td style="display:flex;gap:4px">'
          +'<button class="btn sm" style="background:rgba(75,200,232,.15);color:var(--celeste)" data-action="migConfirmar" data-id="'+r.contratoId+'">✓</button>'
          +'<button class="btn sm" style="background:rgba(255,80,80,.12);color:#f87171" data-action="migCancelarEditar" data-id="'+r.contratoId+'">✕</button>'
        +'</td>'
      +'</tr>';
    }
    return '<tr style="opacity:.65">'
      +'<td style="font-size:12px">'+r.propietario+'</td>'
      +'<td style="font-size:12px">'+(r.inquilino||'—')+'</td>'
      +'<td style="font-size:11px;color:var(--gris3)">'+(r.inicio||'—')+'</td>'
      +'<td style="font-size:11px;color:var(--gris3)">'+moneda(r.monto||0)+'</td>'
      +'<td style="font-size:11px;color:var(--verde)">✓ '+(r.direccionActual||'—')+'</td>'
      +'<td><button class="btn sm" style="background:rgba(255,255,255,.06);color:var(--gris3)" data-action="migEditar" data-id="'+r.contratoId+'">✎</button></td>'
    +'</tr>';
  }).join('');
  let body='';
  if(pendientes.length)body+='<p style="font-size:11px;color:var(--gris3);margin:0 0 6px">Pendientes ('+pendientes.length+')</p><div style="'+WRAP+'"><table>'+TH+'<tbody>'+rowsPend+'</tbody></table></div>';
  else body+='<p style="color:var(--gris3);font-size:13px;padding:4px 0 8px">✅ Sin pendientes.</p>';
  if(confirmados.length)body+='<p style="font-size:11px;color:var(--gris3);margin:8px 0 6px">Ya asignados ('+confirmados.length+')</p><div style="'+WRAP+'"><table>'+TH+'<tbody>'+rowsConf+'</tbody></table></div>';
  return '<div class="overlay"><div class="modal" style="max-width:960px;max-height:85vh;overflow:hidden;display:flex;flex-direction:column">'
    +'<div class="modal-header"><span>Asignar propiedades'+(pendientes.length?' — '+pendientes.length+' pendientes':'')+'</span><button data-action="closeModal">✕</button></div>'
    +'<div style="padding:16px;overflow-y:auto;flex:1">'+body+'</div>'
  +'</div></div>';
}
function renderModalManual(){
  const q=normStr(S.manualBuscar||"");
  const temaActivoId=S.manualTema||MANUAL_TEMAS[0].id;
  // Búsqueda simple: filtra temas cuyo título o contenido (sin tags HTML) incluya el texto buscado
  const temaMatch=(t)=>{
    if(!q) return true;
    const textoPlano=t.html.replace(/<[^>]+>/g," ");
    return normStr(t.titulo).includes(q)||normStr(textoPlano).includes(q);
  };
  const temasFiltrados=MANUAL_TEMAS.filter(temaMatch);
  const temaActivo=MANUAL_TEMAS.find(t=>t.id===temaActivoId)||MANUAL_TEMAS[0];
  const sideItems=temasFiltrados.map(t=>
    '<div class="manual-tema-item'+(t.id===temaActivo.id?' on':'')+'" data-action="manualVerTema" data-id="'+t.id+'">'
    +'<span class="ic">'+t.ic+'</span><span>'+t.titulo+'</span></div>'
  ).join("");
  const sideHtml=temasFiltrados.length
    ? sideItems
    : '<div class="manual-no-results">Sin resultados para "'+(S.manualBuscar||"")+'"</div>';
  return '<div class="overlay"><div class="modal manual-modal">'
    +'<div class="manual-head">'
    +'<div class="manual-head-title"><span class="ic">📖</span>Manual de uso</div>'
    +'<button data-action="closeModal" style="background:none;border:none;color:var(--gris3);font-size:16px;cursor:pointer">✕</button>'
    +'</div>'
    +'<div class="manual-body">'
    +'<div class="manual-side">'
    +'<div class="manual-search"><input placeholder="🔍 Buscar en el manual..." value="'+(S.manualBuscar||"")+'" data-action="manualBuscar"></div>'
    +sideHtml
    +'</div>'
    +'<div class="manual-content">'
    +(temasFiltrados.length
      ? '<h3>'+temaActivo.ic+' '+temaActivo.titulo+'</h3>'+temaActivo.html
      : '<div class="manual-empty">No encontramos nada con esa búsqueda.<br>Probá con otra palabra o navegá por los temas.</div>')
    +'</div>'
    +'</div>'
    +'</div></div>';
}

function renderModal(){
  const extra=S.modalExtra==="grilla_gastos"?renderModalGrillaGastos():"";
  if(!S.modal)return extra;
  if(S.modal==="contrato_detalle")return renderModalDetalle()+extra;
  if(S.modal==="caja")return renderModalCaja()+extra;
  if(S.modal==="grilla_gastos")return renderModalGrillaGastos();if(S.modal==="renovar_contrato")return renderModalRenovar();if(S.modal==="editar_inquilino")return renderModalEditarInquilino();if(S.modal==="editar_propiedad")return renderModalEditarPropiedad();if(S.modal==="feriados")return renderModalFeriados();if(S.modal==="matriz_gastos")return renderModalMatrizGastos();if(S.modal==="editar_propietario")return renderModalEditarPropietario();
  if(S.modal==="migracion")return renderModalMigracion();
  if(S.modal==="manual")return renderModalManual();
  if(S.modal==="editar_extras")return renderModalEditarExtras()+extra;
  const f=S.form;
  const inp=(k,type,val,ph)=>`<input class="inp" style="width:100%" type="${type||"text"}" value="${val!==undefined?val:(f[k]||"")}" placeholder="${ph||""}" data-action="setForm" data-key="${k}">`;
  const sel=(k,opts)=>`<select class="inp" style="width:100%" data-action="setForm" data-key="${k}">${opts.map(o=>`<option value="${o[0]}"${(f[k]||"")==o[0]?" selected":""}>${o[1]}</option>`).join("")}</select>`;
  let content="";
  if(S.modal==="contrato"){
    const extH=S.formExtras.map((e,i)=>`<div class="xi">
      <input value="${e.desc||""}" placeholder="Descripción (ej: TGI, Agua...)" data-action="setExtraDesc" data-idx="${i}">
      <input value="${e.monto||""}" type="number" placeholder="Monto $" style="width:110px" data-action="setExtraMonto" data-idx="${i}">
      <button class="xi-rm" data-action="removeExtra" data-id="${i}">✕</button>
    </div>`).join("");
    content=`<div class="mth"><div class="mth-ic">📋</div>Nuevo Contrato</div>
    <div class="fsec"><div class="fsec-t">1. Elegir propietario</div>
      <select class="inp" style="width:100%" data-action="setPropietario">
        <option value="">-- Seleccionar propietario --</option>
        ${(()=>{const elimNombres=new Set(S.propietarios.filter(p=>p._eliminado).map(p=>p.nombre));return[...new Set(S.contratos.map(c=>c.propietarioNombre).filter(n=>n&&!elimNombres.has(n)))].concat(S.propietarios.filter(p=>!p._eliminado).map(p=>p.nombre)).filter((v,i,a)=>v&&a.indexOf(v)===i).sort().map(n=>'<option value="'+n+'"'+(f.propietarioNombre===n?' selected':'')+'>'+n+'</option>').join('');})()}
      </select>
    </div>
    <div class="fsec"><div class="fsec-t">2. Elegir propiedad</div>
      ${(()=>{
        const propsDisp=(f.propietarioNombre?propiedadesDelPropietario(f.propietarioNombre):[]).filter(p=>!p._eliminado);
        if(!f.propietarioNombre) return '<div style="font-size:12px;color:var(--gris3);padding:8px 0">Primero seleccioná el propietario</div>';
        if(!propsDisp.length) return '<div style="font-size:12px;color:var(--naranja);padding:8px 0">Este propietario no tiene propiedades cargadas. Agregala desde la ficha del propietario.</div>';
        const opts=propsDisp.map(p=>{const libre=propiedadLibre(p._id);return '<option value="'+p._id+'"'+(f.propiedadId===p._id?' selected':'')+(!libre?' disabled':'')+'>'+p.direccion+(libre?'':' (Ocupada)')+'</option>';}).join('');
        return '<select class="inp" style="width:100%" data-action="setPropiedad"><option value="">-- Seleccionar propiedad --</option>'+opts+'</select>'
          +(f.propiedadId?'<div style="font-size:11px;color:var(--gris3);margin-top:4px">'+(propsDisp.find(p=>p._id===f.propiedadId)||{tipo:"",superficie:"",ambientes:""}).tipo+' · Dirección: <strong>'+f.direccion+'</strong></div>':"");
      })()}
    </div>
    <div class="fsec"><div class="fsec-t">3. Datos del inquilino</div><div class="fg">
      <div class="fgf"><label class="fl">Inquilino *</label>${inp("inquilino")}</div>
      <div><label class="fl">DNI / CUIL</label>${inp("dni")}</div>
      <div><label class="fl">Teléfono</label>${inp("telefono")}</div>
      <div><label class="fl">Email</label>${inp("email","email")}</div>
      <div><label class="fl">Garante</label>${inp("garante")}</div>
      <div><label class="fl">Tel. garante</label>${inp("telGarante","tel")}</div>
    </div></div>
    <div class="fsec"><div class="fsec-t">Condiciones económicas</div><div class="fg">
      <div><label class="fl">Alquiler base ($) *</label>${inp("alquilerBase","number")}</div>
      <div><label class="fl">Comisión agencia (%)</label>${inp("comisionAgencia","number","5")}</div>
    </div>
    <div style="margin-top:10px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <label class="fl" style="margin:0">Gastos a cargo del inquilino</label>
      <button class="btn sm" data-action="addExtra">+ Agregar gasto</button>
    </div><div class="xlist">${extH}</div></div></div>
    <div class="fsec"><div class="fsec-t">Vigencia</div><div class="fg">
      <div><label class="fl">Fecha inicio *</label>${inp("inicio","date")}</div>
      <div><label class="fl">Fecha fin</label>${inp("fin","date")}</div>
      ${(()=>{
        if(!f.inicio) return '';
        const _p=f.inicio.split('-').map(Number);
        if(!_p[2]||_p[2]<=1) return '';
        return '<div style="grid-column:1/-1"><label class="fl">Monto acordado para el mes parcial (opcional)</label>'
          +inp("montoMedioMesForzado","number",undefined,"Dejar vacío para prorratear automáticamente por días")
          +'<div style="font-size:11px;color:var(--gris3);margin-top:2px">Si no se completa, se calcula el prorrateo exacto por días.</div></div>';
      })()}
    </div></div>
    <div class="fsec"><div class="fsec-t">Depósito y honorarios</div>
      <div class="fg">
        <div><label class="fl">¿Lleva depósito de garantía? *</label>
          <select class="inp" style="width:100%;${f.tieneDeposito?'':'border-color:var(--naranja)'}" data-action="setForm" data-key="tieneDeposito">
            <option value=""${!f.tieneDeposito?" selected":""}>-- Elegir --</option>
            <option value="si"${f.tieneDeposito==="si"?" selected":""}>Sí</option>
            <option value="no"${f.tieneDeposito==="no"?" selected":""}>No</option>
          </select>
          ${!f.tieneDeposito?'<div style="font-size:10px;color:var(--naranja);margin-top:3px">Obligatorio para guardar el contrato</div>':''}
        </div>
        ${f.tieneDeposito==="si"
          ?('<div><label class="fl">Depósito (= 1 mes alquiler)</label>'
            +'<select class="inp" style="width:100%" data-action="setForm" data-key="depCuotas">'
            +'<option value="1"'+(+(f.depCuotas||1)===1?' selected':'')+'>1 cuota (pago completo al ingreso)</option>'
            +'<option value="2"'+(+(f.depCuotas||1)===2?' selected':'')+'>2 cuotas</option>'
            +'<option value="3"'+(+(f.depCuotas||1)===3?' selected':'')+'>3 cuotas</option>'
            +'</select></div>')
          :''}
        <div><label class="fl">Honorarios inmobiliaria</label>
          <select class="inp" style="width:100%" data-action="setForm" data-key="honMonto">
            <option value="medio"${(f.honMonto||"medio")==="medio"?" selected":""}>Medio mes (habitual)</option>
            <option value="mes"${f.honMonto==="mes"?" selected":""}>Un mes completo</option>
          </select>
        </div>
        <div><label class="fl">Cuotas honorarios</label>
          <select class="inp" style="width:100%" data-action="setForm" data-key="honCuotas">
            <option value="0"${+(f.honCuotas||1)===0?" selected":""}>Sin honorarios (no se cobran)</option>
            <option value="1"${+(f.honCuotas||1)===1?" selected":""}>1 cuota (pago al ingreso)</option>
            <option value="2"${+(f.honCuotas||1)===2?" selected":""}>2 cuotas (mitad al ingreso, mitad al mes sig.)</option>
          </select>
        </div>
        <div style="background:rgba(75,200,232,.06);border:1px solid rgba(75,200,232,.2);border-radius:8px;padding:10px;font-size:11px;color:var(--gris2)">
          <div>💡 Si se paga en 2 cuotas, la 2da queda <strong>pendiente automáticamente</strong> para el mes siguiente</div>
        </div>
      </div>
    </div>
    <div class="fsec" style="border:none;margin:0;padding:0"><div class="fsec-t">Actualización</div><div class="fg3">
      <div><label class="fl">Cada cuántos meses</label>${sel("frecActualizacion",[["3","3 meses"],["4","4 meses"],["6","6 meses"],["12","12 meses"]])}</div>
      <div><label class="fl">Índice</label>${sel("indiceActualizacion",[["IPC","IPC"],["ICL","ICL"],["Libre","Libre"]])}</div>
      <div><label class="fl">Notas</label>${inp("notasActualizacion","text","","Ej: según contrato...")}</div>
    </div></div>
    <div class="fsec">
      <div class="fsec-t" style="display:flex;justify-content:space-between;align-items:center">
        <span>4. Gastos fijos</span>
        <button class="btn sm" data-action="agregarGastoNuevoContrato" style="background:rgba(75,200,232,.1);color:var(--celeste);font-size:11px">+ Agregar</button>
      </div>
      <div style="font-size:11px;color:var(--gris3);margin-bottom:10px">Configurá qué gastos se cobran, con qué frecuencia y si tienen monto fijo o variable.</div>
      ${(()=>{
        if(!S.matrizTemp){
          S.matrizTemp=GASTOS_DEFAULT.map(g=>({...g,mesInicio:f.inicio||mesActual()}));
        }
        const iS="padding:4px 6px;font-size:11px;border:1px solid var(--negro4);border-radius:4px;background:var(--negro3);color:var(--blanco)";
        return S.matrizTemp.map((g,i)=>'<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap">'
          +'<input type="checkbox" '+(g.activo?"checked ":"")+'data-action="matrizCheck" data-idx="'+i+'" style="width:16px;height:16px">'
          +'<input value="'+(g.nombre||"")+'" placeholder="Nombre" data-action="matrizNombre" data-idx="'+i+'" style="'+iS+';width:90px;'+(g.activo?"":"opacity:.5")+'">'
          +'<input type="number" value="'+(g.monto||"")+'" placeholder="$ (vacío=variable)" data-action="matrizMonto" data-idx="'+i+'" style="'+iS+';width:120px;'+(g.activo?"":"opacity:.5")+'">'
          +'<select data-action="matrizFreq" data-idx="'+i+'" style="'+iS+';'+(g.activo?"":"opacity:.5")+'">'
          +[1,2,3,6,12].map(v=>'<option value="'+v+'"'+(+g.frecuencia===v?" selected":"")+'>c/'+v+'m</option>').join("")
          +'</select>'
          +'<input type="month" value="'+(g.mesInicio||"")+'" data-action="matrizDesde" data-idx="'+i+'" style="'+iS+';width:130px;'+(g.activo?"":"opacity:.5")+'">'
          +'<button data-action="matrizBorrar" data-idx="'+i+'" style="background:rgba(231,76,60,.15);color:#ff7b6b;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:12px">✕</button>'
          +'</div>'
        ).join("");
      })()}
    </div>
    <div class="fa"><button class="btn" data-action="closeModal">Cancelar</button><button class="btn naranja" data-action="guardarContrato">Guardar contrato</button></div>`;
  }
  if(S.modal==="propietario"){
    content=`<div class="mth"><div class="mth-ic">👤</div>Nuevo Propietario</div><div class="fg">
      <div class="fgf"><label class="fl">Nombre completo *</label>${inp("nombre")}</div>
      <div><label class="fl">DNI / CUIT</label>${inp("dni")}</div>
      <div><label class="fl">Celular</label>${inp("telefono","tel")}</div>
      <div><label class="fl">Teléfono alternativo</label>${inp("telefonoAlt","tel")}</div>
      <div><label class="fl">Email</label>${inp("email","email")}</div>
      <div><label class="fl">Dirección particular</label>${inp("direccionPart")}</div>
      <div><label class="fl">Localidad</label>${inp("localidad")}</div>
      <div><label class="fl">CBU / Alias (para transferencia)</label>${inp("cbu")}</div>
      <div><label class="fl">Banco</label>${inp("banco")}</div>
      <div><label class="fl">% Comisión</label>${inp("comisionAgencia","number")}</div>
      <div style="grid-column:1/-1"><label class="fl">Observaciones</label><textarea class="inp" style="width:100%;height:60px;resize:vertical" data-action="setForm" data-key="obs">${f.obs||""}</textarea></div>
    </div><div class="fa"><button class="btn" data-action="closeModal">Cancelar</button><button class="btn naranja" data-action="guardarPropietario">Guardar</button></div>`;
  }
  if(S.modal==="inquilino"){
    content=`<div class="mth"><div class="mth-ic">🏠</div>Nuevo Inquilino</div><div class="fg">
      <div class="fgf"><label class="fl">Nombre completo *</label>${inp("nombre")}</div>
      <div><label class="fl">DNI / CUIL</label>${inp("dni")}</div>
      <div><label class="fl">Celular</label>${inp("telefono","tel")}</div>
      <div><label class="fl">Teléfono alternativo</label>${inp("telefonoAlt","tel")}</div>
      <div><label class="fl">Email</label>${inp("email","email")}</div>
      <div><label class="fl">Dirección particular</label>${inp("direccionPart")}</div>
      <div><label class="fl">Localidad</label>${inp("localidad")}</div>
      <div><label class="fl">Ocupación / Trabajo</label>${inp("ocupacion")}</div>
      <div><label class="fl">Garante</label>${inp("garante")}</div>
      <div><label class="fl">Tel. garante</label>${inp("telGarante","tel")}</div>
      <div style="grid-column:1/-1"><label class="fl">Observaciones</label><textarea class="inp" style="width:100%;height:60px;resize:vertical" data-action="setForm" data-key="obs">${f.obs||""}</textarea></div>
    </div><div class="fa"><button class="btn" data-action="closeModal">Cancelar</button><button class="btn naranja" data-action="guardarInquilino">Guardar</button></div>`;
  }
  return `<div class="overlay"><div class="modal"><button class="mclose" data-action="closeModal">✕</button>${content}</div></div>`;
}

// ── TEMA CLARO/OSCURO ────────────────────────────────────────────────────────
(function(){
  const saved=localStorage.getItem("tema");
  if(saved==="light")document.body.classList.add("light");
})();
window.toggleTema=function(){
  const esLight=document.body.classList.toggle("light");
  localStorage.setItem("tema",esLight?"light":"dark");
  document.querySelectorAll(".tema-btn-icon").forEach(el=>{
    el.textContent=esLight?"☀️":"🌙";
  });
};

function renderParcial(){
  const ae=document.activeElement;
  const fid=ae&&ae.id?ae.id:null;
  const faction=ae&&ae.dataset&&ae.dataset.action?ae.dataset.action:null;
  const fstart=ae&&ae.tagName==="INPUT"?ae.selectionStart:null;
  const fend=ae&&ae.tagName==="INPUT"?ae.selectionEnd:null;
  const modalEl=document.querySelector('.modal');
  const modalScroll=modalEl?modalEl.scrollTop:0;
  render();
  setTimeout(()=>{
    if(fid||faction){
      const el=fid?document.getElementById(fid):document.querySelector('[data-action="'+faction+'"]');
      if(el){el.focus();try{if(fstart!==null)el.setSelectionRange(fstart,fend);}catch(e){}}
    }
    if(modalScroll){
      const newModal=document.querySelector('.modal');
      if(newModal)newModal.scrollTop=modalScroll;
    }
  },0);
}
function render(){
  if(!S.usuario){renderLogin();return;}
  const[pt,ps]=TITLES[S.sec];
  let body="";
  if(S.loading)body=`<div class="loading"><div class="spinner"></div>Cargando datos...</div>`;
  else if(S.sec==="dashboard")body=renderDashboard();
  else if(S.sec==="contratos")body=renderContratos();
  else if(S.sec==="cobranzas")body=renderCobranzas();
  else if(S.sec==="liquidaciones")body=renderLiquidaciones();else if(S.sec==="ipc")body=renderIPC();else if(S.sec==="servicios")body=renderServicios();
  else if(S.sec==="inquilinos")body=renderInquilinos();
  else if(S.sec==="propietarios")body=renderPropietarios();else if(S.sec==="caja")body=renderCaja();else if(S.sec==="setup")body=renderSetup();else if(S.sec==="deudores")body=renderDeudores();else if(S.sec==="puntualidad")body=renderPuntualidad();
  const userLabel=(S.usuario.email||"").split("@")[0];
  const presenciaHtml=S.presencia.length?
    `<div class="presence-bar"><div style="font-size:10px;color:var(--gris4);letter-spacing:.5px;text-transform:uppercase;margin-bottom:4px">En línea ahora</div><div class="presence-list">${S.presencia.map(u=>`<div class="presence-item"><div class="presence-dot"></div>${u.nombre}</div>`).join("")}</div></div>`:
    `<div class="sync-bar"><div class="sync-dot ${S.synced?"":"off"}"></div>${S.synced?"Sincronizado · Firebase":S.loading?"Cargando...":"Sin conexión"}</div>`;
  $("root").innerHTML=`<div class="app">
    <aside class="sidebar">
      <div class="logo-wrap"><div class="logo-row"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAABGCAYAAAAHFFAPAAAZpklEQVR42u18eZRdZZXvb+/vTPfWmMiQkDCEhGAnISAJgihUSkSQQWift7RbGmQwiC3QDDa07fPmOkAzRXxiKxBksu1+dVfbzynQmn5VpSDKgxalExmSkJBASAJUVXLrTuf79u4/zq2kMqdyb3wUi7PWXlmpVTnZ59tn/77f/u39HcLb6FIFYQGIchAAqN436URlc54STgHrNCEap8SGPRSZ6RUy9LQyHinCLR7356sHAEC7YagL7u2yJvS2CW4WPBzY8ncmnUUBXytARxSxpwCsKhwIAIF9wPcYFCR/tyqrlPn+4mD1W+2fern/7RTkt0WAhwPy6jcnHDg+8r4VBvwJMFCsKpTgYIiIQcREIAIZqBKBGAJiCkMwNRu4iqy2Vq+Kzl3x47dLkPntEtw3bjt41rsC/nUY0icKJXGFkjgAIIIhgGnbl5mSUMMQgSuxamXAWgMcHqb4R+WfTf076oLr6enw3sngtwAsD37jkKPDAH2+TwcPVRGzIR8MEFPyCjOBan/WMjj5GQFgBlhBTFCCkIEG7b6JB6tfDs5e+VXt6fCos8++k8H/PwgVAF30rhbD+qPA0MGFsloi8nfyu6Ja24YVTgFb25Z1m7edwCrE8aC1fqv/Ffvo9E9QZ5/Vbph3AvynvvK17O3372hK89GFssZM8LYLrKpCmiLidDN76TSbVIpMqom9KM2eYZBi232WCKQAu7KIGtw9tOSoSchANDs212pMOq2ZZN8dun3inCjgywoFcUTYJnNFoZ4hakoxl2P9f6Uh+XKxJB+rlOWsckHmV0ryz0JUilJsdggyiF1VxGsybb7DV4igmJkZk9vZmHR6mFgN3j7hf7emTdemilhm8pL9lqGARhGREvU7xVXpS1/+/k7v88Mp02PmO/2IPlIpqyOGAVGyH7OqMawwiGOLP0ud8cJLI0uxdzJ4P13ZLJi64Aq3HjiBgbOLZQFh6x6pqhr4pArtj8t0WvrSl7+vWbD2wNNuGO2G0Sw8zcKjj730QnD+irPikvuXMG2M6tZMJoCcUzFNHBqjfwEAmNcx5tZrzDm8oOazEs9rjqgpFrjtkEgDn7hUlc82f27177QbAeUg1AlLXXDUBUc5WMrBajeMKuiVAbk4LssLfkCsUBlRSxGsKimdCQDo7ZN3AvyngmnBiSAo0VYmrIBripiHivLb9ite7e7JwqMuVHe5P3XBobfDTLl4dVmdfo0DouQ2W+7HqCopYYb+4sg2ykGG2ftYucZeIT9zOAA6FQLCNguuyh6ACnXr3vKLeX1OAUKzv7haqG7yfW61Ck0qZpB1CiIaX1FzCIDBGlroOxm8v66lyeKqol13WGZitQAYzxKgW1+G3bBMghKgdPpzbyjwEvsE6NY7q0A9n4g9r7VWno2pDB67dTDtPHgiCnVa2RfRBIQyktTd8d7xO0LHnwqia8GgN2l77xVqPIJHNFEVhKV7zjZNdGnVp+b4EJoAm/xsywIxKI5VhewmAEBm7MDzWIVoAgBSXV7r/m1dcEpy0UE+RLSXgegGaxZcXTs4ywR0aDUWrSnXUECNIQDoD/30uq3vxDsB3v8ITfokBNiGZCmZclnV8ylTuOvwCVgAtycdeSlmGMpBxOnVXkgMbFMLC3wCAS9S5+8HVJNsfyfA+/cSAGCVxzeXpWQYZjiriECxU4kCboPvvksERRdEe+CNLG80yXXWp+b4s7qWVQv5Kef4EV9YHRIByBspmsAnheKxpA7uGHNNhzEXYMolwn/TDW+8qorHmkJSVYwUJ0yhKK4pzeeV7zv0PnxzWkCdsMOZpwoiQIkgNPfpuPyvUz8ahvQv4hSyXY1LREkdbOQnAICNfTrW1musNrQZgCj4ARCdvv22SARTGBLX3GwuqXBlbuXBw2+pUnlJy4XrNxBB9f7Do7iVjyGiy9nQpU4V4lTZ2ybLJQiJ4pIsf2EweKIGz2NuwmNsNhtqfr+anZhqbtXnooAnVwRKDAZzrbkPgMilU2TIZxQrboCIVoGoCkMH+QEf4aUI5SIUrGBDVPs3tea/2KA98OLN9ovBGS/ePFYb/2N2okOz8CgHu3nhhGuam8zCzWW1xPBGBjjpCkFApEEA4we8RdkoO4AIjpjN8ETHcIBBpBwAUNpUhp3efMbKjUk9BR2LUDc2rwVw2Sy4OOjuLZTcmtAjo9ixlUcAE8HEFlosqxTL6sqxSlJh7Yphq/OamCC4q+WMlRugGR6LwR3jZRJ0wUzQwbmNBVF8KUgaBbKb3yeiJNi02+dW8QJmu9mt91z5jmSSIy9jdZ3G9FQldSV1bus1rz1cGJJfNUfkqWp9REghHBGL4It0zsv9mJmhsZq9Yz7ANaVCCVCIu6ISa9UzhO2H6fa6wFa4oNl41U3SG561/HvJ5Eh+TM9Gj/kAUw7Sk4XXcu36pWWLL6VSbIDRlzOqUM8j2IoMiZPPKEBjTXd+e2YwgHm5BKrHXfXqbZsLbklzmj2RUQfZeSk2UnFXpc5bsRzdYCLIOwHe+3Jsf9jwzRVLoaogrpoLK1V5LQyIRfcuQCpqw1bjVQbtQ+H5L31Pezq8EcdWaH/7P7brYFUCke7nZ0hkyNq0Zf+3J3WmU/wfzkGEwJScTdrpyQYhcqlmNnEV/+m3xu/HxtUxMhAi6J/S97EZ4K0L5M2Zfzfh6aeBOfXftvn5iVo4eh09fc898S4FkO9O/uvmVnNXqSyxEvk7C7ACEkTMQlhvq+7E9MdXrVbdAs0EQKcBIa68EnixgetyFLD8W9+qjO0M7u426OpyU7777+fyU7+8U1c+pwhDhjbghVVSYiIArzRZOvMPJ08tIZfTLZncA486YTfdM/nOlnZzdXFIY2L4IwOsRGJ8Iva4UqzEH2zrWv3ElhOFNd+P/PYjZ9PvHv+2vrxc4IemIb4ThJhZRVe5As5YPe+I6kjfx0aAs1kGFuCw6Gdt/jj/v7hUPER+8cMtikOD0AEchIjLxbtWPfqDK9HR4aEv0YoVIGRhKAdbvO+w7lQrZ4pDLibDfk2qVOOTmoCoWpTzm/5y1Y+HXwqoEhaApo1/xNeA/8CV0nT3Hz8CUW0MrxFhUAEHEeJK8Y5VP33o+pG+jxGSNY+RIzHNspDD8BDX3BTrjPcIqhVJxtikfoOKVMvW84PPTz3rwk709VlkMmYL6VoAp1lwyh74qdKQLEk3G1+SA2hqDDQIiOOy/lUS3I4kuACQByNH4oz7PEfRdNfUFOPoYxTVcgN9h7i4Yj0vuPbIcy96/0jf3/oB7u42yHXaI+/6yVmmueXTrlR0sLGPo2ayTpzMai0rG1bi+g3ESqRKdO/Bp1/QNBKVtqhPlz9tBzdWzq+U5LGmJvbYwAUBc7ksF6U/+dI/JZlby55slpGBHH7XTyew739J4oogjj06aibpwZMS341hZa7bALAyEZi/NzlzTWp/IWpjA6xKWJrRaQ//ppUC/zvqnIJBNckfOO4kIAhr/zMPd2723QyzOhETRlPTId+MfN6hY+vUBeUgyIImfmH9UOHN4OxKSZ+IUuwNFd2n0p9c9dAWWB6+Zs4kEKlh+hqnm9pVnICIlBk45gTAD2obANVvzCzOWQ5T0/3K4E3b+/7WDPCCXoMciQy9eTunWw5TGwsxMxkGOQcafwBo5ntALgYx12/EIMPG2aozfnjl1I9uC9XDQdYs+ICrl2+qUuWjhYLrbLlg9Q+0G2ab4NaI1dS7HzmeotSnXanoiNgQ13x/14Ggd88GrAWMaUiQmdmTOHYmCP7miI9dcur+gGqvodDc1Wmn3Pvo6RymPuOKBUdMW51lAuIqcNQM6PpXgA3rkozQhrAWUoIKe/dMPGf+sevQXxlZYw4fOSFa9zqA3lop5HZ+Jyw0vmdcXHXg2swm1XyfNgPYuA54fT3g+XX7rlt8JzB59048Z/57tvf9rZHBqoRMRmd09zQzm7uhyTdOks8jjLAEmkDHvXcEVDcA7ohZxTkvSE2LjL0Z+bzr2A7uiBKlS7thdpAgu9Wgq8tNW/TzjNfU2iHlkiPDBrSd74ZBs4ehGo2BamIWsZaDaHrkSw2qs+YtBdEdC3oNiKQyWLnFa26ZgmpFmJl3fBYCOQsafyB4xrGAjUFssMOLsA9GbIyLq84E4VVTz7t0Xt9O4I4IusOXc1QJS6ET7/5xGkS3wMVKTLRL38cdAH737MR30xjfmY0RW7UmjK6elvlMB/pyDYPqugOc6e42fblOe/SiRzuDdNPnMFRwxrBJOuu8ozHDxFWY6TNBEyZDbdwQwqVEBAIpkYpv7pl4zvz03jDTTK0savXDa4OWtikUV8Uw8y59t1WYo/4MPGES1FpQo3wHGEQQ8u6bfcF1TY1i1Vw3NAOYc/dTafb8exhQJiVm2s0LS+CERMI/7gTADxsHd8yszooXpI6KQuwZ7rJZzmcgM7/36KHs+TegMiTMzIl/u/KdwMzwZs8FfD85p9Yg352zjsPU1E3VoX9oFFRzvdCc7+pypaD/pqClbZrGFcdsmImxW2MDdhbe+APhzzwWsBZkTGOYtTEJqw7Cq4/IXLFbuMvUyiKQf5OfbmmGFWVm2r3vnPg+7gD4M46FOgtwY1g1MRuxFecF4eendl3R2QiopnqgOd/V5WY/2PMBDoNfSrUqgPKo72kMSr9aArvxNZAfAFJnC5YIUBHyfBbnXowlPHYt1laRz8tIZjrs/6wHe99nQv9xTfwf1WKSMSj9umer7w2oCFRV2PNInKxsZv/YP1ReLm/v+/7P4Bo0d9zfExnD9xpmYlIyxGSIMBrziJE+7oRkgYYFkHqMCGDDIs6ZMHWUz+VdQ7UqeSQLPc8jBjBa35kIqdlzgSCEqCafG6jTEqh2jqNo6iZXuaVeqN6nf9gxb563+Jxz3PjMRTeFLe3nudKQNcwmQRoananAa2kDEaG6bi3YD0Z/j50ak4oT4wcnt846vmfgp7e/hEzGYNkyzXSryXfNcnOPmvdXfkvblTJUcMaQ2Sffm1tAbFB9bW1SGzeGT7A6Z00QnjRu5tzH+n9y64ph3/c7RA9D23sf7jkJqdTjGscKFa6b8RmDwV8uQXXjesdBYBoHdz6rsy9Uq+a4tVhbxYwZCizAyYc+3hQ3yTIy3iS1sdbDR8gYDP66F9UNr4F8vzHijaqQ55OKWxU1V2Yv27ixhHy3AKMbQOB9geZpixeHFHj3eoaZIWSYyDBhn60Gea3vOQFea5tRVVXmhsCdiLUcpacHgXwd+bybNn68jxyJpN0NYUvbZLLWGWaux3cmQsuxc0BBoKoqjaiNYQyLOOEoNaW0KbwtgeoFZr9mcEdPj9fX2Wnf94O+r/vt474YbxqwRNQYuVNVKQhs/29+tbj86ivngYcPi9SdDQoiIWMMgeYtv/+2vhMe/MX0oKn5GVUJ4VyCt3X2pskPMPTScgz+1zPJDxrWPIZlL/CkXPnwS99f+AtkMgb5vR/l5dFAc19npz05/9hcL526wRULznAiaNRrAGzQNo5g4weW3fqF8+GZJymISImcsoEy12GGFCCwgVNdNO3MK8Mgnf6Kn0qnyA2XRfX5T0TKRNp85NS15Pm/ZT8gkMqWhkgdBgIDqhSYe46+5AstyRaj1OAAbxE0fANaZIxnOFHsG7A4ED+MjBQLL1OMG6BK5JlLRLVCxoCItL7amEDGsDinAKb5Myc94gfBeVIs6LDiVpcxgYjEb2oizwu+tuG55ecKUxGer0KkwoR6TNmwE+cQpY8oK25DLiejgWreO2hOBI3m8aW/D9vaj0W5bE2iaKBeM2zE830iF1/+2KdO6Z921f8KViy6dak6m6UoZYTglBqyHxMIWils6qxsWB8Z36fhH9djBEiQSrPbPPjH8osrHio8lt/onPtbBJERwAkxhKguU2bPVsuWoujyQy+58cOjEUBob1lzx789dpzvpZ4UZxnSANacEEUXtLab6qaB+3r+x/svq+3xDpluxoyletja8uMcBCdpteJAZOrciQEiSFyVsK2dD5t3ekOacgo4P9Vk4qFNZ/d8/AOLZ2SzwbJcrnr4ZTcu4TA6TaplB5BpIKte44f+McvHo4AFC3RPY728Z9acQaZbTUjeIt/3fKOKulkzEwxBgijFUiysMa3hdVlV7ps3zwFQzFiqyOVESS9T0QqMB4C0Pq03GSwxYcTlwQG8+dxSBEEIA+zzMzDBpZpbjBQ3P9Lz8Q8sznR3m2XLljkApD7mi3MFeD5ApIkAX4cZZhErHKUOq1QqdyCXEyzYM1TvNsAdvb0m30Vus/ebG6PW9jlaKluPyYxW8dmpMavv++Q5uXzJ6XMHl+XzW4fMczlBNuutWXTrUqhbwFHKgMklSlV95YcS4EUR3lz5Ioob1iMIgyTIo/UfpL4xhLhaDcLoOkBpRiajw8rTy9/5h5UiNoFqohpU12fKxthqxXKYvmzy/L8/E7mcRabb7BNEZ1U5RyRn/+TJWeT5T6uIgXP1Q3MiFbugdZypDvTfv/jPT7pkuPza4TdrUH3oa/bXHIQnSiOguvYA4hyi1lYc3XFaraLRUT6DurCt3VQG3rxz8fnvuyajavJEbkSnykMuZydf8aWfmzB1ulRKDsR1CjgEQBKodm5NaGiPUL2rDKZleVA2q8zAoiAIAxaB4dFrzdsag0EShCmW4tCapuYDr8mqcl9vr+x8e8sn2WzoUhGtwPMSuKu//woOAhQHB/Da839EEARgIOn37o0GDZIgjMgNFTbYSL+azWY5v+PhcwFARsx8cXYzjE8KaH0lX8KqxVlHqfRhJScL9wTVvAtBw+S7yD0z97fXp9rHnyilovUSsadO1gl4zOIHAZG4z+ZPn5pAcy638xZSPu+QzXpr/vFrS0XiHEUpowS39WH31RgCwIQR1q14EZs3rkcQhmBosrfulvUzmKBBOs2k8uWfn3nym72YxztkUC4n6O7m1XfnVonI9RpFLMSuXkYtRBA2nq2ULUWpSyd8LnvW7qCadgXNH3v0D+82TL+Dii/OciOOJKiKC1vbTXmg/4F/O/eEi3cBzdgVVB/yJj3BfvDeLVBdJwMmIjhn0dTahuNO7RwB1bQb1qzOj9ImLhefMYXj5wJ55Lu6dt3Oq01rHvL5Bf/OUerDUik5Im4Iq4bnkYq84sMes7odm3YG1bwDNAMEVfLU3huEQURiE2hmoB5jggRRxFIsrJVm75oRrHnPlUiNVTvSS1W0SsZrgACSvLOeH2DzwADWPP8coi1QvWvzmBMWrXpdvmvLnrvrV23pUgVAEpr56uxmMgElX7mufwIEzomJUpOryt/YFVSb7bXmxVOmuE++7/y/SbWPm28Lmy0ze42QI5nYBVHKSKX0l/96+pxnD5o5k5fNmrV33f2+PkU26w3dmnut9b0dwummD0lsHXGi5dVdOnkeBt58A+PfdQBaWtugIrUJju2eAXBRS6uxxcIPu8+ac8uwRrA3vhduzvY3nzRvI0Wp88Q6p0TcgP5xbXg+Oj4955Snh25d8Bwy3QbL8roDRNegWf/i5/85zfOjZ6ASirUMqlfQIKiIi9raTWlT/wP//OHj9xaad7xRdzcjD0yc9MITFEQnaLXcEFYNIjhr0dLahpNO7dgK1bQtNtdOy1QZOuuhD85amQUoR7R3L2mNVR98zdcXmyj1ESmXGuO7QsgzpCKvhjaatbp9YBuo3gLRvb29DEANzD1+GKbVOexxPmkvjADxo4jj4tArgT9uNNC846MsXarIdzlH3qWqUoXnAVy/iKAEeEGAgcEBrHjxeYRBUDtts+1zhK1trC7+xkOnHbMiA/BeB3cLq1YyFF4u1g6S5ydQXbcAQqzihFPpSWVTvHN7qOaRbcALlvz+r1Pjxs2zxSFrzPCERn0IyMzihSHB2c8+2DllYBtBY7RXTQDZ8I0bn3XOfgWptBHULyIoMRwAPwyxcsVyvPH6xiTItfUnSl5SW9j0SpiObs6q7qws2rPv3Xl+deH1a1Ti64ZZdSN0dmU2rly2lGq66KBrb/oocjmL7oRVU1aVc4BevOTZKZQKf68iabW2/h4pEkEjah9nygP9Dz542uxP7yM075xVZ4CDnlr5G/KjuYlWjQYIIATrLNra2nDqKR0jW9Uuam0zpcHBix467ZiHdhA1RnPVoPqgv731ZxSlztJSsbFQrbouqNAxa1s3DQAA9/b2MoiUfL47iKJmclaZiepFDqqxZjtUeCUdYHeCxj7o+3mgq8uB/EugWt3SVqy790rwgwD9AwN44YXnEYUBCOKi5mYTbx787YMfnPVwprt734M7DNWq5Fn+LGw8QJ5PSUWQfAR1n80krJqj1CEVX75Z0xaY+zo77WX/99lLU+3jPhQPFWwyvUJaB2NWTo5gqh9FBLFXfOeU2f3L8ti1oDHaqyaAbLjlumeds19FU7MRsBNm1Nt/TaA6wvMrVmDj669rFEWACAx711IjPshS2yNfXXj9GnFyjaZSNQGEtWb7uNWQijHsymVL6fQFB9x4+znI5Sxd8tgfj/aYn2RjWiWO69YzErXUadQ2jsoDbzxw76nHXNwgaN45qwZwwDNrH6cwOlHLZR0eEalXAImtRXtLi5x99jlc2Tz48KJTZlyYTGNSY758V4PqA/7ujv9D6abztFRUMNd/AFwV5PkQZ9fBVOZ6vuqtJvA9VyoNJnWl1nt/9YIQ8dDmDUFors9ms4zeXulDwy9FPp9k8xcXfg6KJeSZQFWpAXsAgiDQ/s2b6dlnf1/oOvsj/xOqNKOxH0oRAORYrzQ2Ph7Ga4M41M19iKC2KuSH7RrLV/8bdWAJDYuVSZoAAAAASUVORK5CYII=" style="height:30px;width:auto"><div><div class="logo-brand">ECKERDT</div><div class="logo-sub">Gestión de alquileres</div></div></div><div class="logo-sub">Urdinarrain · Entre Ríos</div></div>
      <ul class="nav">${NAVS.map(n=>`<li class="${S.sec===n.id?"on":""}" data-action="nav" data-sec="${n.id}"><span>${n.ic}</span>${n.lbl}</li>`).join("")}</ul>
      <div class="nav-user"><div><div style="font-size:10px;color:var(--gris4)">Usuario</div><strong>${userLabel}</strong></div><button class="logout-btn" data-action="doLogout">Salir</button></div>
      ${presenciaHtml}
      <div class="manual-link" data-action="abrirManual"><span>📖</span>Manual de uso</div>
      <div class="sidebar-foot">© 2026 Eckerdt Negocios Inmobiliarios</div>
    </aside>
    <main class="main">
      <div class="ph"><div class="ph-left"><div class="ph-accent"></div><div><div class="pt">${pt}</div><div class="ps">${ps}</div><button onclick="toggleTema()" title="Cambiar tema" style="background:none;border:none;font-size:18px;cursor:pointer;padding:4px 8px;border-radius:8px;line-height:1"><span class="tema-btn-icon">🌙</span></button></div></div></div>
      ${body}
    </main>
  </div>${renderModal()}`;
}

render();
cargarTodo();
