/*=========================================================
 PDF ENGINE
 Convierte el HTML del certificado (plantilla1.html ya
 diligenciada, misma vista que produce buildCertificateHTML
 en certificados.js) en un archivo PDF real, usando html2pdf
 (que internamente combina html2canvas + jsPDF).

 Por qué no se genera el PDF directamente desde plantilla1.docx:
 no existe una librería gratuita client-side que convierta un
 .docx a PDF con fidelidad visual real (eso requiere un motor
 de renderizado de Word — LibreOffice headless, Google Drive
 API, etc. — es decir, un servidor, y este proyecto no tiene
 uno desplegado para eso). plantilla1.html es la réplica A4 de
 la misma carta oficial, así que el PDF resultante es visualmente
 igual al que produciría el Word, pero generado 100% en el
 navegador con lo que ya está cargado en la página.

 Esta es la misma técnica que ya usaba app.js en
 generatePDFBase64() para adjuntar el PDF al guardar en
 Firestore — este archivo la generaliza para poder generar el
 PDF de CUALQUIER emergencia (no solo el formulario abierto) y
 devolver un Blob reutilizable para mostrar o descargar.
=========================================================*/

// Espera a que todas las imágenes dentro del contenedor (firmas, fotos
// adjuntas, QR de verificación) terminen de cargar antes de rasterizar.
// Si html2canvas captura la vista antes de que una imagen cargue, esa
// imagen sale en blanco en el PDF final — un bug silencioso y difícil
// de detectar en pruebas rápidas porque casi siempre carga a tiempo en
// conexiones rápidas.
function esperarImagenes(contenedor) {

    const imagenes = Array.from(contenedor.querySelectorAll('img'));

    if (!imagenes.length) return Promise.resolve();

    return Promise.all(imagenes.map(img => {

        if (img.complete) return Promise.resolve();

        return new Promise(resolve => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
        });

    }));

}

/**
 * Genera un PDF real a partir de un fragmento HTML.
 *
 * @param {string} html            HTML completo del certificado (con su
 *                                 propio <style> interno, tal como lo
 *                                 devuelve buildCertificateHTML).
 * @param {string} [nombreArchivo] Nombre sugerido para el archivo.
 * @returns {Promise<Blob>} el PDF como Blob (application/pdf).
 */
export async function generarPDFBlob(html, nombreArchivo = 'certificado.pdf') {

    if (typeof window.html2pdf !== 'function') {
        throw new Error('La librería html2pdf no está cargada en esta página.');
    }

    const contenedor = document.createElement('div');

    // OJO: NO usar un offset gigante como "left:-99999px" para esconder
    // este contenedor. Chrome (y otros navegadores) deja de pintar
    // contenido posicionado muy lejos del viewport visible como
    // optimización de rendimiento — html2canvas entonces captura un
    // lienzo del tamaño correcto pero completamente en blanco, sin
    // avisar ningún error. Por eso aquí se deja en top:0/left:0 (dentro
    // del viewport real) y se esconde con z-index negativo, quedando
    // tapado por el modal (#certModal tiene z-index:1000 en styles.css)
    // en vez de "fuera de pantalla".
    contenedor.style.position = 'fixed';
    contenedor.style.top = '0';
    contenedor.style.left = '0';
    contenedor.style.zIndex = '-1';
    contenedor.style.pointerEvents = 'none';
    contenedor.innerHTML = html;

    document.body.appendChild(contenedor);

    try {

        await esperarImagenes(contenedor);

        // Da un frame al navegador para confirmar el layout antes de
        // rasterizar; sin esto, en equipos lentos html2canvas a veces
        // captura antes de que el reflow del contenido recién insertado
        // termine, lo que también puede producir páginas en blanco o
        // recortadas.
        await new Promise(resolve => requestAnimationFrame(resolve));

        const blob = await window.html2pdf()
            .set({

                margin: 0,

                filename: nombreArchivo,

                image: { type: 'jpeg', quality: 1 },

                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    scrollX: 0,
                    scrollY: 0
                },

                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }

            })
            .from(contenedor)
            .outputPdf('blob');

        return blob;

    } finally {

        contenedor.remove();

    }

}
