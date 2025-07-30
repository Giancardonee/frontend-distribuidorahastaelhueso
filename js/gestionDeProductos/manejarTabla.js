document.addEventListener('DOMContentLoaded', event => {
   

    const API_BASE_URL = 'http://localhost:8080/distribuidora/productos'; // URL base de tu API de productos
    const API_MARCAS_URL = 'http://localhost:8080/distribuidora/marcas'; // Endpoint para cargar marcas

    const nombreEnFooterSpan = document.getElementById('nombreEnFooter');
    if (nombreEnFooterSpan) {
        nombreEnFooterSpan.textContent = "Usuario Admin";
    }

    const datatablesSimple = document.getElementById('datatablesSimple');
    let productosDataTable;

    const productoModal = new bootstrap.Modal(document.getElementById('productoModal'));
    const productoModalLabel = document.getElementById('productoModalLabel');
    const formProducto = document.getElementById('formProducto');
    const productoIdInput = document.getElementById('productoId');
    const nombreProductoInput = document.getElementById('nombreProducto');
    const marcaProductoSelect = document.getElementById('marcaProducto');
    const stockProductoInput = document.getElementById('stockProducto');
    const pesoProductoInput = document.getElementById('pesoProducto');
    const precioMinoristaInput = document.getElementById('precioMinorista');
    const precioMayoristaInput = document.getElementById('precioMayorista');
    const btnGuardarCambiosProducto = document.getElementById('btnGuardarCambiosProducto');
    const btnAbrirModalNuevoProducto = document.getElementById('btnAbrirModalNuevoProducto');

    let allMarcas = [];

    function getToken() {
        return localStorage.getItem('jwtToken');
    }

    function checkAuthAndRedirect() {
        const token = getToken();
        if (!token) {
            showToast('No hay sesión activa. Por favor, inicie sesión.', 'warning', 'Sesión Requerida');
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    async function cargarMarcasEnSelect() {
        if (!checkAuthAndRedirect()) return;

        const token = getToken();
        try {
            const response = await fetch(API_MARCAS_URL, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                if (response.status === 401) {
                    showToast('Sesión expirada o no autorizada. Por favor, inicie sesión nuevamente.', 'danger', 'Error de Autenticación');
                    window.location.href = 'login.html';
                    return;
                }
                throw new Error(`Error al cargar marcas: ${response.statusText}`);
            }
            allMarcas = await response.json();
            

            marcaProductoSelect.innerHTML = '<option value="">Seleccione una marca</option>';
            allMarcas.forEach(marca => {
                const option = document.createElement('option');
                option.value = marca.idMarca;
                option.textContent = marca.nombre;
                marcaProductoSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error al cargar las marcas:', error);
            showToast('No se pudieron cargar las marcas. Asegúrate de que el endpoint ' + API_MARCAS_URL + ' esté funcionando y de tener los permisos correctos.', 'danger', 'Error de Carga');
        }
    }

    btnAbrirModalNuevoProducto.addEventListener('click', function() {
        if (!checkAuthAndRedirect()) return;
        console.log('Clic en botón "Registrar Producto". Abriendo modal de nuevo producto.'); 

        productoModalLabel.innerHTML = '<i class="fas fa-plus-circle me-2"></i> Registrar Nuevo Producto';
        btnGuardarCambiosProducto.textContent = 'Guardar Producto';
        productoIdInput.value = '';
        formProducto.reset();
        formProducto.classList.remove('was-validated');
        formProducto.querySelectorAll('.form-control, .form-select').forEach(input => {
            input.classList.remove('is-invalid');
            input.setCustomValidity("");
        });
        
        const feedbackMinorista = document.getElementById('feedbackPrecioMinorista');
        const feedbackMayorista = document.getElementById('feedbackPrecioMayorista'); 
        if (feedbackMinorista) feedbackMinorista.textContent = "";
        if (feedbackMayorista) feedbackMayorista.textContent = "";

        precioMinoristaInput.classList.remove('is-invalid');
        precioMayoristaInput.classList.remove('is-invalid');
        cargarMarcasEnSelect();
        productoModal.show();
    });

    async function cargarProductosEnTabla() {
        if (!checkAuthAndRedirect()) return;
        console.log('Cargando productos en la tabla...');

        const token = getToken();
        try {
            const response = await fetch(API_BASE_URL, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                if (response.status === 401) {
                    showToast('Sesión expirada o no autorizada. Por favor, inicie sesión nuevamente.', 'danger', 'Error de Autenticación');
                    window.location.href = 'login.html';
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const productos = await response.json();
            

            // Si DataTable ya está inicializada, la destruimos para recargar
            if (productosDataTable) {
                productosDataTable.destroy();
                
            }

            const tbody = datatablesSimple.querySelector('tbody');
            
            if (tbody) {
                
                tbody.innerHTML = ''; // Limpiar el tbody
            } else {
                
                return; // Detener si no hay tbody
            }


            productos.forEach(producto => {
                const row = tbody.insertRow();
                row.id = `producto_${producto.idProducto}`;

                row.insertCell(0).textContent = producto.idProducto;
                row.insertCell(1).textContent = producto.nombreMarca || 'N/A';
                row.insertCell(2).textContent = producto.nombre;
                row.insertCell(3).textContent = producto.peso !== null ? `${producto.peso.toFixed(2)} kg` : '';
                row.insertCell(4).textContent = producto.stock;
                row.insertCell(5).textContent = producto.precioMinorista !== null ? `$${producto.precioMinorista.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
                row.insertCell(6).textContent = producto.precioMayorista !== null ? `$${producto.precioMayorista.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';

                const actionsCell = row.insertCell(7);
                actionsCell.classList.add('table-actions');

                const marcaEncontrada = allMarcas.find(m => m.nombre === producto.nombreMarca);
                const idMarcaParaEditar = marcaEncontrada ? marcaEncontrada.idMarca : '';

                // HTML de los botones en una sola línea para evitar problemas de saltos de línea
                actionsCell.innerHTML = `
                    <button class="btn btn-sm btn-info text-white btn-editar-producto" data-id="${producto.idProducto}" data-nombre="${producto.nombre}" data-idmarca="${idMarcaParaEditar}" data-peso="${producto.peso || ''}" data-stock="${producto.stock}" data-preciominorista="${producto.precioMinorista || ''}" data-preciomayorista="${producto.precioMayorista || ''}"><i class="fas fa-edit"></i> Editar</button>
                    <button class="btn btn-sm btn-danger btn-eliminar-producto" data-id="${producto.idProducto}" data-nombre="${producto.nombre}"><i class="fas fa-trash-alt"></i> Eliminar</button>
                `;
            });

            // Re-inicializar DataTable después de poblar la tabla
            if (datatablesSimple) {
                productosDataTable = new simpleDatatables.DataTable(datatablesSimple, {
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
                

                // DEBUG: Verificar si el tbody aún existe y es el mismo después de la inicialización
                const newTbodyAfterInit = datatablesSimple.querySelector('tbody');
                if (newTbodyAfterInit && newTbodyAfterInit === tbody) {
                    console.log('tbody es el mismo después de la inicialización de DataTable.');
                } else if (newTbodyAfterInit) {
                    console.warn('ADVERTENCIA: tbody ha sido reemplazado por simple-datatables.');
                } else {
                    console.error('ERROR: tbody no encontrado después de la inicialización de DataTable.');
                }
            }
        } catch (error) {
            console.error('Error al obtener productos:', error);
            showToast('Error al cargar los productos. Por favor, inténtalo de nuevo.', 'danger', 'Error de Carga');
        }
    }

    if (checkAuthAndRedirect()) {
        cargarMarcasEnSelect().then(() => {
            cargarProductosEnTabla();
        });
    }

    // Event listener para los botones de Editar y Eliminar (delegación de eventos)
    // Se adjunta al elemento datatablesSimple (la tabla completa)
    // Esto es más robusto porque simple-datatables no suele reemplazar el elemento principal <table>
    datatablesSimple.addEventListener('click', function(e) {
        console.log('Clic detectado en #datatablesSimple. Target:', e.target); // DEBUG
        
        const editButton = e.target.closest('.btn-editar-producto');
        const deleteButton = e.target.closest('.btn-eliminar-producto');

        if (editButton) {
            const button = editButton;
            console.log('Clic en botón "Editar". ID Producto:', button.dataset.id); // DEBUG

            productoModalLabel.innerHTML = '<i class="fas fa-edit me-2"></i> Editar Datos de Producto';
            btnGuardarCambiosProducto.textContent = 'Guardar Cambios';

            productoIdInput.value = button.dataset.id;
            nombreProductoInput.value = button.dataset.nombre;
            stockProductoInput.value = button.dataset.stock;
            pesoProductoInput.value = button.dataset.peso;
            precioMinoristaInput.value = button.dataset.preciominorista;
            precioMayoristaInput.value = button.dataset.preciomayorista;

            const idMarcaProducto = button.dataset.idmarca;
            if (idMarcaProducto) {
                marcaProductoSelect.value = idMarcaProducto;
            } else {
                marcaProductoSelect.value = '';
            }

            formProducto.classList.remove('was-validated');
            formProducto.querySelectorAll('.form-control, .form-select').forEach(input => {
                input.classList.remove('is-invalid');
                input.setCustomValidity("");
            });
            // Asegurarse de limpiar los feedback aquí también, obteniendo la referencia directamente
            const feedbackMinorista = document.getElementById('feedbackPrecioMinorista');
            const feedbackMayorista = document.getElementById('feedbackPrecioMayorista'); // ID CORREGIDO
            if (feedbackMinorista) feedbackMinorista.textContent = "";
            if (feedbackMayorista) feedbackMayorista.textContent = "";

            precioMinoristaInput.classList.remove('is-invalid');
            precioMayoristaInput.classList.remove('is-invalid');

            productoModal.show();
            console.log('Modal de edición abierto para producto ID:', button.dataset.id); // DEBUG
        } else if (deleteButton) {
            const button = deleteButton;
            const id = button.dataset.id;
            const nombreProducto = button.dataset.nombre;
            console.log('Clic en botón "Eliminar". ID Producto:', id, 'Nombre:', nombreProducto); // DEBUG
            eliminarProducto(id, nombreProducto);
        }
    });

    function validarPrecios() {
        // OBTENER LAS REFERENCIAS AQUÍ DENTRO DE LA FUNCIÓN
        const feedbackMinorista = document.getElementById('feedbackPrecioMinorista');
        const feedbackMayorista = document.getElementById('feedbackPrecioMayorista'); // ID CORREGIDO

        const precioMinoristaVal = parseFloat(precioMinoristaInput.value);
        const precioMayoristaVal = parseFloat(precioMayoristaInput.value);

        precioMinoristaInput.setCustomValidity("");
        precioMinoristaInput.classList.remove('is-invalid');
        if (feedbackMinorista) feedbackMinorista.textContent = ""; // Verificación de existencia

        precioMayoristaInput.setCustomValidity("");
        precioMayoristaInput.classList.remove('is-invalid');
        if (feedbackMayorista) feedbackMayorista.textContent = ""; // Verificación de existencia

        const tieneMinorista = precioMinoristaInput.value.trim() !== '' && !isNaN(precioMinoristaVal);
        const tieneMayorista = precioMayoristaInput.value.trim() !== '' && !isNaN(precioMayoristaVal);

        if (!tieneMinorista && !tieneMayorista) {
            precioMinoristaInput.setCustomValidity("Debes ingresar al menos un precio (Minorista o Mayorista).");
            precioMinoristaInput.classList.add('is-invalid');
            if (feedbackMinorista) feedbackMinorista.textContent = "¡Debes ingresar al menos un precio (Minorista o Mayorista)!";
            return false;
        }

        if (tieneMinorista && precioMinoristaVal < 0) {
            precioMinoristaInput.setCustomValidity("El precio minorista no puede ser negativo.");
            precioMinoristaInput.classList.add('is-invalid');
            if (feedbackMinorista) feedbackMinorista.textContent = "¡El precio minorista no puede ser negativo!";
            return false;
        }

        if (tieneMayorista && precioMayoristaVal < 0) {
            precioMayoristaInput.setCustomValidity("El precio mayorista no puede ser negativo.");
            precioMayoristaInput.classList.add('is-invalid');
            if (feedbackMayorista) feedbackMayorista.textContent = "¡El precio mayorista no puede ser negativo!";
            return false;
        }

        return true;
    }

    precioMinoristaInput.addEventListener('input', validarPrecios);
    precioMayoristaInput.addEventListener('input', validarPrecios);

    formProducto.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Formulario de producto enviado.'); // DEBUG

        const preciosValidos = validarPrecios();

        if (!this.checkValidity() || !preciosValidos) {
            console.log('Formulario inválido o precios no válidos. Deteniendo envío.'); // DEBUG
            e.stopPropagation();
            this.classList.add('was-validated');
            return;
        }

        const id = productoIdInput.value;
        const nombre = nombreProductoInput.value;
        const idMarca = marcaProductoSelect.value ? parseInt(marcaProductoSelect.value) : null;
        const stock = parseInt(stockProductoInput.value);
        const peso = pesoProductoInput.value.trim() !== '' ? parseFloat(pesoProductoInput.value) : null;

        const precioMinorista = precioMinoristaInput.value.trim() !== '' ? parseFloat(precioMinoristaInput.value) : null;
        const precioMayorista = precioMayoristaInput.value.trim() !== '' ? parseFloat(precioMayoristaInput.value) : null;

        const productoData = {
            nombre: nombre,
            peso: peso,
            stock: stock,
            precio_minorista: precioMinorista,
            precio_mayorista: precioMayorista,
            idMarca: idMarca
        };

        let url = API_BASE_URL;
        let method = '';
        const token = getToken();

        if (!token) {
            showToast('No hay sesión activa para guardar el producto. Por favor, inicie sesión.', 'warning', 'Sesión Requerida');
            window.location.href = 'login.html';
            return;
        }

        if (id) {
            url = `${API_BASE_URL}/${id}`;
            method = 'PUT';
            console.log('Editando producto existente. ID:', id, 'Datos:', productoData); // DEBUG
        } else {
            method = 'POST';
            console.log('Creando nuevo producto. Datos:', productoData); // DEBUG
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(productoData)
            });

            if (!response.ok) {
                if (response.status === 401) {
                    showToast('Sesión expirada o no autorizada. Por favor, inicie sesión nuevamente.', 'danger', 'Error de Autenticación');
                    window.location.href = 'login.html';
                    return;
                }
                const errorData = await response.json();
                let errorMessage = errorData.message || `Error en la operación: ${response.statusText}`;
                if (errorMessage.includes("El producto con nombre") && errorMessage.includes("ya existe.")) {
                    // Extract only the part "El producto con nombre ... ya existe."
                    const startIndex = errorMessage.indexOf("El producto con nombre");
                    const endIndex = errorMessage.indexOf("ya existe.") + "ya existe.".length;
                    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
                        errorMessage = errorMessage.substring(startIndex, endIndex);
                    } else {
                        // Fallback if the expected phrase structure is not found
                        errorMessage = "El producto ya existe.";
                    }
                } else if (errorMessage.includes("Ha ocurrido un error inesperado.")) {
                    // For a more generic unexpected error, just shorten it to "Error inesperado."
                    errorMessage = "Error inesperado. Por favor, intente de nuevo más tarde.";
                }

               throw new Error(errorMessage);
            }

            const responseProducto = await response.json();
            console.log('Producto guardado/actualizado con éxito:', responseProducto); // DEBUG

            showToast(`Producto "${responseProducto.nombre}" ${id ? 'actualizado' : 'registrado'} con éxito.`, 'success', 'Operación Exitosa');

            requestAnimationFrame(() => {
                if (document.activeElement && document.getElementById('productoModal').contains(document.activeElement)) {
                    document.activeElement.blur();
                }
                productoModal.hide();
                console.log('Modal de producto cerrado.'); // DEBUG
            });

            formProducto.reset();
            formProducto.classList.remove('was-validated');

            cargarProductosEnTabla();

        } catch (error) {
            console.error('Error al guardar producto:', error);
            showToast(`Hubo un error al guardar el producto:  ${error.message}`, 'danger', 'Error al Guardar');
        }
    });

    document.getElementById('productoModal').addEventListener('hidden.bs.modal', function() {
        
        formProducto.reset();
        formProducto.classList.remove('was-validated');
        formProducto.querySelectorAll('.form-control, .form-select').forEach(input => {
            input.classList.remove('is-invalid');
            input.setCustomValidity("");
        });
        // OBTENER LAS REFERENCIAS DENTRO DEL LISTENER AL CERRAR EL MODAL
        const feedbackMinorista = document.getElementById('feedbackPrecioMinorista');
        const feedbackMayorista = document.getElementById('feedbackPrecioMayorista'); 
        if (feedbackMinorista) feedbackMinorista.textContent = "";
        if (feedbackMayorista) feedbackMayorista.textContent = "";

        precioMinoristaInput.classList.remove('is-invalid');
        precioMayoristaInput.classList.remove('is-invalid');


        setTimeout(() => {
            btnAbrirModalNuevoProducto.focus();
        }, 50);
    });

    async function eliminarProducto(id, nombreProducto) {
        if (!checkAuthAndRedirect()) return;
        console.log('Intentando eliminar producto. ID:', id, 'Nombre:', nombreProducto); // DEBUG

        const confirmed = await showConfirmationDialog(
            `¿Estás seguro de que quieres eliminar el producto "${nombreProducto}"?`,
            'Confirmar Eliminación',
            'danger',
            'Sí, Eliminar',
            'Cancelar'
        );

        if (confirmed) {
            console.log('Confirmación de eliminación aceptada.'); // DEBUG
            const token = getToken();
            try {
                const response = await fetch(`${API_BASE_URL}/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        showToast('Sesión expirada o no autorizada. Por favor, inicie sesión nuevamente.', 'danger', 'Error de Autenticación');
                        window.location.href = 'login.html';
                        return;
                    }
                    const errorText = await response.text();
                    throw new Error(`Error al eliminar el producto: ${response.statusText} - ${errorText}`);
                }

                showToast(`Producto "${nombreProducto}" eliminado con éxito.`, 'success', 'Operación Exitosa');
                console.log('Producto eliminado con éxito.'); // DEBUG
                await cargarProductosEnTabla();

                setTimeout(() => {
                    btnAbrirModalNuevoProducto.focus();
                }, 50);

            } catch (error) {
                console.error('Error al eliminar producto:', error);
                showToast(`Hubo un error al eliminar el producto: ${error.message}`, 'danger', 'Error al Eliminar');
            }
        } else {
            console.log('Eliminación de producto cancelada.'); // DEBUG
            setTimeout(() => {
                btnAbrirModalNuevoProducto.focus();
            }, 50);
        }
    }
});