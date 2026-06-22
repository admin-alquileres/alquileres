---
name: eckerdt-alquileres
description: Contexto técnico completo para desarrollar y mantener el sistema de gestión de alquileres de Eckerdt Negocios Inmobiliarios. Usar SIEMPRE al inicio de cualquier sesión de trabajo sobre app.js, styles.css o index.html, cuando se pida agregar funcionalidades, corregir bugs, refactorizar código, o cualquier tarea relacionada con el sistema de alquileres. También usar cuando se mencione Firebase, Firestore, contratos, cobranzas, IPC, depósitos, o cualquier módulo del sistema.
---

# Skill: Eckerdt Alquileres — Sistema de Gestión

## Descripción del proyecto

Aplicación web de gestión de alquileres para **Eckerdt Negocios Inmobiliarios** (Urdinarrain, Entre Ríos, Argentina). Hosteada en GitHub Pages, separada en 3 archivos:

- `index.html` — estructura HTML mínima (638 B)
- `styles.css` — todo el CSS (~15 KB)
- `app.js` — todo el JavaScript (~297 KB, ~3600 líneas)

- **URL producción:** `https://admin-alquileres.github.io/alquileres/`
- **Stack:** HTML + CSS + JavaScript vanilla + Firebase (Firestore + Auth)
- **Usuarios:** gaston@ie.com, matias@ie.com, ara@ie.com
- **Sin backend propio** — toda la lógica es client-side con Firebase como base de datos

---

## Reglas críticas de desarrollo

Estas reglas se aprendieron a los golpes. Violarlas genera bugs difíciles de rastrear.

### 1. NUNCA usar `onclick` inline como string
```js
// ❌ MAL — genera errores de CSP y es difícil de mantener
element.innerHTML = `<button onclick="miFuncion('${id}')">`;

// ✅ BIEN — data attributes + listener central
element.innerHTML = `<button data-action="editar" data-id="${id}">`;
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  if (btn.dataset.action === 'editar') miFuncion(btn.dataset.id);
});
```

### 2. NUNCA anidar template literals
```js
// ❌ MAL — rompe el parsing y genera errores silenciosos
const html = `<div class="${esActivo ? `activo` : `inactivo`}">`;

// ✅ BIEN — concatenación o variable intermedia
const clase = esActivo ? 'activo' : 'inactivo';
const html = `<div class="${clase}">`;
```

### 3. SIEMPRE usar `h[idx_e:]` con dos puntos en reemplazos Python
```python
# ❌ MAL — trunca el archivo desde idx_e hasta el final
h = h[:idx_s] + nuevo_bloque + h[idx_e]

# ✅ BIEN — reemplaza solo el bloque, conserva el resto
h = h[:idx_s] + nuevo_bloque + h[idx_e:]
```

### 4. Cuando el archivo se corrompe → reconstruir desde gen_html.py
Si el HTML queda en estado inconsistente por ediciones fallidas, la solución es reconstruir desde el script base `gen_html.py`, no parchear sobre el archivo corrupto.

---

## Workflow de deploy (GitHub Pages)

No hay CI/CD. El flujo es git desde la terminal:

```bash
git add .
git commit -m "descripción del cambio"
git push
```

GitHub Pages publica automáticamente en ~30 segundos. Solo Gaston hace deploys.

**Implicación:** Claude edita directamente los archivos del repo (`app.js`, `styles.css`, `index.html`). No hace falta entregar HTML completo para copiar — basta con el diff del archivo modificado.

---

## Estructura de colecciones Firestore

### `contratos`
Colección principal. Cada documento es un contrato de alquiler activo o histórico.

Campos clave:
- `inquilino` — nombre del inquilino
- `propiedad` — dirección/descripción del inmueble
- `propietario` — nombre del propietario
- `fechaInicio`, `fechaVencimiento` — Date
- `montoActual` — número (en pesos ARS)
- `deposito` — monto del depósito
- `honorarios` — comisión de la inmobiliaria
- `estado` — `'activo'` | `'vencido'` | `'rescindido'`
- `historialActualizaciones` — array de objetos `{fecha, monto, ipc}`

### `propietarios` / `inquilinos`
Datos de contacto y perfil de cada persona. Se cruzan con `contratos` por nombre.

Campos clave (`propietarios`): `nombre`, `dni`, `telefono`, `telefonoAlt`, `email`, `cbu`, `banco`, `comisionAgencia`, `obs`
Campos clave (`inquilinos`): `nombre`, `dni`, `telefono`, `telefonoAlt`, `email`, `garante`, `telGarante`, `ocupacion`, `obs`

### `pagos`
Un documento por cobro registrado.

Campos clave: `contratoId`, `inquilino`, `direccion`, `propietarioNombre`, `mes` (formato `"2026-07"`), `alquiler`, `itemsCobro` (array), `totalInquilino`, `comision`, `netoPropiertario`, `fechaCobro`, `estado` (`cobrado` | `pendiente` | `vencido`), `comprobante`, `liquidadoProp`, `liquidacionRef`

### `propiedades`
Inmuebles registrados, independientes de los contratos. Un propietario puede tener propiedades sin contrato activo.

Campos clave: `propietarioNombre`, `direccion`, `tipo` (`Casa` | `Departamento` | `Local comercial` | etc.), `superficie`, `ambientes`, `descripcion`, `_eliminado`

### `caja`
Movimientos de caja de la agencia (nombre real en Firestore: `caja`, no `cajaAgencia`).

Campos clave: `tipo` (`gasto` | `retiro` | `adelanto` | `honorario`), `concepto`, `monto`, `fecha`, `detalle`, `inquilino`, `recuperado`

### `historial_prop`
Eventos de cada propiedad (reparaciones, cambios, etc.). Persiste entre inquilinos.

Campos clave: `propiedadId` (normalización de la dirección), `fecha`, `descripcion`, `creadoEn`

### `historial_inq`
Anotaciones sobre cada inquilino (llamados, acuerdos, observaciones).

Campos clave: `inquilino` (nombre), `fecha`, `nota`, `creadoEn`

### `notas_temp`
Comentarios temporales vinculados a un contrato o propietario. Se borran manualmente cuando ya no sirven.

Campos clave: `contratoId` o `propietarioNombre`, `texto`, `creadoEn`

### `gastos_pendientes`
Items de cobro guardados para un contrato entre sesiones (para no perder lo que se estaba preparando cobrar).

Campos clave: `contratoId`, `items` (array de `{tipo, desc, monto}`)

### `saldos_prop`
Saldo de un propietario entre liquidaciones (diferencia entre lo calculado y lo entregado realmente).

Campos clave: `propietarioNombre`, `monto` (positivo = a favor del propietario, negativo = deuda)

### `usuarios`
Configuración por usuario (gaston@ie.com, matias@ie.com, ara@ie.com).

---

## Módulos del sistema

### Cobranzas
- Lista de contratos con estado de pago mensual
- Filtros por estado, mes, propietario, inquilino
- Registro de pagos con fecha y monto

### Contratos
- ABM completo de contratos
- Tabla sorteable por columnas
- Vista de detalle con historial de actualizaciones IPC

### Actualización IPC
- Cálculo de nuevos montos según índice IPC
- Agrupación de actualizaciones por período
- Historial de actualizaciones previas por contrato

### Depósitos y Honorarios
- Tracking de depósitos (recibidos, devueltos, retenidos)
- Honorarios cobrados por contrato

### Caja Agencia
- Registro de ingresos/egresos de la agencia
- Separado de los movimientos de propietarios/inquilinos

### Dashboard
- Alertas de contratos próximos a vencer
- Contratos con pagos pendientes
- Resumen de caja

### Generación de PDF
- Recibos de pago
- Contratos
- Liquidaciones a propietarios

---

## Patrones de UI establecidos

- **Tablas:** siempre con encabezados clicables para ordenar (sort ascendente/descendente)
- **Modales:** para formularios de alta/edición, con overlay oscuro
- **Alertas:** banner en dashboard para vencimientos y pagos pendientes
- **Filtros:** panel colapsable sobre cada tabla principal
- **Colores:** esquema propio de la app (no Bootstrap), definido en variables CSS en `styles.css`

---

## Convenciones de código

- **Sin frameworks** — JavaScript vanilla puro
- **Sin bundler** — los archivos se editan y se sirven tal cual
- **Firebase SDK** cargado desde CDN via `<script type="module" src="app.js">`
- **Autenticación** con Firebase Auth (email/password)
- Las funciones de Firestore usan la API modular v9+ (`import { collection, getDocs } from 'firebase/firestore'`)
- Variables globales para estado de la UI (módulo activo, filtros aplicados, etc.)

---

## Checklist antes de entregar código

- [ ] ¿Hay algún `onclick` inline como string? → Reemplazar con data-action
- [ ] ¿Hay template literals anidados? → Extraer a variables
- [ ] ¿Los índices de reemplazo usan `h[idx_e:]` con dos puntos?
- [ ] ¿Las nuevas colecciones Firestore están documentadas en SKILL.md?
- [ ] ¿Los nuevos módulos siguen los patrones de UI establecidos?
- [ ] ¿El cambio va en `app.js`, `styles.css` o `index.html` según corresponda?

---

## Contexto del negocio

- ~130 contratos de alquiler activos
- Actualizaciones de alquiler según IPC (índice de precios al consumidor de Argentina)
- Los contratos se actualizan típicamente cada 3 o 6 meses
- Ara (novia de Gaston) es la operadora principal del sistema de alquileres
- Gaston y Matías son los socios (50/50) con acceso admin
