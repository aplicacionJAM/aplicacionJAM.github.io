function abrirBaseDatos(){
    return new Promise((resolve,reject)=>{
        const req = indexedDB.open('jampos_db',1);
        req.onupgradeneeded = e => { const db = e.target.result; window.DATA_STORES.forEach(s => { if(!db.objectStoreNames.contains(s)) db.createObjectStore(s); }); };
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
    });
}
window.saveToIDB = async (store,data) => {
    const db = await abrirBaseDatos();
    return new Promise((resolve,reject)=>{
        const tx = db.transaction(store,'readwrite');
        const obj = tx.objectStore(store);
        obj.clear();
        data.forEach(item => obj.add(item, item.id));
        tx.oncomplete = ()=>{ db.close(); resolve(); };
        tx.onerror = e =>{ db.close(); reject(e.target.error); };
    });
};
window.loadFromIDB = async (store) => {
    const db = await abrirBaseDatos();
    return new Promise((resolve,reject)=>{
        const tx = db.transaction(store,'readonly');
        const obj = tx.objectStore(store);
        const req = obj.getAll();
        req.onsuccess = ()=>{ db.close(); resolve(req.result||[]); };
        req.onerror = e =>{ db.close(); reject(e.target.error); };
    });
};
