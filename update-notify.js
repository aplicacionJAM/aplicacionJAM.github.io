// ==================== AVISO DE NUEVAS VERSIONES (PWA/HTML) ====================
// Mecanismo fiable y estable:
//   - Compara la version desplegada en esta instalacion contra la version
//     publicada en "update.json" del servidor.
//   - Si el servidor tiene version mayor, muestra un popup con las novedades
//     y dos botones: "Actualizar ahora" o "Quedarme con la version actual".
//   - Si el usuario decide quedarse, se guarda en localStorage y NO se vuelve
//     a molestar durante REAVISO_DIAS dias (salvo que aparezca una version
//     aun mas nueva).
//   - Funciona offline: cualquier fallo de red se ignora en silencio.
//   - No interfiere con el candado de prueba ni con la interfaz de la app.
(function () {
    if (window.jamUpdaterLoaded) return;
    window.jamUpdaterLoaded = true;

    var APP_VERSION = '1.1.0';                   // version DE ESTA instalacion (editar al publicar)
    var UPDATE_URL = 'update.json';              // version publicada en el servidor
    var REAVISO_DIAS = 7;                        // dias minimos entre recordatorios de la misma version
    var CHECK_INICIAL_MS = 4000;                 // espera tras cargar la app
    var CHECK_INTERVALO_MS = 6 * 60 * 60 * 1000; // cada 6 horas
    var CLAVE_SKIP = 'jampos_upd_skip';

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

    function leerSkips() {
        try { return JSON.parse(localStorage.getItem(CLAVE_SKIP)) || {}; } catch (e) { return {}; }
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
        var notasHtml = (datos.notas && datos.notas.length)
            ? '<ul class="jamupd-notas">' + datos.notas.map(function (n) { return '<li><b>&#10003;</b><span>' + escapeHtml(String(n)) + '</span></li>'; }).join('') + '</ul>'
            : '';
        var bloqueHtml = datos.bloqueo
            ? '<div class="jamupd-aviso">&#9888;&nbsp;' + escapeHtml(String(datos.bloqueo)) + '</div>'
            : '<div class="jamupd-aviso">&#9888;&nbsp;Si te quedas con la versi&oacute;n actual podr&iacute;as perder acceso a las nuevas funciones, correcciones y mejoras publicadas.</div>';
        overlay.innerHTML =
            '<div class="jamupd-caja">' +
            '<div class="jamupd-badge">&#9650;&nbsp;Nueva versi&oacute;n</div>' +
            '<h2>JAM POS <span>' + escapeHtml(String(datos.version)) + '</span></h2>' +
            '<p class="jamupd-sub">' + (datos.fecha ? 'Publicada el ' + escapeHtml(String(datos.fecha)) : 'Ya est&aacute; disponible.') + '</p>' +
            (datos.titulo ? '<p class="jamupd-sub" style="opacity:.85;margin-top:-6px"><b>' + escapeHtml(String(datos.titulo)) + '</b></p>' : '') +
            notasHtml +
            bloqueHtml +
            '<button class="jamupd-btn jamupd-btn-actualizar" id="jamupdSi">&#8635;&nbsp; Actualizar ahora</button>' +
            '<button class="jamupd-btn jamupd-btn-quedarme" id="jamupdNo">Quedarme con la versi&oacute;n actual</button>' +
            '</div>';
        document.body.appendChild(overlay);
        overlay.dataset.version = String(datos.version);
        overlay.querySelector('#jamupdSi').onclick = actualizarAhora;
        overlay.querySelector('#jamupdNo').onclick = quedarse;
    }

    function quedarse() {
        var v = overlay ? overlay.dataset.version : null;
        var skips = leerSkips();
        if (v) skips[v] = Date.now();
        try { localStorage.setItem(CLAVE_SKIP, JSON.stringify(skips)); } catch (e) {}
        cerrarPopup();
        toast('Puedes actualizar cuando quieras. Te lo recordaremos en la pr&oacute;xima versi&oacute;n.');
    }

    var recargando = false;

    function navegacionForzada() {
        if (recargando) return;
        recargando = true;
        window.location.href = window.location.href.split('#')[0] + (window.location.search ? '&' : '?') + 'jampos_upd=' + Date.now();
        setTimeout(function () { window.location.reload(); }, 4000);
    }

    function actualizarAhora() {
        cerrarPopup();
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
                    if (!esMayor(APP_VERSION, datos.version)) return;
                    var skips = leerSkips();
                    var ultimo = skips[datos.version];
                    if (ultimo && Date.now() - ultimo < REAVISO_DIAS * 86400000) return;
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