// ============================================================================
// JAM ULTIMATE - SIN CANDADO DE BLOQUEO.
//
// - Version liberada: NO hay periodo de prueba, no hay conteo, no hay bloqueo.
// - Conserva EXACTAMENTE la misma API publica que la version con candado:
//   window.JAMUltimateTrial = { DIAS, iniciar, verificar, estado, bloquearInmediato }
//   y window.__jamt_estado  -> para que el resto de la app (arranque, avisos de
//   actualizacion, promos, canal nativo AndroidBridge) siga funcionando igual.
// - Nunca muestra toast, nunca cuenta, nunca bloquea. Todas las cualidades
//   logradas hasta ahora quedan intactas; solo se retira la restriccion.
// - Se conserva la lectura del canal nativo (AndroidBridge.verificarUltimate)
//   por compatibilidad, pero su resultado NUNCA se usa para bloquear.
// - Enlace con el canal nativo AndroidBridge sigue disponible (escribir la
//   marca para no romper la expectativa del host), mas la API siempre responde
//   "bloqueada:false" y diasRestantes:0/diaActual:1/Dias:DIAS (solo informativo).
// ============================================================================
(function () {
    var DIAS = 7;              // se conserva solo como referencia informativa
    var MS_DIA = 86400000;
    var TOLERANCIA = 5 * 60000;
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

    // ---------------- Canal nativo (solo lectura informativa) ----------------
    function estadoNativo() {
        try {
            if (window.AndroidBridge && typeof AndroidBridge.verificarUltimate === 'function') {
                var n = JSON.parse(AndroidBridge.verificarUltimate());
                if (n && typeof n.fechaInicio === 'number' && n.fechaInicio > 0) return n;
            }
        } catch (e) {}
        return null;
    }

    // ---------------- Estado (SIEMPRE libres) ----------------
    // API identica a la version con candado, pero nunca bloquea.
    function calcular() {
        return {
            bloqueada: false,
            tamper: false,
            diaActual: 1,
            diasRestantes: 0,
            fechaInicio: ahora(),
            diasTotales: DIAS,
            liberada: true   // marca extra: esta build esta SIN candado
        };
    }

    function estadoActual() {
        return window.__jamt_estado || calcular();
    }

    function verificar() {
        return new Promise(function (resolver) {
            var est = calcular();
            window.__jamt_estado = est;
            resolver(est);
        });
    }

    function iniciar() {
        // Sin candado: no hay UI, no hay conteo, no hay bloqueo.
        // Escribimos una marca de inicio local (no restrictiva) por si algun
        // canal del host solo espera ver la KEY presente, sin forzar nada.
        try {
            var m = { v: 1, f: ahora(), l: ahora(), u: uid() };
            localStorage.setItem(KEY, codificar(m));
        } catch (e) {}
        window.__jamt_estado = calcular();
    }

    // ---------------- API publica (identica) ----------------
    window.JAMUltimateTrial = {
        DIAS: DIAS,
        iniciar: iniciar,
        verificar: verificar,
        estado: estadoActual,
        bloquearInmediato: function () { return false; }   // nunca bloquea
    };

    // Estado global no bloqueado por si update-notify/app.js lo consultan.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();
