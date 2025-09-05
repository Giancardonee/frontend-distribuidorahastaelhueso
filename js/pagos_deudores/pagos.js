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
    let currentIdCliente = null;

    const API_PAGOS_URL = `${window.API_BASE_URL}/pagos/registrar`;
    const API_USUARIOS_URL = `${window.API_BASE_URL}/usuarios/id`;

    // FUNCION PARA FORMATO DE MONEDA CON SÍMBOLO $ AL PRINCIPIO
    function formatCurrency(number) {
        return new Intl.NumberFormat('es-AR', { 
            style: 'currency', 
            currency: 'ARS',
        }).format(number);
    }

    function parseJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    }
    
    async function getUserIdByUsername(username, token) {
        try {
            const response = await fetch(`${API_USUARIOS_URL}?username=${username}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Error al obtener el ID del usuario: ${response.status}`);
            }

            const userId = await response.json();
            return userId;
        } catch (error) {
            console.error('Error en getUserIdByUsername:', error);
            return null;
        }
    }

    window.abrirModalDePago = function(idVenta, totalVenta, saldoPendiente, idCliente) {
        if (!modalPagoVenta) {
            console.error("El modal de pago no pudo ser inicializado. Verifique el HTML.");
            return;
        }

        currentIdVenta = idVenta;
        currentIdCliente = idCliente;

        if (pagoIdVenta) pagoIdVenta.textContent = idVenta;
        if (pagoTotalVenta) pagoTotalVenta.textContent = formatCurrency(totalVenta);
        if (pagoSaldoPendiente) pagoSaldoPendiente.textContent = formatCurrency(saldoPendiente);
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
                const saldoPendienteTexto = pagoSaldoPendiente.textContent;
                const saldoPendiente = parseFloat(saldoPendienteTexto.replace('$', '').replace(/\./g, '').replace(',', '.'));
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
            const saldoPendienteTexto = pagoSaldoPendiente.textContent;
            const saldoPendiente = parseFloat(saldoPendienteTexto.replace('$', '').replace(/\./g, '').replace(',', '.'));

            if (montoPagado <= 0 || montoPagado > saldoPendiente) {
                alert('El monto ingresado no es válido. Debe ser mayor a 0 y no exceder el saldo pendiente.');
                return;
            }

            const token = localStorage.getItem('jwtToken');
            if (!token) {
                console.error('No hay token, sesión expirada.');
                return;
            }

            const payload = parseJwt(token);
            if (!payload || !payload.sub) {
                console.error('No se pudo obtener el nombre de usuario del token.');
                alert('Error de autenticación. Nombre de usuario no disponible.');
                return;
            }
            const username = payload.sub;
            
            const idUsuarioQueRegistra = await getUserIdByUsername(username, token);
            
            if (!idUsuarioQueRegistra) {
                alert('Error al procesar el pago. No se pudo obtener el ID del usuario.');
                return;
            }

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
                    window.location.reload();
                }, 1000); 

            } catch (error) {
                console.error('Error al registrar el pago:', error);
                if (alertPagoError) alertPagoError.classList.remove('d-none');
                if (alertPagoSuccess) alertPagoSuccess.classList.add('d-none');
            }
        });
    }
});