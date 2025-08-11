// js/reporteEnvios/reporteEnvios.js

const baseUrl = 'http://localhost:8080/distribuidora';
const jwtToken = localStorage.getItem('jwtToken');
let dataTable;

document.addEventListener('DOMContentLoaded', () => {
    if (!jwtToken) {
        console.error('No se encontró el token JWT. Redirigiendo al login.');
        window.location.href = 'login.html';
        return;
    }

    cargarTodosLosEnvios();

    document.querySelector('.filter-button-group').addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;

        const buttonText = button.textContent.trim();
        const dateFilterInput = document.getElementById('dateFilter');
        dateFilterInput.value = '';

        if (button.id === 'mostrarTodosBtn') {
            cargarTodosLosEnvios();
        } else if (button.id === 'generarPDFBtn') {
            generarPDF();
        } else if (buttonText === 'Hoy') {
            const today = getLocalIsoDate(new Date());
            dateFilterInput.value = today;
            cargarEnviosPorFechaQuery(today);
        } else if (buttonText === 'Esta Semana') {
            cargarEnviosPorRangoDeFecha(getStartOfWeek(), getEndOfWeek());
        } else if (buttonText === 'Este Mes') {
            cargarEnviosPorRangoDeFecha(getStartOfMonth(), getEndOfMonth());
        }
    });

    document.getElementById('dateFilter').addEventListener('change', (event) => {
        const fechaSeleccionada = event.target.value;
        if (fechaSeleccionada) {
            cargarEnviosPorFechaQuery(fechaSeleccionada);
        } else {
            cargarTodosLosEnvios();
        }
    });

    const cerrarSesionLink = document.querySelector('.dropdown-menu a[href="#!"]');
    if (cerrarSesionLink) {
        cerrarSesionLink.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('jwtToken');
            window.location.href = 'login.html';
        });
    }
});

function getLocalIsoDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getStartOfWeek() {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(today.setDate(diff));
    return getLocalIsoDate(start);
}

function getEndOfWeek() {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? 0 : 7);
    const end = new Date(today.setDate(diff));
    return getLocalIsoDate(end);
}

function getStartOfMonth() {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return getLocalIsoDate(start);
}

function getEndOfMonth() {
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return getLocalIsoDate(end);
}

function cargarTodosLosEnvios() {
    document.getElementById('dateFilter').value = '';
    cargarEnviosDesdeBackend(`${baseUrl}/envios`);
}

function cargarEnviosPorFechaQuery(fecha) {
    const url = `${baseUrl}/envios/por-fecha-query?fecha=${fecha}`;
    cargarEnviosDesdeBackend(url);
}

function cargarEnviosPorRangoDeFecha(fechaInicio, fechaFin) {
    const url = `${baseUrl}/envios/por-rango-fecha?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
    cargarEnviosDesdeBackend(url);
}

async function cargarEnviosDesdeBackend(url) {
    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${jwtToken}` }
        });

        if (!response.ok) {
            throw new Error(`Error al obtener los envíos. Código de estado: ${response.status}`);
        }

        const enviosData = await response.json();

        try {
            // Siempre destruimos el DataTable antes de modificar la tabla
            if (dataTable) {
                dataTable.destroy();
                dataTable = null;
            }

            // Si no hay datos, mostramos mensaje y salimos
            if (!enviosData || enviosData.length === 0) {
                mostrarMensajeSinEnvios();
                return;
            }

            // Si hay datos, renderizamos la tabla
            renderizarTabla(enviosData);

        } catch (renderError) {
            console.error('Error al renderizar la tabla:', renderError);

            const table = document.getElementById('datatablesSimple');
            if (table) {
                let tbody = table.querySelector('tbody');
                if (!tbody) {
                    tbody = document.createElement('tbody');
                    table.appendChild(tbody);
                }

                let mensaje;
                if (String(renderError).includes("Data heading length mismatch")) {
                    mensaje = "No se encontraron envíos para la fecha seleccionada.";
                } else {
                    mensaje = "Error al mostrar los envíos. Intente nuevamente.";
                }

                tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">${mensaje}</td></tr>`;

                if (dataTable) {
                    dataTable.destroy();
                    dataTable = null;
                }
            }
        }

    } catch (error) {
        console.error('Error al cargar los envíos:', error);

        const table = document.getElementById('datatablesSimple');
        if (table) {
            let tbody = table.querySelector('tbody');
            if (!tbody) {
                tbody = document.createElement('tbody');
                table.appendChild(tbody);
            }

            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error al cargar los envíos. Intente nuevamente.</td></tr>`;

            if (dataTable) {
                dataTable.destroy();
                dataTable = null;
            }
        }
    }
}


function mostrarMensajeSinEnvios() {
    if (dataTable) {
        dataTable.destroy();
        dataTable = null;
    }

    const table = document.getElementById('datatablesSimple');
    if (table) {
        let tbody = table.querySelector('tbody');
        if (!tbody) {
            tbody = document.createElement('tbody');
            table.appendChild(tbody);
        }

        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No se encontraron envíos para la fecha seleccionada.</td></tr>`;
    }
}


// Función para formatear fechas "YYYY-MM-DD" a "dd/mm/yyyy"
function formatearFechaYYYYMMDD(fechaStr) {
    if (!fechaStr) return '—';
    const [anio, mes, dia] = fechaStr.split("-");
    return `${dia}/${mes}/${anio}`;
}

function renderizarTabla(envios) {
    const table = document.getElementById('datatablesSimple');
    if (!table) return;

    if (dataTable) {
        dataTable.destroy();
        dataTable = null;
    }

    const newTbody = document.createElement('tbody');

    // Mantenemos la lógica de filtro en esta línea
    const enviosFiltrados = envios.filter(envio => envio.estado !== 'SIN_FECHA');

    if (enviosFiltrados.length > 0) {
        enviosFiltrados.forEach(envio => {
            const row = document.createElement('tr');
            const telefono = envio.clienteTelefono || 'N/A';
            const observaciones = envio.observaciones || 'Sin observaciones';
            const fechaEntrega = envio.fechaEntrega 
                ? formatearFechaYYYYMMDD(envio.fechaEntrega) 
                : '—';

            let estadoButton;
            if (envio.estado === 'ENTREGADO') {
                estadoButton = `<span class="badge bg-success fs-6">Entregado</span>`; // <-- Añade fs-6 aquí
            } else {
                estadoButton = `<span class="badge bg-warning text-dark fs-6">Pendiente</span>`; // <-- Y aquí
            }

            row.innerHTML = `
                <td>${envio.idEnvio}</td>
                <td>${envio.clienteNombreCompleto}</td>
                <td>${telefono}</td>
                <td>${envio.clienteDomicilio}</td>
                <td>${observaciones}</td>
                <td>${fechaEntrega}</td>
                <td>
                    <button class="btn btn-info btn-sm btn-info-details" 
                            onclick="verDetalleVenta(${envio.idVenta}, '${envio.idEnvio}', '${envio.clienteDomicilio}')">
                        Ver detalles
                    </button>
                </td>
                <td class="text-center">${estadoButton}</td>
            `;
            newTbody.appendChild(row);
        });
    } else {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="8" class="text-center">No se encontraron entradas</td>`;
        newTbody.appendChild(row);
    }

    const oldTbody = table.querySelector('tbody');
    if (oldTbody) {
        table.removeChild(oldTbody);
    }
    table.appendChild(newTbody);

    dataTable = new simpleDatatables.DataTable("#datatablesSimple", {
        columns: [
            { select: [5, 6, 7], sortable: false }
        ],
        labels: {
            placeholder: "Buscar...",
            perPage: "Registros por página",
            noRows: "No se encontraron registros",
            noResults: "No se encontraron resultados que coincidan con tu búsqueda",
            info: "Mostrando de {start} a {end} de {rows} registros",
            next: "Siguiente",
            prev: "Anterior"
        }
    });
}


function verDetalleVenta(idVenta, idEnvio, domicilio) {
    const url = `${baseUrl}/envios/venta/${idVenta}`;
    
    fetch(url, { headers: { 'Authorization': `Bearer ${jwtToken}` } })
        .then(response => {
            if (!response.ok) {
                throw new Error('Detalle de venta no encontrado.');
            }
            return response.json();
        })
        .then(ventaDetalle => {
            document.getElementById('modal-detalle-nroEnvio').textContent = idEnvio;
            document.getElementById('modal-detalle-cliente').textContent = ventaDetalle.cliente.nombre + ' ' + ventaDetalle.cliente.apellido;
            document.getElementById('modal-detalle-domicilio').textContent = domicilio;
            
            const productosList = document.getElementById('modal-productos-list');
            productosList.innerHTML = '';
            ventaDetalle.detalles.forEach(p => {
                const li = document.createElement('li');
                li.innerHTML = `<i class="fas fa-tag me-2"></i>${p.nombreMarca} ${p.nombreProducto} ${p.peso}kg (Cantidad: ${p.cantidad})`;
                productosList.appendChild(li);
            });
            
            const productosModal = new bootstrap.Modal(document.getElementById('productosModal'));
            productosModal.show();
        })
        .catch(error => {
            console.error('Error al ver el detalle de la venta:', error);
            alert('Error al obtener el detalle de la venta: ' + error.message);
        });
}

function generarPDF() {
    console.log("Generando PDF...");
    alert('Funcionalidad de generar PDF no implementada.');
}
