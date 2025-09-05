document.addEventListener('DOMContentLoaded', async () => {
    // 1. Obtener el token JWT del localStorage
    const jwtToken = localStorage.getItem('jwtToken');
    const baseUrl = window.API_BASE_URL;


    // Si no hay token, el usuario no está autenticado, redirigir a login
    if (!jwtToken) {
        console.warn('No JWT token found. Redirecting to login.');
        window.location.href = 'login.html';
        return;
    }

    // 2. Función genérica para hacer peticiones, incluyendo el token JWT
    const authenticatedFetch = async (url, options = {}) => {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            }
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers,
            }
        };

        try {
            const response = await fetch(url, mergedOptions);

            if (response.status === 401 || response.status === 403) {
                console.error('Authentication/Authorization error:', response.status);
                alert('Su sesión ha expirado o no tiene permisos. Por favor, inicie sesión nuevamente.');
                localStorage.removeItem('jwtToken');
                window.location.href = 'login.html';
                return null;
            }

            return response;
        } catch (error) {
            console.error('Network error:', error);
            return null;
        }
    };

    // Inicialización de la tabla simple-datatables
    let datatable;
    const datatablesSimple = document.getElementById('datatablesSimple');

    // Variables globales para el estado de los filtros
    let filterEstado = 'PENDIENTE'; // <-- Valor inicial cambiado a 'PENDIENTE'
    let filterStock = null;

    // Función para obtener la clase de color del botón según el estado
    function getStatusButtonClass(status) {
        switch (status) {
            case 'PENDIENTE':
                return 'btn-warning';
            case 'RESUELTO':
                return 'btn-success';
            case 'CANCELADO':
                return 'btn-danger';
            default:
                return 'btn-secondary';
        }
    }

    // Nueva función para obtener la clase de color del botón de stock
    function getStockButtonClass(hasStock) {
        return hasStock ? 'btn-success' : 'btn-secondary';
    }

    // Función principal para cargar y renderizar los pedidos desde el backend
    async function fetchAndRenderPedidos() {
        const url = new URL(`${baseUrl}/pedidoPendiente`);

        if (filterEstado !== 'ALL') {
            url.searchParams.append('estado', filterEstado);
        }
        if (filterStock !== null) {
            url.searchParams.append('conStock', filterStock === 'Con Stock');
        }

        try {
            const response = await authenticatedFetch(url);
            if (!response || !response.ok) {
                throw new Error('Error al obtener los pedidos.');
            }
            const pedidos = await response.json();

            // 1. Destruir la instancia de la tabla si existe
            if (datatable) {
                datatable.destroy();
                datatable = null;
            }

            // 2. Asegurarse de que el tbody exista antes de manipularlo
            let tableBody = datatablesSimple.querySelector('tbody');
            if (!tableBody) {
                tableBody = document.createElement('tbody');
                datatablesSimple.appendChild(tableBody);
            }

            // 3. Limpiamos el tbody para volver a construirlo
            tableBody.innerHTML = '';

            // 4. Construimos las filas de la tabla
            pedidos.forEach(pedido => {
                const row = document.createElement('tr');
                row.setAttribute('data-status', pedido.estado);

                const tieneStock = pedido.stockProducto >= pedido.unidadesSolicitadas;
                const stockStatus = tieneStock ? 'Con Stock' : 'Sin Stock';
                row.setAttribute('data-stock', stockStatus);
                
                // Nuevas variables para deshabilitar los botones de acción
                const accionesDeshabilitadas = (pedido.estado === 'CANCELADO' || pedido.estado === 'RESUELTO');
                const disabledAttribute = accionesDeshabilitadas ? 'disabled' : '';
                const editButtonClass = accionesDeshabilitadas ? 'btn-secondary' : 'btn-primary';

                const realizarVentaButtonDisabled = (accionesDeshabilitadas || !tieneStock);
                const realizarVentaButtonClass = realizarVentaButtonDisabled ? 'btn-secondary' : 'btn-success';
                const realizarVentaButtonAttribute = realizarVentaButtonDisabled ? 'disabled' : '';

                const estadoButtonClass = getStatusButtonClass(pedido.estado);
                const stockButtonClass = getStockButtonClass(tieneStock);

                // Creamos la cadena con el nombre completo del cliente. 
                const nombreCompletoCliente = `${pedido.nombreCliente} ${pedido.apellidoCliente}`;

                // Creamos la cadena del producto con la marca y el peso
                const productoInfo = `${pedido.nombreMarca} ${pedido.nombreProducto} (${pedido.peso} kg)`;

                row.innerHTML = `
                    <td>${pedido.idPedidoPendiente}</td>
                    <td>${nombreCompletoCliente}</td>
                    <td>${pedido.fechaSolicitud}</td>
                    <td>${productoInfo}</td> 
                    <td>${pedido.unidadesSolicitadas}</td>
                    <td class="text-center"><span class="btn btn-sm ${estadoButtonClass} disabled">${pedido.estado}</span></td>
                    <td class="text-center"><span class="btn btn-sm ${stockButtonClass} disabled">${stockStatus}</span></td>
                    <td>
                        <button class="btn btn-sm ${editButtonClass} me-1 edit-btn" ${disabledAttribute} data-bs-toggle="modal" data-bs-target="#editModal" 
                            data-id="${pedido.idPedidoPendiente}" 
                            data-cliente="${nombreCompletoCliente}" 
                            data-fecha="${pedido.fechaSolicitud}" 
                            data-producto="${pedido.nombreProducto}" 
                            data-unidades="${pedido.unidadesSolicitadas}" 
                            data-estado="${pedido.estado}">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-sm ${realizarVentaButtonClass} sale-btn" ${realizarVentaButtonAttribute} 
                            data-id="${pedido.idPedidoPendiente}"
                            data-cliente-id="${pedido.idCliente}"
                            data-cliente-nombre="${nombreCompletoCliente}"
                            data-producto-id="${pedido.idProducto}"
                            data-nombre-producto="${pedido.nombreProducto}"
                            data-marca-producto="${pedido.nombreMarca}"
                            data-unidades="${pedido.unidadesSolicitadas}"
                            data-precio-unitario="${pedido.precioUnitario}"
                            >
                            <i class="fas fa-check"></i> Realizar Venta
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });

            // 5. Siempre inicializamos la tabla. El plugin se encarga
            // de mostrar el mensaje de "noRows" si no hay datos.
            if (datatablesSimple) {
                datatable = new simpleDatatables.DataTable(datatablesSimple, {
                    labels: {
                        placeholder: "Buscar...",
                        perPage: "Registros por página",
                        noRows: "No se encontraron registros",
                        noResults: "No se encontraron resultados que coincidan con tu búsqueda",
                        info: "Mostrando de {start} a {end} de {rows} registros",
                        next: "Siguiente",
                        prev: "Anterior"
                    },
                });
            }
            if (pedidos.length > 0) {
                showToast('Productos faltantes cargados correctamente.', 'success', 'Exito');
            } else {
                showToast('No se encontraron pedidos.', 'info', 'Sin Registros');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    // --- NUEVA LÓGICA: Redirección del botón "Realizar Venta" ---
    datatablesSimple.addEventListener('click', (event) => {
        const button = event.target.closest('.sale-btn');
        if (button) {
            const url = new URL('realizarVenta.html', window.location.href);
            url.searchParams.append('pedidoId', button.dataset.id);
            url.searchParams.append('clienteId', button.dataset.clienteId);
            url.searchParams.append('nombreCliente', button.dataset.clienteNombre);
            url.searchParams.append('productoId', button.dataset.productoId);
            url.searchParams.append('unidades', button.dataset.unidades);
            url.searchParams.append('nombreProducto', button.dataset.nombreProducto);
            url.searchParams.append('marcaProducto', button.dataset.marcaProducto);
            url.searchParams.append('precioUnitario', button.dataset.precioUnitario);

            window.location.href = url.href;
        }
    });
    // --- FIN DE LA LÓGICA NUEVA ---

    // Al cargar la página, carga los pedidos por primera vez
    // y selecciona el estado 'PENDIENTE' en el filtro
    fetchAndRenderPedidos();
    document.getElementById('filterStatus').value = 'PENDIENTE';

    // Lógica para llenar el modal con los datos de la fila
    const editModal = document.getElementById('editModal');
    if (editModal) {
        editModal.addEventListener('show.bs.modal', event => {
            const button = event.relatedTarget;
            const id = button.getAttribute('data-id');
            const cliente = button.getAttribute('data-cliente');
            const fecha = button.getAttribute('data-fecha');
            const producto = button.getAttribute('data-producto');
            const unidades = button.getAttribute('data-unidades');
            const estado = button.getAttribute('data-estado');

            const modalTitle = editModal.querySelector('.modal-title');
            const pedidoId = editModal.querySelector('#pedidoId');
            const clienteName = editModal.querySelector('#clienteName');
            const fechaSolicitud = editModal.querySelector('#fechaSolicitud');
            const productoSolicitado = editModal.querySelector('#productoSolicitado');
            const unidadesFaltantes = editModal.querySelector('#unidadesFaltantes');
            const estadoPedido = editModal.querySelector('#estadoPedido');

            modalTitle.textContent = `Editar Pedido #${id}`;
            pedidoId.value = id;
            clienteName.value = cliente;
            fechaSolicitud.value = fecha;
            productoSolicitado.value = producto;
            unidadesFaltantes.value = unidades;
            estadoPedido.value = estado;
        });

        // Manejador del botón "Guardar cambios" del modal
        document.getElementById('saveChanges').addEventListener('click', async () => {
            const id = document.getElementById('pedidoId').value;
            const nuevoEstado = document.getElementById('estadoPedido').value;
            const nuevasUnidades = document.getElementById('unidadesFaltantes').value;

            const updateData = {
                estado: nuevoEstado,
                unidadesSolicitadas: parseInt(nuevasUnidades)
            };

            const response = await authenticatedFetch(`${baseUrl}/pedidoPendiente/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(updateData)
            });

            if (!response || !response.ok) {
                console.error('Error al actualizar el pedido');
            } else {
                const modal = bootstrap.Modal.getInstance(editModal);
                modal.hide();
                fetchAndRenderPedidos();
            }
        });
    }

    // Manejador del select de estado
    document.getElementById('filterStatus').addEventListener('change', (event) => {
        filterEstado = event.target.value;
        if (filterEstado === 'ALL') {
            filterStock = null;
            document.getElementById('filterConStock').classList.remove('active');
            document.getElementById('filterSinStock').classList.remove('active');
        }
        fetchAndRenderPedidos();
    });

    // Manejador del botón "Con Stock"
    document.getElementById('filterConStock').addEventListener('click', (event) => {
        if (filterStock === 'Con Stock') {
            filterStock = null;
            event.target.classList.remove('active');
        } else {
            filterStock = 'Con Stock';
            event.target.classList.add('active');
            document.getElementById('filterSinStock').classList.remove('active');
        }
        fetchAndRenderPedidos();
    });

    // Manejador del botón "Sin Stock"
    document.getElementById('filterSinStock').addEventListener('click', (event) => {
        if (filterStock === 'Sin Stock') {
            filterStock = null;
            event.target.classList.remove('active');
        } else {
            filterStock = 'Sin Stock';
            event.target.classList.add('active');
            document.getElementById('filterConStock').classList.remove('active');
        }
        fetchAndRenderPedidos();
    });
});