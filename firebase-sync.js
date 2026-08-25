// ============================================================================
// firebase-sync.js — Sincronización JAM POS vía Firebase Realtime Database
//
// Plan gratuito (Spark):
//   - 1 GB almacenamiento
//   - 10 GB/mes transferencia
//   - 50K lecturas/día, 20K escrituras/días
//
// Configuración:
//   1. Crear proyecto en https://console.firebase.google.com
//   2. Habilitar Realtime Database (región: us-central1 o la más cercana)
//   3. Reglas de BD: { "rules": { ".read": true, ".write": true } }
//   4. Copiar config del proyecto → pegar en window.FIREBASE_CONFIG abajo
//   5. Listo: la app sincroniza automáticamente
// ============================================================================
(function() {
    'use strict';

    // ==================== CONFIGURACIÓN ====================
    // Pegar aquí la config de tu proyecto Firebase:
    window.FIREBASE_CONFIG = {
        apiKey: "",
        authDomain: "",
        databaseURL: "",
        projectId: "",
        storageBucket: "",
        messagingSenderId: "",
        appId: ""
    };

    const DB_ROOT = 'jampos';
    const SYNC_INTERVAL = 30000; // 30 segundos
    const DEVICE_ID_KEY = 'jampos_device_id';
    const DEVICE_NAME_KEY = 'jampos_sync_name';

    let _db = null;
    let _ref = null;
    let _listeners = [];
    let _syncing = false;
    let _intervalId = null;
    let _connected = false;
    let _deviceId = null;
    let _deviceName = null;
    let _lastSync = 0;

    // ==================== INICIALIZACIÓN ====================
    function getDeviceId() {
        if (_deviceId) return _deviceId;
        _deviceId = localStorage.getItem(DEVICE_ID_KEY);
        if (!_deviceId) {
            _deviceId = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
            localStorage.setItem(DEVICE_ID_KEY, _deviceId);
        }
        return _deviceId;
    }

    function getDeviceName() {
        if (_deviceName) return _deviceName;
        _deviceName = localStorage.getItem(DEVICE_NAME_KEY) || ('Dispositivo ' + getDeviceId().slice(-4));
        return _deviceName;
    }

    function setDeviceName(name) {
        _deviceName = name;
        localStorage.setItem(DEVICE_NAME_KEY, name);
    }

    function isFirebaseReady() {
        const c = window.FIREBASE_CONFIG;
        return c && c.apiKey && c.databaseURL;
    }

    function isFirebaseAvailable() {
        return _connected && _db && _ref;
    }

    // ==================== CARGA DINÁMICA DE SDK ====================
    function loadFirebaseSDK() {
        return new Promise((resolve, reject) => {
            if (window.firebase && window.firebase.database) {
                resolve();
                return;
            }
            const scripts = [
                'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
                'https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js'
            ];
            let loaded = 0;
            scripts.forEach(src => {
                const s = document.createElement('script');
                s.src = src;
                s.onload = () => { loaded++; if (loaded === scripts.length) resolve(); };
                s.onerror = () => reject(new Error('Error cargando Firebase SDK: ' + src));
                document.head.appendChild(s);
            });
        });
    }

    async function initFirebase() {
        if (!isFirebaseReady()) {
            console.log('[FIREBASE] Config no encontrada. Sync deshabilitado.');
            return false;
        }
        try {
            await loadFirebaseSDK();
            if (!window.firebase.apps.length) {
                window.firebase.initializeApp(window.FIREBASE_CONFIG);
            }
            _db = window.firebase.database();
            _ref = _db.ref(DB_ROOT);

            // Listener de conexión
            _db.ref('.info/connected').on('value', snap => {
                _connected = snap.val() === true;
                console.log('[FIREBASE] Conectado:', _connected);
                actualizarUISync();
            });

            // Escuchar cambios remotos en tiempo real
            DATA_STORES.forEach(store => {
                _ref.child(store).on('value', snap => {
                    if (_syncing) return; // Ignorar si estamos escribiendo
                    const data = snap.val();
                    if (!data) return;
                    const items = Object.values(data);
                    // Solo actualizar si hay datos y son diferentes
                    if (items.length > 0 && JSON.stringify(items) !== JSON.stringify(D[store] || [])) {
                        D[store] = items;
                        console.log('[FIRESYNC] Remoto → ' + store + ': ' + items.length + ' registros');
                        if (typeof datosSucios !== 'undefined') datosSucios = true;
                        // Refrescar UI si el módulo está visible
                        try { refrescarModulo(store); } catch(e) {}
                    }
                });
            });

            console.log('[FIREBASE] Inicializado OK. Device:', getDeviceId());
            return true;
        } catch (e) {
            console.warn('[FIREBASE] Error al inicializar:', e);
            return false;
        }
    }

    // ==================== SUBIDA DE DATOS ====================
    async function syncUp(store) {
        if (!isFirebaseAvailable()) return;
        if (!D[store] || D[store].length === 0) return;
        try {
            const dataMap = {};
            D[store].forEach(item => {
                if (item && item.id) dataMap[item.id] = item;
            });
            _syncing = true;
            await _ref.child(store).set(dataMap);
            _syncing = false;
        } catch (e) {
            _syncing = false;
            console.warn('[FIREBASE] Error subida ' + store + ':', e);
        }
    }

    async function syncDown(store) {
        if (!isFirebaseAvailable()) return;
        try {
            const snap = await _ref.child(store).once('value');
            const data = snap.val();
            if (!data) return;
            const items = Object.values(data);
            if (items.length > (D[store] || []).length) {
                D[store] = items;
                // Guardar en IDB local
                if (typeof saveToIDB === 'function') {
                    try { await saveToIDB(store, items); } catch(e) {}
                }
                console.log('[FIRESYNC] Remoto → local ' + store + ': ' + items.length + ' registros');
            }
        } catch (e) {
            console.warn('[FIREBASE] Error descarga ' + store + ':', e);
        }
    }

    // ==================== SYNC COMPLETA ====================
    async function syncAll() {
        if (!isFirebaseAvailable() || _syncing) return;
        _syncing = true;
        try {
            for (const store of DATA_STORES) {
                await syncUp(store);
            }
            _lastSync = Date.now();
            localStorage.setItem('jampos_last_sync', _lastSync.toString());
            console.log('[FIREBASE] Sync completa:', new Date().toLocaleTimeString());
        } catch (e) {
            console.warn('[FIREBASE] Error en syncAll:', e);
        }
        _syncing = false;
        actualizarUISync();
    }

    async function syncBidirectional() {
        if (!isFirebaseAvailable() || _syncing) return;
        _syncing = true;
        try {
            for (const store of DATA_STORES) {
                // Primero subir locales
                await syncUp(store);
                // Luego descargar remotos
                await syncDown(store);
            }
            _lastSync = Date.now();
            localStorage.setItem('jampos_last_sync', _lastSync.toString());
            console.log('[FIREBASE] Sync bidireccional completa:', new Date().toLocaleTimeString());
        } catch (e) {
            console.warn('[FIREBASE] Error en syncBidirectional:', e);
        }
        _syncing = false;
        actualizarUISync();
    }

    // ==================== AUTO-SYNC ====================
    function startAutoSync() {
        stopAutoSync();
        _intervalId = setInterval(syncBidirectional, SYNC_INTERVAL);
        console.log('[FIREBASE] Auto-sync cada ' + (SYNC_INTERVAL / 1000) + 's');
    }

    function stopAutoSync() {
        if (_intervalId) { clearInterval(_intervalId); _intervalId = null; }
    }

    // ==================== UI ====================
    function actualizarUISync() {
        // Actualizar indicadores en la UI si existen
        const indicators = document.querySelectorAll('.fire-status');
        indicators.forEach(el => {
            el.textContent = _connected ? '🟢 Conectado' : '🔴 Desconectado';
            el.style.color = _connected ? '#10b981' : '#ef4444';
        });
        const lastSyncEl = document.querySelectorAll('.fire-last-sync');
        lastSyncEl.forEach(el => {
            el.textContent = _lastSync ? 'Última sync: ' + new Date(_lastSync).toLocaleTimeString() : 'Sin sincronizar';
        });
    }

    function refrescarModulo(store) {
        // Intentar refrescar el módulo actual si es el que cambió
        try {
            const mod = document.querySelector('.module-content');
            if (mod && typeof renderModulo === 'function') {
                // No recargar si el usuario está editando
            }
        } catch(e) {}
    }

    // ==================== API PÚBLICA ====================
    window.JAMFirebase = {
        init: initFirebase,
        sync: syncBidirectional,
        syncUp: syncUp,
        syncDown: syncDown,
        startAutoSync: startAutoSync,
        stopAutoSync: stopAutoSync,
        isConnected: () => _connected,
        isAvailable: isFirebaseAvailable,
        isConfigured: isFirebaseReady,
        getDeviceId: getDeviceId,
        getDeviceName: getDeviceName,
        setDeviceName: setDeviceName,
        getLastSync: () => _lastSync,
        updateConfig: (config) => { window.FIREBASE_CONFIG = { ...window.FIREBASE_CONFIG, ...config }; }
    };

})();
