const fs = require('fs');

const store = new Map();
const sesion = new Map();

global.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k)
};
global.sessionStorage = {
  getItem: (k) => (sesion.has(k) ? sesion.get(k) : null),
  setItem: (k, v) => sesion.set(k, String(v)),
  clear: () => sesion.clear()
};
global.indexedDB = undefined; // sin IDB en el harness
global.caches = undefined;    // sin CacheStorage
global.document = {
  readyState: 'loading',
  addEventListener() {},
  head: { appendChild() {} },
  createElement() { return { classList: { add() {}, remove() {} }, appendChild() {}, remove() {}, style: {} }; },
  body: { appendChild() {} },
  querySelector() { return null; }
};
global.window = global;

const src = fs.readFileSync('trial.js', 'utf8');
eval(src);

const MS_DIA = 86400000;
let fake = 1700000000000;
Date.now = () => fake;

function hasta(fn) { return new Promise((res) => { const t = setInterval(() => { if (fn()) { clearInterval(t); res(); } }, 5); }); }

(async () => {
  const TOTAL = 7;
  const resultados = [];
  const correr = async (nombre) => {
    const est = await window.JAMUltimateTrial.verificar();
    resultados.push(`${nombre}: dia=${est.diaActual}/${est.diasTotales} restantes=${est.diasRestantes} bloqueada=${est.bloqueada}`);
    return est;
  };

  // 1. primer arranque
  await correr('arranque-1');
  // 2. mismo dia
  await correr('mismo-dia');

  // 3. dia 3 (2 dias despues)
  fake += 2 * MS_DIA;
  await correr('dia-3');

  // 4. dia 6
  fake += 3 * MS_DIA;
  await correr('dia-6');

  // 5. ultimo dia (dia 7, restante 1)
  fake += 1 * MS_DIA;
  await correr('dia-7');

  // 6. expira (dia 8)
  fake += 1 * MS_DIA;
  let estExp = await correr('expirado');

  // 7. "desinstalar": borrar canales locales = SEGUNDA instalacion
  //    PERO la marca vieja sigue en un canal (simular cache/otra marca vieja persistida)
  //    Simulamos reinstall limpio + marca externa vieja -> debe seguir bloqueado.
  const marcasAntes = Array.from(store.keys());
  store.clear();
  // recuperar candidata externa: reinyectar la marca que existia con fecha original
  // (en el APK real eso lo aporta /sdcard + MediaStore; aqui lo simulamos):
  const Mk = btoa(unescape(encodeURIComponent(JSON.stringify({ v: 1, f: 1700000000000, l: fake, u: 'u_x' }))));
  sessionStorage.clear();
  // primero arrancar SIN marca -> dia 1 (reinstall ingenuo que no tiene canal externo)
  let estSin = await correr('reinstall-sin-canal-externo');
  // ahora reinstall con canal externo viejo
  sessionStorage.clear();
  store.clear();
  store.set('jamt_ultimate', Mk);
  let estCon = await correr('reinstall-con-canal-externo');

  // 8. retroceso de reloj (manipulacion)
  await correr('pre-reloj');
  fake -= 3 * MS_DIA;
  let estReloj = await correr('reloj-atras');

  console.log(resultados.join('\n'));
  console.log('---');
  console.log('reinstall sin canal externo bloqueada?', estSin.bloqueada, '(esperado false: es instalacion limpia real)');
  console.log('reinstall con canal externo viejo bloqueada?', estCon.bloqueada, '(esperado TRUE: la marca antigua triunfa)');
  console.log('reloj hacia atras bloqueado (tamper)?', estReloj.bloqueada, 'tamper=', estReloj.tamper, '(esperado TRUE)');

  const ok =
    resultados[0].includes('dia=1/7') &&
    resultados[3].includes('dia=6/7') &&
    resultados[4].includes('dia=7/7') &&
    resultados[5].includes('bloqueada=true') &&
    estCon.bloqueada === true &&
    estReloj.bloqueada === true;
  console.log('\nRESULTADO:', ok ? 'TODO OK' : 'FALLAS DETECTADAS');
  process.exit(ok ? 0 : 1);
})();