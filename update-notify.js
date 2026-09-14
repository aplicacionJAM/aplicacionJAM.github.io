// =========== AVISO DE NUEVAS VERSIONES (WEB/PWA/APK/EXE/DEB) ===========
// Mecanismo fiable y estable para TODAS las plataformas:
//   - La web/PWA revisa "update.json" RELATIVO (su propio directorio).
//   - Las nativas (apk/exe/deb) revisan una CARPETA por plataforma en el
//     servidor: https://aplicacionjam.github.io/<apk|exe|deb>/update.json
//   - Si esa carpeta "esta llena" (update.json responde 200) hay version
//     nueva publicada; si responde 404 (carpeta vacia) no hay nada y la app
//     arranca normal en silencio.
//   - Si hay version distinta a la instalada, popup con novedades + 2 botones:
//     en web recarga la app; en nativas abre la descarga del instalador.
//   - Regla que PREVALECE: se recuerda en CADA inicio mientras la version
//     publicada siga siendo distinta (no hay silencio de 7 dias).
//   - Funciona offline / sin servidor del libro: cualquier fallo de red o
//     404 se ignora en silencio. No interfiere con el candado ni con la UI.
(function () {
    if (window.jamUpdaterLoaded) return;
    window.jamUpdaterLoaded = true;

    var APP_VERSION = '1.1.2';                   // version DE ESTA instalacion (editar al publicar)
    var BASE_URL = 'https://aplicacionjam.github.io/'; // raiz publicada (GitHub Pages)
    var PLATAFORMA = detectarPlataforma();       // 'web' | 'apk' | 'exe' | 'deb'
    var UPDATE_URL = PLATAFORMA === 'web'
        ? 'update.json'                          // web/PWA: su propio directorio
        : BASE_URL + PLATAFORMA + '/update.json';// nativas: carpeta por plataforma
    var CHECK_INICIAL_MS = 4000;                 // espera tras cargar la app
    var CHECK_INTERVALO_MS = 6 * 60 * 60 * 1000; // cada 6 horas

    // Deteccion automatica de la plataforma. Prioridad:
    //   1) window.plataformaApp si el shell nativo lo inyecta (apk/exe/deb/web).
    //   2) Por userAgent: WebView Android -> apk; Electron Windows -> exe;
    //      Electron Linux -> deb; navegador/PWA -> web.
    function detectarPlataforma() {
        try {
            if (window.plataformaApp) return String(window.plataformaApp);
            var ua = (navigator.userAgent || '').toLowerCase();
            var nativa = !!(window.AndroidBridge ||
                (typeof window.process !== 'undefined' && window.process.versions && window.process.versions.electron));
            if (!nativa && ua.indexOf('electron') === -1) return 'web';
            if (ua.indexOf('android') !== -1) return 'apk';
            if (ua.indexOf('windows') !== -1) return 'exe';
            if (ua.indexOf('linux') !== -1) return 'deb';
            return 'web';
        } catch (e) { return 'web'; }
    }

    function normalizar(v) {
        return String(v == null ? '' : v).replace(/^v/i, '').split('.').map(function (n) { return parseInt(n, 10) || 0; });
    }
    function esMayor(a, b) {
        var A = normalizar(a), B = normalizar(b), n = Math.max(A.length, B.length), i;
        for (i = 0; i < n; i++) {
            var x = A[i] || 0, y = B[i] || 0;
            if (y > x) return true;
            if (y < x) return false;
        }
        return false;
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
        });
    }

    function appBloqueada() {
        try {
            if (window.__jamt_estado && window.__jamt_estado.bloqueada) return true;
            if (document.querySelector('.jamult-bloqueo')) return true;
            if (window._pruebaInfo && window._pruebaInfo.bloqueada) return true;
        } catch (e) {}
        return false;
    }

    var overlay = null;
    var __avisadoSesion = {}; // evita re-avisar la misma version varias veces en UNA sesion

    // ===== MARCADOR LOCAL: version ya descargada/instalada en ESTE equipo =====
    // Previene popups repetidos: una vez que el usuario instala (o acepta
    // descargar) una version, esta app recuerda ese numero y NO vuelve a avisar
    // mientras el servidor no publique una version MAYOR a la ya instalada.
    var CLAVE_INSTALADA = 'jampos_ultima_instalada';

    function leerInstalada() {
        try {
            var v = localStorage.getItem(CLAVE_INSTALADA);
            if (v) return String(v);
        } catch (e) {}
        return '';
    }
    function guardarInstalada(v) {
        try { localStorage.setItem(CLAVE_INSTALADA, String(v)); } catch (e) {}
    }
    // Version instalada efectiva = el numero mayor entre el marcador local y el
    // APP_VERSION embebido (el marcador manda si es mas nuevo).
    function versionInstalada() {
        var m = leerInstalada();
        if (!m) return APP_VERSION;
        return esMayor(m, APP_VERSION) ? APP_VERSION : m;
    }

    function cerrarPopup() {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        overlay = null;
    }

    function toast(mensaje) {
        try { if (window.mostrarNotificacion) { window.mostrarNotificacion(mensaje, 'info'); return; } } catch (e) {}
        try {
            var el = document.createElement('div');
            el.style.cssText = 'position:fixed;right:12px;bottom:12px;left:12px;max-width:320px;margin:0 auto;z-index:999991;background:rgba(17,17,20,.92);color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:10px 12px;font-family:sans-serif;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,.35)';
            el.textContent = mensaje;
            document.body.appendChild(el);
            setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 4000);
        } catch (e) {}
    }

    function crearEstilos() {
        if (document.getElementById('jamupd-estilos')) return;
        var s = document.createElement('style');
        s.id = 'jamupd-estilos';
        s.textContent =
            '.jamupd-fondo{position:fixed;inset:0;z-index:999992;background:rgba(8,8,12,.66);display:flex;align-items:center;justify-content:center;padding:18px;' +
            'font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}' +
            '.jamupd-caja{max-width:360px;width:100%;max-height:88vh;overflow:auto;background:#141419;color:#f5f5f7;border:1px solid rgba(255,255,255,.14);' +
            'border-radius:18px;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.5);animation:jamupdIn .3s ease}' +
            '@keyframes jamupdIn{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}' +
            '.jamupd-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(59,130,246,.16);color:#60a5fa;border:1px solid rgba(59,130,246,.4);' +
            'font-size:11px;font-weight:700;letter-spacing:.5px;padding:5px 10px;border-radius:999px;margin-bottom:12px;text-transform:uppercase}' +
            '.jamupd-caja h2{margin:0 0 6px;font-size:19px;line-height:1.3;font-weight:800;letter-spacing:.2px}' +
            '.jamupd-sub{font-size:12px;opacity:.6;margin:0 0 14px}' +
            '.jamupd-notas{list-style:none;margin:0 0 16px;padding:0;display:flex;flex-direction:column;gap:8px}' +
            '.jamupd-notas li{display:flex;gap:9px;font-size:13px;line-height:1.5;align-items:flex-start}' +
            '.jamupd-notas li b{color:#34d399;flex:0 0 auto}' +
            '.jamupd-aviso{background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.35);color:#fbbf24;border-radius:12px;padding:10px 12px;' +
            'font-size:12px;line-height:1.55;margin:0 0 8px}' +
            '.jamupd-btn{width:100%;border:0;border-radius:14px;padding:14px;font-size:14px;font-weight:800;cursor:pointer;margin-top:8px;letter-spacing:.2px}' +
            '.jamupd-btn-actualizar{background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff}' +
            '.jamupd-btn-actualizar:active{opacity:.85}' +
            '.jamupd-btn-quedarme{background:rgba(255,255,255,.07);color:rgba(255,255,255,.85);border:1px solid rgba(255,255,255,.14)}' +
            '.jamupd-btn-quedarme:active{background:rgba(255,255,255,.14)}' +
            '@media(prefers-color-scheme:light){.jamupd-fondo{background:rgba(240,242,245,.72)}.jamupd-caja{background:#ffffff;color:#18181b;border-color:rgba(0,0,0,.12)}' +
            '.jamupd-btn-quedarme{background:rgba(0,0,0,.05);color:#374151;border-color:rgba(0,0,0,.14)}}.jamupd-notas li span{min-width:0}';
        document.head.appendChild(s);
    }

    function mostrarPopup(datos) {
        if (overlay) cerrarPopup();
        if (appBloqueada()) return;
        crearEstilos();
        overlay = document.createElement('div');
        overlay.className = 'jamupd-fondo';
        var esNativa = PLATAFORMA !== 'web';
        var notasHtml = (datos.notas && datos.notas.length)
            ? '<ul class="jamupd-notas">' + datos.notas.map(function (n) { return '<li><b>&#10003;</b><span>' + escapeHtml(String(n)) + '</span></li>'; }).join('') + '</ul>'
            : '';
        var textoAceptar = esNativa
            ? '&#10515;&nbsp; Descargar y actualizar'
            : '&#8635;&nbsp; Aceptar y actualizar ahora';
        var avisoPlataforma = esNativa
            ? 'Hay una nueva versi&oacute;n de la aplicaci&oacute;n. Desc&aacute;rgala e inst&aacute;lala para disfrutar de las mejoras.'
            : '<b>Regla de actualizaci&oacute;n:</b> debes actualizar al iniciar la aplicaci&oacute;n. Si no lo haces ahora, se te recordar&aacute; en cada inicio.';
        overlay.innerHTML =
            '<div class="jamupd-caja">' +
            '<div class="jamupd-badge">&#9650;&nbsp;Actualizaci&oacute;n disponible</div>' +
            '<h2>JAM POS v1.1 By @felinuxs</h2>' +
            '<p class="jamupd-sub">Nueva versi&oacute;n <b>' + escapeHtml(String(datos.version)) + '</b>' + (datos.fecha ? ' &middot; Publicada el ' + escapeHtml(String(datos.fecha)) : '') + '</p>' +
            (datos.titulo ? '<p class="jamupd-sub" style="opacity:.85;margin-top:-6px"><b>' + escapeHtml(String(datos.titulo)) + '</b></p>' : '') +
            notasHtml +
            '<div class="jamupd-aviso">&#9888;&nbsp;' + avisoPlataforma + '</div>' +
            '<button class="jamupd-btn jamupd-btn-actualizar" id="jamupdSi">' + textoAceptar + '</button>' +
            '<button class="jamupd-btn jamupd-btn-quedarme" id="jamupdNo">No aceptar por ahora</button>' +
            '</div>';
        document.body.appendChild(overlay);
        overlay.dataset.version = String(datos.version);
        ultimosDatos = datos;
        overlay.querySelector('#jamupdSi').onclick = actualizarAhora;
        overlay.querySelector('#jamupdNo').onclick = quedarse;
    }

    var ultimosDatos = null; // update.json de la ultima version detectada

    function quedarse() {
        cerrarPopup();
        // Se queda con la version actual por ahora: el marcador local NO se
        // sobreescribe, asi seguimos avisando SOLO cuando haya una version
        // mayor a la publicada. Sin nuevas versiones publicadas => sin popup.
        toast('De momento te quedas con esta versi\u00f3n. Te avisamos si aparece una m\u00e1s nueva.');
    }

    var recargando = false;

    function navegacionForzada() {
        if (recargando) return;
        recargando = true;
        window.location.href = window.location.href.split('#')[0] + (window.location.search ? '&' : '?') + 'jampos_upd=' + Date.now();
        setTimeout(function () { window.location.reload(); }, 4000);
    }

    // URL de descarga del instalador para nativas (apk/exe/deb).
    function urlDescargaNativa() {
        try {
            var d = ultimosDatos || {};
            if (d.descarga) return String(d.descarga);
            if (d.url) return String(d.url);
            if (d.archivo) return BASE_URL + PLATAFORMA + '/' + String(d.archivo);
        } catch (e) {}
        return '';
    }

    function actualizarAhora() {
        cerrarPopup();
        // El usuario acepto la actualizacion: registrar la version como
        // "ya instalada/aceptada" para no volver a preguntar por ella.
        try { if (ultimosDatos && ultimosDatos.version) guardarInstalada(String(ultimosDatos.version)); } catch (e) {}
        if (PLATAFORMA !== 'web') {
            // NATIVA (apk/exe/deb): abre la descarga del instalador de su carpeta.
            var url = urlDescargaNativa();
            if (!url) { toast('No se encontre el enlace de descarga de la actualizaci\u00f3n.'); return; }
            toast('Abriendo descarga de la actualizaci\u00f3n...');
            var puente = window.AndroidBridge;
            try {
                if (puente && typeof puente.abrirEnlace === 'function') { puente.abrirEnlace(url); return; }
            } catch (e) {}
            try {
                var a = document.createElement('a');
                a.href = url;
                a.target = '_blank';
                a.rel = 'noopener';
                document.body.appendChild(a);
                a.click();
                setTimeout(function () { if (a.parentNode) a.parentNode.removeChild(a); }, 100);
            } catch (e) {}
            return;
        }
        // WEB/PWA: recarga a la nueva version via Service Worker.
        toast('Buscando actualizaci&oacute;n...');
        if ('serviceWorker' in navigator) {
            try {
                var handler = function () {
                    try { navigator.serviceWorker.removeEventListener('controllerchange', handler); } catch (e) {}
                    setTimeout(function () { window.location.reload(); }, 600);
                };
                navigator.serviceWorker.addEventListener('controllerchange', handler);
                navigator.serviceWorker.getRegistration().then(function (reg) {
                    if (reg) {
                        if (reg.waiting) { try { reg.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch (e) {} }
                        try { reg.update(); } catch (e) {}
                        setTimeout(navegacionForzada, 6000);
                    } else {
                        navegacionForzada();
                    }
                }).catch(navegacionForzada);
            } catch (e) { navegacionForzada(); }
        } else {
            navegacionForzada();
        }
    }

    function comprobar() {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
        if (appBloqueada()) return;
        if (document.readyState === 'loading') { setTimeout(comprobar, CHECK_INICIAL_MS); return; }
        try {
            fetch(UPDATE_URL + '?v=' + Date.now(), { cache: 'no-store' })
                .then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); })
                .then(function (datos) {
                    if (!datos || !datos.version) return;
                    // Popup INTELIGENTE: solo avisa si la version publicada es
                    // MAYOR que la que este equipo ya tiene (marcador local o
                    // APP_VERSION embebido). Si la publicada NO es mayor, es que
                    // ya esta instalada/actualizada: silencio total, sin popup.
                    var p = normalizar(datos.version).join('.');
                    var t = normalizar(versionInstalada()).join('.');
                    if (p === t) {
                        // Version publicada == version instalada: registrar el
                        // marcador (por si APP_VERSION quedo desactualizado) y
                        // no avisar.
                        guardarInstalada(String(datos.version));
                        return;
                    }
                    if (!esMayor(versionInstalada(), datos.version)) return;
                    var v = String(datos.version);
                    if (__avisadoSesion[v]) return;
                    __avisadoSesion[v] = true;
                    mostrarPopup(datos);
                })
                .catch(function () {});
        } catch (e) {}
    }

    function iniciar() {
        setTimeout(comprobar, CHECK_INICIAL_MS);
        setInterval(comprobar, CHECK_INTERVALO_MS);
        if (typeof navigator !== 'undefined' && navigator.onLine !== undefined) {
            window.addEventListener('online', function () { setTimeout(comprobar, 3000); });
        }
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) setTimeout(comprobar, 2000);
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();

    window.jamCheckUpd = comprobar; // util para depuracion/forzar
    window.jamEsMayor = esMayor;    // util para pruebas/debug
})();