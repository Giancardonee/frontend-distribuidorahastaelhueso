// js/realizarVenta/scriptRealizarVenta.js

document.addEventListener('DOMContentLoaded', () => {
    // --- URLs Base ---

    const BASE_URL = "http://localhost:8080";

    const API_VENTAS_URL = `${BASE_URL}/distribuidora/ventas`;
    const API_CLIENTES_URL = `${BASE_URL}/distribuidora/clientes`;
    const API_PRODUCTOS_URL = `${BASE_URL}/distribuidora/productos`;
    const API_MARCAS_URL = `${BASE_URL}/distribuidora/marcas`;
    const API_PERFIL_URL = `${BASE_URL}/distribuidora/auth/perfil`;


    // Para tener en cuenta si es un pedido pendiente
    let pedidoPendienteId = null;

    let lineaCounter = 0; // Contador para las líneas de productos en el formulario

    // --- Referencias a elementos del DOM para el formulario de registro de venta ---
    const formRegistrarVenta = document.getElementById('formRegistrarVenta');
    const productosVentaContainer = document.getElementById('productosVentaContainer');
    const btnAgregarProducto = document.getElementById('btnAgregarProducto');
    const ventaTotalVentaSpan = document.getElementById('ventaTotalVenta');


    // Referencias para la selección de Cliente en el formulario de Venta
    const ventaClienteNombreInput = document.getElementById('ventaClienteNombre');
    const ventaClienteIdInput = document.getElementById('ventaClienteId');
    const btnAbrirBuscadorCliente = document.getElementById('btnAbrirBuscadorCliente');

    let selectedClientId = null; // ID del cliente seleccionado para la venta

    // --- Referencias a elementos del DOM para el MODAL DE BÚSQUEDA DE CLIENTES ---
    const modalBuscarClienteElement = document.getElementById('modalBuscarCliente');
    const searchClienteInput = document.getElementById('searchClienteInput');
    const btnBuscarClienteModal = document.getElementById('btnBuscarClienteModal');
    const clientSearchResults = document.getElementById('clientSearchResults');

    // --- Referencias a elementos del DOM para el MODAL DE BÚSQUEDA DE PRODUCTOS ---
    const modalBuscarProductoElement = document.getElementById('modalBuscarProducto');
    const searchProductoInput = document.getElementById('searchProductoInput');
    const btnBuscarProductoModal = document.getElementById('btnBuscarProductoModal');
    const productSearchResults = document.getElementById('productSearchResults');
    const searchMarcaSelect = document.getElementById('searchMarcaSelect');

    let currentProductLineElement = null; // Para saber qué línea de producto está abriendo el modal de búsqueda

    // --- Referencias a elementos del DOM para el MODAL DE DESCUENTO POR UNIDAD ---
    const modalAplicarDescuentoElement = document.getElementById('modalAplicarDescuento');
    const descuentoProductoNombreInput = document.getElementById('descuentoProductoNombre');
    const descuentoPrecioUnitarioActualInput = document.getElementById('descuentoPrecioUnitarioActual');
    const inputValorDescuento = document.getElementById('inputValorDescuento');
    const descuentoPrecioUnitarioConDescuentoInput = document.getElementById('descuentoPrecioUnitarioConDescuento');
    const btnConfirmarDescuento = document.getElementById('btnConfirmarDescuento');
    const radioDescuentoMonto = document.getElementById('radioDescuentoMonto');
    const radioDescuentoPorcentaje = document.getElementById('radioDescuentoPorcentaje');

    let currentProductLineElementForDiscount = null; // Para saber a qué línea aplicar el descuento

    // --- Variables para almacenar la información del usuario autenticado ---
    let authenticatedUserId = null;
    let authenticatedUserName = 'Usuario No Disponible'; // Valor por defecto

    // --- Referencias a elementos del DOM del modal de detalle de venta ---
    const modalDetalleVentaElement = document.getElementById('modalDetalleVenta');
    const detalleVentaIdSpan = document.getElementById('detalleVentaId');
    const detalleVentaFechaSpan = document.getElementById('detalleVentaFecha');
    const detalleVentaClienteSpan = document.getElementById('detalleVentaCliente');
    const detalleVentaUsuarioSpan = document.getElementById('detalleVentaUsuario');
    const detalleVentaProductosTbody = document.getElementById('detalleVentaProductos');
    const detalleVentaFooter = document.getElementById('detalleVentaFooter');
    const btnDescargarComprobante = document.getElementById('btnDescargarComprobante');

    let currentSaleId = null; // Para almacenar el ID de la venta actual

    // --- Funciones de Ayuda ---

    function getAuthToken() {
        return localStorage.getItem('jwtToken');
    }

    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            console.warn("No se encontró el contenedor de toasts. No se puede mostrar el toast:", message);
            return;
        }
        const toast = document.createElement('div');
        toast.classList.add('toast', 'align-items-center', 'text-white', 'border-0');
        if (type === 'danger') {
            toast.classList.add('bg-danger');
        } else if (type === 'success') {
            toast.classList.add('bg-success');
        } else {
            toast.classList.add('bg-info'); // Por defecto u otros tipos
        }
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Cerrar"></button>
            </div>
        `;
        toastContainer.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
        bsToast.show();

        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2
        }).format(amount);
    }

    // eslint-disable-next-line no-unused-vars
    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }


    // Lógica para pre-cargar el formulario si viene de la página de productos faltantes
    const urlParams = new URLSearchParams(window.location.search);
    const pedidoIdFromUrl = urlParams.get('pedidoId');
    const clienteIdFromUrl = urlParams.get('clienteId');
    const nombreClienteFromUrl = urlParams.get('nombreCliente');
    const productoIdFromUrl = urlParams.get('productoId');

    // Función asíncrona para cargar el pedido pendiente
    async function loadPendingOrder() {
        if (pedidoIdFromUrl && clienteIdFromUrl && productoIdFromUrl) {
            pedidoPendienteId = pedidoIdFromUrl;

            // 1. Cargar el cliente
            selectedClientId = parseInt(clienteIdFromUrl);
            ventaClienteIdInput.value = clienteIdFromUrl;
            ventaClienteNombreInput.value = nombreClienteFromUrl;

            // 2. Obtener los datos completos del producto por ID
            const token = getAuthToken();
            if (!token) {
                showToast("Token de autenticación no encontrado. Por favor, inicia sesión.", 'danger');
                return;
            }

            try {
                const response = await fetch(`${API_PRODUCTOS_URL}/${productoIdFromUrl}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Error al cargar el producto: ${errorText || response.statusText}`);
                }

                const productoCompleto = await response.json();

                if (productoCompleto) {
                    // 3. Construir el objeto productData con los datos de la API y de la URL
                    const productData = {
                        idProducto: productoCompleto.idProducto,
                        nombre: productoCompleto.nombre,
                        nombreMarca: productoCompleto.nombreMarca,
                        peso: productoCompleto.peso,
                        stock: productoCompleto.stock,
                        precioMinorista: productoCompleto.precioMinorista,
                        precioMayorista: productoCompleto.precioMayorista,
                        cantidad: urlParams.get('unidades') || 1, // Usar la cantidad de la URL si existe, sino 1
                        tipoPrecio: 'MINORISTA' // Por defecto, se carga el precio minorista
                    };

                    // 4. Usar tu función addProductLine para crear la línea de producto con todos los datos
                    const newProductLine = addProductLine(productData);

                    // Deshabilitar la búsqueda para esta línea y el input de cantidad
                    if (newProductLine) {
                        newProductLine.querySelector('.btn-abrir-buscador-producto').style.display = 'none';
                        const cantidadInput = newProductLine.querySelector('.cantidad-input');
                        if (cantidadInput) {
                            cantidadInput.disabled = true;
                        }
                    }

                    showToast("Se cargó un pedido pendiente.", 'info');

                    // Recalcular el total después de la carga inicial
                    calculateTotalSale();
                } else {
                    showToast("No se pudo cargar el producto para el pedido pendiente.", 'danger');
                }
            } catch (error) {
                console.error("Error fetching product by ID:", error);
                showToast(`Error al cargar el producto: ${error.message}`, 'danger');
            }
        }
    }

    // --- FUNCIÓN PARA OBTENER EL PERFIL DEL USUARIO DESDE LA API ---
    async function fetchUserProfile() {
        const jwtToken = getAuthToken();
        if (!jwtToken) {
            console.warn('No se encontró un token JWT. No se puede obtener el perfil del usuario.');
            showToast('Tu sesión ha expirado o no estás autenticado. Por favor, inicia sesión.', 'danger');
            window.location.href = 'login.html';
            return null;
        }

        try {
            const response = await fetch(API_PERFIL_URL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwtToken}`
                },
            });

            if (response.ok) {
                const userData = await response.json();
                return {
                    id: userData.idUsuario,
                    name: userData.nombreUsuario
                };
            } else {
                const errorData = await response.json().catch(() => response.text());
                console.error('Error al cargar el perfil del usuario:', response.status, errorData);
                showToast(`Error al cargar el usuario: ${errorData.message || response.statusText}`, 'danger');
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('jwtToken');
                    window.location.href = 'login.html';
                }
                return null;
            }
        } catch (error) {
            console.error('Error de conexión al obtener el perfil del usuario:', error);
            showToast(`Error de conexión: ${error.message}`, 'danger');
            return null;
        }
    }

    async function createSale(ventaDTO) {
        const token = getAuthToken();
        if (!token) {
            showToast("Token de autenticación no encontrado. Por favor, inicia sesión.", 'error');
            window.location.href = "login.html";
            return null;
        }

        try {
            const response = await fetch(API_VENTAS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(ventaDTO)
            });

            const responseText = await response.text();
            let responseData = null;

            try {
                if (responseText) {
                    responseData = JSON.parse(responseText);
                }
            } catch (jsonParseError) {
                console.warn("La respuesta no es un JSON válido o está vacía:", responseText);
            }

            if (!response.ok) {
                let errorMessage = "Error desconocido al registrar venta.";

                if (responseData && typeof responseData === 'object' && responseData.message) {
                    errorMessage = responseData.message;
                } else if (responseText) {
                    errorMessage = `Error del servidor: ${responseText}`;
                } else {
                    errorMessage = `Error del servidor: ${response.status} ${response.statusText}`;
                }

                throw new Error(errorMessage);
            }

            if (responseData) {
                return responseData;
            } else {
                showToast("Operación exitosa, pero no se recibió JSON de vuelta.", 'info');
                return true;
            }

        } catch (error) {
            showToast(error.message, 'error');
            console.error("Detalle del error de venta:", error);
            return null;
        }
    }


    /**
* Muestra el modal de detalle de venta y carga los datos.
* @param {number} saleId - El ID de la venta a mostrar.
*/
    async function showSaleDetailsInModal(saleId) {
        currentSaleId = saleId; // Almacena el ID para la descarga
        detalleVentaIdSpan.textContent = saleId;
        detalleVentaProductosTbody.innerHTML = '<tr><td colspan="4" class="text-center">Cargando detalles...</td></tr>';

        const token = getAuthToken();
        if (!token) {
            showToast("Token de autenticación no encontrado. Por favor, inicia sesión.", 'danger');
            return;
        }

        try {
            const response = await fetch(`${API_VENTAS_URL}/${saleId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => response.text());
                throw new Error(`Error al cargar el detalle de la venta: ${errorData.message || response.statusText}`);
            }

            const sale = await response.json();
            console.log("Detalle de venta cargado:", sale);

            // Poblar información general
            detalleVentaFechaSpan.textContent = sale.fecha;
            const clienteNombreCompleto = sale.cliente ? `${sale.cliente.nombre || ''} ${sale.cliente.apellido || ''}`.trim() : 'N/A';
            detalleVentaClienteSpan.textContent = clienteNombreCompleto;
            const usuarioNombreCompleto = sale.usuario ? `${sale.usuario.nombre || ''} ${sale.usuario.apellido || ''}`.trim() : 'N/A';
            detalleVentaUsuarioSpan.textContent = usuarioNombreCompleto;

            // Poblar detalles de productos
            detalleVentaProductosTbody.innerHTML = '';
            let totalGeneral = 0; // Este será el subtotal de los productos ANTES del descuento
            if (sale.detalles && sale.detalles.length > 0) {
                sale.detalles.forEach(item => {
                    const row = document.createElement('tr');
                    // Usar item.precioUnitario ya que es el precio final registrado en el backend para el detalle
                    const subtotal = item.cantidad * item.precioUnitario;
                    totalGeneral += subtotal; // Acumular el subtotal de cada producto
                    row.innerHTML = `
                    <td>${item.nombreProducto} (${item.marcaProducto || 'Sin Marca'})</td>
                    <td>${item.cantidad}</td>
                    <td>${formatCurrency(item.precioUnitario)}</td>
                    <td>${formatCurrency(subtotal)}</td>
                `;
                    detalleVentaProductosTbody.appendChild(row);
                });
            } else {
                detalleVentaProductosTbody.innerHTML = '<tr><td colspan="4" class="text-center">No hay productos en esta venta.</td></tr>';
            }

            // --- INICIO DE CAMBIOS PARA MOSTRAR DESCUENTO Y TOTAL FINAL ---

            // Limpiar contenido existente en el tfoot antes de agregar las nuevas filas
            detalleVentaFooter.innerHTML = '';

            // Ya que el descuento es por unidad, no hay un 'descuento' global en el objeto 'sale'
            // El 'totalGeneral' ya debería reflejar el subtotal de todos los productos *con sus descuentos individuales aplicados*.
            // Por lo tanto, el total final es simplemente 'totalGeneral'.

            const totalFinalRow = document.createElement('tr');
            totalFinalRow.innerHTML = `
                <td colspan="3" class="text-end fw-bold">Total:</td>
                <td class="text-start fw-bold">${formatCurrency(totalGeneral)}</td>
            `;
            detalleVentaFooter.appendChild(totalFinalRow);

            // --- FIN DE CAMBIOS PARA MOSTRAR DESCUENTO Y TOTAL FINAL ---

            const modal = new bootstrap.Modal(modalDetalleVentaElement);
            modal.show();

        } catch (error) {
            console.error('Error al mostrar detalle de venta:', error);
            showToast(error.message, 'danger');
            detalleVentaProductosTbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error al cargar el detalle.</td></tr>';
        }
    }


    // --- Lógica del MODAL DE BÚSQUEDA Y SELECCIÓN DE CLIENTES ---

    async function searchClients(query) {
        const token = getAuthToken();
        if (!token) {
            showToast("Token de autenticación no encontrado. Por favor, inicia sesión.", 'error');
            return [];
        }
        try {
            const response = await fetch(`${API_CLIENTES_URL}/buscarPorNombreOApellido?query=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error al buscar clientes: ${errorText || response.statusText}`);
            }

            // Leer como texto primero
            const responseText = await response.text();

            // Si está vacío, devolvemos array vacío para que no falle el JSON.parse
            if (!responseText) {
                return [];
            }

            return JSON.parse(responseText);

        } catch (error) {
            console.error("Error fetching clients:", error);
            showToast(`Error al buscar clientes: ${error.message}`, 'error');
            return [];
        }
    }


    btnAbrirBuscadorCliente.addEventListener('click', () => {
        searchClienteInput.value = '';
        clientSearchResults.innerHTML = '<p class="text-muted">Escribe un nombre o apellido y haz clic en "Buscar".</p>';
        const searchModal = new bootstrap.Modal(modalBuscarClienteElement);
        searchModal.show();
    });

    btnBuscarClienteModal.addEventListener('click', async () => {
        const query = searchClienteInput.value.trim();
        if (query.length < 3) {
            clientSearchResults.innerHTML = '<div class="alert alert-warning">Ingrese al menos 3 caracteres para buscar.</div>';
            return;
        }

        clientSearchResults.innerHTML = '<div class="text-center my-3"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Cargando...</span></div></div>'; // Indicador de carga

        const clients = await searchClients(query);
        clientSearchResults.innerHTML = '';

        if (clients.length > 0) {
            const ul = document.createElement('ul');
            ul.classList.add('list-group', 'list-group-flush');
            clients.forEach(client => {
                const li = document.createElement('li');
                li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
                li.innerHTML = `
                    <div>
                        <strong>${client.nombre} ${client.apellido || ''}</strong><br>
                        <small>Teléfono: ${client.telefono || 'N/A'}</small>
                        <br>
                         <small>Domicilio: ${client.domicilio || 'N/A'}</small>
                    </div>
                    <button type="button" class="btn btn-success btn-sm btn-select-client rounded-md"
                            data-client-id="${client.idCliente}"
                            data-client-nombre="${client.nombre}"
                            data-client-apellido="${client.apellido || ''}">
                        Seleccionar
                    </button>
                `;
                ul.appendChild(li);
            });
            clientSearchResults.appendChild(ul);
        } else {
            clientSearchResults.innerHTML = '<div class="alert alert-info">No se encontraron clientes con ese criterio.</div>';
        }
    });

    clientSearchResults.addEventListener('click', (event) => {
        if (event.target.classList.contains('btn-select-client')) {
            const btn = event.target;
            const clientId = btn.dataset.clientId;
            const clientNombre = btn.dataset.clientNombre;
            const clientApellido = btn.dataset.clientApellido;
            const fullName = `${clientNombre} ${clientApellido}`.trim();

            selectedClientId = parseInt(clientId);
            ventaClienteIdInput.value = clientId;
            ventaClienteNombreInput.value = fullName;
            ventaClienteNombreInput.classList.remove('is-invalid');
            ventaClienteNombreInput.removeAttribute('placeholder');

            const searchModal = bootstrap.Modal.getInstance(modalBuscarClienteElement);
            if (searchModal) {
                // Mueve el foco antes de ocultar el modal
                ventaClienteNombreInput.focus();
                searchModal.hide();
            }
            // Agregamos una función para eliminar el backdrop de forma segura
            modalBuscarClienteElement.addEventListener('hidden.bs.modal', () => {
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) {
                    backdrop.remove();
                }
            }, { once: true }); // Usamos { once: true } para que el evento se ejecute solo una vez.

            showToast(`Cliente "${fullName}" seleccionado.`, 'success');
        }
    });

    // --- Lógica del MODAL DE BÚSQUEDA Y SELECCIÓN DE PRODUCTOS ---

    // Función para obtener las marcas activas y popular el select
    async function fetchAndPopulateActiveBrands() {
        const token = getAuthToken();
        if (!token) {
            showToast("Token de autenticación no encontrado. Por favor, inicia sesión.", 'error');
            return;
        }
        try {
            const response = await fetch(API_MARCAS_URL, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error al cargar marcas: ${errorText || response.statusText}`);
            }
            const marcas = await response.json();

            // Limpiar opciones existentes, excepto la primera (Todas las marcas)
            searchMarcaSelect.innerHTML = '<option value="">-- Todas las marcas --</option>';
            marcas.forEach(marca => {
                const option = document.createElement('option');
                option.value = marca.idMarca;
                option.textContent = marca.nombre;
                searchMarcaSelect.appendChild(option);
            });

        } catch (error) {
            console.error("Error fetching active brands:", error);
            showToast(`Error al cargar marcas: ${error.message}`, 'error');
        }
    }


    // Modifica la función searchProducts para enviar dos parámetros
    async function searchProducts(nombreProducto, idMarca) {
        const token = getAuthToken();
        if (!token) {
            showToast("Token de autenticación no encontrado. Por favor, inicia sesión.", 'error');
            return [];
        }
        try {
            let url = `${API_PRODUCTOS_URL}/buscarCombinado?`;

            const params = new URLSearchParams();
            if (nombreProducto && nombreProducto.trim() !== '') {
                params.append('nombreProducto', nombreProducto.trim());
            }
            if (idMarca && idMarca !== '') {
                params.append('idMarca', idMarca);
            }

            url += params.toString();

            if (params.toString() === '') {
                productSearchResults.innerHTML = '<div class="alert alert-warning">Por favor, ingrese un nombre de producto o seleccione una marca para buscar.</div>';
                return [];
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error al buscar productos: ${errorText || response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error("Error fetching products:", error);
            showToast(`Error al buscar productos: ${error.message}`, 'error');
            return [];
        }
    }


    // Listener para el botón de búsqueda de productos
    btnBuscarProductoModal.addEventListener('click', async () => {
        const nombreProducto = searchProductoInput.value.trim();
        const idMarca = searchMarcaSelect.value;

        if (nombreProducto.length < 3 && idMarca === '') {
            productSearchResults.innerHTML = '<div class="alert alert-warning">Ingrese al menos 3 caracteres para el nombre del producto, o seleccione una marca.</div>';
            return;
        }

        productSearchResults.innerHTML = '<div class="text-center my-3"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Cargando...</span></div></div>';

        const products = await searchProducts(nombreProducto, idMarca);
        productSearchResults.innerHTML = '';

        if (products.length > 0) {
            const ul = document.createElement('ul');
            ul.classList.add('list-group', 'list-group-flush');
            products.forEach(product => {
                const li = document.createElement('li');
                li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center', 'flex-wrap');
                li.innerHTML = `
                    <div class="col-12 col-md-8 mb-2 mb-md-0">
                        <strong>${product.nombre} ${product.peso !== undefined && product.peso !== null ? product.peso.toFixed(2) + ' kg' : ''}</strong><br>
                        <small> <strong> Marca:${product.nombreMarca ? product.nombreMarca : 'N/A'}</strong></small><br>
                        <small>Peso: ${product.peso !== undefined && product.peso !== null ? product.peso.toFixed(2) + ' kg' : 'N/A'}</small><br>
                        <small>Stock: ${product.stock !== undefined && product.stock !== null ? product.stock : 'N/A'}</small> <br>
                        <small>P. Minorista: ${formatCurrency(product.precioMinorista || 0)}</small><br>
                        <small>P. Mayorista: ${formatCurrency(product.precioMayorista || 0)}</small><br>

                    </div>
                    <div class="col-12 col-md-4 text-end">
                    <button type="button" class="btn btn-success btn-sm btn-select-product rounded-md"
                            data-product-id="${product.idProducto}"
                            data-product-nombre="${product.nombre}"
                            data-product-nombre-marca="${product.nombreMarca || ''}"
                            data-product-peso="${product.peso !== undefined && product.peso !== null ? product.peso : ''}"
                            data-product-precio-minorista="${product.precioMinorista || 0}"
                            data-product-precio-mayorista="${product.precioMayorista || 0}"
                            data-product-stock="${product.stock || 0}"> Seleccionar
                    </button>
                    </div>
                `;
                ul.appendChild(li);
            });
            productSearchResults.appendChild(ul);
        } else {
            productSearchResults.innerHTML = '<div class="alert alert-info">No se encontraron productos con ese criterio.</div>';
        }
    });

    

    productSearchResults.addEventListener('click', (event) => {
        if (event.target.classList.contains('btn-select-product')) {
            const btn = event.target;
            const productId = parseInt(btn.dataset.productId);
            const productName = btn.dataset.productNombre;
            const precioMinorista = parseFloat(btn.dataset.productPrecioMinorista);
            const precioMayorista = parseFloat(btn.dataset.productPrecioMayorista);
            const stockDisponible = parseInt(btn.dataset.productStock);
            const productMarca = btn.dataset.productNombreMarca;
            const productPeso = btn.dataset.productPeso;

            if (currentProductLineElement) {
                const productoInput = currentProductLineElement.querySelector('.producto-input');
                const productoIdHidden = currentProductLineElement.querySelector('.producto-id-hidden');
                const productoPrecioMinoristaHidden = currentProductLineElement.querySelector('.producto-precio-minorista-hidden');
                const productoPrecioMayoristaHidden = currentProductLineElement.querySelector('.producto-precio-mayorista-hidden');
                const productoStockHidden = currentProductLineElement.querySelector('.producto-stock-hidden');

                productoPrecioMinoristaHidden.value = precioMinorista.toFixed(2);
                productoPrecioMayoristaHidden.value = precioMayorista.toFixed(2);
                productoStockHidden.value = stockDisponible;

                const nombreCompleto = `${productMarca || ''} ${productName || ''} ${productPeso ? productPeso + 'kg' : ''}`.trim();
                productoInput.value = nombreCompleto;

                productoIdHidden.value = productId;

                const precioUnitarioInput = currentProductLineElement.querySelector('.precio-unitario-input');
                const radioMinorista = currentProductLineElement.querySelector('.tipo-precio-radio[value="MINORISTA"]');
                if (radioMinorista) {
                    radioMinorista.checked = true;
                }
                precioUnitarioInput.value = precioMinorista.toFixed(2);

                productoInput.classList.remove('is-invalid');

                // Llamamos a la función de cálculo
                calculateLineSubtotalAndTotal({ target: currentProductLineElement.querySelector('.cantidad-input') });
            }

            // --- CAMBIO CLAVE: Lógica de cierre del modal mejorada ---
            const searchModal = bootstrap.Modal.getInstance(modalBuscarProductoElement);
            if (searchModal) {
                // Mueve el foco a un elemento fuera del modal antes de cerrarlo
                const cantidadInput = currentProductLineElement.querySelector('.cantidad-input');
                if (cantidadInput) {
                    cantidadInput.focus();
                }
                searchModal.hide();
            }

            // --- Asegurar que el backdrop se elimine ---
            modalBuscarProductoElement.addEventListener('hidden.bs.modal', () => {
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) {
                    backdrop.remove();
                }
            }, { once: true });
            
            showToast(`Producto "${productName}" seleccionado.`, 'success');
        }
    });


    // --- Lógica de Líneas de Producto en el Formulario ---

    btnAgregarProducto.addEventListener('click', () => addProductLine({}));

    function addProductLine(productData = {}) {
        lineaCounter++;
        const newRow = document.createElement('div');
        newRow.classList.add('row', 'g-2', 'align-items-center', 'mb-2', 'producto-linea');
        newRow.setAttribute('data-linea-id', lineaCounter);
        newRow.innerHTML = `
            <div class="col-md-4">
                <label for="productoVenta_${lineaCounter}" class="visually-hidden-on-small-screens">Producto:</label>
                <div class="input-group">
                    <input type="text" class="form-control producto-input" id="productoVenta_${lineaCounter}" placeholder="Seleccione un producto..." required readonly value="${[productData.nombreMarca, productData.nombre, productData.peso ? productData.peso.toFixed(2) + ' kg' : ''].filter(Boolean).join(' ') || ''}">
                    <button class="btn btn-outline-secondary btn-abrir-buscador-producto rounded-md" type="button"><i class="fas fa-search"></i></button>
                </div>
                <input type="hidden" class="producto-id-hidden" value="${productData.idProducto || ''}">
                <input type="hidden" class="producto-precio-minorista-hidden" value="${productData.precioMinorista ? productData.precioMinorista.toFixed(2) : '0.00'}">
                <input type="hidden" class="producto-precio-mayorista-hidden" value="${productData.precioMayorista ? productData.precioMayorista.toFixed(2) : '0.00'}">
                <input type="hidden" class="producto-stock-hidden" value="${productData.stock || 0}"> <div class="invalid-feedback">Seleccione un producto válido.</div>
            </div>
            <div class="col-md-1">
                <label for="cantidadVenta_${lineaCounter}" class="visually-hidden-on-small-screens">Cant.:</label>
                <input type="number" class="form-control cantidad-input" id="cantidadVenta_${lineaCounter}" min="1" value="${productData.cantidad || 1}" required>
                <div class="invalid-feedback cantidad-invalid-feedback">Cantidad inválida.</div>
            </div>
            <div class="col-md-2">
                <label for="precioUnitarioVenta_${lineaCounter}" class="visually-hidden-on-small-screens">P. Unitario:</label>
                <div class="input-group">
                    <input type="number" step="0.01" class="form-control precio-unitario-input" id="precioUnitarioVenta_${lineaCounter}" placeholder="P. Unitario" required min="0.00" readonly value="${productData.precioUnitario ? productData.precioUnitario.toFixed(2) : '0.00'}">
                    <button class="btn btn-outline-info btn-aplicar-descuento rounded-md" type="button" title="Aplicar Descuento"><i class="fas fa-percentage"></i></button>
                </div>
                <div class="invalid-feedback">Precio inválido.</div>
            </div>
            <div class="col-md-2">
                <label class="visually-hidden-on-small-screens">Tipo Precio:</label>
                <div class="producto-tipo-precio-container">
                    <div class="form-check form-check-inline">
                        <input class="form-check-input tipo-precio-radio" type="radio" name="tipoPrecioProducto_${lineaCounter}" id="radioMinorista_${lineaCounter}" value="MINORISTA" ${productData.tipoPrecio === 'MINORISTA' || !productData.tipoPrecio ? 'checked' : ''}>
                        <label class="form-check-label" for="radioMinorista_${lineaCounter}">Min.</label>
                    </div>
                    <div class="form-check form-check-inline">
                        <input class="form-check-input tipo-precio-radio" type="radio" name="tipoPrecioProducto_${lineaCounter}" id="radioMayorista_${lineaCounter}" value="MAYORISTA" ${productData.tipoPrecio === 'MAYORISTA' ? 'checked' : ''}>
                        <label class="form-check-label" for="radioMayorista_${lineaCounter}">May.</label>
                    </div>
                </div>
            </div>
            <div class="col-md-2">
                <label for="subtotalVenta_${lineaCounter}" class="visually-hidden-on-small-screens">Subtotal:</label>
                <input type="text" class="form-control subtotal-input" id="subtotalVenta_${lineaCounter}" readonly value="${formatCurrency(productData.subtotal || 0)}" data-unformatted-subtotal="${(productData.subtotal || 0).toFixed(2)}">
            </div>
            <div class="col-md-1">
                <button type="button" class="btn btn-danger btn-sm btn-remover-producto rounded-md"><i class="fas fa-minus-circle"></i></button>
            </div>
        `;
        productosVentaContainer.appendChild(newRow);

        const currentLine = newRow;
        currentLine.querySelector('.btn-remover-producto').addEventListener('click', removeProductLine);
        currentLine.querySelector('.cantidad-input').addEventListener('input', calculateLineSubtotalAndTotal);
        currentLine.querySelector('.cantidad-input').addEventListener('change', calculateLineSubtotalAndTotal);
        currentLine.querySelectorAll('.tipo-precio-radio').forEach(radio => {
            radio.addEventListener('change', calculateLineSubtotalAndTotal);
        });

        currentLine.querySelector('.btn-abrir-buscador-producto').addEventListener('click', (e) => {
            currentProductLineElement = e.target.closest('.producto-linea');
            searchProductoInput.value = '';
            searchMarcaSelect.value = '';
            productSearchResults.innerHTML = '<p class="text-muted">Escribe un nombre de producto y/o selecciona una marca.</p>';

            fetchAndPopulateActiveBrands();

            const productModal = new bootstrap.Modal(modalBuscarProductoElement);
            productModal.show();
        });

        // Event Listener para abrir el modal de aplicar descuento
        currentLine.querySelector('.btn-aplicar-descuento').addEventListener('click', (e) => {
            currentProductLineElementForDiscount = e.target.closest('.producto-linea');
            const productoNombre = currentProductLineElementForDiscount.querySelector('.producto-input').value;
            const precioUnitarioActual = parseFloat(currentProductLineElementForDiscount.querySelector('.precio-unitario-input').value);

            if (!productoNombre || isNaN(precioUnitarioActual) || precioUnitarioActual <= 0) {
                showToast("Primero selecciona un producto válido y asegúrate de que tiene un precio unitario.", 'warning');
                return;
            }

            descuentoProductoNombreInput.value = productoNombre;
            descuentoPrecioUnitarioActualInput.value = formatCurrency(precioUnitarioActual);
            inputValorDescuento.value = 0; // Resetear el valor del descuento
            radioDescuentoMonto.checked = true; // Por defecto a monto fijo
            updatePrecioConDescuento(); // Recalcular el precio con descuento inicial (sin descuento)

            const discountModal = new bootstrap.Modal(modalAplicarDescuentoElement);
            discountModal.show();
        });

        if (productData.idProducto) {
            calculateLineSubtotalAndTotal({ target: currentLine.querySelector('.cantidad-input') });
        }
         return newRow; 
    }

    function removeProductLine(event) {
        event.target.closest('.producto-linea').remove();
        calculateTotalSale();
    }

    

    function calculateLineSubtotalAndTotal(event) {
    const lineElement = event.target.closest('.producto-linea');
    const productoInput = lineElement.querySelector('.producto-input'); // Nuevo
    const cantidadInput = lineElement.querySelector('.cantidad-input');
    const precioUnitarioInput = lineElement.querySelector('.precio-unitario-input');
    const subtotalInput = lineElement.querySelector('.subtotal-input');
    const tipoPrecioRadios = lineElement.querySelectorAll('.tipo-precio-radio');
    const productoIdHidden = lineElement.querySelector('.producto-id-hidden');
    const precioMinoristaHidden = lineElement.querySelector('.producto-precio-minorista-hidden');
    const precioMayoristaHidden = lineElement.querySelector('.producto-precio-mayorista-hidden');
    const productoStockHidden = lineElement.querySelector('.producto-stock-hidden');
    const cantidadInvalidFeedback = lineElement.querySelector('.cantidad-invalid-feedback');

    const cantidad = parseInt(cantidadInput.value) || 0;
    let precioUnitarioDesdeBase = 0;
    let tipoPrecioSeleccionado = '';
    const stockDisponible = parseInt(productoStockHidden.value) || 0;

    tipoPrecioRadios.forEach(radio => {
        if (radio.checked) {
            tipoPrecioSeleccionado = radio.value;
        }
    });

    if (productoIdHidden.value) {
        const precioMinorista = parseFloat(precioMinoristaHidden.value);
        const precioMayorista = parseFloat(precioMayoristaHidden.value);

        if (tipoPrecioSeleccionado === 'MAYORISTA') {
            precioUnitarioDesdeBase = precioMayorista;
        } else { // MINORISTA o default
            precioUnitarioDesdeBase = precioMinorista;
        }

        const currentDisplayedPrice = parseFloat(precioUnitarioInput.value);

        if (isNaN(currentDisplayedPrice) || currentDisplayedPrice === 0 || event.target.classList.contains('tipo-precio-radio')) {
            precioUnitarioInput.value = precioUnitarioDesdeBase.toFixed(2);
        }
    }

    const precioUnitarioParaCalculo = parseFloat(precioUnitarioInput.value) || 0;

    // ----- CAMBIO AQUÍ: LÓGICA PARA STOCK INSUFICIENTE -----
    if (cantidad > stockDisponible) {
        cantidadInput.classList.add('is-invalid');
        cantidadInvalidFeedback.textContent = `Stock insuficiente. Disponible: ${stockDisponible}`;
        cantidadInvalidFeedback.style.display = 'block';
        subtotalInput.value = formatCurrency(0);
        subtotalInput.setAttribute('data-unformatted-subtotal', '0.00');

        // Extraemos los datos del producto para el modal
        const productoNombreCompleto = productoInput.value;
        const productoNombreMatch = productoNombreCompleto.match(/(.+?)(?:\s\((.+?)\))?$/);
        const productoNombre = productoNombreMatch ? productoNombreMatch[1].trim() : productoNombreCompleto;
        const productoMarcaPeso = productoNombreMatch ? productoNombreMatch[2] : null;
        let productoMarca = null;
        let productoPeso = null;
        if (productoMarcaPeso) {
            const parts = productoMarcaPeso.split(' ');
            productoMarca = parts[0];
            productoPeso = parts.length > 1 ? parts[1].replace('kg', '') : null;
        }

        // Llamamos a la función global para mostrar el modal de faltantes
        if (window.showModalConfirmarFaltante && selectedClientId) {
            window.showModalConfirmarFaltante({
                clienteId: selectedClientId,
                clienteNombre: ventaClienteNombreInput.value,
                productoId: parseInt(productoIdHidden.value),
                productoNombre: productoNombre,
                productoMarca: productoMarca,
                productoPeso: productoPeso,
                unidadesFaltantes: cantidad - stockDisponible
            });
        }
    } else if (cantidad < 1) {
        cantidadInput.classList.add('is-invalid');
        cantidadInvalidFeedback.textContent = 'La cantidad debe ser al menos 1.';
        cantidadInvalidFeedback.style.display = 'block';
        subtotalInput.value = formatCurrency(0);
        subtotalInput.setAttribute('data-unformatted-subtotal', '0.00');
    } else {
        cantidadInput.classList.remove('is-invalid');
        cantidadInvalidFeedback.textContent = 'Cantidad inválida.';
        cantidadInvalidFeedback.style.display = 'none';

        const subtotal = cantidad * precioUnitarioParaCalculo;
        subtotalInput.value = formatCurrency(subtotal);
        subtotalInput.setAttribute('data-unformatted-subtotal', subtotal.toFixed(2));
    }

    calculateTotalSale();
    }



    function calculateTotalSale() {
        let total = 0;
        document.querySelectorAll('.producto-linea').forEach(line => {
            const subtotalInput = line.querySelector('.subtotal-input');
            const unformattedSubtotal = parseFloat(subtotalInput.getAttribute('data-unformatted-subtotal')) || 0;
            total += unformattedSubtotal;
        });
        ventaTotalVentaSpan.textContent = formatCurrency(total);
        // REMOVIDO: calculateTotalConDescuento();
    }

    // --- Funciones y Listeners del MODAL DE DESCUENTO POR UNIDAD ---

    function updatePrecioConDescuento() {
        let precioBase = parseFloat(descuentoPrecioUnitarioActualInput.value.replace('$', '').replace(/\./g, '').replace(',', '.')) || 0;
        let valorDescuento = parseFloat(inputValorDescuento.value) || 0;
        let precioFinal = precioBase;

        if (radioDescuentoMonto.checked) {
            precioFinal = precioBase - valorDescuento;
        } else if (radioDescuentoPorcentaje.checked) {
            precioFinal = precioBase * (1 - (valorDescuento / 100));
        }

        if (precioFinal < 0) {
            precioFinal = 0;
        }

        descuentoPrecioUnitarioConDescuentoInput.value = formatCurrency(precioFinal);
    }

    // Event listeners para recalcular el precio al cambiar tipo o valor de descuento
    inputValorDescuento.addEventListener('input', updatePrecioConDescuento);
    radioDescuentoMonto.addEventListener('change', updatePrecioConDescuento);
    radioDescuentoPorcentaje.addEventListener('change', updatePrecioConDescuento);

    btnConfirmarDescuento.addEventListener('click', () => {
        if (!currentProductLineElementForDiscount) {
            showToast("Error: No se ha seleccionado una línea de producto para aplicar el descuento.", 'danger');
            return;
        }

        const precioUnitarioInput = currentProductLineElementForDiscount.querySelector('.precio-unitario-input');
        const nuevoPrecioUnitario = parseFloat(descuentoPrecioUnitarioConDescuentoInput.value.replace('$', '').replace(/\./g, '').replace(',', '.')) || 0;

        if (isNaN(nuevoPrecioUnitario) || nuevoPrecioUnitario < 0) {
            showToast("El precio unitario con descuento no es válido.", 'danger');
            return;
        }

        precioUnitarioInput.value = nuevoPrecioUnitario.toFixed(2);

        // Disparar el recálculo del subtotal y total de la venta
        const cantidadInput = currentProductLineElementForDiscount.querySelector('.cantidad-input');
        calculateLineSubtotalAndTotal({ target: cantidadInput });


        const discountModal = bootstrap.Modal.getInstance(modalAplicarDescuentoElement);
        if (discountModal) {
            discountModal.hide();
        }
        showToast("Descuento aplicado al producto.", 'success');
        currentProductLineElementForDiscount = null; // Limpiar la referencia
    });

    // Limpiar el modal al cerrarse para evitar datos residuales
    modalAplicarDescuentoElement.addEventListener('hidden.bs.modal', () => {
        descuentoProductoNombreInput.value = '';
        descuentoPrecioUnitarioActualInput.value = '';
        inputValorDescuento.value = 0;
        descuentoPrecioUnitarioConDescuentoInput.value = '';
        radioDescuentoMonto.checked = true; // Resetear al tipo por defecto
        currentProductLineElementForDiscount = null;
    });


    // --- Envío del Formulario ---

    formRegistrarVenta.addEventListener('submit', async (event) => {
        event.preventDefault();
        event.stopPropagation();

        let formValid = true;
        if (!selectedClientId) {
            ventaClienteNombreInput.classList.add('is-invalid');
            formValid = false;
        } else {
            ventaClienteNombreInput.classList.remove('is-invalid');
        }

        const ventaItems = [];
        document.querySelectorAll('.producto-linea').forEach(line => {
            const productoInput = line.querySelector('.producto-input');
            const productoId = parseInt(line.querySelector('.producto-id-hidden').value);
            const cantidadInput = line.querySelector('.cantidad-input');
            const cantidad = parseInt(cantidadInput.value);
            const precioUnitarioInput = line.querySelector('.precio-unitario-input');
            const precioUnitario = parseFloat(precioUnitarioInput.value); // Obtener el precio unitario FINAL del input
            const tipoPrecioAplicadoRadio = line.querySelector('input[name^="tipoPrecioProducto_"]:checked');
            const tipoPrecioAplicado = tipoPrecioAplicadoRadio ? tipoPrecioAplicadoRadio.value : '';
            const productoStockHidden = line.querySelector('.producto-stock-hidden');
            const stockDisponible = parseInt(productoStockHidden.value) || 0;

            if (isNaN(productoId) || !productoId || isNaN(cantidad) || cantidad <= 0 || isNaN(precioUnitario) || precioUnitario < 0 || !tipoPrecioAplicado || cantidad > stockDisponible) {
                if (isNaN(productoId) || !productoId) productoInput.classList.add('is-invalid'); else productoInput.classList.remove('is-invalid');
                if (isNaN(cantidad) || cantidad <= 0 || cantidad > stockDisponible) {
                    cantidadInput.classList.add('is-invalid');
                    line.querySelector('.cantidad-invalid-feedback').textContent = `Stock insuficiente o cantidad inválida. Disponible: ${stockDisponible}`;
                    line.querySelector('.cantidad-invalid-feedback').style.display = 'block';
                } else {
                    cantidadInput.classList.remove('is-invalid');
                    line.querySelector('.cantidad-invalid-feedback').style.display = 'none';
                }
                // Cambio: precioUnitario puede ser 0 si se aplica un descuento del 100%
                if (isNaN(precioUnitario) || precioUnitario < 0) precioUnitarioInput.classList.add('is-invalid'); else precioUnitarioInput.classList.remove('is-invalid');
                formValid = false;
            } else {
                productoInput.classList.remove('is-invalid');
                cantidadInput.classList.remove('is-invalid');
                precioUnitarioInput.classList.remove('is-invalid');
                ventaItems.push({
                    idProducto: productoId,
                    cantidad: cantidad,
                    precioUnitarioAplicado: precioUnitario,
                    tipoPrecioAplicado: tipoPrecioAplicado
                });
            }
        });

        if (ventaItems.length === 0) {
            showToast("Debe agregar al menos un producto a la venta.", 'error');
            formValid = false;
        }

        if (!formValid) {
            showToast("Por favor, corrige los errores en el formulario.", 'error');
            return;
        }

        if (authenticatedUserId === null) {
            showToast("No se pudo obtener el ID del usuario autenticado. Por favor, asegúrate de haber iniciado sesión y recarga la página.", 'danger');
            return;
        }

        const ventaDTO = {
            fecha: new Date().toISOString().slice(0, 10),
            idCliente: selectedClientId,
            idUsuario: authenticatedUserId,
            detalles: ventaItems
        };

        console.log("JSON de Venta a enviar:", JSON.stringify(ventaDTO, null, 2));

        try {
            const newSale = await createSale(ventaDTO);
            console.log("Resultado de createSale:", newSale);

            if (newSale && newSale.idVenta) {
            //Llamamos a la función para registrar el envío con el ID de la venta creada.
                if (pedidoPendienteId) {
                    await marcarPedidoComoResuelto(pedidoPendienteId);
                }

            await registrarEnvio(newSale.idVenta);
            showToast("Venta y envío registrados exitosamente. ID de Venta: " + newSale.idVenta, 'success');
            

            resetRegisterSaleForm();
            showSaleDetailsInModal(newSale.idVenta);
            } else {
                showToast("Error al registrar la venta o no se obtuvo el ID de la venta.", 'danger');
            }
        } catch (error) {
            console.error('Error al registrar la venta:', error);
            showToast(`Error al registrar la venta: ${error.message || 'Error desconocido del servidor.'}`, 'danger');
        }
    });

    // --- Función para Reiniciar el Formulario ---
    function resetRegisterSaleForm() {
        formRegistrarVenta.reset();
        productosVentaContainer.innerHTML = '';
        lineaCounter = 0;
        addProductLine({}); // Agrega una línea inicial vacía

        selectedClientId = null;
        ventaClienteIdInput.value = '';
        ventaClienteNombreInput.value = '';
        ventaClienteNombreInput.setAttribute('placeholder', 'Seleccione un cliente...');
        ventaClienteNombreInput.classList.remove('is-invalid');


        calculateTotalSale(); 

    }

// --- AGREGADO: Configuración inicial al cargar la página ---
    async function initializePageUserAndForm() {
        const userProfile = await fetchUserProfile();
        if (userProfile) {
            authenticatedUserId = userProfile.id;
            authenticatedUserName = userProfile.name;
        }

        // Si no hay un pedido pendiente en la URL, agregamos una línea de producto vacía.
        // Si hay un pedido, 'loadPendingOrder()' ya se encargó de agregar la línea.
        const urlParams = new URLSearchParams(window.location.search);
        const pedidoIdFromUrl = urlParams.get('pedidoId');
        if (!pedidoIdFromUrl) {
            addProductLine({});
        }
    }

    // Llama a la función para cargar el pedido pendiente primero.
    // La función loadPendingOrder ya llama a addProductLine si es necesario.
    loadPendingOrder();

    // Luego, inicializa el usuario y el formulario de la página.
    initializePageUserAndForm();

    // Listener para el botón de descargar comprobante
    btnDescargarComprobante.addEventListener('click', async () => {
        if (!currentSaleId) {
            showToast("No hay una venta seleccionada para descargar.", 'danger');
            return;
        }

        const token = getAuthToken();
        if (!token) {
            showToast("Token de autenticación no encontrado. Por favor, inicia sesión.", 'danger');
            return;
        }

        try {
            const response = await fetch(`${API_VENTAS_URL}/${currentSaleId}/comprobante`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error al generar el comprobante: ${errorText || response.statusText}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `comprobante_venta_${currentSaleId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            showToast("Comprobante descargado exitosamente.", 'success');

        } catch (error) {
            console.error('Error al descargar comprobante:', error);
            showToast(error.message, 'danger');
        }
    });

    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('jwtToken');
            window.location.href = "login.html";
        });
    }

    const sidebarToggle = document.body.querySelector('#sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', event => {
            event.preventDefault();
            document.body.classList.toggle('sb-sidenav-toggled');
            localStorage.setItem('sb|sidebar-toggle', document.body.classList.contains('sb-sidenav-toggled'));
        });
    }


    // Función para marcar un pedido pendiente como resuelto
    async function marcarPedidoComoResuelto(id) {
        const token = getAuthToken();
        if (!token) {
            showToast("Token de autenticación no encontrado.", 'danger');
            return;
        }
        try {
            const response = await fetch(`${BASE_URL}/distribuidora/pedidoPendiente/${id}/marcar-resuelto`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error('Error al marcar el pedido como resuelto.');
            }
            console.log(`Pedido pendiente con ID ${id} marcado como resuelto.`);
        } catch (error) {
            console.error('Error al marcar pedido como resuelto:', error);
            showToast(`Error: ${error.message}`, 'danger');
        }
    }

});