document.addEventListener('DOMContentLoaded', function() {
    const bodyTablaClientes = document.getElementById('bodyTablaClientes');
    const inputBuscarCliente = document.getElementById('inputBuscarCliente');
    const btnFiltrarTodos = document.getElementById('btnFiltrarTodos');
    const btnFiltrarDeudores = document.getElementById('btnFiltrarDeudores');
    const btnFiltrarSinDeuda = document.getElementById('btnFiltrarSinDeuda');
    const badgeTodos = document.getElementById('badgeTodos');
    const badgeDeudores = document.getElementById('badgeDeudores');
    const badgeSinDeuda = document.getElementById('badgeSinDeuda');
    const loadingSpinner = document.getElementById('loading-spinner');
    const tablaClientesContainer = document.getElementById('tablaClientesContainer');

    const modalDetallesVentaElement = document.getElementById('modalDetallesVenta');
    const modalDetallesVenta = modalDetallesVentaElement ? new bootstrap.Modal(modalDetallesVentaElement) : null;
    const bodyTablaVentasCliente = document.getElementById('bodyTablaVentasCliente');
    const nombreClienteModal = document.getElementById('nombreClienteModal');

    const API_CLIENTES_URL = "http://localhost:8080/distribuidora/clientes";
    const API_VENTAS_CLIENTE_URL = "http://localhost:8080/distribuidora/ventas/cliente";

    let todosLosClientes = [];
    let clientesDeudores = [];
    let clientesSinDeuda = [];
    let clientesFiltrados = [];

    // FUNCION PARA FORMATO DE MONEDA CON SÍMBOLO $ AL PRINCIPIO
    function formatCurrency(number) {
        return new Intl.NumberFormat('es-AR', { 
            style: 'currency', 
            currency: 'ARS',
        }).format(number);
    }

    function getToken() {
        return localStorage.getItem('jwtToken');
    }

    function handleSessionExpired() {
        alert('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
        window.location.href = 'login.html';
    }

    if (bodyTablaClientes) {
        cargarClientesDesdeAPI();

        inputBuscarCliente.addEventListener('input', function() {
            const searchTerm = this.value.trim().toLowerCase();
            clientesFiltrados = todosLosClientes.filter(cliente => 
                cliente.nombre.toLowerCase().includes(searchTerm) || 
                cliente.apellido.toLowerCase().includes(searchTerm)
            );
            renderizarTablaClientes(clientesFiltrados);
        });

        const botonesFiltro = document.querySelectorAll('[data-filtro]');
        botonesFiltro.forEach(boton => {
            boton.addEventListener('click', function() {
                botonesFiltro.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                const filtro = this.dataset.filtro;
                if (filtro === 'todos') {
                    clientesFiltrados = todosLosClientes;
                } else if (filtro === 'deudores') {
                    clientesFiltrados = clientesDeudores;
                } else if (filtro === 'sin-deuda') {
                    clientesFiltrados = clientesSinDeuda;
                }
                renderizarTablaClientes(clientesFiltrados);
            });
        });

        bodyTablaClientes.addEventListener('click', function(e) {
            if (e.target.classList.contains('btn-ver-compras')) {
                const idCliente = e.target.dataset.idcliente;
                const filaCliente = e.target.closest('tr');
                const nombreCliente = filaCliente.querySelector('td:nth-child(2)').textContent;
                const apellidoCliente = filaCliente.querySelector('td:nth-child(3)').textContent;
                
                if (nombreClienteModal) {
                    nombreClienteModal.textContent = `${nombreCliente} ${apellidoCliente}`;
                }
                cargarVentasPorCliente(idCliente);
            }
        });

        bodyTablaVentasCliente.addEventListener('click', function(e) {
            if (e.target.classList.contains('btn-pagar-venta')) {
                const idVenta = e.target.dataset.idventa;
                const totalVenta = parseFloat(e.target.dataset.total);
                const saldoPendiente = parseFloat(e.target.dataset.saldopendiente);
                const idCliente = e.target.dataset.idcliente;
                
                if (window.abrirModalDePago) {
                    window.abrirModalDePago(idVenta, totalVenta, saldoPendiente, idCliente);
                } else {
                    console.error("La función abrirModalDePago no está disponible. Asegúrese de que pagos.js está cargado.");
                }
            }
        });
    }

    async function cargarClientesDesdeAPI() {
        const token = getToken();
        if (!token) { handleSessionExpired(); return; }

        if (loadingSpinner) loadingSpinner.classList.remove('d-none');
        if (tablaClientesContainer) tablaClientesContainer.classList.add('d-none');
        
        try {
            const response = await fetch(`${API_CLIENTES_URL}/pagos-deudores`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.status === 204) { 
                todosLosClientes = [];
            } else if (!response.ok) { 
                throw new Error(`Error ${response.status}: ${await response.text()}`); 
            } else {
                todosLosClientes = await response.json();
            }
            
            clientesDeudores = todosLosClientes.filter(c => c.estado === 'con-deuda');
            clientesSinDeuda = todosLosClientes.filter(c => c.estado === 'sin-deuda');
            
            clientesFiltrados = todosLosClientes; 
            renderizarTablaClientes(clientesFiltrados);
            actualizarBadges();

        } catch (error) {
            console.error('Error al cargar clientes:', error);
            if (bodyTablaClientes) bodyTablaClientes.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar clientes.</td></tr>';
        } finally {
            if (loadingSpinner) loadingSpinner.classList.add('d-none');
            if (tablaClientesContainer) tablaClientesContainer.classList.remove('d-none');
        }
    }

    function renderizarTablaClientes(clientes) {
        if (!bodyTablaClientes) return;
        bodyTablaClientes.innerHTML = '';
        if (clientes.length === 0) {
            bodyTablaClientes.innerHTML = '<tr><td colspan="5" class="text-center">No se encontraron clientes.</td></tr>';
            return;
        }

        clientes.forEach(cliente => {
            const row = document.createElement('tr');
            const estadoDeuda = cliente.estado === 'con-deuda' ? 'deuda-con-deuda' : 'deuda-al-dia';
            const estadoTexto = cliente.estado === 'con-deuda' ? 'Con Deuda' : 'Sin Deuda';
            
            row.innerHTML = `
                <td>${cliente.idCliente}</td>
                <td>${cliente.nombre}</td>
                <td>${cliente.apellido}</td>
                <td><span class="${estadoDeuda}">${estadoTexto}</span></td>
                <td>
                    <button type="button" class="btn btn-sm btn-primary btn-ver-compras" data-idcliente="${cliente.idCliente}">Ver Compras</button>
                </td>
            `;
            bodyTablaClientes.appendChild(row);
        });
    }

    function actualizarBadges() {
        if (badgeTodos) badgeTodos.textContent = todosLosClientes.length;
        if (badgeDeudores) badgeDeudores.textContent = clientesDeudores.length;
        if (badgeSinDeuda) badgeSinDeuda.textContent = clientesSinDeuda.length;
    }

    async function cargarVentasPorCliente(idCliente) {
        const token = getToken();
        if (!token) { handleSessionExpired(); return; }
        if (!bodyTablaVentasCliente) return;

        bodyTablaVentasCliente.innerHTML = '<tr><td colspan="7" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Cargando...</span></div></td></tr>';

        try {
            const response = await fetch(`${API_VENTAS_CLIENTE_URL}/${idCliente}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const responseText = await response.text();

            if (response.status === 204) {
                bodyTablaVentasCliente.innerHTML = '<tr><td colspan="7" class="text-center">El cliente no tiene ventas registradas.</td></tr>';
                modalDetallesVenta.show();
                return;
            }

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${responseText}`);
            }

            const ventas = JSON.parse(responseText);
            renderizarVentasCliente(ventas, idCliente);
            modalDetallesVenta.show();

        } catch (error) {
            console.error('Error al cargar las ventas del cliente:', error);
            bodyTablaVentasCliente.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error al cargar las ventas.</td></tr>';
        }
    }

    function renderizarVentasCliente(ventas, idCliente) {
        if (!bodyTablaVentasCliente) return;
        bodyTablaVentasCliente.innerHTML = '';
        if (ventas.length === 0) {
            bodyTablaVentasCliente.innerHTML = '<tr><td colspan="7" class="text-center">El cliente no tiene ventas registradas.</td></tr>';
            return;
        }  
        ventas.forEach(venta => {
            const estadoVenta = venta.saldoPendiente <= 0 ? 'Sin Deuda' : 'Con Deuda';
            const estadoClase = venta.saldoPendiente <= 0 ? 'deuda-al-dia' : 'deuda-con-deuda';

            const isDeudor = venta.saldoPendiente > 0;
            const btnClass = isDeudor ? 'btn-success btn-pagar-venta' : 'btn-secondary';
            const btnDisabled = isDeudor ? '' : 'disabled';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${venta.idVenta}</td>
                <td>${venta.fecha}</td>
                <td>${formatCurrency(venta.total)}</td>
                <td>${formatCurrency(venta.totalPagado)}</td>
                <td>${formatCurrency(venta.saldoPendiente)}</td>
                <td><span class="${estadoClase}">${estadoVenta}</span></td>
                <td>
                    <button type="button" class="btn btn-sm ${btnClass}" 
                            data-idventa="${venta.idVenta}" 
                            data-total="${venta.total}" 
                            data-saldopendiente="${venta.saldoPendiente}" 
                            data-idcliente="${idCliente}" 
                            ${btnDisabled}>
                        Pagar
                    </button>
                </td>
            `;
            bodyTablaVentasCliente.appendChild(row);
        });
    }
});