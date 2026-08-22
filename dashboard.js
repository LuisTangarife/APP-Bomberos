/*============================================
 PANEL GENERAL — CENTRO DE OPERACIONES
=============================================*/

import { protegerPagina } from "./shared/auth.js";

document.addEventListener("DOMContentLoaded", async () => {

    await protegerPagina();

    renderSidebar("dashboard");

    renderHeader("Panel General");

    iniciarSistema();

    cargarDashboard();

});

/*=============================================
 CARGAR DATOS
=============================================*/

// APH, Ayudas y Censos no tienen todavía una colección real en
// Firestore (los botones de esas secciones en el sidebar solo abren
// un alert "Próximamente") — así que sus tarjetas se marcan como
// "sin módulo activo" en vez de mostrar un número, real o inventado.
// Antes esas tres tarjetas (y las otras dos) mostraban un número fijo
// escrito directo en el HTML — nunca venía de ningún dato real.
function marcarSinDatos(idContador, mensaje = "Módulo sin datos aún") {

    const el = document.getElementById(idContador);
    if (!el) return;

    el.textContent = "—";

    const nota = el.parentElement?.querySelector("span");
    if (nota) nota.textContent = mensaje;

}

async function cargarDashboard(){

    marcarSinDatos("totalAPH");
    marcarSinDatos("totalAyudas");
    marcarSinDatos("totalCensos");

    try {

        const [{ listarEmergencias }, { listarInspecciones }] = await Promise.all([
            import("./modules/emergencia/firebase.js"),
            import("./modules/inspecciones/firebase.js")
        ]);

        const [emergencias, inspecciones] = await Promise.all([
            listarEmergencias().catch(error => {
                console.error("[dashboard] No se pudieron cargar emergencias:", error);
                return null;
            }),
            listarInspecciones().catch(error => {
                console.error("[dashboard] No se pudieron cargar inspecciones:", error);
                return null;
            })
        ]);

        if (Array.isArray(emergencias)) {

            const inicioMes = new Date();
            inicioMes.setDate(1);
            inicioMes.setHours(0, 0, 0, 0);

            const esteMes = emergencias.filter(e => {
                const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(e.fecha || "");
                if (!match) return false;
                const fecha = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
                return fecha >= inicioMes;
            }).length;

            document.getElementById("totalEmergencias").textContent = esteMes;

        } else {

            marcarSinDatos("totalEmergencias", "No se pudo cargar (revisa conexión)");

        }

        if (Array.isArray(inspecciones)) {

            document.getElementById("totalInspecciones").textContent = inspecciones.length;

        } else {

            marcarSinDatos("totalInspecciones", "No se pudo cargar (revisa conexión)");

        }

    } catch (error) {

        console.error("[dashboard] Error cargando datos reales del panel:", error);

    }

    // Anima SOLO los contadores que sí quedaron con un número real
    // ("—" no es numérico, así que animarContadores() ya lo ignora).
    animarContadores();

}

/*=============================================
 ANIMACIÓN DE CONTADORES (efecto de telemetría)
=============================================*/

function animarContadores(){

    const contadores = document.querySelectorAll(".stat-card h2[id]");

    contadores.forEach((el) => {

        const destino = parseInt(el.textContent, 10);

        if (isNaN(destino)) return;

        const duracion = 900;
        const inicio = performance.now();

        function paso(ahora){
            const progreso = Math.min((ahora - inicio) / duracion, 1);
            const valor = Math.round(destino * progreso);
            el.textContent = valor;
            if (progreso < 1) requestAnimationFrame(paso);
        }

        el.textContent = "0";
        requestAnimationFrame(paso);

    });

}

/*=============================================
 NAVEGACIÓN
=============================================*/

function abrirEmergencias() {
    location.href = "modules/emergencia/gestor.html";
}

function abrirAPH(){

    alert("Próximamente");

}

function abrirAyudas(){

    alert("Próximamente");

}

function abrirInspecciones(){

    location.href = "modules/inspecciones/index.html";

}

function abrirEstadisticas(){

    location.href = "modules/estadisticas/index.html";

}

/*=============================================
 EXPOSICIÓN GLOBAL (necesaria por el atributo
 "onclick" de index.html)
=============================================*/
// dashboard.js se carga como <script type="module">, así que las
// funciones declaradas arriba viven en el scope del módulo, NO en
// "window". Los "onclick" en HTML solo pueden llamar funciones que
// existan en el scope global (window), así que sin estas líneas
// "abrirInspecciones()" (y las demás) fallan con
// "ReferenceError: abrirInspecciones is not defined" y el botón no
// hace nada. Por eso solo funcionaban los botones que tenían la
// navegación escrita directo en el onclick (ej:
// onclick="location.href='...'"), y no los que llamaban a una función.
window.abrirEmergencias = abrirEmergencias;
window.abrirAPH = abrirAPH;
window.abrirAyudas = abrirAyudas;
window.abrirInspecciones = abrirInspecciones;
window.abrirEstadisticas = abrirEstadisticas;
