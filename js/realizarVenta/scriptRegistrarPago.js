// js/realizarVenta/scriptRegistrarPago.js

document.addEventListener('DOMContentLoaded', () => {

    // --- URLs Base ---
    const BASE_URL = "http://localhost:8080";
    const API_PAGOS_URL = `${BASE_URL}/distribuidora/pagos/registrar`;
    const API_PERFIL_URL = `${BASE_URL}/distribuidora/auth/perfil`;

    // --- Referencias a elementos del DOM del modal de pago ---
    const modalRegistrarPagoElement = document.getElementById('modalRegistrarPago');
    const formRegistrarPago = document.getElementById('formRegistrarPago');
    const pagoTotalVentaSpan = document.getElementById('pagoTotalVenta');
    const inputMontoPagado = document.getElementById('inputMontoPagado');
    const btnPagoCompleto = document.getElementById('btnPagoCompleto');
    const btnConfirmarPago = document.getElementById('btnConfirmarPago');

    // Referencia al modal anterior para poder mantenerlo abierto
    const modalDetalleVentaElement = document.getElementById('modalDetalleVenta');

    // Variables para almacenar datos temporales
    let currentSaleId = null;
    let currentSaleTotal = 0;
    let authenticatedUserId = null;

    // --- Funciones de Ayuda (reutilizadas para la independencia del script) ---

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


    // --- Lógica del nuevo modal de pago ---

    modalDetalleVentaElement.addEventListener('show.bs.modal', (event) => {
        // Al abrir el modal de detalle, reiniciamos el modal de pago
        const modalPago = bootstrap.Modal.getInstance(modalRegistrarPagoElement);
        if (modalPago) {
            modalPago.hide();
        }
    });

    modalRegistrarPagoElement.addEventListener('show.bs.modal', (event) => {
        // Obtenemos los datos necesarios desde el modal de detalle de venta (el que lo llama)
        const idVentaStr = document.getElementById('detalleVentaId').textContent;
        const totalVentaStr = document.querySelector('#detalleVentaFooter .text-start.fw-bold').textContent;
        
        currentSaleId = parseInt(idVentaStr);
        // Ajustamos la limpieza de la cadena para que funcione con tu formato
        currentSaleTotal = parseFloat(totalVentaStr.replace('$', '').replace(/\./g, '').replace(',', '.'));

        pagoTotalVentaSpan.textContent = formatCurrency(currentSaleTotal);
        inputMontoPagado.value = '';
        inputMontoPagado.classList.remove('is-invalid');
    });

    btnPagoCompleto.addEventListener('click', () => {
        if (!isNaN(currentSaleTotal)) {
            inputMontoPagado.value = currentSaleTotal.toFixed(2);
            inputMontoPagado.classList.remove('is-invalid');
        }
    });

    btnConfirmarPago.addEventListener('click', async () => {
        const montoPagado = parseFloat(inputMontoPagado.value);

        if (isNaN(montoPagado) || montoPagado <= 0) {
            inputMontoPagado.classList.add('is-invalid');
            showToast('El monto debe ser un número positivo.', 'danger');
            return;
        }

        if (montoPagado > currentSaleTotal) {
            inputMontoPagado.classList.add('is-invalid');
            showToast('El monto pagado no puede exceder el total de la venta.', 'danger');
            return;
        }
        
        inputMontoPagado.classList.remove('is-invalid');
        
        const userProfile = await fetchUserProfile();
        if (!userProfile) {
            return; // La función ya mostró un toast de error y redirigió
        }
        authenticatedUserId = userProfile.id;

        const pagoData = {
            idVenta: currentSaleId,
            montoPagado: montoPagado,
            idUsuarioQueRegistra: authenticatedUserId
        };
        
        // Deshabilitar botón para evitar múltiples clics
        btnConfirmarPago.disabled = true;

        try {
            const response = await fetch(API_PAGOS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify(pagoData)
            });

            if (response.ok) {
                // Modificación sugerida: ahora podemos acceder a las nuevas propiedades
                const pagoRegistrado = await response.json();
                console.log("Pago registrado con éxito:", pagoRegistrado);

                // El mensaje de éxito ahora lo podemos tomar de la respuesta del backend
                showToast(pagoRegistrado.mensaje, 'success');
                
                // Cerrar solo el modal de registro de pago
                const modalPago = bootstrap.Modal.getInstance(modalRegistrarPagoElement);
                if (modalPago) {
                    modalPago.hide();
                }
                
                // *** SUGERENCIA DE MEJORA: Lógica de actualización de la UI ***
                // Aquí deberías recargar los datos de la venta o actualizar
                // el saldo pendiente en el modal de detalle de venta.
                // Podrías emitir un evento personalizado para que el script
                // del modal de detalle de venta reaccione a este cambio.
                
            } else {
                // Manejo de errores mejorado
                let errorData;
                try {
                    errorData = await response.json();
                } catch (jsonError) {
                    errorData = await response.text();
                }
                const errorMessage = (errorData && errorData.message) || errorData || 'Error desconocido al registrar el pago.';
                console.error("Error al registrar el pago:", errorMessage);
                showToast(`Error: ${errorMessage}`, 'danger');
            }

        } catch (error) {
            console.error("Error de conexión al registrar el pago:", error);
            showToast(`Error de conexión: ${error.message}`, 'danger');
        } finally {
            btnConfirmarPago.disabled = false;
        }
    });

});