// js/gestionDeClientes/manejarTabla.js

const API_BASE_URL = "http://localhost:8080/distribuidora/clientes";
window.clientesDataTable = null; // Mantenemos esta variable global para el DataTable

document.addEventListener('DOMContentLoaded', async event => {
    const nombreEnFooterSpan = document.getElementById('nombreEnFooter');
    if (nombreEnFooterSpan) nombreEnFooterSpan.textContent = "Usuario Admin";

    // Inicializamos el modal de Bootstrap
    const clienteModal = new bootstrap.Modal(document.getElementById('clienteModal'));
    const clienteModalLabel = document.getElementById('clienteModalLabel');
    const formCliente = document.getElementById('formCliente');
    const clienteIdInput = document.getElementById('clienteId');
    const nombreClienteInput = document.getElementById('nombreCliente');
    const apellidoClienteInput = document.getElementById('apellidoCliente');
    const telefonoClienteInput = document.getElementById('telefonoCliente');
    const domicilioClienteInput = document.getElementById('domicilioCliente'); // Nueva variable para el input de domicilio
    const btnGuardarCambiosCliente = document.getElementById('btnGuardarCambiosCliente');

    // Listener para abrir el modal de nuevo cliente
    document.getElementById('btnAbrirModalNuevoCliente').addEventListener('click', function () {
        clienteModalLabel.innerHTML = '<i class="fas fa-user-plus me-2"></i> Registrar Nuevo Cliente';
        btnGuardarCambiosCliente.textContent = 'Guardar Cliente';
        clienteIdInput.value = '';
        formCliente.reset(); // Limpia los campos del formulario
        formCliente.classList.remove('was-validated'); // Quita las clases de validación de Bootstrap
        // Quita la validación visual de los inputs
        formCliente.querySelectorAll('.form-control').forEach(input => {
            input.classList.remove('is-invalid');
            input.setCustomValidity("");
        });
        clienteModal.show(); // Abre el modal
    });

    // Listener para los botones de editar y eliminar en la tabla
    document.body.addEventListener('click', async function (e) {
        if (e.target.classList.contains('btn-editar-cliente')) {
            const fila = e.target.closest('tr');
            if (fila) { // Asegurarse de que se encontró una fila
                const id = fila.children[0].textContent;
                const nombre = fila.children[1].textContent;
                const apellido = fila.children[2].textContent;
                const domicilio = fila.children[3].textContent; // Obtener domicilio del índice correcto
                const telefono = fila.children[4].textContent; // Teléfono ahora en el índice 4

                clienteModalLabel.innerHTML = '<i class="fas fa-edit me-2"></i> Editar Datos de Cliente';
                btnGuardarCambiosCliente.textContent = 'Guardar Cambios';

                clienteIdInput.value = id;
                nombreClienteInput.value = nombre;
                apellidoClienteInput.value = apellido;
                domicilioClienteInput.value = domicilio; // Asignar valor al input de domicilio
                telefonoClienteInput.value = telefono;

                formCliente.classList.remove('was-validated');
                formCliente.querySelectorAll('.form-control').forEach(input => {
                    input.classList.remove('is-invalid');
                    input.setCustomValidity("");
                });

                clienteModal.show();
            }
        } else if (e.target.classList.contains('btn-eliminar-cliente')) {
            const id = e.target.dataset.id;
            const nombre = e.target.dataset.nombre || 'este cliente';
            
            // Reemplazamos el confirm() nativo con la llamada a showConfirmationDialog
            const confirmed = await showConfirmationDialog(
                `¿Estás seguro de que quieres eliminar al cliente "${nombre}"?`,
                'Confirmar Eliminación',
                'danger' // Usamos 'danger' para que el encabezado del modal sea rojo
            );

            if (confirmed) {
                await eliminarCliente(id, nombre); // Pasamos el nombre para el mensaje del toast
            }
        }
    });

    // Validación en tiempo real para el campo de teléfono (mantener)
    telefonoClienteInput.addEventListener('input', function () {
        telefonoClienteInput.setCustomValidity("");
        const soloNumerosRegex = /^[0-9]+$/;

        if (telefonoClienteInput.value.length > 0 && !soloNumerosRegex.test(telefonoClienteInput.value)) {
            telefonoClienteInput.setCustomValidity("El teléfono debe contener solo números.");
        } else if (telefonoClienteInput.value.length > 0 && telefonoClienteInput.value.length < 10) {
            telefonoClienteInput.setCustomValidity("El teléfono debe tener al menos 10 dígitos.");
        }
        // Actualizar la clase de validación de Bootstrap
        if (!telefonoClienteInput.checkValidity()) {
            telefonoClienteInput.classList.add('is-invalid');
        } else {
            telefonoClienteInput.classList.remove('is-invalid');
        }
    });

    // Manejo del envío del formulario de cliente
    formCliente.addEventListener('submit', async function (e) {
        e.preventDefault(); // Evitar el envío predeterminado del formulario

        // Re-validar el teléfono antes de enviar
        telefonoClienteInput.setCustomValidity(""); // Resetear antes de validar
        const soloNumerosRegex = /^[0-9]+$/;
        if (telefonoClienteInput.value.length > 0 && !soloNumerosRegex.test(telefonoClienteInput.value)) {
            telefonoClienteInput.setCustomValidity("El teléfono debe contener solo números.");
        } else if (telefonoClienteInput.value.length > 0 && telefonoClienteInput.value.length < 10) {
            telefonoClienteInput.setCustomValidity("El teléfono debe tener al menos 10 dígitos.");
        }

        // Si el formulario no es válido, mostrar los mensajes de validación de Bootstrap
        if (!this.checkValidity()) {
            e.stopPropagation(); // Evitar que el evento burbujee
            this.classList.add('was-validated'); // Muestra los estilos de validación
            // Opcional: mostrar un toast si la validación falla
            showToast("Por favor, corrige los errores en el formulario.", 'warning', 'Formulario Inválido');
            return;
        }

        const id = clienteIdInput.value;
        const clienteDTO = {
            nombre: nombreClienteInput.value,
            apellido: apellidoClienteInput.value,
            domicilio: domicilioClienteInput.value, // Incluir el domicilio en el DTO
            telefono: telefonoClienteInput.value
        };

        if (id) {
            await modificarCliente(id, clienteDTO);
        } else {
            await agregarCliente(clienteDTO);
        }

        // Cierra el modal, limpia el formulario y recarga la tabla
        clienteModal.hide();
        formCliente.reset();
        formCliente.classList.remove('was-validated');
        formCliente.querySelectorAll('.form-control').forEach(input => {
            input.classList.remove('is-invalid');
            input.setCustomValidity("");
        });
        await cargarClientes(); // <- Esto recarga y reinyecta la tabla
    });

    // Limpia el formulario y la validación cuando el modal se cierra
    document.getElementById('clienteModal').addEventListener('hidden.bs.modal', function () {
        formCliente.reset();
        formCliente.classList.remove('was-validated');
        formCliente.querySelectorAll('.form-control').forEach(input => {
            input.classList.remove('is-invalid');
            input.setCustomValidity("");
        });
    });

    await cargarClientes(); // carga inicial de la tabla
});

// Función para obtener el token del localStorage
function getToken() {
    return localStorage.getItem('jwtToken');
}

// Función principal para cargar y renderizar la tabla de clientes
async function cargarClientes() {
    console.log('Iniciando cargarClientes()...');
    const contenedorTabla = document.getElementById('contenedorTablaClientes');

    if (!contenedorTabla) {
        console.error('No se encontró contenedorTablaClientes.');
        return;
    }

    // Si ya existe una instancia de DataTable, la destruimos antes de reinicializar
    if (window.clientesDataTable) {
        window.clientesDataTable.destroy();
        window.clientesDataTable = null;
    }

    // Actualiza la estructura de la tabla para incluir la columna de Domicilio
    contenedorTabla.innerHTML = `
        <table id="datatablesClientes">
            <thead>
                <tr>
                    <th>Nro Cliente</th>
                    <th>Nombre</th>
                    <th>Apellido</th>
                    <th>Domicilio</th> 
                    <th>Teléfono</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    `;

    const tabla = document.getElementById('datatablesClientes');
    const tbody = tabla.querySelector('tbody');
    const token = getToken();

    if (!token) {
        // Usar showToast en lugar de alert
        showToast('Su sesión ha expirado o no ha iniciado sesión. Por favor, inicie sesión nuevamente.', 'danger', 'Sesión Requerida');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 3000); // Dar tiempo para que el toast sea leído antes de redirigir
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/buscarTodos`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 204) {
            console.log('Sin clientes: No hay contenido para mostrar.');
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay clientes registrados.</td></tr>'; // colspan ahora es 6
        } else if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error ${response.status}: ${errorText}`);
        } else {
            const clientes = await response.json();
            clientes.forEach(cliente => {
                const fila = `
                    <tr>
                        <td>${cliente.idCliente}</td>
                        <td>${cliente.nombre}</td>
                        <td>${cliente.apellido}</td>
                        <td>${cliente.domicilio}</td> <td>${cliente.telefono}</td>
                        <td class="table-actions">
                            <button class="btn btn-sm btn-info text-white btn-editar-cliente">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="btn btn-sm btn-danger btn-eliminar-cliente" 
                                        data-id="${cliente.idCliente}" data-nombre="${cliente.nombre} ${cliente.apellido}">
                                <i class="fas fa-trash-alt"></i> Eliminar
                            </button>
                        </td>
                    </tr>
                `;
                tbody.insertAdjacentHTML('beforeend', fila);
            });
        }

        // Inicializa o reinicializa Simple-DataTables
        window.clientesDataTable = new simpleDatatables.DataTable(tabla, {
            labels: {
                placeholder: "Buscar...",
                perPage: "Registros por página",
                noRows: "No se encontraron registros",
                noResults: "No se encontraron resultados que coincidan con tu búsqueda",
                info: "Mostrando de {start} a {end} de {rows} registros",
                next: "Siguiente",
                prev: "Anterior"
            },
            perPageSelect: [5, 10, 15, 20, 25, ["Todas", -1]],
        });

    } catch (error) {
        console.error('Error al cargar clientes:', error);
        showToast(`Error al cargar clientes: ${error.message}`, 'danger', 'Error de Carga');
    }
}

// Función para agregar un nuevo cliente
async function agregarCliente(clienteDTO) {
    try {
        const token = getToken();
        if (!token) {
            showToast('Su sesión ha expirado. Por favor, inicie sesión nuevamente.', 'danger', 'Error de Autenticación');
            setTimeout(() => { window.location.href = 'login.html'; }, 3000);
            return;
        }

        const response = await fetch(`${API_BASE_URL}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(clienteDTO)
        });

        if (!response.ok) {
            const errorData = await response.json();
            const errorMessage = errorData.message || `Error ${response.status}: No se pudo agregar el cliente.`;
            throw new Error(errorMessage);
        }

        const nuevo = await response.json();
        showToast(`Cliente "${nuevo.nombre} ${nuevo.apellido}" agregado correctamente.`, 'success', 'Cliente Agregado');
    } catch (e) {
        console.error('Error en agregarCliente:', e);
        showToast(`Error al agregar cliente: ${e.message}`, 'danger', 'Fallo al Guardar');
    }
}

// Función para modificar un cliente existente
async function modificarCliente(id, clienteDTO) {
    try {
        const token = getToken();
        if (!token) {
            showToast('Su sesión ha expirado. Por favor, inicie sesión nuevamente.', 'danger', 'Error de Autenticación');
            setTimeout(() => { window.location.href = 'login.html'; }, 3000);
            return;
        }

        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(clienteDTO)
        });

        if (!response.ok) {
            const errorData = await response.json();
            const errorMessage = errorData.message || `Error ${response.status}: No se pudo modificar el cliente.`;
            throw new Error(errorMessage);
        }

        const modificado = await response.json();
        showToast(`Cliente "${modificado.nombre} ${modificado.apellido}" actualizado correctamente.`, 'success', 'Cliente Actualizado');
    } catch (e) {
        console.error('Error en modificarCliente:', e);
        showToast(`Error al modificar cliente: ${e.message}`, 'danger', 'Fallo al Actualizar');
    }
}

// Función para eliminar un cliente
async function eliminarCliente(id, nombreCliente = 'cliente') {
    try {
        const token = getToken();
        if (!token) {
            showToast('Su sesión ha expirado. Por favor, inicie sesión nuevamente.', 'danger', 'Error de Autenticación');
            setTimeout(() => { window.location.href = 'login.html'; }, 3000);
            return;
        }

        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 204) {
            showToast(`Cliente "${nombreCliente}" eliminado con éxito.`, 'success', 'Cliente Eliminado');
            await cargarClientes();
        } else {
            const errorData = await response.json();
            const errorMessage = errorData.message || `Error ${response.status}: No se pudo eliminar el cliente.`;
            throw new Error(errorMessage);
        }
    } catch (e) {
        console.error('Error en eliminarCliente:', e);
        showToast(`Error al eliminar cliente: ${e.message}`, 'danger', 'Fallo al Eliminar');
    }
}