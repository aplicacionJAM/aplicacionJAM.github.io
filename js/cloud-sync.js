var CLOUD_ENABLED = false;
var FIREBASE_CONFIG = { apiKey:"", authDomain:"", projectId:"", storageBucket:"", messagingSenderId:"", appId:"" };
var colaSync = [];
function cargarCola(){ try{ let d = localStorage.getItem('jam_sync_queue'); if(d) colaSync = JSON.parse(d); }catch(e){} }
function guardarCola(){ localStorage.setItem('jam_sync_queue', JSON.stringify(colaSync)); }
window.encolarSync = (store,accion,data) => {
    if(!CLOUD_ENABLED) return;
    colaSync.push({store,accion,data,timestamp:Date.now()});
    guardarCola();
    if(colaSync.length >= 5) procesarColaSync();
};
window.procesarColaSync = async () => {
    if(!CLOUD_ENABLED || colaSync.length === 0) return;
    try { guardarCola(); } catch(e){ console.error('Sync error:',e); }
};
cargarCola();
