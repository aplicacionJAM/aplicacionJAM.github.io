# MEMORIA JAM POS — CONTEXTO COMPLETO PARA OTROS AGENTES/LLMs

> Documento vivo. Actualizado: 2026-09-13.
> Objetivo: que cualquier agente/LLM continúe el trabajo **sin romper** nada (reglas invariables al final).
> Base de todos los proyectos: `C:\Users\felin\Documents\MisProyectos\`
> ⚠️ **OBLIGACIÓN:** actualizar este documento al terminar CADA tarea (ver AGENTS.md). La nueva entrada SIEMPRE va al inicio de la lista de CHANGELOG.

---

## 0. CHANGELOG

- **[2026-09-13] FIX CRÍTICO: iconos (Font Awesome) no se veían en el APK/EXE/DEB/Web 1.1**: el cliente reportó que en el módulo de ventas (cajón subtotal/total, menú de tipo de pago) se veían las letras pero NO los iconos. Causa: las fuentes `fa-solid-900.woff2` y `fa-brands-400.woff2` en las carpetas fuente estaban SUBSET/truncadas (7.764 y 672 bytes respectivamente; el original completo pesa 150.124 y 108.020). Solo se veían ~10 iconos que sí estaban en el subset, y los demás (Font Awesome 6.4.0 según `fontawesome.min.css`, "-- Font Awesome Free 6.4.0 (subset)") no renderizaban. El APK viejo (Libre 0.1) sí traía las fuentes completas. Solución: descargar las 8 fuentes completas FA 6.4.0 desde cdnjs (`https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/`) en `C:\Users\felin\AppData\Local\Temp\opencode\fa640\`, reemplazarlas en: `web-pwa\`, `JAM POS 1.1 actualizable (web-pwa)\`, `windows\`, `windows-exe\resources\app\` y dentro del árbol del `.deb` (`usr/lib/jampos/resources/app`), y REBUILD del APK (`android\build.ps1`) + RE-EMPAQUETADO del `.deb` (zstd nivel 19 para replicar el tamaño, `data.tar.zst` 82,56→83,07 MB). Resultado: APK 3.690.482 bytes, versionCode 50, cert idéntico `99478066...`, fuentes completas dentro del paquete; EXE corregido en `resources\app`; DEB 83.076.848 bytes validado con `dpkg-deb --info/--fsys-tarfile`. Backups: `respaldos\apks\JAMPOS-1.1-estable-final_20260913_1824.apk` + `JAMPOS-1.1-estable-final_20260913_1643.apk` (APK con fuentes subset, para rollback/no usar). NOTA DE FUTURO: verificar SIEMPRE `fa-solid-900.woff2`=150.124 y `fa-brands-400.woff2`=108.020 bytes en toda entrega nueva; un `fontawesome.min.css` que diga "(subset)" indica fuentes recortadas.
- **[2026-09-13] Sistema de aviso de nuevas versiones (web/PWA "actualizable")**: se creó `C:\Users\felin\Documents\MisProyectos\JAM POS 1.1 actualizable (web-pwa)\` (misma v1.1, preparada para futuras actualizaciones) con `update-notify.js` (popup con 2 botones: Actualizar ahora / Quedarme, re-aviso a los 7 días, respeta candado, silencio offline), `update.json` (manifiesto del servidor), `sw.js` actualizado (cache `jampos-web-cache-v11-a1`, `update.json` siempre desde red, handler `SKIP_WAITING`) e `index.html` (script agregado). Prueba automatizada completa en Electron real: base→sin popup, 1.1.1→popup, Quedarme→skip, reintento→no reavisa, 1.1.2→reavisa, Actualizar→fuerza, bloqueada→no molesta, SW activo. `APP_VERSION=1.1.0` = `update.json.version` (sin avisos falsos). Se creó `AGENTS.md` con la obligación de mantener la memoria al día y se añadió esta sección CHANGELOG.
- **[2026-09-13] Entrega final "JAM POS 1.1 estable final" (4 formatos, candado 7 días)**: web (`web-pwa\`), APK (`JAMPOS-1.1-estable-final.apk`, versionCode 50, cert idéntico `99478066...`, actualiza sobre 0.1), EXE portable (`windows-exe\`), DEB (`linux-desktop\`, dpkg-deb WSL). Verificaciones completas de candado en los 4 formatos. Scripts: `android\build.ps1` + `android\empaquetar.ps1` (reemplazo de Python inexistente).

---

## 1. RESUMEN GENERAL

**JAM POS** es un Sistema de Punto de Venta (POS) 100% offline-first con sincronización P2P (WebRTC/PeerJS), tasas de cambio en vivo (BCV / Al Cambio / USDT), inventario, ventas, gastos, clientes, reportes, tickets, respaldos, y modo kiosco. Se distribuye como licencia "de prueba por 7 días" (candado) en **4 formatos**:

| Formato | Entrega | Carpeta |
|---|---|---|
| Web/PWA | HTML + SW + manifest | `ultima vercion estable jam pos\web-pwa\` |
| APK Android | instalable, firma V2, mismo keystore que versiones previas | `ultima vercion estable jam pos\JAMPOS-1.1-estable-final.apk` |
| EXE Windows | carpeta portable (Electron) | `ultima vercion estable jam pos\windows-exe\` |
| DEB Linux | paquete `.deb` amd64 | `ultima vercion estable jam pos\linux-desktop\` |

**Versión de producto final:** "JAM POS 1.1 estable final", `v1.1`, con **candado de 7 días** activo en todas las versiones.

**ÚLTIMA MEJORA (2026-09-13):** sistema automático de **aviso de nuevas versiones** (popup con botones "Actualizar ahora" / "Quedarme") para la versión web/PWA. Trabajado en una carpeta NUEVA aparte (misma v1.1 pero "actualizable"):
> `C:\Users\felin\Documents\MisProyectos\JAM POS 1.1 actualizable (web-pwa)\`

---

## 2. CARPETAS EXACTAS DE LAS ENTREGAS

### 2.1 Versión estable completa (APK + EXE + DEB + web) — LA PRINCIPAL
```
C:\Users\felin\Documents\MisProyectos\ultima vercion estable jam pos\
├── web-pwa\                       ← web/PWA (trial.js 7 días activo)
│   ├── index.html, app.js, style.css, sw.js, manifest.json
│   ├── trial.js                   ← candado 7 días (web)
│   ├── sync-core.js, sync.js      ← sincronización P2P
│   ├── web-bridge.js              ← puente Android nativo
│   └── vendor\                    ← peerjs.min.js, qrcode-gen.js, jsqr.js  (¡recursivo!)
├── android\                       ← proyecto Android (NO Gradle; build manual por scripts)
│   ├── build.ps1                  ← pipeline completo de build del APK
│   ├── empaquetar.ps1             ← reemplazo en PowerShell de empaquetar.py (sin Python)
│   └── keystore\jampos-release.jks← key store (contraseña 12345678; no usar jamjar)
├── windows\                       ← app web + harness Electron (para empaquetar el EXE)
│   └── electron\ main.js, preload.js, widget-preload.js, widget.html, trial-exe.js
├── windows-exe\                   ← ENTREGA EXE (carpeta portable, copiar/renombrar dist)
│   ├── "JAM POS 1.1 estable final.exe"   (188.784.128 bytes = 188.7 MB)
│   └── resources\app\             ← contenido web + electron\ (main.js/preload/trial-exe.js)
├── linux-desktop\                 ← ENTREGA DEB
│   └── "JAM POS 1.1 estable final (Linux).deb"   (82.573.566 bytes = 82.5 MB)
├── JAMPOS-1.1-estable-final.apk        (3.174.386 bytes)
└── JAMPOS-1.1-estable-final.apk.idsig  (34.345 bytes, firma .aab/.apk Play)
```

### 2.2 ÚLTIMA MEJORA — Web/PWA "actualizable" (misma v1.1, preparada para futuras actualizaciones)
```
C:\Users\felin\Documents\MisProyectos\JAM POS 1.1 actualizable (web-pwa)\
├── update-notify.js   ← NUEVO: aviso automático de nuevas versiones (popup 2 botones)
├── update.json        ← NUEVO: manifiesto de versiones del servidor {version, titulo, fecha, notas[], bloqueo}
├── index.html         ← agrega <script src="update-notify.js"> en <head>
├── sw.js              ← CACHE_NAME = "jampos-web-cache-v11-a1"; precachea update-notify.js y update.json;
│                        update.json SIEMPRE desde red; handler de mensaje SKIP_WAITING
└── (resto igual a web-pwa estable: app.js, trial.js, sync.js, etc.)
```
Estado actual: `APP_VERSION`(en update-notify.js) = `1.1.0` y `update.json.version` = `1.1.0` → **iguales**, así que los nuevos instalados NO ven avisos falsos.

---

## 3. EL CANDADO DE 7 DÍAS (trial) — CÓMO FUNCIONA

Concepto: **marca de origen con la fecha más antigua gana**; si pasan >7 días se bloquea. El reloj NO se puede hacer retroceder para ganar días (anti-rollback: se compara contra la fecha mínima vista).

### 3.1 Web/PWA (`trial.js` en web-pwa y en la versión actualizable)
- Canales: `localStorage` (`jamt_ultimate`), `IndexedDB`, `Cache Storage`.
- Claves: `j27`, `2025-ult-imado2` (key en b64), chip `jamt-clave`.
- Expone `window.JAMUltimateTrial = { iniciar, verificar, estado, bloquearInmediato }`.
- `app.js` llama `window.JAMUltimateTrial.bloquearInmediato()` en el arranque (línea ~5507) y `verificarPruebaInicio()`.
- UI: toast discreto de cuenta regresiva (`mostrarDiscreto`) + pantalla de bloqueo `mostrarBloqueo()` (z-index 999999).
- Textos: "JAM POS 1.1 estable final · Versión de prueba — día X de 7", marca "JAM POS 1.1 estable final · v1.1".
- **Límite físico (documentado al cliente):** en web pura SIN servidor, borrar TODOS los datos del navegador regenera el conteo. APK/EXE/DEB sí garantizan candado nativo.

### 3.2 APK Android
- Candado NATIVO en Kotlin en `src/main/java/.../MainActivity.kt` (`verificarPrueba`/`bloquear`) PLUS `trial.js` embebido en los assets.
- En la copia entregada, ambos están **activos** (trial.js con `CANDADO ACTIVO`, 2× `bloquearInmediato`, sin `VERSION LIBRE`).
- Verificado: package `com.jam.pos`, versionCode **50**, versionName **1.1**, label "JAM POS 1.1 estable final", firma V2.

### 3.3 EXE Windows (`windows\electron\trial-exe.js`, embebido en `windows-exe\resources\app\electron\`)
- Canales (sobreviven reinstalación, desinstalación y borrado del perfil Chrome):
  1. Registro Windows: `HKCU\Software\JAM POS` → valor `jamt_ultimate` (vía `reg.exe`).
  2. Carpeta de estado Electron (`app.getPath('userData')`) → archivo `trial-ultimate.json`.
  3. Carpeta datos (`%USERPROFILE%\Documents\JAM POS`) → archivo `trial.json`.
- Exporta `{ verificarUltimate, bloquearInmediato, setCarpetaDatos, setCarpetaEstado, DIAS=7, ... }`.
- `main.js`: `TrialExe.setCarpetaDatos(BASE_DIR)` y `setCarpetaEstado(app.getPath('userData'))`; IPC `cam:verificarUltimate` + `cam:verificarUltimateSync`.
- `preload.js`: `verificarPrueba` y `verificarUltimate` → `ipcRenderer.sendSync('cam:verificarUltimateSync')`, `esVersionPrueba: () => true`.
- Probado: instalación limpia → `bloqueada=false`, restantes=7; marca vieja de 9 días → `bloqueada=true`.

### 3.4 DEB Linux
- Mismo `trial-exe.js` (canales: `~/.config/<app>` (userData) + `~/Documents/JAM POS/trial.json`). En Linux NO hay `reg.exe`: se omite el canal de registro.
- Probado en Linux real (WSL, stub de `reg.exe`): limpio → `bloqueada=false restantes=7`; marca de 9 días → `bloqueada=true`.

---

## 4. PROCEDIMIENTOS DE BUILD (imprescindibles)

### 4.1 Herramientas reales disponibles
- Node JS portable: `C:\Users\felin\AppData\Local\Temp\opencode\node\node.exe` (v20.11.1). **No existe `python` real** (solo alias WindowsApps) → usar PowerShell o node.
- Android SDK: `C:\Users\rosav\android-sdk` (build-tools **36.1.0**, platform android-36).
- Java 17: `C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot`.
- Kotlin compiler: `kotlinc` disponible en PATH.
- Electron win32-x64 v33.4.11: `C:\Users\felin\AppData\Local\Temp\opencode\electron\dist\` (**importante: NO tiene `electron.asar`; arranca con `resources\app` + `default_app.asar`**).
- Electron linux-x64 v33.4.11: `C:\Users\felin\AppData\Local\Temp\opencode\electron-linux\dist\`.
- WSL: `Ubuntu` (para dpkg-deb y pruebas Linux; NO hay cargo/rustc/node dentro de WSL por defecto).
- Firmas APK: `apksigner.jar` (build-tools), keytool (JDK).

### 4.2 APK — `android\build.ps1` (copia del repo en la carpeta nueva)
Pasos del pipeline (resumen):
0. Copiar `web-pwa\` completo (¡recursivo, incluye **vendor**!) a la carpeta de trabajo del APK, **filtrando `.apk`/`.idsig`** que ya no deben viajar dentro del APK.
1. Generar `assets/www/` con el contenido web.
2. Compilar Kotlin (`.kt` → `.class`) con `kotlinc`.
3. Empaquetar dex: `d8.bat` sobre los `.class` (y `kotlin-stdlib`).
4. Compilar recursos `aapt2 compile` + `link` contra android-36.
5. Firmar/sellar el APK base (`zipalign`, `apksigner sign`) → `base.apk`.
6. **Empaquetar el APK FINAL con `empaquetar.ps1`** (reemplazo de `empaquetar.py`):
   - Entrada: `base.apk`, dex, `assets/www`.
   - Abre el zip en modo **Update** (copiando `base.apk` primero con `Copy-Item`), inyecta `classes.dex` en STORE/NoCompression y `assets/www/...` en DEFLATE/Optimal.
   - **Regla crítica:** NO usar una variable local llamada `$out` (colisiona con el parámetro `$Out` de PowerShell case-insensitive). Usar `$outStream`/`$inStream`/`$outDex`/`$inDex`.
7. Verificación final: `aapt2 dump badging`, `apksigner verify --print-certs`, y conteo de entradas en el APK (fueron 55 en la entrega).

Salida del script: `JAMPOS-1.1-estable-final.apk` + `.idsig`.

### 4.3 EXE — empaquetado portable (Electron)
1. El contenido de `windows\` es la app (copia recursiva de `web-pwa\` + `electron\`).
2. Copiar dist Electron completo a `windows-exe\` y **renombrar `electron.exe` → `"JAM POS 1.1 estable final.exe"`** (resources\app contiene la app).
3. Smoke con variables de entorno: `JAMPOS_SMOKE=1`, `JAMPOS_USERDATA=<carpeta temporal>`, `JAMPOS_MULTI=1` → el harness imprime `[SMOKE] {...}` con título, hijos en appRoot, botones del sidebar, librerías y módulos de sync.
4. Evaluar el candado con `ELECTRON_RUN_AS_NODE=1` + `trial-exe.js` (marca vieja → bloqueada).

### 4.4 DEB — construcción manual con dpkg-deb (WSL)
1. En WSL, estructurar `/tmp/jampos-1.1.0-amd64/`:
   - `usr/lib/jampos/` → binario electron renombrado (`jampos-electron`), `resources/app/` con la app + `update-notify.js`/`update.json` si se replica la mejora.
   - `usr/bin/jampos` → wrapper: `exec /usr/lib/jampos/jampos-electron /usr/lib/jampos/resources/app "$@"`.
   - `usr/share/applications/jampos.desktop`, iconos, `DEBIAN/control` (Package: `jampos`, Version 1.1.0, amd64, Depends), `DEBIAN/postinst` (`chmod 4755` a `chrome-sandbox`, `update-desktop-database`), `md5sums`.
2. `dpkg-deb --build` → copiar a `linux-desktop\`.
3. Notas: registro `JAMPOS-Libre-0.1.apk`? No. El `.deb` viejo de "123" era **otro producto** (`Package: jamp-pos-sync`) → sin conflicto de actualización.
4. Probar el candado Linux con un `.sh` (NO comandos bash embebidos dentro de PowerShell: las comillas/$()/`$OLDF` rompen la interpolación; siempre escribir script `.sh` y ejecutar `wsl.exe -e bash -lc "bash /mnt/c/.../script.sh"`).

---

## 5. LA ÚLTIMA MEJORA — AVISO DE NUEVAS VERSIONES (detalle técnico)

Archivos (en `JAM POS 1.1 actualizable (web-pwa)\`):
- **`update-notify.js`**: módulo IIFE autocontenido.
  - `APP_VERSION = '1.1.0'` (versión de ESTA instalación; **editar al publicar**).
  - `UPDATE_URL = 'update.json'`; `REAVISO_DIAS = 7`; comprobaciones: a los 4 s, cada 6 h, al volver `online`, al volver visible (`visibilitychange`).
  - `esMayor(a,b)` semver numérico: true si servidor > instalada.
  - Fetch a `update.json?ts=<Date.now()>` con `{cache:'no-store'}` para **saltarse siempre la caché del service worker**.
  - Reglas de no-molestar: silencio si offline (`navigator.onLine===false`), si `document.readyState==='loading'`, o si la app está **bloqueada por candado** (`window.__jamt_estado.bloqueada`, `.jamult-bloqueo`, `window._pruebaInfo.bloqueada`).
  - `localStorage['jampos_upd_skip']` mapa `{version: timestamp}`: si ya se rechazó esa versión y no han pasado 7 días, no re-avisa; versiones más nuevas siempre avisan.
  - Popup (z-index 999992, entre toast 999990 y bloqueo 999999): badge "▲ NUEVA VERSIÓN", título `JAM POS <versión>`, fecha, **lista de novedades** (✓), **aviso de posible pérdida de funcionalidades** (amarillo), y **2 botones**:
    - `Actualizar ahora` → cierra, force `reg.update()` + envía `{type:'SKIP_WAITING'}` al SW en waiting, escucha `controllerchange` → recarga; fallback `navegacionForzada()` que agrega `?jampos_upd=<ts>` y reload.
    - `Quedarme con la versión actual` → guarda skip, cierra, toast de recordatorio.
  - Funciones de test/debug expuestas: `window.jamCheckUpd` y `window.jamEsMayor`.
- **`update.json`** (manifiesto del servidor): `{ "version": "1.1.0", "nombre", "titulo", "fecha", "bloqueo" (texto advertencia, sobreescribe el default), "notas": [...] }`.
- **`sw.js`**: `CACHE_NAME = "jampos-web-cache-v11-a1"`; agrega `update-notify.js` y `update.json` a `STATIC_ASSETS`; en `fetch`, si la URL contiene `/update.json` → **siempre red** (`fetch(req)` con fallback a cache); handler `message` para `SKIP_WAITING`.
- **`index.html`**: `<script src="update-notify.js"></script>` al final del `<head>` (tras `trial.js`).

**Flujo de publicación de una actualización futura (sin tocar la lógica):**
1. En el servidor: edit `update.json` → `version = X.Y.Z` (mayor) + `notas` nuevas + `fecha`.
2. En la nueva build: `APP_VERSION = X.Y.Z` y subir los archivos nuevos (app.js/sw.js/etc.); cambiar `CACHE_NAME` en sw.js para forzar cache fresh.
3. Las copias instaladas (+1.1.0) verán `X.Y.Z > 1.1.0` → popup automático con botón Actualizar.

**Prueba automatizada de la mejora** (Electron real + servidor HTTP local que sirve la carpeta web):
Cadena validada: `base 1.1.0 sin novedades → sin popup`; `publican 1.1.1 → popup con versión/notas/botones/aviso`; `Quedarme → cierra y guarda skip`; `reintento 1.1.1 → sin popup (7 días)`; `publican 1.1.2 → reavisa`; `actualizar-ahora → cierra y fuerza`; `app bloqueada → NO avisa`; `service worker registrado y activo`.

---

## 6. VERIFICACIONES CLAVE YA REALIZADAS (no repetir, referenciar)

- **APK actualiza sobre la anterior:** `com.jam.pos` + **certificado idéntico** SHA-256 `99478066c0ab396c5463c5cf3dea3c9da1b2753ac7888c571108b2f3ab47c200` entre `JAMPOS-Libre-0.1.apk` (versionCode 40) y `JAMPOS-1.1-estable-final.apk` (versionCode 50); keystore SHA-256 `78425843CBD7D27FEE3CF01BACBB1E78F22C697CFADFCA15B1B217217903D675`. → instalación encima garantizada.
- **Web/EXE/DEB**: trial.js dentro de los paquetes con candado ACTIVO (2× `bloquearInmediato`, 0× `VERSION LIBRE`).
- **Rutas/hashes de entrega**:
  - APK: 3.174.386 bytes (55 entradas zip).
  - EXE: `windows-exe\JAM POS 1.1 estable final.exe` 188.784.128 bytes.
  - DEB: `linux-desktop\JAM POS 1.1 estable final (Linux).deb` 82.573.566 bytes.
  - idsig: 34.345 bytes.
- Registro Windows de prueba limpiado; userDatas temporales de smoke borrados.

---

## 7. REGLAS INVARIABLES (NO ROMPER)

1. **NUNCA cambiar interfaces, menús, handlers ni flujos existentes** (sidebar, módulos, ventas, kiosco, sync, config). Solo defectos y candado.
2. **No regenerar claves ni cambiar el keystore** del APK: usar `android\keystore\jampos-release.jks` existente para que siga actualizando encima de versiones instaladas.
3. El candado debe quedar **ACTIVO por 7 días** en toda entrega (timer marca-fecha más antigua; bloqueo al superar los días).
4. `web-pwa` / `windows` / dist se copian **recursivamente** (incluye `vendor\`, icons, fuentes). Filtrar `.apk`/`.idsig`/`package*.json` obsoletos al empaquetar.
5. En PowerShell 5.1: **NO usar operador ternario** (`a ? b : c`) ni `&&`; usar `$(if(...){...}else{...})` y `cmd1; if($?){cmd2}`. No anidar comillas bash dentro de PowerShell (usar archivos `.sh`).
6. Los comandos bash hacia WSL se lanzan así: `wsl.exe -e bash -lc "bash /mnt/<unidad>/<ruta>/script.sh"`.
7. No existe `python` real → usar PowerShell o node portable.
8. El dist Electron no tiene `electron.asar`; para apps de prueba, clonar el dist y **reemplazar `resources\app`** (NO pasar la carpeta de la app como argumento al exe).
9. Matar procesos `electron` zombie antes de pruebas de EXE/Electron (bloquean archivos en Temp).
10. Cambios en `trial.js`/`update-notify.js` se reflejan en las 3 copias (web-pwa, windows/windows-exe, y la versión actualizable).
11. **Verificar las fuentes Font Awesome al entregar**: `fa-solid-900.woff2` DEBE pesar 150.124 bytes y `fa-brands-400.woff2` 108.020 bytes (FA 6.4.0 completo). Si `fontawesome.min.css` contiene "(subset)" o las fuentes pesan menos (ej. 7.764/672 bytes), los iconos no se renderizan → descargar las 8 fuentes completas desde `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/` y reemplazar en web-pwa, windows, windows-exe\resources\app y el árbol del .deb, y REBUILD de APK + DEB. El `.deb` se re-empaqueta con `ar rcs debian-binary control.tar.zst data.tar.zst` y `tar` plano + `zstd -19` (nivel 19 replica el tamaño original).

---

## 8. PARA EL PRÓXIMO AGENTE — RESUMEN DE ESTADO

**ENTREGADO y verificado:**
- 4 versiones de "JAM POS 1.1 estable final" (web, APK, EXE, DEB) con candado 7 días → en `ultima vercion estable jam pos\`.
- Cookie/idsig, smoke EXE y candado probados, cert APK identico para update, deb dpkg-deb OK en WSL.
- **[2026-09-13·FIX] Iconos FA corregidos**: fuentes subset en los 4 formatos reemplazadas por las 8 completas de FA 6.4.0; APK 1.1 REBUILD (3.690.482 bytes, versionCode 50, cert idéntico) y DEB re-empaquetado (83.076.848 bytes, zstd -19, validado dpkg-deb). EXE ya usa `resources\app` corregido. El cliente debe volver a instalar el APK/DEB/EXE nuevos para ver los iconos.

**ÚLTIMO TRABAJO (nueva feature):** aviso automático de versiones web/PWA (`update-notify.js` + `update.json` + `sw.js` + `index.html`) → carpeta nueva `JAM POS 1.1 actualizable (web-pwa)\` (misma v1.1). Prueba automatizada completa PASADA.

**Posibles pasos futuros (a confirmar con el cliente):**
- Replicar el aviso de versiones en APK/EXE/DEB/`windows\` si se desea.
- Generar README/instrucciones de despliegue web (hosting donde subir `update.json`).
- Publicar futuras versiones siguiendo el flujo de la sección 5.