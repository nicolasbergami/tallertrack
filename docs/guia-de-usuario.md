# 🔧 TallerTrack — Guía de Usuario Oficial

> **Versión:** 1.0 · **Última actualización:** Marzo 2026
> Para dueños de talleres, administradores y mecánicos.

---

## Tabla de Contenidos

1. [¿Qué es TallerTrack?](#1-qué-es-tallertrack)
2. [Primeros Pasos](#2-primeros-pasos)
   - [Conectar WhatsApp](#21-conectar-whatsapp)
   - [Configurar el perfil del taller](#22-configurar-el-perfil-del-taller)
   - [Invitar al equipo](#23-invitar-al-equipo)
3. [Gestión de Órdenes de Trabajo](#3-gestión-de-órdenes-de-trabajo)
   - [Crear una nueva OT](#31-crear-una-nueva-ot)
   - [Los estados del trabajo](#32-los-estados-del-trabajo)
   - [Cambiar el estado de una OT](#33-cambiar-el-estado-de-una-ot)
4. [Diagnóstico, Presupuestos y Aprobación](#4-diagnóstico-presupuestos-y-aprobación)
   - [Armar el diagnóstico](#41-armar-el-diagnóstico)
   - [Enviar el presupuesto al cliente](#42-enviar-el-presupuesto-al-cliente)
   - [Aprobación digital del cliente](#43-aprobación-digital-del-cliente)
   - [Estados de pago](#44-estados-de-pago)
5. [Dashboard y Vista Kanban](#5-dashboard-y-vista-kanban)
6. [Historial y Búsqueda](#6-historial-y-búsqueda)
7. [Suscripción y Facturación](#7-suscripción-y-facturación)
8. [Roles y Permisos](#8-roles-y-permisos)
9. [Preguntas Frecuentes](#9-preguntas-frecuentes)

---

## 1. ¿Qué es TallerTrack?

TallerTrack es la plataforma digital diseñada específicamente para talleres mecánicos de Argentina. Su objetivo principal es simple: **eliminar los llamados de "¿ya está listo mi auto?"** automatizando toda la comunicación con el cliente a través de WhatsApp.

### ✅ Beneficios principales

| Beneficio | ¿Qué significa para tu taller? |
|-----------|-------------------------------|
| 🤖 **Avisos automáticos por WhatsApp** | Cada vez que cambiás el estado de un vehículo, el cliente recibe un mensaje automático. Sin llamadas, sin olvidos. |
| 📋 **Presupuestos digitales** | Enviás el presupuesto por WhatsApp y el cliente lo aprueba o rechaza con un solo clic desde su celular. |
| 🎤 **Diagnóstico por voz con IA** | Dictás el diagnóstico en voz alta y la IA lo convierte en un presupuesto estructurado listo para enviar. |
| 📊 **Todo en un solo lugar** | Órdenes de trabajo, estados, historial, equipo y facturación en una sola pantalla. |
| 🔗 **QR de seguimiento para clientes** | Cada OT tiene un código QR que el cliente puede usar para ver el estado de su vehículo en tiempo real. |

---

## 2. Primeros Pasos

Cuando te registrás en TallerTrack, el sistema te guía por una **pantalla de bienvenida** que no podés saltar. Hay un orden lógico para empezar.

---

### 2.1 Conectar WhatsApp

> ⚠️ **Este paso es el más importante.** Sin WhatsApp conectado, los avisos automáticos a tus clientes no funcionan.

TallerTrack usa tu propia línea de WhatsApp (no una línea compartida) para enviar los mensajes. Esto hace que los mensajes lleguen desde un número que tus clientes ya conocen.

**¿Cómo conectar?**

1. Al entrar por primera vez verás la **pantalla de bienvenida** con un código QR.
2. En tu celular, abrí **WhatsApp** → tocá los tres puntitos (⋮) → **Dispositivos vinculados** → **Vincular dispositivo**.
3. Apuntá la cámara del celular al código QR que aparece en la pantalla.
4. En 3–5 segundos, el sistema confirma la conexión y te lleva directamente al Dashboard.

> 📱 **¿Te registraste desde el celular?** El QR no puede escanearse desde la misma pantalla que lo muestra. Abrí TallerTrack en una PC o tablet, conectá desde ahí, y tu celular queda listo.

> ⏱️ **El QR expira en 2 minutos.** Si se venció, tocá "Generar nuevo QR" y repetí el proceso.

**Reconectar si se desconectó**

Si WhatsApp se desconecta (por actualización, reinstalación o cierre de sesión en otro dispositivo), entrá a **Perfil → Vincular WhatsApp** y repetí el escaneo del QR.

---

### 2.2 Configurar el perfil del taller

En la sección **Perfil** podés completar los datos de tu negocio:

- **Nombre del taller** — aparece en todos los mensajes de WhatsApp y presupuestos.
- **Dirección y teléfono de contacto.**
- **Logo** *(disponible en plan Taller Pro y Platinum)* — se incluye en los presupuestos digitales que reciben tus clientes.

---

### 2.3 Invitar al equipo

Podés agregar a tus mecánicos, recepcionistas o administradores para que usen TallerTrack con sus propias cuentas. Cada uno tiene su propio usuario y contraseña.

**Roles disponibles:**

| Rol | ¿Qué puede hacer? |
|-----|-------------------|
| 👑 **Owner (Dueño)** | Todo: gestionar órdenes, usuarios, perfil y suscripción. Solo hay un owner por taller. |
| 🛠️ **Admin (Administrador)** | Lo mismo que el owner, excepto ciertas configuraciones de cuenta raíz. Puede gestionar la suscripción. |
| 🔧 **Mechanic (Mecánico)** | Crear y gestionar órdenes de trabajo, cargar diagnósticos y presupuestos. **No puede gestionar la suscripción ni el equipo.** |
| 📞 **Receptionist (Recepcionista)** | Crear órdenes, actualizar estados y comunicarse con clientes. Sin acceso a configuración avanzada. |

> 💡 La suscripción la gestiona únicamente el **Owner** o el **Admin**. Un mecánico puede ver el plan activo, pero no puede contratar, cambiar ni cancelar la suscripción.

---

## 3. Gestión de Órdenes de Trabajo

La **Orden de Trabajo (OT)** es el documento central de TallerTrack. Cada vehículo que entra al taller genera una OT.

---

### 3.1 Crear una nueva OT

Tocá el botón **"+ Nueva OT"** en el Dashboard. El asistente tiene **3 pasos simples**:

**Paso 1 — El vehículo**
- Patente (obligatoria)
- Marca, modelo y año
- Kilometraje actual

**Paso 2 — El cliente**
- Nombre y apellido
- Número de WhatsApp *(acá es donde llegará cada aviso automático)*
- Email (opcional)

**Paso 3 — El trabajo**
- Descripción del problema que reporta el cliente
- Mecánico asignado (podés dejarlo sin asignar)
- Fecha estimada de entrega *(la IA puede sugerirte una basándose en el tipo de trabajo)*

Al confirmar, la OT queda creada en estado **Recibido** y el cliente recibe un WhatsApp automático avisando que su vehículo ingresó al taller.

---

### 3.2 Los estados del trabajo

Cada OT pasa por estados que representan exactamente en qué punto está el trabajo. **Cada cambio de estado le avisa al cliente por WhatsApp automáticamente.**

```
Recibido → Diagnosticando → Esperando aprobación → En proceso → [Esperando repuestos →] Control de calidad → Listo → Entregado
```

| Estado | 🟡 Indicador | ¿Qué significa? | ¿Avisa al cliente? |
|--------|-------------|-----------------|-------------------|
| **Recibido** | Gris | El auto acaba de ingresar. | ✅ Sí |
| **Diagnosticando** | Azul | El mecánico está revisando el vehículo. | ✅ Sí |
| **Esperando aprobación** | Violeta | Se envió el presupuesto y se espera respuesta del cliente. | ✅ Sí (con el link de aprobación) |
| **En proceso** | Naranja | El cliente aprobó y el trabajo está en curso. | ✅ Sí |
| **Esperando repuestos** | Amarillo | Se frenó el trabajo por falta de piezas. | ✅ Sí |
| **Control de calidad** | Celeste | El trabajo terminó, se está verificando antes de entregar. | ✅ Sí |
| **Listo para retirar** | Verde | El auto está listo. El cliente puede pasar a buscarlo. | ✅ Sí (aviso especial) |
| **Entregado** | Verde oscuro | El cliente retiró el vehículo. OT cerrada. | ✅ Sí |
| **Cancelado** | Rojo | La OT fue cancelada. | Opcional |

> 🔑 **Estado especial — Esperando aprobación:** Este estado se activa automáticamente cuando enviás el presupuesto desde el panel de diagnóstico. No podés avanzar manualmente hasta que el cliente apruebe o rechace desde su WhatsApp.

---

### 3.3 Cambiar el estado de una OT

1. Entrá al detalle de la OT (tocá la tarjeta en el Dashboard).
2. En la parte inferior verás los **botones de transición disponibles** según el estado actual.
3. Tocá el botón con el próximo estado deseado.
4. El sistema actualiza el estado **y envía el WhatsApp al cliente** en el mismo momento.

> ⚡ Solo aparecen las transiciones válidas para cada estado. No podés saltar pasos que tendrían sentido incorrecto para el cliente.

**¿Cómo cancelar una OT?**
Desde el detalle de cualquier OT activa, el botón **"Cancelar"** siempre está disponible.

---

## 4. Diagnóstico, Presupuestos y Aprobación

El módulo de diagnóstico y presupuesto es uno de los diferenciadores clave de TallerTrack. Se activa cuando la OT está en estado **Diagnosticando**.

---

### 4.1 Armar el diagnóstico

Dentro del detalle de la OT, en la sección **Diagnóstico**, tenés dos opciones:

#### 🎤 Por voz (recomendado)

1. Tocá el **botón circular del micrófono**.
2. Hablá con naturalidad: *"Hay un ruido en el diferencial trasero, necesito cambiar los rulimanes, el costo de la mano de obra es ocho mil pesos y los rulimanes salen doce mil."*
3. La IA (Inteligencia Artificial) transcribe tu voz y extrae automáticamente:
   - Cada ítem del presupuesto (repuesto, mano de obra, insumo)
   - Precio estimado de cada uno
   - Un resumen claro en lenguaje para el cliente
4. Revisá el borrador generado. Podés editar cualquier valor antes de enviarlo.

#### ✏️ Manual

1. Cargá los ítems uno por uno:
   - Descripción del ítem
   - Tipo: **Repuesto**, **Mano de obra**, **Insumo** o **Servicio externo**
   - Precio unitario y cantidad
2. Escribí el resumen para el cliente (qué se va a hacer, en lenguaje simple).

> 💡 **Ítems sin precio estimado** aparecen con un borde naranja para recordarte que falta completarlos antes de enviar.

---

### 4.2 Enviar el presupuesto al cliente

Una vez que el presupuesto está listo:

1. Tocá **"Enviar Diagnóstico y Presupuesto al Cliente"**.
2. El sistema envía al cliente por WhatsApp:
   - El resumen en lenguaje simple (lo que vos escribiste/dictaste)
   - El total del presupuesto
   - **Dos botones interactivos:** ✅ Aprobar / ❌ Rechazar
3. La OT pasa automáticamente a estado **Esperando aprobación**.

---

### 4.3 Aprobación digital del cliente

El cliente recibe el mensaje en su WhatsApp con un link. Al abrirlo ve:

- El detalle del presupuesto
- El nombre del taller
- Un botón verde **"Aprobar presupuesto"** y uno rojo **"Rechazar"**

**Si aprueba:** La OT avanza automáticamente a **En proceso** y vos recibís una notificación.

**Si rechaza:** La OT pasa a **Cancelado** y el cliente puede agregar un comentario con el motivo.

> 🔒 Cada link de aprobación es único y expira. No se puede usar dos veces ni reutilizar entre OTs.

---

### 4.4 Estados de pago

Dentro de cada OT podés registrar el estado del cobro:

| Estado | Significado |
|--------|-------------|
| **Pendiente** | No se cobró nada aún. |
| **Seña** | Se cobró una parte adelantada. |
| **Cobrado** | El trabajo está completamente pago. |

> 📌 El estado de pago es independiente del estado del trabajo. Podés cobrar antes, durante o al retirar el vehículo.

---

## 5. Dashboard y Vista Kanban

El **Dashboard** es la pantalla principal. Muestra todas las órdenes activas de tu taller.

### Métricas rápidas (tira de estadísticas)

Al tope del Dashboard verás 4 números clave:

- **En taller:** Cantidad total de vehículos activos.
- **Listos:** Vehículos que esperan ser retirados (en verde si hay alguno).
- **Repuestos:** OTs frenadas esperando piezas (en amarillo).
- **Vencidas:** OTs sin avance hace más de 8 horas (en rojo parpadeante). ⚠️ Estas necesitan atención urgente.

Tocá cualquier número para filtrar y ver solo esas órdenes.

### Vista Lista vs. Vista Kanban

Con el botón **⊞ / ≡** en el encabezado podés cambiar entre dos modos:

| Modo | Ideal para |
|------|-----------|
| **Lista** | Ver rápido todas las órdenes ordenadas por prioridad (las urgentes primero). |
| **Kanban** | Ver las órdenes distribuidas en columnas por estado. Podés arrastrar tarjetas de columna en columna para cambiar el estado. |

### Capacidad del taller

Una barra de progreso te indica qué porcentaje de la capacidad de tu plan estás usando. Cuando llegás al 80% o más, aparece una alerta para que consideres mejorar el plan.

### Filtros disponibles

- **Buscador:** Buscá por patente, nombre del cliente, número de OT o nombre del mecánico.
- **Filtro por estado:** Tocá cualquier pestaña de estado para ver solo esas OTs.
- **Filtro por mecánico:** Chips en la parte superior para ver las OTs asignadas a cada integrante del equipo.

---

## 6. Historial y Búsqueda

El **Historial** muestra todas las órdenes entregadas o canceladas. Es tu archivo de trabajos realizados.

### ¿Cómo buscar una OT pasada?

1. Entrá a la sección **Historial** desde el menú inferior.
2. Usá el buscador para filtrar por:
   - **Patente** *(el método más rápido)*
   - Nombre del cliente
   - Número de OT
   - Nombre del mecánico
3. Tocá la OT para ver todos sus detalles: trabajo realizado, presupuesto, repuestos usados y fechas.

### Estadísticas rápidas del historial

En la parte superior del Historial verás chips con contadores:
- Total de OTs
- Entregadas
- Canceladas
- Con pago pendiente

Tocá cualquier chip para filtrar y ver solo ese grupo.

---

## 7. Suscripción y Facturación

> ⚠️ Esta sección es solo para el **Owner** o el **Admin** del taller. Los mecánicos pueden ver el plan activo pero no pueden cambiarlo ni cancelarlo.

Accedé a **Suscripción** desde el menú inferior.

---

### Planes disponibles

| Plan | Precio | Vehículos simultáneos | Usuarios | Ideal para |
|------|--------|-----------------------|----------|------------|
| 🔵 **Mecánico Independiente** | $18.000/mes | Hasta 10 | 1 | Mecánico que trabaja solo. |
| 🟠 **Taller Pro** | $35.000/mes | Hasta 30 | Hasta 3 | Taller mediano con equipo. |
| 💜 **Taller Platinum** | $80.000/mes | Ilimitados | Ilimitados | Taller grande o con sucursales. |

> 💡 **Período de prueba:** Al registrarte tenés **14 días gratis** con todas las funciones del plan Taller Pro activas. No necesitás ingresar datos de pago para empezar.

---

### Cómo contratar o cambiar de plan

1. Entrá a **Suscripción**.
2. Elegí el plan que querés y tocá **"Elegir este plan"** (o **"Mejorar Plan"** si ya tenés uno activo).
3. El sistema te redirige a **Mercado Pago** para completar el pago de forma segura.
4. Una vez pagado, tu suscripción se activa automáticamente.

**La renovación es automática.** Mercado Pago cobra mensualmente sin que tengas que hacer nada.

---

### Estado de tu suscripción

En la parte superior de la pantalla de Suscripción verás el banner con el estado actual:

| Banner | Significado |
|--------|-------------|
| 🟢 **Suscripción activa** | Todo bien. Muestra la fecha del próximo cobro. |
| 🟠 **Prueba activa** | Días restantes de tu trial gratuito. |
| ⚫ **Suscripción cancelada** | Acceso hasta la fecha indicada, sin futuros cobros. |
| 🔴 **Inactiva** | El acceso está bloqueado. Elegí un plan para reactivar. |

---

### Cancelar la suscripción

Si querés cancelar:

1. En **Suscripción**, tocá el link **"Cancelar suscripción"** debajo del banner verde.
2. Seleccioná el motivo (ayuda a mejorar el servicio).
3. Confirmá la cancelación.

**¿Qué pasa después?**
- Mercado Pago no realiza más cobros futuros.
- Seguís teniendo acceso completo hasta que termine el período que ya pagaste.
- Al vencer ese período, el acceso queda bloqueado.

---

## 8. Roles y Permisos

Tabla completa de permisos por rol:

| Acción | 👑 Owner | 🛠️ Admin | 🔧 Mechanic | 📞 Receptionist |
|--------|---------|---------|-----------|----------------|
| Crear y editar OTs | ✅ | ✅ | ✅ | ✅ |
| Cambiar estado de OTs | ✅ | ✅ | ✅ | ✅ |
| Cargar diagnósticos y presupuestos | ✅ | ✅ | ✅ | ✅ |
| Ver historial | ✅ | ✅ | ✅ | ✅ |
| Invitar usuarios al taller | ✅ | ✅ | ❌ | ❌ |
| Editar perfil del taller | ✅ | ✅ | ❌ | ❌ |
| Gestionar la suscripción | ✅ | ✅ | ❌ | ❌ |
| Ver el plan activo | ✅ | ✅ | ✅ | ✅ |

---

## 9. Preguntas Frecuentes

---

**❓ El cliente dice que no le llegó el WhatsApp. ¿Qué hago?**

Verificá que:
1. El número de WhatsApp del cliente esté bien cargado en la OT (con código de área, sin el 0 inicial).
2. Tu sesión de WhatsApp siga conectada. Entrá a **Perfil → Estado de WhatsApp**. Si dice "Desconectado", volvé a escanear el QR.
3. El cliente no haya bloqueado tu número.

---

**❓ El QR para conectar WhatsApp no aparece o se traba.**

- Refrescá la página.
- Si el QR expiró (más de 2 minutos sin escanear), tocá **"Generar nuevo QR"**.
- Asegurate de estar usando un navegador moderno (Chrome o Safari actualizados).

---

**❓ ¿Puedo usar TallerTrack desde el celular?**

Sí. TallerTrack está optimizado para mobile. Podés gestionar todas las OTs desde tu smartphone. La única excepción es **la primera conexión de WhatsApp**, que requiere una pantalla más grande (PC o tablet) para escanear el QR.

---

**❓ ¿Qué pasa si alguien del equipo se va del taller?**

Desde **Perfil → Usuarios**, podés desactivar la cuenta de ese usuario. Queda sin acceso inmediatamente, pero el historial de sus OTs se conserva.

---

**❓ ¿Cuántos vehículos puedo tener activos al mismo tiempo?**

Depende de tu plan:
- **Mecánico Independiente:** hasta 10 vehículos activos.
- **Taller Pro:** hasta 30 vehículos activos.
- **Taller Platinum:** sin límite.

El Dashboard te muestra una barra de capacidad en tiempo real.

---

**❓ ¿Se puede recuperar una OT cancelada?**

No. Las OTs canceladas son definitivas y quedan archivadas en el Historial. Si el cliente vuelve, creá una nueva OT.

---

**❓ ¿Mis datos están seguros?**

Sí. Cada taller tiene sus propios datos completamente separados de los demás. Usamos cifrado en tránsito (HTTPS) y ningún usuario de otro taller puede ver tu información.

---

**❓ ¿Puedo usar mi número de WhatsApp personal?**

Sí, pero recomendamos usar un número exclusivo para el taller para separar lo profesional de lo personal. Puede ser una línea de prepago dedicada al negocio.

---

*¿Tenés una consulta que no está aquí?*
📧 Contactanos en **soporte@tallertrack.com.ar** o desde la sección **Ayuda** dentro de la app.

---

*© 2026 TallerTrack · Todos los derechos reservados.*
