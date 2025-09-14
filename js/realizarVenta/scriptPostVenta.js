// js/realizarVenta/scriptPostVenta.js

document.addEventListener('DOMContentLoaded', () => {
    const BASE_URL = window.API_BASE_URL;

    // Se elimina /distribuidora/ de la ruta
    const API_VENTAS_URL = `${BASE_URL}/ventas`;

    
    // Referencias a elementos del DOM del modal de detalle de venta
    const modalDetalleVentaElement = document.getElementById('modalDetalleVenta');
    const detalleVentaIdSpan = document.getElementById('detalleVentaId');
    const detalleVentaFechaSpan = document.getElementById('detalleVentaFecha');
    const detalleVentaClienteSpan = document.getElementById('detalleVentaCliente');
    const detalleVentaUsuarioSpan = document.getElementById('detalleVentaUsuario');
    const detalleVentaProductosTbody = document.getElementById('detalleVentaProductos');
    const detalleVentaTotalTh = document.getElementById('detalleVentaTotal');
    const btnDescargarComprobante = document.getElementById('btnDescargarComprobante');

    let currentSaleId = null; // Para almacenar el ID de la venta actual

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
            toast.classList.add('bg-info');
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

    /**
     * Muestra el modal de detalle de venta y carga los datos.
     * @param {number} saleId - El ID de la venta a mostrar.
     */
    window.showSaleDetailModal = async (saleId) => {
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
            detalleVentaFechaSpan.textContent = sale.fecha; // Asumiendo que el backend retorna un string de fecha
            detalleVentaClienteSpan.textContent = sale.nombreCliente || 'N/A';
            detalleVentaUsuarioSpan.textContent = sale.nombreUsuario || 'N/A'; // Asumiendo que el backend retorna nombreUsuario

            // Poblar detalles de productos
            detalleVentaProductosTbody.innerHTML = '';
            let totalGeneral = 0;
            if (sale.detalles && sale.detalles.length > 0) {
                sale.detalles.forEach(item => {
                    const row = document.createElement('tr');
                    const subtotal = item.cantidad * item.precioUnitario;
                    totalGeneral += subtotal;

                    // --- CAMBIO AQUÍ: Formatear y añadir el peso ---
                    const pesoText = (item.pesoProducto !== undefined && item.pesoProducto !== null) 
                                     ? ` ${item.pesoProducto.toFixed(2)} kg` 
                                     : '';
                    // Concatenar marca, nombre de producto y peso
                    const productNameWithBrandAndWeight = `${item.marcaProducto || 'Sin Marca'} ${item.nombreProducto}${pesoText}`;
                    // --- FIN CAMBIO ---

                    row.innerHTML = `
                        <td>${productNameWithBrandAndWeight}</td>
                        <td>${item.cantidad}</td>
                        <td>${formatCurrency(item.precioUnitario)}</td>
                        <td>${formatCurrency(subtotal)}</td>
                    `;
                    detalleVentaProductosTbody.appendChild(row);
                });
            } else {
                detalleVentaProductosTbody.innerHTML = '<tr><td colspan="4" class="text-center">No hay productos en esta venta.</td></tr>';
            }
            detalleVentaTotalTh.textContent = formatCurrency(totalGeneral);

            const modal = new bootstrap.Modal(modalDetalleVentaElement);
            modal.show();

        } catch (error) {
            console.error('Error al mostrar detalle de venta:', error);
            showToast(error.message, 'danger');
            detalleVentaProductosTbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error al cargar el detalle.</td></tr>';
        }
    };

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
            // Este endpoint debería generar un PDF en el backend y devolverlo.
            // Por ejemplo: GET /distribuidora/ventas/{id}/comprobante
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

            // Descargar el archivo
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

});