# Instrucciones para Claude Code — App de alquileres

Lo lee Claude Code al arrancar en esta carpeta. El detalle técnico (colecciones,
módulos, reglas de código) está en `SKILL.md`: leelo también al empezar.

## Con quién trabajás

Gastón (Eckerdt Negocios Inmobiliarios) no es programador. Te habla como a una
persona: describe el problema, manda capturas, a veces dicta por voz. Vos hacés
todo el trabajo técnico dentro de esta carpeta, sin pasar por otro chat.

- Respondé en español, en palabras simples. Nada de jerga sin explicar.
- Antes de programar, explicá en pocas líneas qué encontraste y qué vas a
  cambiar (la lógica del negocio, no el código).
- Si dice "dale" y no queda claro a qué, preguntá.
- Esta app maneja la plata real de unos 130 contratos. Ante la duda, preguntá
  antes de tocar.

## Al empezar cada sesión

1. `git pull` para traer lo último de GitHub.
2. `git status`: si hay cambios sin subir, avisale antes de seguir.

## Cambios de código

1. Diagnosticá leyendo el código real (no supongas nombres de campos ni de
   funciones: buscalos con grep).
2. Programá el cambio.
3. `node --check app.js` tiene que dar OK.
4. Probalo vos mismo: si es un cálculo, armá un test con números concretos y
   mostrá el resultado; si es pantalla, decile exactamente qué mirar.
5. Mostrale el `git diff` completo y un resumen en palabras simples.
6. Commit solo cuando él lo apruebe.
7. Push solo con una confirmación aparte y explícita ("publicalo", "subilo").
   Pegale la línea literal `xxxxxxx..yyyyyyy  main -> main` como prueba.
8. Agrupá arreglos en pocos commits: GitHub Pages limita las publicaciones
   seguidas. Si hace falta forzar una publicación, usá un commit vacío.
9. Nada de ramas ni force-push salvo que él lo pida.

## Cambios en datos (Firestore)

Nunca escribas en Firestore sin antes:

1. Hacer una lectura (sin escribir nada) y mostrarle exactamente qué documentos
   vas a cambiar, con el valor de hoy y el valor nuevo.
2. Esperar su sí.
3. Escribir con guarda: solo si el documento sigue igual a lo que leíste.
4. Volver a leer y mostrarle que quedó bien.

Nunca borres de verdad: se marca `_eliminado: true`.

La credencial `sa.json` la maneja solo Gastón. Nunca la muestres, la copies, la
subas al repo ni la pidas por chat. Si un script la necesita, que la lea del
disco.

## Lecciones aprendidas (no repetir)

- **Auditorías de cuotas (depósito/honorarios):** no cuentes cuántos pagos hay;
  leé qué dice cada pago (un pago rotulado "cuota 2/2" prueba que la 1 también
  se pagó aunque su registro se haya borrado). Si el contrato tiene pagos
  borrados en su historia, confirmá con Gastón antes de corregir.
- **Todo se vincula por el texto exacto de `propietarioNombre`** (comparación
  `===`, sin normalizar acentos). `propietarioId` y `propiedadId` se guardan
  pero no se leen. Un acento distinto ("José" / "Jose") parte a un mismo
  dueño en dos.
- **La comisión del propietario** sale de la ficha del propietario
  (`propietarios.comisionAgencia`), no del contrato.
- **La liquidación agrupa por el texto de la dirección:** dos inquilinos en la
  misma dirección se diferencian como "Local 1" / "Local 2".
- **Ítems congelados:** los ítems de cobro guardados en `gastos_pendientes`
  pueden seguir mostrando una cuota ya pagada. Revisalos si una cuota "vuelve".
- **Listeners:** texto libre → `input`; fecha/mes/select → `change`; botones →
  `click`. Un handler en el listener equivocado falla en silencio.
- **Sin template literals anidados:** armá el HTML en una variable aparte.

## Reglas del negocio

- **Actualización IPC:** se carga a mitad de mes, pero rige desde el día 1 del
  mes siguiente. La próxima es ese mes + la frecuencia del contrato, siempre
  día 1. No corresponde solo si el contrato vence antes del día 1 de ese mes.
- **Mora:** 1% por día hábil desde el día 2 si no se pagó hasta la fecha límite
  (día 10 corrido al hábil). No modificar `calcularMora`.
- **Cuenta de deuda** (contratos con `cuentaDeuda`): las entregas van a la
  colección `entregas`, no a `pagos`; se aplican al mes más viejo primero;
  interés 1% por día hábil desde el día 2; al propietario se le liquida cada
  entrega con su comisión descontada. Si la entrega pagó servicios (luz, agua,
  impuestos), se descuentan del monto, el resto cancela alquiler y los
  servicios pasan enteros al propietario, sin comisión, como en un cobro
  normal. El interés se suma al total solo si la cuenta tiene marcado "Cobrar
  intereses" (por defecto no). Feriados en `FERIADOS_NACIONALES`: actualizar
  la lista cada año.
- **Depósito en cuotas:** al cobrar la cuota, el contrato tiene que guardar
  `cuotasTotales` (si no, sale "cuota 2/1").

## Archivo público

Este repo se publica en GitHub Pages: todo lo que está acá se puede leer desde
internet. No escribas nombres de inquilinos, montos, DNI, teléfonos ni nada
personal en este archivo, en `SKILL.md` ni en los mensajes de commit.
