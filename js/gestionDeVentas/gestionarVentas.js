document.addEventListener('DOMContentLoaded', () => {
    // Obtenemos referencias a los elementos del DOM
    const salesTableBody = document.getElementById('salesTableBody');
    const modalVerDetalle = new bootstrap.Modal(document.getElementById('modalVerDetalle'));
    const detalleVentaId = document.getElementById('detalleVentaId');
    const detalleVentaFecha = document.getElementById('detalleVentaFecha');
    const detalleVentaCliente = document.getElementById('detalleVentaCliente');
    const detalleVentaUsuario = document.getElementById('detalleVentaUsuario'); // SPAN para vendedor en el modal
    const detalleVentaTotal = document.getElementById('detalleVentaTotal');
    const detalleProductosVentaBody = document.getElementById('detalleProductosVentaBody');
    const dataTable = document.getElementById('datatablesVentas'); // La tabla completa, para delegar eventos

    // Instancia de SimpleDataTable para gestionar su destrucción y reinicialización
    let salesDataTableInstance = null;

    // Referencia al botón de descarga del comprobante en gestionarVentas.js
    const btnDescargarComprobanteGestion = document.getElementById('btnDescargarComprobanteGestion');
    let currentSaleIdGestion = null; // Variable para almacenar el ID de la venta actual para la descarga

    // Función auxiliar para obtener el token del localStorage
    function getAuthToken() {
        return localStorage.getItem('jwtToken');
    }

// Función para formatear la fecha a DD-MM-YYYY
const formatDate = (dateString) => {
    // Si dateString es "YYYY-MM-DD", podemos parsearlo manualmente o usar un constructor específico
    // Una forma robusta es dividir la cadena y crear el objeto Date directamente con los componentes
    const parts = dateString.split('-'); // ["YYYY", "MM", "DD"]
    // new Date(year, monthIndex, day)
    // monthIndex es 0-basado, por eso restamos 1 a parts[1]
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));

    // Asegurarse de que la fecha es válida
    if (isNaN(date.getTime())) return 'Fecha inválida';

    // Obtener los componentes de la fecha. Como creamos el Date con componentes locales,
    // getFullYear, getMonth, getDate funcionarán correctamente sin desplazamiento.
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    return `${day}/${month}/${year}`;
};

    // Eliminamos la función formatISODate porque ya no la necesitamos para ordenar
    // const formatISODate = (dateString) => {
    //     return dateString;
    // };

    // Función para formatear precios a moneda
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    // Función para obtener los headers de autenticación
    const getAuthHeaders = () => {
        const token = getAuthToken();
        if (token) {
            return {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
        }
        return {};
    };

    // Función para mostrar toasts (mensajes de notificación)
    const showToast = (message, type = 'success') => {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            console.warn("No se encontró el contenedor de toasts. No se puede mostrar el toast:", message);
            return;
        }

        const toast = document.createElement('div');
        toast.classList.add('toast', `bg-${type}`, 'text-white', 'border-0', 'fade', 'show');
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            const bsToast = bootstrap.Toast.getInstance(toast) || new bootstrap.Toast(toast);
            bsToast.hide();
            toast.addEventListener('hidden.bs.toast', () => {
                toast.remove();
            });
        }, 5000);
    };

    // Mostrar detalle de venta en el modal
    const showSaleDetail = async (idVenta) => {
        try {
            currentSaleIdGestion = idVenta;
            const headers = getAuthHeaders();
            if (!headers.Authorization) {
                showToast("Token de autenticación no encontrado. Por favor, inicia sesión.", 'danger');
                return;
            }
            const response = await fetch(`http://localhost:8080/distribuidora/ventas/${idVenta}`, {
                method: 'GET',
                headers: headers
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error al obtener el detalle de la venta: ${errorText || response.statusText}`);
            }
            const venta = await response.json();

            detalleVentaId.textContent = venta.idVenta;
            detalleVentaFecha.textContent = formatDate(venta.fecha);
            detalleVentaCliente.textContent = `${venta.cliente.nombre} ${venta.cliente.apellido}`;
            detalleVentaUsuario.textContent = venta.usuario.nombre || 'N/A';
            detalleVentaTotal.textContent = formatCurrency(venta.total);

            detalleProductosVentaBody.innerHTML = '';
            if (venta.detalles && venta.detalles.length > 0) {
                venta.detalles.forEach(detalle => {
                    const row = detalleProductosVentaBody.insertRow();
                    row.insertCell().textContent = detalle.marcaProducto || 'N/A';
                    row.insertCell().textContent = `${detalle.nombreProducto || 'N/A'} (${detalle.pesoProducto || 'N/A'} kg)`;
                    row.insertCell().textContent = detalle.cantidad || 0;
                    row.insertCell().textContent = `$${detalle.precioUnitario ? detalle.precioUnitario.toFixed(2) : '0.00'}`;
                    row.insertCell().textContent = `$${detalle.subtotal ? detalle.subtotal.toFixed(2) : '0.00'}`;
                    row.insertCell().textContent = detalle.tipoPrecioAplicado || 'N/A';
                });
            } else {
                const row = detalleProductosVentaBody.insertRow();
                const cell = row.insertCell();
                cell.colSpan = 6;
                cell.textContent = 'No hay productos en esta venta.';
                cell.classList.add('text-center', 'text-muted');
            }

            modalVerDetalle.show();
        } catch (error) {
            console.error(`Error al obtener el detalle de la venta con ID ${idVenta}:`, error);
            showToast(`Error al cargar el detalle de la venta: ${error.message}`, 'danger');
        }
    };

    // Obtener y mostrar todas las ventas
    const fetchSales = async () => {
        try {
            const headers = getAuthHeaders();
            if (!headers.Authorization) {
                showToast("Token de autenticación no encontrado. Por favor, inicia sesión para ver las ventas.", 'danger');
                return;
            }
            const response = await fetch('http://localhost:8080/distribuidora/ventas', {
                method: 'GET',
                headers: headers
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error al obtener las ventas: ${errorText || response.statusText}`);
            }
            const sales = await response.json();

            if (salesDataTableInstance) {
                salesDataTableInstance.destroy();
            }

            salesTableBody.innerHTML = '';
            sales.forEach(sale => {
                const row = salesTableBody.insertRow();
                row.insertCell().textContent = sale.idVenta;

                const fechaCell = row.insertCell();
                // Ya no necesitamos data-order para deshabilitar el ordenamiento
                fechaCell.textContent = formatDate(sale.fecha);

                row.insertCell().textContent = `${sale.cliente.nombre} ${sale.cliente.apellido}`;
                row.insertCell().textContent = sale.usuario.nombre;

                const totalCell = row.insertCell();
                totalCell.textContent = formatCurrency(sale.total);
                totalCell.setAttribute('data-order', sale.total); // Para el total sí puede ser útil

                const actionsCell = row.insertCell();
                actionsCell.innerHTML = `
                    <button type="button" class="btn btn-info btn-sm btn-ver-detalle" data-id="${sale.idVenta}">
                        <i class="fas fa-eye" aria-hidden="true"></i> Detalle
                    </button>
                `;
            });

            // MODIFICACIÓN CLAVE: Deshabilitar el ordenamiento para la columna de fecha (índice 1)
            salesDataTableInstance = new simpleDatatables.DataTable("#datatablesVentas", {
                labels: {
                    placeholder: "Buscar...",
                    perPage: "Registros por página",
                    noRows: "No se encontraron resultados",
                    noResults: "No se encontraron resultados que coincidan con tu búsqueda",
                    info: "Mostrando {start} a {end} de {rows} registros",
                    next: "Siguiente",
                    previous: "Anterior"
                },
                // --- CONFIGURACIÓN PARA DESHABILITAR ORDENAMIENTO DE LA FECHA ---
                columns: [
                    { select: 1, sortable: false } // La columna con índice 1 (Fecha) no será ordenable
                ]
                // ----------------------------------------------------------------
            });

        } catch (error) {
            console.error("Error al cargar las ventas:", error);
            showToast(`Error al cargar las ventas: ${error.message}`, 'danger');
        }
    };

    // Delegación de eventos para los botones de "Detalle"
    dataTable.addEventListener('click', (event) => {
        const button = event.target.closest('.btn-ver-detalle');
        if (button) {
            const idVenta = button.dataset.id;
            showSaleDetail(idVenta);
        }
    });

    // Listener para el botón de descargar comprobante
    if (btnDescargarComprobanteGestion) {
        btnDescargarComprobanteGestion.addEventListener('click', async () => {
            if (!currentSaleIdGestion) {
                showToast("No se ha seleccionado una venta para descargar el comprobante.", 'danger');
                return;
            }
            const token = getAuthToken();
            if (!token) {
                showToast("Token de autenticación no encontrado. Por favor, inicia sesión.", 'danger');
                return;
            }
            try {
                const API_VENTAS_URL_PDF = "http://localhost:8080/distribuidora/ventas";
                const response = await fetch(`${API_VENTAS_URL_PDF}/${currentSaleIdGestion}/comprobante`, {
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
                a.download = `comprobante_venta_${currentSaleIdGestion}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                showToast("Comprobante descargado exitosamente.", 'success');
            } catch (error) {
                console.error('Error al descargar comprobante:', error);
                showToast(`Error al descargar comprobante: ${error.message}`, 'danger');
            }
        });
    }
    // Carga inicial de ventas
    fetchSales();
});