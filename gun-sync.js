// ============================================================================
// gun-sync.js — Sincronización JAM POS vía Gun.js (P2P descentralizado)
//
// Zero-config: sin servidor, sin cuenta, sin configuración.
// Usa relés públicos gratuitos para el peering inicial.
// Los dispositivos se sincronizan entre sí directamente.
//
// Datos: cada registro se almacena individualmente en Gun
//   jampos/{store}/{id} = item
//   jampos/meta/{deviceId} = { nombre, lastUpdate }
//
// Resolución conflictos: "última escritura gana" (LWW) por timestamp.
// ============================================================================
(function() {
    'use strict';

    const GUN_RELAYS = [
        'https://peers.gunjs.co/gun',
        'https://gun-manhattan.herokuapp.com/gun'
    ];
    const DB_PREFIX = 'jampos';
    const DEVICE_ID_KEY = 'jampos_device_id';
    const DEVICE_NAME_KEY = 'jampos_sync_name';

    let _gun = null;
    let _root = null;
    let _deviceId = null;
    let _deviceName = null;
    let _connected = false;
    let _syncing = false;
    let _lastSync = 0;
    let _listeners = [];
    let _initialized = false;

    // ==================== DEVICE ID ====================
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
        if (_root) {
            _root.get(DB_PREFIX).get('meta').get(getDeviceId()).put({
                nombre: name,
                lastUpdate: Date.now()
            });
        }
    }

    // ==================== CARGA DINÁMICA DE GUN ====================
    function loadGunSDK() {
        return new Promise((resolve, reject) => {
            if (window.Gun) { resolve(); return; }
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/gun/gun.js';
            s.onload = () => {
                // Cargar también SEA (autenticación) y localStorage adapter
                const s2 = document.createElement('script');
                s2.src = 'https://cdn.jsdelivr.net/npm/gun/lib/radix.js';
                s2.onload = () => resolve();
                s2.onerror = () => resolve(); // radix es opcional
                document.head.appendChild(s2);
            };
            s.onerror = () => reject(new Error('Error cargando Gun.js'));
            document.head.appendChild(s);
        });
    }

    // ==================== INICIALIZACIÓN ====================
    async function initGun() {
        if (_initialized && _gun) return true;
        try {
            await loadGunSDK();
            _gun = Gun({
                peers: GUN_RELAYS,
                localStorage: false,
                radisk: false
            });
            _root = _gun;
            _initialized = true;

            // Monitorear conexión
            _gun.on('hi', () => { _connected = true; actualizarUISync(); });
            _gun.on('bye', () => { _connected = false; actualizarUISync(); });

            // Registrar dispositivo
            _root.get(DB_PREFIX).get('meta').get(getDeviceId()).put({
                nombre: getDeviceName(),
                lastUpdate: Date.now(),
                version: '0.1.3'
            });

            console.log('[GUN] Inicializado. Device:', getDeviceId());
            return true;
        } catch (e) {
            console.warn('[GUN] Error al inicializar:', e);
            return false;
        }
    }

    // ==================== SUBIDA DE DATOS ====================
    async function syncUp(store) {
        if (!_root || !D[store]) return;
        const items = D[store];
        if (!items || items.length === 0) return;
        try {
            const now = Date.now();
            items.forEach(item => {
                if (!item || !item.id) return;
                _root.get(DB_PREFIX).get(store).get(item.id).put({
                    data: JSON.stringify(item),
                    ts: now,
                    deviceId: getDeviceId()
                });
            });
            _root.get(DB_PREFIX).get('meta').get(getDeviceId()).put({
                nombre: getDeviceName(),
                lastUpdate: now
            });
        } catch (e) {
            console.warn('[GUN] Error subida ' + store + ':', e);
        }
    }

    // ==================== DESCARGA DE DATOS ====================
    function syncDown(store) {
        if (!_root) return;
        return new Promise((resolve) => {
            const items = [];
            let loaded = false;
            _root.get(DB_PREFIX).get(store).map().once((val, id) => {
                if (!val || !val.data) return;
                try {
                    const item = JSON.parse(val.data);
                    if (item && item.id) items.push(item);
                } catch(e) {}
            });
            // Gun.js no tiene "fin" real, usamos timeout
            setTimeout(() => {
                if (items.length > 0) {
                    // Merge: agregar nuevos que no existen localmente
                    const existentes = new Set((D[store] || []).map(x => x.id));
                    let nuevos = 0;
                    items.forEach(item => {
                        if (!existentes.has(item.id)) {
                            D[store] = D[store] || [];
                            D[store].push(item);
                            nuevos++;
                        } else {
                            // Actualizar si el remoto es más reciente
                            const idx = D[store].findIndex(x => x.id === item.id);
                            if (idx !== -1 && item.updatedAt && D[store][idx].updatedAt && item.updatedAt > D[store][idx].updatedAt) {
                                D[store][idx] = item;
                                nuevos++;
                            }
                        }
                    });
                    if (nuevos > 0) {
                        console.log('[GUN] Remoto → ' + store + ': ' + nuevos + ' actualizados');
                        if (typeof saveToIDB === 'function') {
                            saveToIDB(store, D[store]).catch(() => {});
                        }
                    }
                }
                resolve(items.length);
            }, 2000);
        });
    }

    // ==================== SYNC COMPLETA ====================
    async function syncAll() {
        if (!_initialized || _syncing) return;
        _syncing = true;
        try {
            for (const store of DATA_STORES) {
                await syncUp(store);
            }
            _lastSync = Date.now();
            localStorage.setItem('jampos_last_sync', _lastSync.toString());
            console.log('[GUN] Sync subida completa:', new Date().toLocaleTimeString());

            // Descargar después de subir
            for (const store of DATA_STORES) {
                await syncDown(store);
            }
            _lastSync = Date.now();
            localStorage.setItem('jampos_last_sync', _lastSync.toString());
            console.log('[GUN] Sync completa:', new Date().toLocaleTimeString());
        } catch (e) {
            console.warn('[GUN] Error en syncAll:', e);
        }
        _syncing = false;
        actualizarUISync();
    }

    // ==================== ESCUCHA EN TIEMPO REAL ====================
    function startListening() {
        if (!_root) return;
        DATA_STORES.forEach(store => {
            _root.get(DB_PREFIX).get(store).map().on((val, id) => {
                if (_syncing || !val || !val.data) return;
                try {
                    const item = JSON.parse(val.data);
                    if (!item || !item.id) return;
                    // Ignorar si es nuestro propio dato
                    if (val.deviceId === getDeviceId()) return;
                    D[store] = D[store] || [];
                    const idx = D[store].findIndex(x => x.id === item.id);
                    if (idx === -1) {
                        D[store].push(item);
                        console.log('[GUN] Remoto (tiempo real) → ' + store + ': nuevo ' + item.id);
                        if (typeof saveToIDB === 'function') {
                            saveToIDB(store, D[store]).catch(() => {});
                        }
                    } else if (item.updatedAt && D[store][idx].updatedAt && item.updatedAt > D[store][idx].updatedAt) {
                        D[store][idx] = item;
                        console.log('[GUN] Remoto (tiempo real) → ' + store + ': actualizado ' + item.id);
                        if (typeof saveToIDB === 'function') {
                            saveToIDB(store, D[store]).catch(() => {});
                        }
                    }
                } catch(e) {}
            });
        });
        console.log('[GUN] Escuchando cambios en tiempo real');
    }

    // ==================== AUTO-SYNC ====================
    let _autoSyncInterval = null;

    function startAutoSync() {
        stopAutoSync();
        _autoSyncInterval = setInterval(syncAll, 30000);
        startListening();
        console.log('[GUN] Auto-sync cada 30s + tiempo real');
    }

    function stopAutoSync() {
        if (_autoSyncInterval) { clearInterval(_autoSyncInterval); _autoSyncInterval = null; }
    }

    // ==================== UI ====================
    function actualizarUISync() {
        const indicators = document.querySelectorAll('.gun-status');
        indicators.forEach(el => {
            el.textContent = _connected ? '🟢 Conectado' : '🔴 Desconectado';
            el.style.color = _connected ? '#10b981' : '#ef4444';
        });
        const lastSyncEl = document.querySelectorAll('.gun-last-sync');
        lastSyncEl.forEach(el => {
            el.textContent = _lastSync ? 'Última sync: ' + new Date(_lastSync).toLocaleTimeString() : 'Sin sincronizar';
        });
    }

    // ==================== API PÚBLICA ====================
    window.JAMSync2 = {
        init: initGun,
        sync: syncAll,
        syncUp: syncUp,
        syncDown: syncDown,
        startAutoSync: startAutoSync,
        stopAutoSync: stopAutoSync,
        startListening: startListening,
        isConnected: () => _connected,
        isAvailable: () => _initialized && _gun,
        getDeviceId: getDeviceId,
        getDeviceName: getDeviceName,
        setDeviceName: setDeviceName,
        getLastSync: () => _lastSync
    };

})();
