(function () {
  "use strict";

  // ==================== SISTEMA DE PROMOCIONES (carpeta Promocion) ====================
  // Cola numerada (1.txt, 2.jpg, 3.png ...) que publica una notificacion cada 30 min.
  // .txt  -> el contenido del archivo es el texto del cuadro de la notificacion.
  // imagen-> la imagen se muestra como notificacion (PNG/JPG/GIF/WEBP con transparencia).
  // Carpeta vacia o irremisiblemente ausente -> silencio total (no invasivo).
  // Por ahora SOLO activo en web/PWA; el codigo queda listo para activar en nativas.

  if (window.jamPromoNotificado) return;
  window.jamPromoNotificado = true;

  var INTERVALO = 30 * 60 * 1000;          // cada 30 minutos
  var PRIMERA = 15 * 1000;                 // primer disparo rapido al abrir
  var CLAVE = "jampos_promocion_cola";     // localStorage (indice de la cola)
  var BASE = "./Promocion/";

  function esPlataforma(plataforma) {
    if (window.plataformaApp) return window.plataformaApp === plataforma;
    var ua = navigator.userAgent.toLowerCase();
    if (ua.indexOf("wv") !== -1 || ua.indexOf("android") !== -1) return plataforma === "apk";
    if (ua.indexOf("electron") !== -1 || ua.indexOf("jam pos") !== -1) return plataforma === "exe";
    if (ua.indexOf("linux") !== -1) return plataforma === "deb";
    return plataforma === "web";
  }

  function detectarPlataforma() {
    if (window.plataformaApp) return window.plataformaApp;
    var ua = navigator.userAgent.toLowerCase();
    if (ua.indexOf("wv") !== -1 || ua.indexOf("android") !== -1) return "apk";
    if (ua.indexOf("electron") !== -1 || ua.indexOf("jam pos") !== -1) return "exe";
    if (ua.indexOf("linux") !== -1) return "deb";
    return "web";
  }

  var EXTENSIONS = { "txt": 1, "png": 1, "jpg": 1, "jpeg": 1, "gif": 1, "webp": 1 };

  // Lista de archivos de la carpeta Promocion. En github.io se obtiene la
  // carpeta real con la API de GitHub; si falla (local, offline, otro host)
  // cae al manifest estatico indice.json que trae el mismo listado.
  function leerLista() {
    var hs = location.hostname || "";
    if (hs.indexOf(".github.io") !== -1) {
      var repo = hs.replace(".github.io", "");
      return fetch("https://api.github.com/repos/" + repo + "/" + repo + ".github.io/contents/Promocion")
        .then(function (r) {
          if (!r.ok) throw new Error("api");
          return r.json();
        })
        .then(function (arr) {
          if (!Array.isArray(arr)) throw new Error("no-array");
          return arr.map(function (x) { return x.name; });
        })
        .catch(function () {
          return fetch(BASE + "indice.json").then(function (r) {
            if (!r.ok) throw new Error("indice");
            return r.json();
          }).then(function (nombres) {
            return Array.isArray(nombres) ? nombres : [];
          });
        });
    }
    return fetch(BASE + "indice.json").then(function (r) {
      if (!r.ok) throw new Error("indice");
      return r.json();
    }).then(function (nombres) {
      return Array.isArray(nombres) ? nombres : [];
    });
  }

  function numeroPrefijo(nombre) {
    var m = nombre.match(/^(\d+)/);
    return m ? parseInt(m[1], 10) : Infinity;
  }

  function normalizar(lista) {
    return lista.filter(function (n) {
      var ext = (n.split(".").pop() || "").toLowerCase();
      return EXTENSIONS[ext] === 1;
    }).sort(function (a, b) {
      return numeroPrefijo(a) - numeroPrefijo(b) || (a < b ? -1 : a > b ? 1 : 0);
    });
  }

  function estado() {
    try {
      var raw = localStorage.getItem(CLAVE);
      var obj = raw ? JSON.parse(raw) : {};
      return { nombre: obj.nombre || "", repeticiones: obj.repeticiones || 0 };
    } catch (e) { return { nombre: "", repeticiones: 0 }; }
  }

  function guardarEstado(e) {
    try { localStorage.setItem(CLAVE, JSON.stringify(e)); } catch (err) {}
  }

  function notificar(titulo, cuerpo, tag, image) {
    if (window.mostrarNotificacionNativa) {
      window.mostrarNotificacionNativa(titulo, cuerpo, tag || "jampos-promo", image ? { image: image } : undefined);
    }
  }

  function publicar(lista) {
    if (lista.length === 0) {
      guardarEstado({ nombre: "", repeticiones: 0 });
      return;
    }
    var e = estado();
    var idx = 0;
    if (e.nombre) {
      var encontrado = -1;
      for (var i = 0; i < lista.length; i++) if (lista[i] === e.nombre) { encontrado = i; break; }
      idx = encontrado === -1 ? 0 : (encontrado + 1) % lista.length;
    }
    var actual = lista[idx];
    var esTxt = (actual.split(".").pop() || "").toLowerCase() === "txt";
    var tag = "jampos-promo-" + actual;
    if (esTxt) {
      fetch(BASE + actual, { cache: "no-store" }).then(function (r) { return r.ok ? r.text() : null; }).then(function (texto) {
        if (texto === null) return;
        var cuerpo = texto.trim();
        notificar("📢 Promoción", cuerpo, tag);
      }).catch(function () {});
    } else {
      notificar("📢 Promoción", actual, tag, BASE + actual);
    }
    guardarEstado({ nombre: actual, repeticiones: e.repeticiones + 1 });
  }

  function tick() {
    if (detectarPlataforma() !== "web") return; // activo SOLO en web/PWA por ahora
    leerLista().then(normalizar).then(publicar).catch(function () {
      guardarEstado({ nombre: "", repeticiones: 0 });
    });
  }

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) tick();
  });

  setTimeout(tick, PRIMERA);
  setInterval(tick, INTERVALO);

})();