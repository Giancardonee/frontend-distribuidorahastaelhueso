document.addEventListener('DOMContentLoaded', () => {
    // --- URLs Base ---
    const BASE_URL = window.API_BASE_URL;

    const API_PEDIDOS_PENDIENTES_URL = `${BASE_URL}/distribuidora/pedidoPendiente`;

    // --- Referencias al MODAL DE CONFIRMACIÓN DE FALTANTE ---
    const modalConfirmarFaltanteElement = document.getElementById('modalConfirmarFaltante');
    const faltanteClienteNombreSpan = document.getElementById('faltanteClienteNombre');
    const faltanteProductoNombreSpan = document.getElementById('faltanteProductoNombre');
    const faltanteProductoMarcaPesoSpan = document.getElementById('faltanteProductoMarcaPeso');
    const faltanteUnidadesSpan = document.getElementById('faltanteUnidades');
    const btnRegistrarFaltante = document.getElementById('btnRegistrarFaltante');

    // Variables para almacenar los datos del faltante actual
    let currentFaltanteData = null;

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

    /**
     * Muestra el modal para registrar un pedido pendiente y lo popula con la información del producto y cliente.
     * @param {object} data - Contiene los datos del faltante.
     */
    window.showModalConfirmarFaltante = (data) => {
        if (!data || !data.clienteId || !data.productoId) {
            showToast("No se pudo obtener la información necesaria para el pedido pendiente.", 'danger');
            return;
        }

        currentFaltanteData = data;

        // Poblar el modal con la información recibida
        faltanteClienteNombreSpan.textContent = data.clienteNombre;
        faltanteProductoNombreSpan.textContent = data.productoNombre;
        const marcaPesoText = `${data.productoMarca ? data.productoMarca + ' ' : ''}${data.productoPeso ? data.productoPeso + 'kg' : ''}`;
        faltanteProductoMarcaPesoSpan.textContent = marcaPesoText.trim() ? `(${marcaPesoText})` : '';
        faltanteUnidadesSpan.textContent = data.unidadesFaltantes;

        // Mostrar el modal
        const faltanteModal = new bootstrap.Modal(modalConfirmarFaltanteElement);
        faltanteModal.show();
    };

    /**
     * Envía la solicitud para registrar el pedido pendiente a la API.
     */
    async function registrarPedidoPendiente(faltanteData) {
        const token = getAuthToken();
        if (!token) {
            showToast("Token de autenticación no encontrado. Por favor, inicia sesión.", 'danger');
            return null;
        }

        const pedidoDTO = {
            idCliente: faltanteData.clienteId,
            idProducto: faltanteData.productoId,
            unidadesSolicitadas: faltanteData.unidadesFaltantes
        };

        try {
            const response = await fetch(API_PEDIDOS_PENDIENTES_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(pedidoDTO)
            });

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    errorData = await response.text();
                }
                const errorMessage = errorData.message || response.statusText || errorData || "Error desconocido al registrar el pedido.";
                throw new Error(errorMessage);
            }

            const result = await response.json();
            showToast("Pedido pendiente registrado con éxito.", 'success');
            return result;

        } catch (error) {
            console.error("Error al registrar pedido pendiente:", error);
            showToast(`Error al registrar el pedido: ${error.message}`, 'danger');
            return null;
        }
    }

    // Listener para el botón de confirmar en el modal
    btnRegistrarFaltante.addEventListener('click', async () => {
        if (!currentFaltanteData) {
            showToast("No hay datos de faltante para registrar.", 'danger');
            return;
        }

        await registrarPedidoPendiente(currentFaltanteData);
        
        const modal = bootstrap.Modal.getInstance(modalConfirmarFaltanteElement);
        if (modal) {
            const originalButton = document.querySelector(`[data-bs-target="#modalConfirmarFaltante"]`);
            if (originalButton) {
                originalButton.focus();
            }
            modal.hide();
        }

        currentFaltanteData = null;
    });
    
    // --- NUEVO: Evento para manejar el cierre del modal, sin importar el botón ---
    modalConfirmarFaltanteElement.addEventListener('hidden.bs.modal', () => {
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
        currentFaltanteData = null;
    });

});