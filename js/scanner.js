window.abrirEscanerCamara = (inputId, callback) => {
    let modal = document.createElement('div'); modal.className = 'modal-form';
    modal.innerHTML = `<div class="modal-form-content" style="max-width:500px"><h3 class="text-xl font-bold mb-3">📷 Escanear código de barras</h3><div id="scannerContainer" style="width:100%;border-radius:12px;overflow:hidden;background:#000;max-height:300px"></div><div id="scannerResult" class="text-center mt-2 text-sm font-bold" style="color:var(--accent,#3b82f6)">Esperando código...</div><div class="flex gap-3 mt-3"><button id="btnStopScan" class="btn-redondeado flex-1 py-2 bg-gray-200">Cancelar</button></div></div>`;
    document.body.appendChild(modal);
    function limpiarYCerrar() { if(escaneo) clearInterval(escaneo); if(window.Quagga && typeof Quagga.stop === 'function') try { Quagga.stop(); } catch(e){} if(stream) stream.getTracks().forEach(t => t.stop()); modal.remove(); }
    let escaneo = null, stream = null;
    if('BarcodeDetector' in window) {
        let video = document.createElement('video');
        video.id = 'scannerVideo'; video.autoplay = true; video.playsInline = true;
        video.style.cssText = 'width:100%;border-radius:12px;background:#000;max-height:300px';
        document.getElementById('scannerContainer').appendChild(video);
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(s => {
            stream = s; video.srcObject = s;
            const detector = new BarcodeDetector({ formats: ['ean_13','ean_8','code_128','code_39','qr_code','upc_a','upc_e','codabar','itf','data_matrix','pdf417'] });
            escaneo = setInterval(async () => {
                try {
                    let codigos = await detector.detect(video);
                    if(codigos.length > 0){
                        clearInterval(escaneo); escaneo = null;
                        stream.getTracks().forEach(t => t.stop()); stream = null;
                        modal.remove();
                        let inp = document.getElementById(inputId); if(inp) inp.value = codigos[0].rawValue;
                        if(callback) callback(codigos[0].rawValue);
                    }
                } catch(e) {}
            }, 500);
        }).catch(() => { mostrarNotificacion('📷 No se pudo acceder a la cámara', 'error'); modal.remove(); });
    } else if(window.Quagga) {
        Quagga.init({
            inputStream: { name: 'Live', type: 'LiveStream', target: document.querySelector('#scannerContainer'),
                constraints: { width: 640, height: 480, facingMode: 'environment' } },
            decoder: { readers: ['ean_reader','ean_8_reader','code_128_reader','code_39_reader','upc_reader','upc_e_reader','codabar_reader','i2of5_reader','pdf417_reader'] }
        }, err => {
            if(err) { mostrarNotificacion('📷 Error al iniciar escáner: ' + (err.message||err), 'error'); modal.remove(); return; }
            Quagga.start();
            Quagga.onDetected(data => {
                let cod = data.codeResult.code;
                Quagga.offDetected();
                try { Quagga.stop(); } catch(e) {}
                modal.remove();
                let inp = document.getElementById(inputId); if(inp) inp.value = cod;
                if(callback) callback(cod);
            });
        });
    } else {
        mostrarNotificacion('📷 Escáner por cámara no disponible. Instale Quagga o use Chrome/Edge.', 'error');
        modal.remove(); return;
    }
    document.getElementById('btnStopScan').onclick = limpiarYCerrar;
    modal.onclick = e => { if(e.target === modal) limpiarYCerrar(); };
};
