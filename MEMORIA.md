# MEMORIA — JAM POS ULTIMATE (prueba 7 días antidesinstalación)

> Nuova app creada con el motor web de `JAM POS Estable` + sistema de prueba de
> 7 días. HTML + PWA + APK viven en esta carpeta. Historial completo: `../MEMORIA.md`.

## Estado actual (punto de retorno)

- **Última acción completada (2026-09-01 ~18:10):** Build COMPLETO del APK en
  Windows con el nuevo pipeline `ultimate/apk/build.ps1` →
  `JAMPOS-Ultimate-0.1.apk` (2.94 MB). Verificado: `com.jam.pos`, versionCode 40,
  versionName 0.1, minSdk 26 / target 34, firma V2 con cert CN=JAM POS,
  `assets/www/trial.js` dentro, www limpio (sin tests/memorias).
- **Candado:** libre (`JAM_MODO_CANDADO = 'libre'` en app.js; el candado viejo de
  30 días NO aplica; el nuevo sistema corre vía `trial.js`).
- **Actualizable sobre la app anterior:** mismo paquete `com.jam.pos`, mismo
  keystore, versionCode 40 > 37 previo.
- **Siguiente paso:** instalar en el teléfono sobre la app actual para probar
  (conteo día 1 → bloqueo al día 8; reinstalar y verificar que sigue bloqueado).
- **Fecha:** 2026-09-01

## Qué es y cómo funciona

- **Web/PWA:** `trial.js` (motor autocontenido en `window.JAMUltimateTrial`).
  Marca el primer arranque en 3 canales: `localStorage` + `IndexedDB` +
  `CacheStorage` (vía service worker `sw.js`). Siempre gana la marca MÁS ANTIGUA
  (`min(f)`). Anti-retroceso de reloj (tamper → bloqueo). Límite honesto: si se
  borran los datos del navegador, la web se regenera (sin servidor no hay
  garantía absoluta); el APK sí garantiza.
- **APK:** `UltimateTrial.kt` persiste en 3 canales: SharedPreferences (Auto
  Backup) + archivo directo `/sdcard/JAM POS/.jampos_ultimate_trial` +
  MediaStore (Descargas y Fotos). SobreVIVE a la desinstalación. Binding por
  `ANDROID_ID` y marca de reloj; siempre gana la marca más antigua; retroceso de
  reloj → bloqueo. Véase `apk/app/src/main/java/com/jam/pos/UltimateTrial.kt`.
- **Bridge web→nativo:** `MainActivity.kt` → `verificarUltimate()` (JSON con
  bloqueada/diasRestantes/diaActual/fechaInicio/tamper). En la web es no-op.
- **Popup discreto:** toast inferior `.jamult-*`, muestra "Día N de 7" SOLO al
  iniciar cada sesión, auto-cierre 5 s (9 s si quedan ≤2 días), botón ✕. No
  bloquea el uso. Al vencer: overlay de bloqueo completo.
- **Detalle de cálculo:** `calcular(lista)` usa `ahoraReal = ahora()` y un ancla
  monotona `ahoraE = max(ahoraReal, ultima)` para que días avancen correctamente.

## Hecho (2026-09-01, sesión #032)

- [x] `ultimate/` creada copiando el maestro web de `JAM POS Estable/`.
- [x] `trial.js` escrito (7 días, multicanal, marca más antigua, anti-reloj, UI
  discreta + bloqueo).
- [x] `index.html` (script trial.js) + hook `bloquearInmediato()` en `app.js`.
- [x] `sw.js`: caché `jampos-web-cache-v9-ultimate` + `./trial.js` en estáticos.
- [x] `ultimate/apk/` = proyecto Kotlin copia de `jam_pos_estable/` (sin build/),
  `www` refrescado desde `ultimate/`.
- [x] `UltimateTrial.kt` + bridge `verificarUltimate()` en `MainActivity.kt`.
- [x] `AndroidManifest.xml` versionCode 40 / versionName 0.1.
- [x] `build.ps1` en banda: kotlinc → d8 → aapt2 → zipalign → apksigner (java -jar).
- [x] APK compilado y verificado (badging + firma V2 + trial.js dentro).
- [x] Prueba de lógica en Node (`test-trial-node.js`, harness heurístico): día
  1→7, expira→bloquea, reintalar con canal externo viejo→sigue bloqueado (min f),
  reloj atrás→tamper+bloqueo. TODO OK. Bug real encontrado y corregido: el ancla
  usaba `fondo` en vez del reloj actual (los días no avanzaban).
- [x] Backups: `respaldos/apks/JAMPOS-Ultimate-0.1_20260901_1810.apk` y
  `respaldos/snapshots/ultimate-20260901-181001.zip`.

## Pipeline de build (Windows)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\rosav\OneDrive\Documents\MisProyectos\ultimate\apk\build.ps1"
```

- Requiere: ANDROID_HOME (build-tools 36.1.0, platform android-36), Java 17,
  kotlinc 2.0.21 en `%ANDROID_HOME%\kotlinc\kotlinc\bin`, Python 3.
- Salida: `..\JAMPOS-Ultimate-0.1.apk`.
- Ojo aprendido: NO usar `@argfile` con kotlinc.bat en Windows (rompe rutas);
  NO usar `apksigner.bat` (falla con `--out`); usar `java -jar lib\apksigner.jar`.

## Permitido (se puede hacer)

- Modificar `trial.js`, `app.js`, `style.css`, `index.html`, `sw.js` y recompilar
  con `build.ps1`.
- Cambiar `DIAS_PRUEBA` (hoy 7) y canales de persistencia.

## Prohibido (NO se debe hacer)

- NO quitar/reducir la persistencia multicanal (rompe el objetivo antidesinstalación).
- NO cambiar el paquete ni el keystore (debe seguir actualizable sobre la anterior).
- NO incluir `test-trial-node.js` ni `MEMORIA.md` dentro del APK (el build ya los excluye).

## Revertir (volver a un estado anterior)

- Snapshots: `../respaldos/snapshots/ultimate-*.zip`.
- APK previos: `../respaldos/apks/JAMPOS-Ultimate-0.1_*.apk`.

## Historial

| Fecha | Qué se hizo | Resultado |
| --- | --- | --- |
| 2026-09-01 | Creación de ultimate (web + PWA + APK) y sistema 7 días antidesinstalación | Build OK verificado |
| 2026-09-01 | Fix lógico en `calcular()` de trial.js + build final | Prueba Node TODO OK |