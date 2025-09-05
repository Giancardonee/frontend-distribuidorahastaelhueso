// js/gestionDeEnvios/gestionarEnvios.js
const baseUrl = window.API_BASE_URL;

const jwtToken = localStorage.getItem('jwtToken');
let enviosData = []; // Variable global para almacenar los envíos cargados

document.addEventListener('DOMContentLoaded', () => {
    if (!jwtToken) {
        console.error('No se encontró el token JWT. Redirigiendo al login.');
        window.location.href = 'login.html';
        return;
    }

    window.cerrarSesion = function() {
        localStorage.removeItem('jwtToken');
        showToast('Sesión cerrada. Redirigiendo a la página de login.', 'info', 'Información');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000); // Dar tiempo para que el toast se vea
    };

    cargarEnvios();
    
    // Agregamos listeners a los filtros
    document.getElementById('filtroEstado').addEventListener('change', cargarEnviosFiltrados);
    document.getElementById('filtroClienteQuery').addEventListener('input', cargarEnviosFiltrados);
});

function getEstadoBadge(estado) {
    switch (estado) {
        case 'PENDIENTE':
            return `<span class="badge rounded-pill text-bg-warning estado-badge">Pendiente</span>`;
        case 'ENTREGADO':
            return `<span class="badge rounded-pill text-bg-success estado-badge">Entregado</span>`;
        case 'SIN_FECHA':
            return `<span class="badge rounded-pill text-bg-danger estado-badge">Sin Fecha</span>`;
        default:
            return `<span class="badge rounded-pill text-bg-secondary estado-badge">${estado}</span>`;
    }
}

function getBotonEntregado(envio) {
    if (envio.estado === 'PENDIENTE') {
        return `<button class="btn btn-success btn-sm" onclick="marcarComoEntregado(${envio.idEnvio})"><i class="fas fa-check"></i> Entregado</button>`;
    }
    return '';
}

function getBotonProgramar(envio) {
    return `<button class="btn btn-primary btn-sm" onclick="abrirModalProgramar(${envio.idEnvio})"><i class="fas fa-calendar-check"></i> ${envio.estado === 'SIN_FECHA' ? 'Programar' : 'Editar'} Envío</button>`;
}

// Función principal para cargar la tabla de envíos desde el backend y guardar en memoria
window.cargarEnvios = async function() {
    document.getElementById('filtroClienteQuery').value = ''; // <--- LÍNEA AÑADIDA
    document.getElementById('filtroEstado').value = '';
    const tbody = document.querySelector('#dataTableEnvios tbody');
    tbody.innerHTML = '';
    
    const url = `${baseUrl}/envios`; // Carga todos los envíos inicialmente

    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${jwtToken}` }
        });
        
        if (!response.ok) {
            throw new Error('Error al obtener los envíos. Código de estado: ' + response.status);
        }
        
        enviosData = await response.json();
        cargarEnviosFiltrados(); // Renderiza la tabla con todos los envíos
        showToast('Todos los envíos cargados correctamente.', 'success', 'Éxito');

    } catch (error) {
        console.error('Error al cargar los envíos:', error);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error al cargar los envíos. Intente nuevamente.</td></tr>`;
        showToast('Error al cargar los envíos: ' + error.message, 'danger', 'Error');
    }
}

// Función para filtrar los envíos que ya están en la memoria
window.cargarEnviosFiltrados = function() {
    const filtroEstado = document.getElementById('filtroEstado').value.toUpperCase();
    const filtroCliente = document.getElementById('filtroClienteQuery').value.toLowerCase();

    const tbody = document.querySelector('#dataTableEnvios tbody');
    tbody.innerHTML = '';

    const enviosFiltrados = enviosData.filter(envio => {
        const coincideEstado = !filtroEstado || envio.estado === filtroEstado;
        const coincideCliente = !filtroCliente || envio.clienteNombreCompleto.toLowerCase().includes(filtroCliente);
        return coincideEstado && coincideCliente;
    });

    if (enviosFiltrados.length > 0) {
        enviosFiltrados.forEach(envio => {
            const row = document.createElement('tr');
            const fechaEntrega = envio.fechaEntrega ? envio.fechaEntrega : 'Fecha no cargada';
            const estadoBadge = getEstadoBadge(envio.estado);
            const observaciones = envio.observaciones || 'Sin observaciones';

            // Aquí se agrega la nueva columna "Nro Envio" al principio
            row.innerHTML = `
                <td>${envio.idEnvio}</td>
                <td>${envio.idVenta}</td>
                <td>${envio.clienteNombreCompleto}</td>
                <td>${envio.clienteDomicilio}</td>
                <td>${observaciones}</td> <td>${estadoBadge}</td>
                <td>${fechaEntrega}</td>
                <td>
                    <div class="d-flex gap-2">
                        <button class="btn btn-info btn-sm" onclick="verDetalleVenta(${envio.idVenta})">
                            <i class="fas fa-eye"></i> Detalle
                        </button>
                        ${getBotonProgramar(envio)}
                        ${getBotonEntregado(envio)}
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    } else {
        // Se actualiza el colspan a 8 para que ocupe el ancho total
        tbody.innerHTML = `<tr><td colspan="8" class="text-center">No se encontraron envíos con los filtros seleccionados.</td></tr>`;
    }
}

window.abrirModalCalendario = function() {
    const modalCalendario = new bootstrap.Modal(document.getElementById('modalCalendario'));
    modalCalendario.show();
};

window.filtrarPorFecha = async function() {
    const fechaSeleccionada = document.getElementById('filtroFechaEnvio').value;
    const modalCalendario = bootstrap.Modal.getInstance(document.getElementById('modalCalendario'));
    modalCalendario.hide();

    if (!fechaSeleccionada) {
        showToast('Por favor, selecciona una fecha.', 'warning', 'Advertencia');
        return;
    }
    
    // Esta función mantiene la llamada al backend para filtrar por fecha
    const tbody = document.querySelector('#dataTableEnvios tbody');
    tbody.innerHTML = '';
    const url = `${baseUrl}/envios/por-fecha?fecha=${fechaSeleccionada}`;
    try {
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${jwtToken}` } });
        if (!response.ok) {
            throw new Error('Error al obtener los envíos por fecha. Código de estado: ' + response.status);
        }
        enviosData = await response.json(); // Actualizamos los datos globales
        cargarEnviosFiltrados(); // Renderiza la tabla con los nuevos datos
    } catch (error) {
        console.error('Error al filtrar por fecha:', error);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error al cargar los envíos por fecha. Intente nuevamente.</td></tr>`;
    }
};

window.verDetalleVenta = async function(idVenta) {
    const url = `${baseUrl}/envios/venta/${idVenta}`;

    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${jwtToken}` }
        });
        
        if (!response.ok) {
            throw new Error('Detalle de venta no encontrado. Código de estado: ' + response.status);
        }
        
        const ventaDetalle = await response.json();
        
        const envio = enviosData.find(e => e.idVenta === idVenta);
        if (!envio) {
             throw new Error('Envío no encontrado en los datos locales.');
        }

        document.getElementById('detalle-nroVenta').textContent = ventaDetalle.idVenta;
        document.getElementById('detalle-cliente').textContent = ventaDetalle.cliente.nombre + ' ' + ventaDetalle.cliente.apellido; 
        document.getElementById('detalle-domicilio').textContent = envio.clienteDomicilio; 
        document.getElementById('detalle-fechaVenta').textContent = ventaDetalle.fecha;
        document.getElementById('detalle-fechaEntrega').textContent = envio.fechaEntrega ? envio.fechaEntrega : 'Fecha no cargada';
        
        const productosBody = document.getElementById('detalle-productos-body');
        productosBody.innerHTML = '';
        ventaDetalle.detalles.forEach(p => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${p.nombreMarca}</td>
                <td>${p.nombreProducto}</td>
                <td>${p.peso} kg</td>
                <td>${p.cantidad}</td>
            `;
            productosBody.appendChild(row);
        });

        const modalDetalleVenta = new bootstrap.Modal(document.getElementById('modalDetalleVenta'));
        modalDetalleVenta.show();

    } catch (error) {
        console.error('Error al ver el detalle de la venta:', error);
        showToast('Error al obtener el detalle de la venta: ' + error.message, 'danger', 'Error');
    }
};

window.abrirModalProgramar = function(idEnvio) {
    const envio = enviosData.find(e => e.idEnvio === idEnvio);
    if (!envio) {
        showToast('Envío no encontrado en los datos locales.', 'danger', 'Error');
        return;
    }

    const modalProgramarEnvioLabel = document.getElementById('modalProgramarEnvioLabel');
    if (envio.estado === 'SIN_FECHA') {
        modalProgramarEnvioLabel.textContent = 'Programar Envío';
    } else {
        modalProgramarEnvioLabel.textContent = 'Editar Envío';
    }

    document.getElementById('idEnvioEditar').value = envio.idEnvio;
    document.getElementById('idVentaProgramar').value = envio.idVenta;
    document.getElementById('estadoEnvioEditar').value = envio.estado;
    document.getElementById('fechaEntregaProgramar').value = envio.fechaEntrega || '';
    document.getElementById('observacionesEditar').value = envio.observaciones;

    const modalProgramarEnvio = new bootstrap.Modal(document.getElementById('modalProgramarEnvio'));
    modalProgramarEnvio.show();
};

window.marcarComoEntregado = async function(idEnvio) {
    const envio = enviosData.find(e => e.idEnvio === idEnvio);
    if (!envio) {
        showToast('No se pudo encontrar el envío para marcar como entregado.', 'danger', 'Error');
        return;
    }
    
    if (!envio.fechaEntrega) {
        showToast('No se puede marcar el envío como entregado si no tiene una fecha de entrega asignada.', 'warning', 'Advertencia');
        return;
    }

    const confirmed = await showConfirmationDialog(
        `¿Está seguro de que desea marcar el envío como Entregado?`,
        'Confirmar Entrega',
        'success'
    );
    
    if (confirmed) {
        const url = `${baseUrl}/envios/${idEnvio}`;
        const data = {
            estado: 'ENTREGADO',
            fechaEntrega: envio.fechaEntrega, // Usamos la fecha ya existente
            observaciones: envio.observaciones
        };

        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwtToken}`
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error('Error al actualizar el estado del envío. Código de estado: ' + response.status);
            }

            console.log('Envío marcado como Entregado con éxito.');
            showToast('Envío marcado como Entregado con éxito.', 'success', 'Éxito');
            cargarEnvios();
        } catch (error) {
            console.error('Error al marcar como entregado:', error);
            showToast('Error al marcar el envío como entregado: ' + error.message, 'danger', 'Error');
        }
    }
};

window.guardarProgramacion = async function() {
    const idEnvio = parseInt(document.getElementById('idEnvioEditar').value);
    const estado = document.getElementById('estadoEnvioEditar').value;
    const fechaEntrega = document.getElementById('fechaEntregaProgramar').value || null;
    const observaciones = document.getElementById('observacionesEditar').value.trim() || null;
    
    if (estado === 'ENTREGADO' && !fechaEntrega) {
        showToast('Para marcar un envío como Entregado, debe seleccionar una fecha de entrega.', 'warning', 'Advertencia');
        return;
    }

    const url = `${baseUrl}/envios/${idEnvio}`;
    const data = {
        estado: estado,
        fechaEntrega: fechaEntrega,
        observaciones: observaciones
    };

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Error al guardar la programación del envío. Código de estado: ' + response.status);
        }

        console.log('Programación del envío guardada con éxito.');
        const modalProgramarEnvio = bootstrap.Modal.getInstance(document.getElementById('modalProgramarEnvio'));
        modalProgramarEnvio.hide();
        showToast('Programación del envío guardada con éxito.', 'success', 'Éxito');
        cargarEnvios();

    } catch (error) {
        console.error('Error al guardar la programación:', error);
        showToast('Error al guardar la programación del envío: ' + error.message, 'danger', 'Error');
    }
};