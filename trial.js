// ============================================================================
// JAM ULTIMATE - Sistema de prueba de 7 dias (discreto).
//
// - El conteo arranca desde el primer arranque del aplicativo.
// - Cada INICIO muestra un aviso discreto "Dia X de 7" que se cierra solo.
// - Al cumplirse los 7 dias -> bloqueo total (pantalla de bloqueo).
// - Persistencia multicanal (localStorage + IndexedDB + CacheStorage del SW):
//   la marca MAS ANTIGUA gana (un re-arranque/desinstalacion no resetea el
//   conteo porque los canales externos conservan la fecha original).
// - Anti-manipulacion de reloj: se ancla a la ultima vista registrada.
// - En el APK, el canal nativo AndroidBridge.verificarUltimate() es la fuente
//   de verdad (escribe tambien en /sdcard/JAM POS/ y MediaStore, que
//   sobreviven a la desinstalacion).
// ============================================================================
(function () {
    var DIAS = 7;
    var MS_DIA = 86400000;
    var TOLERANCIA = 5 * 60000; // 5 min de tolerancia de reloj
    var KEY = 'jamt_ultimate';
    var KEY_UID = 'jamt_ultimate_uid';
    var IDB_NAME = 'jam_ultimate';
    var IDB_STORE = 'kv';
    var CACHE_NAME = 'jamt-ult-v1';

    function ahora() { return Date.now(); }

    function codificar(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))); }
    function decodificar(s) {
        var o = JSON.parse(decodeURIComponent(escape(atob(s))));
        if (!o || typeof o.f !== 'number') return null;
        return o;
    }

    function uid() {
        try {
            var u = localStorage.getItem(KEY_UID);
            if (!u) {
                u = 'u' + Math.random().toString(36).slice(2) + '_' + ahora().toString(36);
                localStorage.setItem(KEY_UID, u);
            }
            return u;
        } catch (e) { return ''; }
    }

    // ---------------- Canales web ----------------

    function leerLocal() {
        try { var r = localStorage.getItem(KEY); return r ? decodificar(r) : null; } catch (e) { return null; }
    }
    function escribirLocal(m) {
        try { localStorage.setItem(KEY, codificar(m)); } catch (e) {}
    }

    function abrirIDB() {
        return new Promise(function (res) {
            try {
                var req = indexedDB.open(IDB_NAME, 1);
                req.onupgradeneeded = function (e) { try { e.target.result.createObjectStore(IDB_STORE); } catch (x) {} };
                req.onsuccess = function () { res(req.result); };
                req.onerror = function () { res(null); };
            } catch (e) { res(null); }
        });
    }
    function leerIDB() {
        return new Promise(function (res) {
            abrirIDB().then(function (db) {
                if (!db) return res(null);
                try {
                    var t = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(KEY);
                    t.onsuccess = function () { try { res(t.result ? decodificar(t.result) : null); } catch (e) { res(null); } };
                    t.onerror = function () { res(null); };
                } catch (e) { res(null); }
            });
        });
    }
    function escribirIDB(m) {
        return new Promise(function (res) {
            abrirIDB().then(function (db) {
                if (!db) return res();
                try {
                    db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(codificar(m), KEY);
                    res();
                } catch (e) { res(); }
            });
        });
    }

    function abrirCache() {
        try { return Promise.resolve(caches.open(CACHE_NAME)); } catch (e) { return Promise.resolve(null); }
    }
    function leerCache() {
        return abrirCache().then(function (c) {
            if (!c) return null;
            return c.match('jam-marca').then(function (r) {
                if (!r) return null;
                return r.text().then(function (t) { return decodificar(t); });
            }).catch(function () { return null; });
        });
    }
    function escribirCache(m) {
        return abrirCache().then(function (c) {
            if (!c) return;
            return c.put('jam-marca', new Response(JSON.stringify(m))).catch(function () {});
        });
    }

    // ---------------- Canal nativo (APK) ----------------
    function estadoNativo() {
        try {
            if (window.AndroidBridge && typeof AndroidBridge.verificarUltimate === 'function') {
                var n = JSON.parse(AndroidBridge.verificarUltimate());
                if (n && typeof n.fechaInicio === 'number' && n.fechaInicio > 0) return n;
            }
        } catch (e) {}
        return null;
    }

    // ---------------- Calculo del estado ----------------
    function calcular(lista) {
        var ahoraReal = ahora();
        var fondo = ahoraReal;
        var ultima = 0;
        if (lista.length) {
            fondo = lista.reduce(function (a, b) { return Math.min(a, b.f); }, fondo);
            ultima = lista.reduce(function (a, b) { return Math.max(a, b.l || 0); }, 0);
        }
        // ancla monotona contra retroceso de reloj
        var ahoraE = Math.max(ahoraReal, ultima);
        var dias = Math.floor((ahoraE - fondo) / MS_DIA);
        var tamper = false;
        for (var i = 0; i < lista.length; i++) {
            if (lista[i].f > ahoraReal + TOLERANCIA || (lista[i].l && lista[i].l > ahoraReal + TOLERANCIA)) tamper = true;
        }
        var bloqueada = dias >= DIAS || tamper;
        var diaActual = bloqueada ? DIAS : Math.min(DIAS, dias + 1);
        var restantes = bloqueada ? 0 : Math.max(0, DIAS - dias);
        return {
            bloqueada: bloqueada,
            tamper: tamper,
            diaActual: diaActual,
            diasRestantes: restantes,
            fechaInicio: fondo,
            diasTotales: DIAS
        };
    }

    function estadoActual() {
        return window.__jamt_estado || null;
    }

    // ---------------- Verificacion principal ----------------
    function verificar() {
        return new Promise(function (resolver) {
            var pendientes = 2; // local + idb
            var lista = [];
            var nativo = estadoNativo();

            function terminar() {
                // El canal nativo (APK) ya entrega decision terminada
                if (nativo && nativo.bloqueada) {
                    window.__jamt_estado = { bloqueada: true, tamper: false, diaActual: DIAS, diasRestantes: 0, fechaInicio: nativo.fechaInicio, diasTotales: DIAS };
                    return resolver(window.__jamt_estado);
                }
                var marcaNativa = nativo ? { f: nativo.fechaInicio, l: ahora(), u: 'native' } : null;
                if (marcaNativa) lista.push(marcaNativa);
                if (lista.length === 0) {
                    // primera ejecucion: crear fecha de inicio
                    var m = { v: 1, f: ahora(), l: ahora(), u: uid() };
                    escribirLocal(m);
                    escribirIDB(m);
                    escribirCache(m);
                    window.__jamt_estado = calcular([m]);
                    return resolver(window.__jamt_estado);
                }
                var est = calcular(lista);
                // actualizar ultima vista
                var nuevo = { v: 1, f: est.fechaInicio, l: ahora(), u: uid() };
                escribirLocal(nuevo);
                escribirIDB(nuevo);
                escribirCache(nuevo);
                window.__jamt_estado = est;
                resolver(est);
            }

            var m = leerLocal(); if (m) lista.push(m);
            leerIDB().then(function (i) { if (i) lista.push(i); terminar(); });
            leerCache().then(function (c) { if (c) lista.push(c); terminar(); });
        });
    }

    // ---------------- UI identidad (discreta) ----------------
    function crearEstilos() {
        var estilo = document.createElement('style');
        estilo.textContent =
            '.jamult-toast{position:fixed;right:12px;bottom:12px;left:12px;max-width:320px;margin:0 auto;z-index:999990;' +
            'background:rgba(17,17,20,.88);border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:10px 12px;' +
            'font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;color:#f5f5f7;box-shadow:0 8px 28px rgba(0,0,0,.35);' +
            'animation:jamultIn .35s ease;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);' +
            'display:flex;align-items:center;gap:10px;user-select:none}' +
            '.jamult-toast.jamult-out{animation:jamultOut .4s ease forwards}' +
            '.jamult-icon{font-size:16px;filter:drop-shadow(0 0 6px rgba(255,255,255,.25))}' +
            '.jamult-cuerpo{flex:1;min-width:0}' +
            '.jamult-titulo{font-size:12px;font-weight:600;letter-spacing:.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
            '.jamult-barra{height:3px;border-radius:3px;background:rgba(255,255,255,.15);margin-top:6px;overflow:hidden}' +
            '.jamult-barra-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,#3b82f6,#22d3ee);transition:width .6s ease}' +
            '.jamult-pct{font-size:10px;opacity:.65;margin-top:3px;letter-spacing:.3px}' +
            '.jamult-cerrar{background:transparent;border:0;color:rgba(255,255,255,.55);font-size:15px;line-height:1;padding:4px 6px;cursor:pointer;border-radius:8px}' +
            '.jamult-cerrar:hover{color:#fff;background:rgba(255,255,255,.1)}' +
            '@keyframes jamultIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}' +
            '@keyframes jamultOut{to{opacity:0;transform:translateY(12px)}}' +
            '.jamult-bloqueo{position:fixed;inset:0;z-index:999999;background:#0b0b0f;color:#f5f5f7;display:flex;align-items:center;justify-content:center;' +
            'font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;overflow:auto}' +
            '.jamult-bloqueo-caja{max-width:340px;margin:24px;text-align:center;padding:0}' +
            '.jamult-bloqueo-icono{font-size:52px;margin-bottom:14px;filter:drop-shadow(0 0 18px rgba(239,68,68,.45))}' +
            '.jamult-bloqueo h2{font-size:20px;margin:0 0 8px;font-weight:700}' +
            '.jamult-bloqueo p{font-size:14px;line-height:1.55;opacity:.85;margin:0 0 6px}' +
            '.jamult-bloqueo-marca{font-size:12px;opacity:.5;margin-top:16px}' +
            '.jamult-bloqueo-btn{margin-top:20px;background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.2);' +
            'border-radius:12px;padding:11px 26px;font-size:14px;font-weight:600;cursor:pointer}' +
            '.jamult-bloqueo-btn:active{background:rgba(255,255,255,.15)}' +
            '@media(prefers-color-scheme:dark){.jamult-toast{background:rgba(10,10,13,.9)}}';
        document.head.appendChild(estilo);
    }

    function mostrarDiscreto(estado) {
        if (!estado || estado.bloqueada) return;
        try { if (sessionStorage.getItem('jamt_popup_shown')) return; } catch (e) {}
        try { sessionStorage.setItem('jamt_popup_shown', '1'); } catch (e) {}

        var textoDia = estado.diaActual === 1 ? '1' : String(estado.diaActual);
        var toast = document.createElement('div');
        toast.className = 'jamult-toast';
        var pct = Math.round((estado.diaActual / estado.diasTotales) * 100);
        toast.innerHTML =
            '<span class="jamult-icon">&#9200;</span>' +
            '<div class="jamult-cuerpo">' +
            '<div class="jamult-titulo">JAM POS &middot; Versi&oacute;n de prueba &mdash; d&iacute;a ' + textoDia + ' de ' + estado.diasTotales + '</div>' +
            '<div class="jamult-barra"><div class="jamult-barra-fill" style="width:' + pct + '%"></div></div>' +
            '<div class="jamult-pct">' + (estado.diasRestantes === 1 ? '1 d&iacute;a restante' : (estado.diasRestantes) + ' d&iacute;as restantes') + '</div>' +
            '</div>' +
            '<button class="jamult-cerrar" aria-label="Cerrar">&times;</button>';
        document.body.appendChild(toast);

        function cerrar() {
            if (toast.parentNode) {
                toast.classList.add('jamult-out');
                setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 380);
            }
        }
        toast.querySelector('.jamult-cerrar').onclick = cerrar;
        var ms = estado.diasRestantes <= 2 ? 9000 : 5000;
        setTimeout(cerrar, ms);
    }

    function mostrarBloqueo() {
        if (document.querySelector('.jamult-bloqueo')) return;
        var fondo = document.createElement('div');
        fondo.className = 'jamult-bloqueo';
        fondo.innerHTML =
            '<div class="jamult-bloqueo-caja">' +
            '<div class="jamult-bloqueo-icono">&#128274;</div>' +
            '<h2>Periodo de prueba finalizado</h2>' +
            '<p>El periodo de prueba de <b>7 d&iacute;as</b> de JAM POS Ultimate ha terminado.</p>' +
            '<button class="jamult-bloqueo-btn" onclick="' +
            'if(window.AndroidBridge&&typeof AndroidBridge.cerrarApp===\'function\')AndroidBridge.cerrarApp();' +
            'else try{window.close()}catch(e){}' +
            '">Cerrar aplicaci&oacute;n</button>' +
            '<div class="jamult-bloqueo-marca">JAM POS Ultimate &middot; v0.1</div>' +
            '</div>';
        document.body.appendChild(fondo);
    }

    // ---------------- Arranque (VERSION LIBRE: sin bloqueo, inerte) ----------------
    function iniciar() {
        return;
    }

    function bloquearInmediato() {
        return false;
    }

    window.JAMUltimateTrial = {
        DIAS: DIAS,
        iniciar: iniciar,
        verificar: verificar,
        estado: estadoActual,
        bloquearInmediato: bloquearInmediato
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();