---
name: eckerdt-alquileres
description: Contexto técnico completo para desarrollar y mantener el sistema de gestión de alquileres de Eckerdt Negocios Inmobiliarios. Usar SIEMPRE al inicio de cualquier sesión de trabajo sobre el archivo HTML de alquileres, cuando se pida agregar funcionalidades, corregir bugs, refactorizar código, o cualquier tarea relacionada con admin-alquileres.html. También usar cuando se mencione Firebase, Firestore, contratos, cobranzas, IPC, depósitos, o cualquier módulo del sistema.
---

# Skill: Eckerdt Alquileres — Sistema de Gestión

## Descripción del proyecto

Aplicación web de gestión de alquileres para **Eckerdt Negocios Inmobiliarios** (Urdinarrain, Entre Ríos, Argentina). Un único archivo HTML autocontenido, hosteado en GitHub Pages.

- **URL producción:** `https://admin-alquileres.github.io/alquileres/admin-alquileres.html`
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

No hay CI/CD. El flujo es manual:

1. Claude genera el archivo `.txt` con el HTML completo
2. Gaston abre el `.txt` → `Cmd+A` → `Cmd+C`
3. Va al archivo en GitHub → editar → `Cmd+A` → `Delete` → `Cmd+V`
4. Commit directamente en `main`
5. GitHub Pages lo publica automáticamente en ~30 segundos

**Implicación:** cada sesión de desarrollo debe entregar el HTML completo listo para copiar, no diffs ni parches parciales.

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
Colecciones de historial. Guardan el historial de propiedades/contratos por persona.

### `cajaAgencia`
Movimientos de caja de la agencia. Ingresos por honorarios, depósitos retenidos, egresos.

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
- **Colores:** esquema propio de la app (no Bootstrap), definido en variables CSS en el `<style>`

---

## Convenciones de código

- **Sin frameworks** — JavaScript vanilla puro
- **Sin bundler** — el archivo se edita y se sirve tal cual
- **Firebase SDK** cargado desde CDN via `<script type="module">`
- **Autenticación** con Firebase Auth (email/password)
- Las funciones de Firestore usan la API modular v9+ (`import { collection, getDocs } from 'firebase/firestore'`)
- Variables globales para estado de la UI (módulo activo, filtros aplicados, etc.)

---

## Checklist antes de entregar código

- [ ] ¿Hay algún `onclick` inline como string? → Reemplazar con data-action
- [ ] ¿Hay template literals anidados? → Extraer a variables
- [ ] ¿El archivo HTML resultante está completo de inicio a fin? → Verificar que no esté truncado
- [ ] ¿Los índices de reemplazo usan `h[idx_e:]` con dos puntos?
- [ ] ¿Las nuevas colecciones Firestore están documentadas arriba?
- [ ] ¿Los nuevos módulos siguen los patrones de UI establecidos?

---

## Contexto del negocio

- ~130 contratos de alquiler activos
- Actualizaciones de alquiler según IPC (índice de precios al consumidor de Argentina)
- Los contratos se actualizan típicamente cada 3 o 6 meses
- Ara (novia de Gaston) es la operadora principal del sistema de alquileres
- Gaston y Matías son los socios (50/50) con acceso admin
