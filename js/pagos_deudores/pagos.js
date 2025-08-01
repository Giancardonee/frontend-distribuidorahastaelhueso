document.addEventListener('DOMContentLoaded', function() {
    const modalPagoVentaElement = document.getElementById('modalPagoVenta');
    const modalPagoVenta = modalPagoVentaElement ? new bootstrap.Modal(modalPagoVentaElement) : null;
    const formRegistrarPago = document.getElementById('formRegistrarPago');
    const pagoIdVenta = document.getElementById('pagoIdVenta');
    const pagoTotalVenta = document.getElementById('pagoTotalVenta');
    const pagoSaldoPendiente = document.getElementById('pagoSaldoPendiente');
    const inputMontoPagar = document.getElementById('inputMontoPagar');
    const btnPagarMontoCompleto = document.getElementById('btnPagarMontoCompleto');
    const alertPagoSuccess = document.getElementById('alertPagoSuccess');
    const alertPagoError = document.getElementById('alertPagoError');

    let currentIdVenta = null;
    let currentIdCliente = null; // Variable para almacenar el ID del cliente actual

    const API_PAGOS_URL = "http://localhost:8080/distribuidora/pagos/registrar";

    // Función global para ser llamada desde scriptsPagina.js
    window.abrirModalDePago = function(idVenta, totalVenta, saldoPendiente, idCliente) {
        if (!modalPagoVenta) {
            console.error("El modal de pago no pudo ser inicializado. Verifique el HTML.");
            return;
        }

        currentIdVenta = idVenta;
        currentIdCliente = idCliente; // Guardamos el ID del cliente
        
        if (pagoIdVenta) pagoIdVenta.textContent = idVenta;
        if (pagoTotalVenta) pagoTotalVenta.textContent = `$${totalVenta.toFixed(2)}`;
        if (pagoSaldoPendiente) pagoSaldoPendiente.textContent = `$${saldoPendiente.toFixed(2)}`;
        if (inputMontoPagar) {
            inputMontoPagar.value = ''; 
            inputMontoPagar.max = saldoPendiente.toFixed(2);
        }
        
        if (alertPagoSuccess) alertPagoSuccess.classList.add('d-none');
        if (alertPagoError) alertPagoError.classList.add('d-none');
        
        modalPagoVenta.show();
    };
    
    if (btnPagarMontoCompleto) {
        btnPagarMontoCompleto.addEventListener('click', function() {
            if (pagoSaldoPendiente && inputMontoPagar) {
                const saldoPendiente = parseFloat(pagoSaldoPendiente.textContent.replace('$', ''));
                if (!isNaN(saldoPendiente)) {
                    inputMontoPagar.value = saldoPendiente.toFixed(2);
                }
            }
        });
    }

    if (formRegistrarPago) {
        formRegistrarPago.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const montoPagado = parseFloat(inputMontoPagar.value);
            const saldoPendiente = parseFloat(pagoSaldoPendiente.textContent.replace('$', ''));
            
            if (montoPagado <= 0 || montoPagado > saldoPendiente) {
                alert('El monto ingresado no es válido. Debe ser mayor a 0 y no exceder el saldo pendiente.');
                return;
            }

            const token = localStorage.getItem('jwtToken');
            if (!token) {
                console.error('No hay token, sesión expirada.');
                return;
            }

            // Simulación: Asumimos un ID de usuario fijo por ahora
            const idUsuarioQueRegistra = 1; 
            
            const pagoData = {
                idVenta: currentIdVenta,
                montoPagado: montoPagado,
                idUsuarioQueRegistra: idUsuarioQueRegistra 
            };

            try {
                const response = await fetch(API_PAGOS_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(pagoData)
                });

                if (!response.ok) {
                    throw new Error(`Error ${response.status}: ${await response.text()}`);
                }
                
                if (alertPagoSuccess) alertPagoSuccess.classList.remove('d-none');
                if (alertPagoError) alertPagoError.classList.add('d-none');
                
                setTimeout(() => {
                    modalPagoVenta.hide();
                    // Llama a la función de recarga en el script principal si está disponible
                    if (window.cargarVentasPorCliente && currentIdCliente) {
                        window.cargarVentasPorCliente(currentIdCliente);
                    }
                }, 2000);

            } catch (error) {
                console.error('Error al registrar el pago:', error);
                if (alertPagoError) alertPagoError.classList.remove('d-none');
                if (alertPagoSuccess) alertPagoSuccess.classList.add('d-none');
            }
        });
    }
});