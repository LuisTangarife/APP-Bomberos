window.uploadedPhotos = [];
// ── SERVICE WORKER REGISTRATION ──────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// ── CONNECTIVITY STATUS ───────────────────────────────────────────────────
function updateConnectivity() {
  const offline = document.getElementById('offlineBadge');
  const online  = document.getElementById('onlineBadge');
  if (navigator.onLine) {
    offline.style.display = 'none';
    online.style.display  = 'inline-block';
  } else {
    offline.style.display = 'inline-block';
    online.style.display  = 'none';
  }
}
window.addEventListener('online',  updateConnectivity);
window.addEventListener('offline', updateConnectivity);
updateConnectivity();

// ── INDEXEDDB SETUP ───────────────────────────────────────────────────────
let db;
const DB_NAME = 'BomberosDB', DB_VERSION = 1, STORE = 'reportes';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = e => { db = e.target.result; resolve(db); };
    req.onerror   = e => reject(e.target.error);
  });
}

function saveToIDB(data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add(data).onsuccess = e => resolve(e.target.result);
    tx.onerror = e => reject(e.target.error);
  });
}

function getAllFromIDB() {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).getAll();
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

function deleteFromIDB(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id).onsuccess = () => resolve();
    tx.onerror = e => reject(e.target.error);
  });
}

// ── INIT ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await openDB();
  setDefaults();
  setupSpellCheck();
  loadSavedReports();
  window.uploadedPhotos = [];

  const photoInput = document.getElementById('photoInput');
  const photoPreview = document.getElementById('photoPreview');

  if (!photoInput || !photoPreview) {
    console.error('No se encontró photoInput o photoPreview');
    return;
  }

  photoInput.addEventListener('change', function(event) {

    const files = Array.from(event.target.files);

    window.uploadedPhotos = [];
    photoPreview.innerHTML = '';

    files.forEach((file, index) => {

      // Validar imagen
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();

      reader.onload = function(e) {

        const base64 = e.target.result;

        console.log('Imagen cargada:', base64);

        // Guardar en memoria
        window.uploadedPhotos.push(base64);

        // Crear preview
        const card = document.createElement('div');
        card.className = 'preview-card';

        const img = document.createElement('img');
        img.src = base64;

        img.style.width = '100%';
        img.style.height = '160px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '10px';

        const number = document.createElement('div');
        number.className = 'preview-number';
        number.textContent = index + 1;

        card.appendChild(img);
        card.appendChild(number);

        photoPreview.appendChild(card);

      };

      reader.onerror = function(err) {
        console.error('Error leyendo imagen:', err);
      };

      reader.readAsDataURL(file);

    });

  });

});

function setDefaults() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  document.getElementById('fecha').value       = date;
  document.getElementById('horaReporte').value = time;
}

// ── SPELL CHECK ───────────────────────────────────────────────────────────
// Common Spanish misspellings dictionary (extended)
const CORRECTIONS = {
  // Accents
  'bombero': 'bombero', 'incendio': 'incendio', 'emergencia': 'emergencia',
  'vehiculo': 'vehículo', 'victima': 'víctima', 'victimas': 'víctimas',
  'area': 'área', 'arboles': 'árboles', 'arbol': 'árbol',
  'lesionado': 'lesionado', 'lesionados': 'lesionados',
  'policia': 'policía', 'agonia': 'agonía', 'aviso': 'aviso',
  'rapido': 'rápido', 'tipico': 'típico', 'electrico': 'eléctrico',
  'quimico': 'químico', 'tecnico': 'técnico', 'médico': 'médico',
  'medico': 'médico', 'oxigeno': 'oxígeno', 'oxígeno': 'oxígeno',
  'fábrica': 'fábrica', 'fabrica': 'fábrica',
  'edificio': 'edificio', 'escombros': 'escombros',
  'explosion': 'explosión', 'evacuacion': 'evacuación',
  'intervencion': 'intervención', 'atencion': 'atención',
  'inspeccion': 'inspección', 'operacion': 'operación',
  'extincion': 'extinción', 'prevencion': 'prevención',
  'combustion': 'combustión', 'rescate': 'rescate',
  'afectacion': 'afectación', 'dotacion': 'dotación',
  'situacion': 'situación', 'ubicacion': 'ubicación',
  'informacion': 'información', 'comunicacion': 'comunicación',
  'trafico': 'tráfico', 'transito': 'tránsito',
  // Common typos
  'incencio': 'incendio', 'inzendio': 'incendio',
  'resgate': 'rescate', 'rrescate': 'rescate',
  'bomberos': 'bomberos', 'bómberos': 'bomberos',
  'esplozion': 'explosión', 'explozion': 'explosión',
  'lesionados': 'lesionados', 'lesionadoz': 'lesionados',
  'conato': 'conato', 'cortocircuito': 'cortocircuito',
  'cortocircito': 'cortocircuito', 'estructural': 'estructural',
  'estrutural': 'estructural', 'forestal': 'forestal',
  'vehicular': 'vehicular', 'flamas': 'llamas', 'flama': 'llama',
  'sinistro': 'siniestro', 'siniestro': 'siniestro',
  'automoviil': 'automóvil', 'automobil': 'automóvil',
  'heridoz': 'heridos', 'heridos': 'heridos',
  'muertos': 'muertos', 'fallecidos': 'fallecidos',
  'perimetro': 'perímetro', 'parametro': 'parámetro',
  'terreno': 'terreno', 'apagado': 'apagado',
  'adentro': 'adentro', 'afuera': 'afuera',
  'personal': 'personal', 'dotacion': 'dotación',
  'municipio': 'municipio', 'vereda': 'vereda',
  'kilometros': 'kilómetros', 'metros': 'metros',
  'minutos': 'minutos', 'horas': 'horas',
};

// Spanish filler/connectors that are always valid
const COMMON_WORDS = new Set([
  'el','la','los','las','un','una','de','del','en','con','por','para','que',
  'se','a','y','o','al','le','su','sus','es','era','fue','son','han','hay',
  'no','si','pero','como','más','ya','así','todo','todos','toda','todas',
  'este','esta','estos','estas','ese','esa','esos','esas','cual','cuál',
  'donde','cuando','mientras','durante','según','sobre','bajo','ante','tras',
  'sin','entre','hasta','desde','hacia','contra','mediante','incluso',
  'también','además','aunque','porque','pues','siendo','estado','siendo',
  'fue','fué','han','haber','tener','hacer','poder','deber','querer',
  'llegar','salir','entrar','pasar','ir','venir','ver','dar','saber',
  'una','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve',
  'diez','hora','horas','minuto','minutos','segundo','segundos','día','días',
  'calle','carrera','avenida','barrio','sector','zona','norte','sur','este','oeste',
  'personas','persona','equipo','equipos','móvil',
]);

function checkSpelling(text) {
  const words = text.toLowerCase().match(/\b[a-záéíóúüñ]{3,}\b/gi) || [];
  const issues = [];
  words.forEach(word => {
    const lower = word.toLowerCase();
    if (COMMON_WORDS.has(lower)) return;
    if (CORRECTIONS[lower] && CORRECTIONS[lower] !== lower) {
      issues.push({ wrong: word, right: CORRECTIONS[lower] });
    }
  });
  return issues;
}

function setupSpellCheck() {
  const fields = [
    { input: 'lugar',       sugg: 'suggestions-lugar' },
    { input: 'direccion',   sugg: 'suggestions-direccion' },
    { input: 'descripcion', sugg: 'suggestions-descripcion' },
    { input: 'novedades',   sugg: 'suggestions-novedades' },
  ];
  fields.forEach(({ input, sugg }) => {
    const el = document.getElementById(input);
    const sg = document.getElementById(sugg);
    if (!el || !sg) return;
    let timer;
    el.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => runSpellCheck(el, sg), 700);
    });
  });
}

function runSpellCheck(el, sg) {
  const issues = checkSpelling(el.value);
  if (!issues.length) { sg.classList.remove('visible'); sg.innerHTML = ''; return; }
  
  sg.innerHTML = `<div class="sugg-label">✏️ Posibles correcciones — haga clic para aplicar:</div>`;
  issues.forEach(({ wrong, right }) => {
    sg.innerHTML += `
      <span class="spell-word">${wrong}</span>
      <span style="color:var(--muted);font-size:0.8rem"> → </span>
      <span class="spell-correct" onclick="applySuggestion('${el.id}','${wrong}','${right}')">${right}</span>
      <span style="font-size:0.75rem;color:var(--muted);margin-right:8px"> </span>
    `;
  });
  sg.classList.add('visible');
}

function applySuggestion(fieldId, wrong, right) {
  const el = document.getElementById(fieldId);
  const rx = new RegExp(wrong, 'gi');
  el.value = el.value.replace(rx, right);
  const sg = document.getElementById('suggestions-' + fieldId);
  runSpellCheck(el, sg);
}

// ── GEOLOCATION ───────────────────────────────────────────────────────────
function getLocation() {
  const btn  = document.getElementById('btnLocation');
  const stat = document.getElementById('locationStatus');
  if (!navigator.geolocation) {
    stat.textContent = '⚠️ Geolocalización no soportada en este dispositivo.';
    stat.className = 'location-status error';
    return;
  }
  btn.textContent = '⏳ Obteniendo ubicación...';
  btn.disabled = true;
  stat.textContent = '';
  stat.className = 'location-status';
  
  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);
      document.getElementById('latitud').value  = lat;
      document.getElementById('longitud').value = lng;
      btn.textContent = '📍 Ubicación obtenida ✓';
      btn.disabled = false;
      stat.textContent = `✔ Coordenadas: ${lat}, ${lng} — Precisión: ±${Math.round(pos.coords.accuracy)}m`;
      stat.className = 'location-status success';
    },
    err => {
      btn.textContent = '📍 Obtener ubicación GPS';
      btn.disabled = false;
      const msgs = {
        1: 'Permiso de ubicación denegado. Active el GPS.',
        2: 'No se pudo obtener la posición. Verifique el GPS.',
        3: 'Tiempo de espera agotado. Intente de nuevo.',
      };
      stat.textContent = '⚠️ ' + (msgs[err.code] || 'Error desconocido.');
      stat.className = 'location-status error';
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

// ── VOICE DICTATION ───────────────────────────────────────────────────────
let recognition = null;
let activeVoiceField = null;

function toggleDictation(fieldId) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const statusEl = document.getElementById('voiceStatus');
  const btnId = fieldId === 'descripcion' ? 'btnVoice' : 'btnVoice2';
  const btn = document.getElementById(btnId);

  if (!SpeechRecognition) {
    if (statusEl) statusEl.textContent = '⚠️ Dictado por voz no disponible en este navegador. Use Chrome o Edge.';
    return;
  }

  // Stop if already recording this field
  if (recognition && activeVoiceField === fieldId) {
    recognition.stop();
    return;
  }
  // Stop if recording another field
  if (recognition) recognition.stop();

  recognition = new SpeechRecognition();
  recognition.lang = 'es-CO';
  recognition.continuous = true;
  recognition.interimResults = true;
  activeVoiceField = fieldId;

  let finalTranscript = document.getElementById(fieldId).value;

  recognition.onstart = () => {
    btn.classList.add('recording');
    btn.title = 'Detener dictado';
    if (statusEl) statusEl.textContent = '🎙️ Escuchando... hable ahora';
  };

  recognition.onresult = e => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) {
        finalTranscript += (finalTranscript ? ' ' : '') + t;
        // Apply spell check on final
        const corrected = applyAutoCorrections(finalTranscript);
        finalTranscript = corrected;
      } else {
        interim = t;
      }
    }
    const el = document.getElementById(fieldId);
    el.value = finalTranscript + (interim ? ' ' + interim : '');
    // Trigger spell check
    const sg = document.getElementById('suggestions-' + fieldId);
    if (sg) runSpellCheck(el, sg);
  };

  recognition.onerror = e => {
    btn.classList.remove('recording');
    const errMsgs = {
      'no-speech': 'No se detectó voz. Intente de nuevo.',
      'network': 'Error de red. El dictado requiere conexión.',
      'not-allowed': 'Permiso de micrófono denegado.',
    };
    if (statusEl) statusEl.textContent = '⚠️ ' + (errMsgs[e.error] || 'Error de dictado.');
  };

  recognition.onend = () => {
    btn.classList.remove('recording');
    btn.title = 'Iniciar dictado por voz';
    if (statusEl) statusEl.textContent = '';
    activeVoiceField = null;
    recognition = null;
  };

  recognition.start();
}

function applyAutoCorrections(text) {
  let result = text;
  Object.entries(CORRECTIONS).forEach(([wrong, right]) => {
    if (wrong !== right) {
      const rx = new RegExp('\\b' + wrong + '\\b', 'gi');
      result = result.replace(rx, right);
    }
  });
  return result;
}

// ── FORM OPERATIONS ───────────────────────────────────────────────────────
function getFormData() {
  return {
    fecha:       document.getElementById('fecha').value,
    horaReporte: document.getElementById('horaReporte').value,
    horaLlegada: document.getElementById('horaLlegada').value,
    horaFinal:   document.getElementById('horaFinal').value,
    lugar:       document.getElementById('lugar').value.trim(),
    direccion:   document.getElementById('direccion').value.trim(),
    latitud:     document.getElementById('latitud').value,
    longitud:    document.getElementById('longitud').value,
    evento:      document.getElementById('evento').value,
    personal:    document.getElementById('personal').value,
    vehiculo:    document.getElementById('vehiculo').value,
    descripcion: document.getElementById('descripcion').value.trim(),
    lesionados:  document.getElementById('lesionados').value || '0',
    victimas:    document.getElementById('victimas').value || '0',
    novedades:   document.getElementById('novedades').value.trim(),
    timestamp: new Date().toISOString(),
    photos: window.uploadedPhotos || []
  };
}

function validateForm(data) {
  const required = [
    ['fecha', 'Fecha'],
    ['horaReporte', 'Hora de Reporte'],
    ['horaLlegada', 'Hora de Llegada'],
    ['horaFinal', 'Hora Final'],
    ['lugar', 'Lugar'],
    ['direccion', 'Dirección'],
    ['evento', 'Evento'],
    ['personal', 'Personal'],
    ['vehiculo', 'Vehículo'],
    ['descripcion', 'Descripción'],
  ];
  for (const [key, label] of required) {
    if (!data[key]) return `⚠️ El campo "${label}" es obligatorio.`;
  }
  return null;
}

async function saveReport() {
  const data = getFormData();
  data.photos = window.uploadedPhotos || [];
  const err = validateForm(data);
  const fb = document.getElementById('saveFeedback');
  if (err) {
    fb.textContent = err;
    fb.className = 'save-feedback err';
    return;
  }
  try {
    const id = await saveToIDB(data);
    fb.textContent = `✔ Reporte #${id} guardado correctamente en este dispositivo.`;
    fb.className = 'save-feedback ok';
    loadSavedReports();
    setTimeout(() => { fb.textContent = ''; fb.className = 'save-feedback'; }, 4000);
  } catch (e) {
    fb.textContent = '⚠️ Error al guardar. Intente de nuevo.';
    fb.className = 'save-feedback err';
  }
}

function clearForm() {
  if (!confirm('¿Desea limpiar todos los campos del formulario?')) return;
  document.getElementById('lugar').value       = '';
  document.getElementById('direccion').value   = '';
  document.getElementById('latitud').value     = '';
  document.getElementById('longitud').value    = '';
  document.getElementById('evento').value      = '';
  document.getElementById('personal').value    = '';
  document.getElementById('vehiculo').value    = '';
  document.getElementById('descripcion').value = '';
  document.getElementById('lesionados').value  = '0';
  document.getElementById('victimas').value    = '0';
  document.getElementById('novedades').value   = '';
  document.getElementById('horaLlegada').value = '';
  document.getElementById('horaFinal').value   = '';
  document.getElementById('locationStatus').textContent = '';
  document.getElementById('locationStatus').className = 'location-status';
  document.getElementById('btnLocation').textContent = '📍 Obtener ubicación GPS';
  // Hide suggestions
  ['lugar','direccion','descripcion','novedades'].forEach(id => {
    const sg = document.getElementById('suggestions-' + id);
    if (sg) { sg.classList.remove('visible'); sg.innerHTML = ''; }
  });
  setDefaults();
}

// ── SAVED REPORTS LIST ────────────────────────────────────────────────────
async function loadSavedReports() {
  const list = document.getElementById('savedList');
  const pending = document.getElementById('pendingBadge');
  try {
    const reports = await getAllFromIDB();
    if (!reports.length) {
      list.innerHTML = '<div class="empty-msg">No hay reportes guardados aún.</div>';
      pending.style.display = 'none';
      return;
    }
    pending.style.display = 'inline-block';
    pending.textContent = `${reports.length} reporte${reports.length > 1 ? 's' : ''} guardado${reports.length > 1 ? 's' : ''}`;
    list.innerHTML = reports.reverse().map(r => `
      <div class="report-card">
        <span class="report-tag">#${r.id}</span>
        <div class="report-info">
          <div class="report-title">${r.evento || '(Sin evento)'} — ${r.lugar || '(Sin lugar)'}</div>
          <div class="report-meta">${formatDate(r.fecha)} · ${r.horaReporte} · ${r.vehiculo || ''} · ${r.personal || ''}</div>
        </div>
        <div class="report-actions">
          <button class="btn-mini" onclick="showCert(${r.id})">📄 Cert.</button>
          <button class="btn-mini" onclick="loadReport(${r.id})">↩ Cargar</button>
          <button class="btn-mini" onclick="deleteReport(${r.id})">🗑</button>
        </div>
      </div>
    `).join('');
  } catch(e) {
    list.innerHTML = '<div class="empty-msg">Error al cargar reportes.</div>';
  }
}

function formatDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${day} ${months[parseInt(m)-1]} ${y}`;
}

async function deleteReport(id) {
  if (!confirm(`¿Eliminar el reporte #${id}?`)) return;
  await deleteFromIDB(id);
  loadSavedReports();
}

async function loadReport(id) {
  const all = await getAllFromIDB();
  const r = all.find(x => x.id === id);
  if (!r) return;
  Object.entries(r).forEach(([k, v]) => {
    const el = document.getElementById(k);
    if (el) el.value = v;
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── CERTIFICATE ───────────────────────────────────────────────────────────
function generateCertificate() {
  const data = getFormData();
  const err = validateForm(data);
  if (err) {
    const fb = document.getElementById('saveFeedback');
    fb.textContent = err;
    fb.className = 'save-feedback err';
    return;
  }
  console.log(data.photos);
  renderCertificate(data);
}

async function showCert(id) {
  const all = await getAllFromIDB();
  const r = all.find(x => x.id === id);
  if (!r) return;
  renderCertificate(r, id);
}

function renderCertificate(data, id = null) {
  const docNum = id ? String(id).padStart(5, '0') : Math.floor(Math.random()*99999).toString().padStart(5,'0');
  const coords = (data.latitud && data.longitud)
    ? `${data.latitud}, ${data.longitud}`
    : 'No registradas';
  const now = new Date();
  const emitted = now.toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'short' });

  const certHTML = `
    <div class="cert-header">
      <div class="cert-logo">🔥</div>
      <div class="cert-entity">CUERPO DE BOMBEROS</div>
      <div class="cert-subtitle">Certificado Oficial de Servicio de Emergencia</div>
      <div class="cert-doc-num">N° DOC: CB-${docNum} &nbsp;|&nbsp; Emitido: ${emitted}</div>
    </div>
    <div class="cert-body-title">Reporte de Intervención — ${data.evento || 'Evento no especificado'}</div>

    <div class="cert-grid">
      <div class="cert-field">
        <div class="cert-label">Fecha</div>
        <div class="cert-value">${formatDate(data.fecha)}</div>
      </div>
      <div class="cert-field">
        <div class="cert-label">Hora de Reporte</div>
        <div class="cert-value">${data.horaReporte || '—'}</div>
      </div>
      <div class="cert-field">
        <div class="cert-label">Hora de Llegada al Sitio</div>
        <div class="cert-value">${data.horaLlegada || '—'}</div>
      </div>
      <div class="cert-field">
        <div class="cert-label">Hora Final</div>
        <div class="cert-value">${data.horaFinal || '—'}</div>
      </div>
      <div class="cert-field">
        <div class="cert-label">Lugar</div>
        <div class="cert-value">${data.lugar || '—'}</div>
      </div>
      <div class="cert-field">
        <div class="cert-label">Dirección</div>
        <div class="cert-value">${data.direccion || '—'}</div>
      </div>
      <div class="cert-field">
        <div class="cert-label">Coordenadas GPS</div>
        <div class="cert-value">${coords}</div>
      </div>
      <div class="cert-field">
        <div class="cert-label">Tipo de Evento</div>
        <div class="cert-value">${data.evento || '—'}</div>
      </div>
      <div class="cert-field">
        <div class="cert-label">Vehículo Desplegado</div>
        <div class="cert-value">${data.vehiculo || '—'}</div>
      </div>
      <div class="cert-field">
        <div class="cert-label">Personal Comisionado</div>
        <div class="cert-value">${data.personal || '—'}</div>
      </div>

      <div class="cert-field full">
        <div class="cert-label">Descripción del Incidente</div>
        <div class="cert-desc-box">${(data.descripcion || '—').replace(/\n/g,'<br>')}</div>
      </div>
    </div>

    <div class="cert-victims-bar">
      <div class="cert-victim-box">
        <div class="cert-victim-num">${data.lesionados || '0'}</div>
        <div class="cert-victim-label">Lesionados</div>
      </div>
      <div class="cert-victim-box">
        <div class="cert-victim-num">${data.victimas || '0'}</div>
        <div class="cert-victim-label">Víctimas Fatales</div>
      </div>
    </div>

    ${data.novedades ? `
    <div class="cert-grid">
      <div class="cert-field full">
        <div class="cert-label">Novedades</div>
        <div class="cert-desc-box">${data.novedades.replace(/\n/g,'<br>')}</div>
      </div>
    </div>` : ''}
    ${data.photos && data.photos.length ? `
      <div class="cert-photo-section">
        <div class="cert-photo-title">
          Evidencia Fotográfica
        </div>
    
        <div class="cert-photo-grid">
          ${data.photos.map(photo => `
            <div class="cert-photo-card">
              <img src="${photo}">
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <div class="cert-footer">
      <div class="cert-sig">
        <div class="cert-sig-line"></div>
        <div class="cert-sig-label">Comandante de Unidad</div>
      </div>
      <div class="cert-sig">
        <div class="cert-sig-line"></div>
        <div class="cert-sig-label">Oficial de Turno</div>
      </div>
      <div class="cert-sig">
        <div class="cert-sig-line"></div>
        <div class="cert-sig-label">Jefe de Bomberos</div>
      </div>
      <div class="cert-timestamp">
        Generado por el Sistema de Reportes<br>
        Cuerpo de Bomberos — ${emitted}<br>
        Doc. N° CB-${docNum}
      </div>
    </div>
  `;

  document.getElementById('certContent').innerHTML = certHTML;
  document.getElementById('certModal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('certModal').style.display = 'none';
  document.body.style.overflow = '';
}

function printCertificate() {
  window.print();
}

// Close modal on overlay click
document.getElementById('certModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// Keyboard shortcut: Escape to close
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

});

