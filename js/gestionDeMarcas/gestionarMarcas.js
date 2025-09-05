const API_URL = `${window.API_BASE_URL}/marcas`;


let marcasDataTable; // Variable global para la instancia de Simple DataTables

document.addEventListener('DOMContentLoaded', async event => {
    // Script para actualizar el nombre de usuario en el footer
    const nombreEnFooterSpan = document.getElementById('nombreEnFooter');
    if (nombreEnFooterSpan) {
        nombreEnFooterSpan.textContent = "Usuario Admin"; // Podrías obtener esto del token JWT si lo parseas
    }

    // --- Modal Elements ---
    const marcaModal = new bootstrap.Modal(document.getElementById('marcaModal'));
    const marcaModalLabel = document.getElementById('marcaModalLabel');
    const formMarca = document.getElementById('formMarca');
    const marcaIdInput = document.getElementById('marcaId');
    const nombreMarcaInput = document.getElementById('nombreMarca');
    const btnGuardarMarca = document.getElementById('btnGuardarMarca');
    const btnAbrirModalMarca = document.getElementById('btnAbrirModalMarca');

    // --- Funciones para interactuar con la API y la tabla ---

    // Función para obtener el token JWT del localStorage
    function getJwtToken() {
        return localStorage.getItem('jwtToken');
    }

    // Función para cargar las marcas desde el backend
    async function cargarMarcas() {
        const token = getJwtToken();
        if (!token) {
            console.error('No se encontró el token JWT en el localStorage.');
            showToast('Sesión no iniciada o expirada. Por favor, inicie sesión.', 'warning', 'Advertencia de Sesión');
            window.location.href = 'login.html'; // Redirigir a la página de login
            return;
        }

        try {
            const response = await fetch(API_URL, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    console.error('Token inválido o expirado. Redirigiendo a login.');
                    showToast('Su sesión ha expirado o no tiene permisos. Por favor, inicie sesión nuevamente.', 'danger', 'Error de Autenticación');
                    window.location.href = 'login.html';
                }
                throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
            }

            const marcas = await response.json();
            
            // Destruir la instancia existente de DataTables si ya existe
            if (marcasDataTable) {
                marcasDataTable.destroy();
            }

            // Limpiar el tbody antes de agregar las nuevas filas
            const tbody = document.querySelector('#datatablesMarcas tbody');
            tbody.innerHTML = '';

            marcas.forEach(marca => {
                const row = `
                    <tr>
                        <td>${marca.idMarca}</td>
                        <td>${marca.nombre}</td>
                        <td>
                            <button class="btn btn-warning btn-sm btn-editar-marca me-1" data-id="${marca.idMarca}" data-nombre="${marca.nombre}"><i class="fas fa-edit"></i> Editar</button>
                            <button class="btn btn-danger btn-sm btn-eliminar-marca" data-id="${marca.idMarca}" data-nombre="${marca.nombre}"><i class="fas fa-trash-alt"></i> Eliminar</button>
                        </td>
                    </tr>
                `;
                tbody.insertAdjacentHTML('beforeend', row);
            });

            // Re-inicializar Simple DataTables con los nuevos datos
            marcasDataTable = new simpleDatatables.DataTable(document.getElementById('datatablesMarcas'), {
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
            console.error('Error al cargar las marcas:', error);
            showToast('Hubo un error al cargar las marcas. Intente de nuevo más tarde.', 'danger', 'Error de Carga');
        }
    }

    // Llamar a cargarMarcas al iniciar la página
    await cargarMarcas();

    // --- Event Listeners para el Modal de Marca ---

    // Cuando el modal se abre para registrar una nueva marca
    btnAbrirModalMarca.addEventListener('click', () => {
        marcaModalLabel.textContent = 'Registrar Marca';
        btnGuardarMarca.textContent = 'Registrar Marca';
        formMarca.reset(); // Limpiar el formulario
        marcaIdInput.value = ''; // Asegurarse de que el ID esté vacío para nuevo registro
        formMarca.classList.remove('was-validated'); // Limpiar validación de Bootstrap
        nombreMarcaInput.classList.remove('is-invalid');
    });

    // Cuando el modal se abre para editar una marca (delegación de eventos)
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-editar-marca')) {
            const id = e.target.dataset.id;
            const nombre = e.target.dataset.nombre;

            marcaModalLabel.textContent = 'Editar Marca';
            btnGuardarMarca.textContent = 'Guardar Cambios';
            
            marcaIdInput.value = id;
            nombreMarcaInput.value = nombre;
            
            marcaModal.show(); // Mostrar el modal
            formMarca.classList.remove('was-validated'); // Limpiar validación de Bootstrap
            nombreMarcaInput.classList.remove('is-invalid');
        }
    });

    // Manejar el envío del formulario del modal (registrar o actualizar)
    formMarca.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Validar el formulario con las capacidades de Bootstrap
        if (!this.checkValidity()) {
            e.stopPropagation();
            this.classList.add('was-validated');
            return;
        }

        const id = marcaIdInput.value;
        const nombre = nombreMarcaInput.value.trim();
        const token = getJwtToken();

        if (!token) {
            showToast('Sesión no iniciada o expirada. Por favor, inicie sesión.', 'warning', 'Advertencia de Sesión');
            window.location.href = 'login.html';
            return;
        }

        try {
            let response;
            if (id) {
                // Modo edición
                response = await fetch(`${API_URL}/${id}`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ nombre: nombre })
                });
            } else {
                // Modo nuevo registro
                response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ nombre: nombre })
                });
            }

            if (!response.ok) {
                const contentType = response.headers.get("content-type");
                let errorMessage = `Error al guardar la marca: ${response.statusText}`; // Default error message

                // Check if the response is JSON
                if (contentType && contentType.includes("application/json")) {
                    try {
                        const errorData = await response.json(); 
                        errorMessage = errorData.message || errorMessage; // Use backend message if available
                    } catch (jsonParseError) {
                        // This means the backend said it's JSON but sent invalid JSON
                        console.error('Error parsing JSON error response:', jsonParseError);
                        errorMessage = `Error inesperado del servidor (falló parseo JSON): ${response.statusText}`;
                    }
                } else {
                    // If not JSON, read the response as plain text
                    try {
                        const textError = await response.text();
                        errorMessage = `Error del servidor: ${textError.substring(0, 200)}...`; // Limit length
                        console.error('Server responded with non-JSON error:', textError);
                    } catch (textReadError) {
                        console.error('Error reading text error response:', textReadError);
                        errorMessage = `Error inesperado del servidor: ${response.statusText}`;
                    }
                }
                
                // Handle authentication/authorization errors first
                if (response.status === 401 || response.status === 403) {
                    showToast('Su sesión ha expirado o no tiene permisos. Por favor, inicie sesión nuevamente.', 'danger', 'Error de Autenticación');
                    window.location.href = 'login.html';
                    return; // Stop further processing
                }

                // For other errors, throw the constructed error message
                throw new Error(errorMessage);
            }

            // Si la operación fue exitosa, recargar la tabla de marcas
            await cargarMarcas();
            showToast(`Marca ${id ? 'actualizada' : 'registrada'} exitosamente.`, 'success', 'Operación Exitosa');
            marcaModal.hide(); // Cerrar el modal
            formMarca.classList.remove('was-validated'); // Limpiar las clases de validación

        } catch (error) {
            console.error('Error al guardar la marca:', error);
            showToast(`Hubo un error al guardar la marca: ${error.message}`, 'danger', 'Error al Guardar');
        }
    });

    // Manejar la eliminación de marca (delegación de eventos)
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-eliminar-marca')) {
            const id = e.target.dataset.id;
            const nombre = e.target.dataset.nombre;
            const token = getJwtToken();

            if (!token) {
                showToast('Sesión no iniciada o expirada. Por favor, inicie sesión.', 'warning', 'Advertencia de Sesión');
                window.location.href = 'login.html';
                return;
            }

            // **Uso del showConfirmationDialog**
            const confirmed = await showConfirmationDialog(
                `¿Estás seguro de que quieres eliminar la marca "${nombre}"?`,
                'Confirmar Eliminación',
                'danger', // Tipo 'danger' para un modal de eliminación
                'Sí, Eliminar',
                'No, Cancelar'
            );

            if (confirmed) {
                try {
                    const response = await fetch(`${API_URL}/${id}`, {
                        method: 'DELETE',
                        headers: { 
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (!response.ok) {
                        const contentType = response.headers.get("content-type");
                        let errorMessage = `Error al eliminar la marca: ${response.statusText}`;

                        if (contentType && contentType.includes("application/json")) {
                            try {
                                const errorData = await response.json();
                                errorMessage = errorData.message || errorMessage;
                            } catch (jsonParseError) {
                                console.error('Error parsing JSON error response:', jsonParseError);
                                errorMessage = `Error inesperado del servidor (falló parseo JSON): ${response.statusText}`;
                            }
                        } else {
                            try {
                                const textError = await response.text();
                                errorMessage = `Error del servidor: ${textError.substring(0, 200)}...`;
                                console.error('Server responded with non-JSON error:', textError);
                            } catch (textReadError) {
                                console.error('Error reading text error response:', textReadError);
                                errorMessage = `Error inesperado del servidor: ${response.statusText}`;
                            }
                        }
                        
                        if (response.status === 401 || response.status === 403) {
                            showToast('Su sesión ha expirado o no tiene permisos. Por favor, inicie sesión nuevamente.', 'danger', 'Error de Autenticación');
                            window.location.href = 'login.html';
                            return;
                        }
                        throw new Error(errorMessage);
                    }

                    // Si la eliminación fue exitosa, recargar la tabla
                    await cargarMarcas();
                    showToast(`Marca "${nombre}" eliminada exitosamente.`, 'success', 'Operación Exitosa');

                } catch (error) {
                    console.error('Error al eliminar marca:', error);
                    showToast(`Hubo un error al eliminar la marca: ${error.message}`, 'danger', 'Error al Eliminar');
                }
            }
        }
    });
});