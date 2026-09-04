# MEMORIA — JAM POS Estable

> Rama VERSIÓN ESTABLE de JAM POS (PWA + APK libre). Nacida del snapshot viejo
> `JAM POS 0.1 OLD`. Historial completo: `../MEMORIA.md`.

## Estado actual (punto de retorno)

- **Última acción completada (2026-08-30 ~09:40):** Widget de la tasa del
  dólar en la pantalla de inicio (APK Estable 0.1-I). Esquema de versiones
  APK "0.1 + letra" (A, B, C, ...): cada build genera `JAMPOS-Estable-0.1-<LETTERA>.apk`
  sin sobrescribir; `versionCode` único por build.
- **Siguiente paso:** verificar visualmente los bordes de inputs en todos los
  popups (pendiente de la mejora de esquinas).
- **Fecha:** 2026-08-30

## Hecho

- [x] Toggles (switch) en inventario: "Descuento del proveedor" y "Oferta del
  producto" (`app.js`).
- [x] Máscara Bs derecha-izquierda en TODOS los montos (montoPagado, formulario
  producto, gastos, salario, pago dividido) con `parseBs`.
- [x] Bordes de inputs SOLO en popups (no en ventanas principales).
- [x] Barra deslizante de % ganancia con bloqueo (hold ~2 s para desbloquear;
  se re-bloquea sola a los 2 s).
- [x] Esquema de versiones APK "0.1 + letra" en `../jam_pos_estable/build.sh`.
- [x] Botón WhatsApp del ticket: en APK copia IMAGEN del ticket y abre WhatsApp
  (`AndroidBridge.copiarImagenWhatsApp`); en web mantiene flujo texto + wa.me.
- [x] Corrección apertura de WhatsApp "no está instalado" (APK).
- [x] Widget de la tasa del dólar en pantalla de inicio (0.1-I).
- [x] Esquinas redondeadas en campos del convertidor.
- [x] Sincronización con la versión moderna (PWA + APK).

## Pendiente / qué falta

- [ ] Verificar visualmente el efecto de bordes en TODOS los popups.
- [ ] Portar mejoras de la versión moderna/Estable según criterio del usuario.

## Permitido (se puede hacer)

- Modificar `app.js`, `style.css`, `index.html`, `web-bridge.js` y recompilar
  con `../jam_pos_estable/build.sh`.
- Generar nuevos `.apk` con letra siguiente del esquema 0.1+A.

## Prohibido (NO se debe hacer)

- NO borrar los `.apk` históricos de la carpeta (son hitos de compilación).
- NO tocar la versión moderna de JAM POS desde aquí.
- NO sobrescribir el esquema de versiones: un APK Estable nueva nunca pisa la anterior.

## Revertir (volver a un estado anterior)

- Snapshots: `../respaldos/snapshots/proyectos/JAM-POS-Estable-*.zip`
- RESTAURAR con:
  `bash respaldos/restaurar_proyecto.sh "JAM POS Estable" "<zip>"`
- Ejemplo real del 2026-08-30: REVERT del popup "Editar Producto" (vuelta a la
  versión F) — ver Historial.

## Historial

| Fecha | Qué se hizo | Resultado |
| --- | --- | --- |
| 2026-08-28 | Rama Estable creada desde `JAM POS 0.1 OLD` | PWA + APK libre |
| 2026-08-28 | Toggles inventario + máscara Bs D-I | Portadas de la moderna |
| 2026-08-28 | Bordes de inputs solo en popups | Fix del cambio global |
| 2026-08-29 | Barra % ganancia con bloqueo | Popup inventario |
| 2026-08-29 | Esquema versiones 0.1+letra | build.sh |
| 2026-08-30 | WhatsApp ticket copia imagen (APK) | MainActivity.kt |
| 2026-08-30 | Widget tasa del dólar (0.1-I) | Pantalla inicio |
| 2026-08-30 | REVERT Editar Producto (vuelta a F) | El cambio no gustó |