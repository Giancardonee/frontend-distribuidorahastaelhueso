// js/decrementarPrecios/decrementarPrecios.js

document.addEventListener('DOMContentLoaded', async event => {
    // Script para actualizar el nombre de usuario en el footer
    const nombreEnFooterSpan = document.getElementById('nombreEnFooter');
    if (nombreEnFooterSpan) {
        // Se asume que 'cargarUsuarioEnFooter.js' manejará esto.
        // Si no, podrías obtener el nombre del usuario de localStorage o de una API.
        // nombreEnFooterSpan.textContent = "Usuario Admin"; 
    }

    // URL base de tu API
    const API_BASE_URL = 'http://localhost:8080/distribuidora/productos';

    // Función para obtener el token JWT del localStorage
    function getJwtToken() {
        return localStorage.getItem('jwtToken');
    }

    // Función para verificar el token y redirigir si no está presente
    function checkAuthAndRedirect() {
        const token = getJwtToken();
        if (!token) {
            showToast('Su sesión ha expirado o no ha iniciado sesión. Por favor, inicie sesión nuevamente.', 'danger', 'Sesión Requerida');
            setTimeout(() => {
                window.location.href = 'login.html'; // Redirige a tu página de login
            }, 3000); // Dar tiempo para que el toast sea leído antes de redirigir
            return false;
        }
        return true;
    }

    // Inicializar Simple DataTables para la tabla de decremento de productos
    const datatablesDecremento = document.getElementById('datatablesDecremento');
    let productosDataTableDec; // Instancia de Simple DataTable para esta tabla
    let productCheckboxes; // Variable para los checkboxes, se actualizará al cargar productos

    // --- Función para cargar los productos y renderizar la tabla ---
    async function cargarProductosEnTabla() {
        // Verifica autenticación antes de cargar productos
        if (!checkAuthAndRedirect()) return;

        const token = getJwtToken();

        try {
            const response = await fetch(API_BASE_URL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });

            if (response.status === 204) {
                console.log('Sin productos: No hay contenido para mostrar.');
                if (productosDataTableDec) {
                    productosDataTableDec.destroy();
                    productosDataTableDec = null;
                }
                const tableBody = document.querySelector('#datatablesDecremento tbody');
                tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No hay productos registrados.</td></tr>'; // Colspan ajustado a 7
                return;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText || 'Error desconocido' }));
                throw new Error(errorData.message);
            }

            const productos = await response.json();

            // Destruye la instancia existente de DataTables si ya está inicializada
            if (productosDataTableDec) {
                productosDataTableDec.destroy();
            }

            const tableBody = document.querySelector('#datatablesDecremento tbody');
            tableBody.innerHTML = ''; // Limpia el cuerpo de la tabla

            productos.forEach(producto => {
                const row = `
                    <tr id="producto_dec_${producto.idProducto}">
                        <td><input type="checkbox" class="form-check-input product-checkbox" value="${producto.idProducto}"></td>
                        <td>${producto.idProducto}</td>
                        <td>${producto.nombreMarca || 'N/A'}</td> <td>${producto.nombre || ''}</td>
                        <td>${producto.peso !== undefined && producto.peso !== null ? producto.peso.toFixed(2) : 'N/A'} kg</td> <td>${producto.stock !== undefined && producto.stock !== null ? producto.stock : 'N/A'}</td>
                        <td>$${producto.precioMinorista !== undefined && producto.precioMinorista !== null ? producto.precioMinorista.toFixed(2) : 'N/A'}</td>
                        <td>$${producto.precioMayorista !== undefined && producto.precioMayorista !== null ? producto.precioMayorista.toFixed(2) : 'N/A'}</td>
                        </tr>
                `;
                tableBody.insertAdjacentHTML('beforeend', row);
            });

            // Re-inicializa Simple DataTables con la nueva data
            productosDataTableDec = new simpleDatatables.DataTable(datatablesDecremento, {
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
                // Definir las columnas para que Simple DataTables las maneje correctamente.
                // IMPORTANTE: Asegúrate de que el índice de la columna coincida con el orden en tu HTML.
                columns: [
                    { select: 0, sortable: false }, // Checkbox
                    { select: 1 }, // ID
                    { select: 2 }, // Marca
                    { select: 3 }, // Nombre
                    { select: 4 }, // Peso
                    { select: 5 }, // Stock
                    { select: 6 }, // Precio Minorista
                    { select: 7 }  // Precio Mayorista
                    // No hay más columnas después de Mayorista si Descripción fue eliminada.
                ]
            });

            // Re-asigna los eventos a los checkboxes después de recargar la tabla
            productCheckboxes = document.querySelectorAll('.product-checkbox');

        } catch (error) {
            console.error('Error al cargar los productos:', error);
            showToast(`No se pudieron cargar los productos: ${error.message}.`, 'danger', 'Error de Carga');
        }
    }

    // --- Cargar productos al inicio de la página ---
    cargarProductosEnTabla();


    // --- Elementos del Formulario de Decremento ---
    const formDecrementarPrecio = document.getElementById('formDecrementarPrecio');
    const radioPrecioMinorista = document.getElementById('radioPrecioMinorista');
    const radioPrecioMayorista = document.getElementById('radioPrecioMayorista');
    const radioMontoFijo = document.getElementById('radioMontoFijo');
    const radioPorcentaje = document.getElementById('radioPorcentaje');
    const valorDecrementoInput = document.getElementById('valorDecremento');
    const btnAplicarDecremento = document.getElementById('btnAplicarDecremento');

    const feedbackTipoPrecio = document.getElementById('feedbackTipoPrecio');
    const feedbackValorDecremento = document.getElementById('feedbackValorDecremento');

    const seleccionarTodosBtn = document.getElementById('seleccionarTodos');

    // --- Lógica de Selección de Productos ---
    seleccionarTodosBtn.addEventListener('click', function() {
        // Asegúrate de que productCheckboxes esté actualizado con los elementos actuales de la tabla
        productCheckboxes = document.querySelectorAll('.product-checkbox');
        const allChecked = Array.from(productCheckboxes).every(cb => cb.checked);
        productCheckboxes.forEach(checkbox => {
            checkbox.checked = !allChecked;
        });
        if (allChecked) {
            seleccionarTodosBtn.innerHTML = '<i class="fas fa-check-double me-1"></i> Seleccionar Todos';
        } else {
            seleccionarTodosBtn.innerHTML = '<i class="fas fa-times-circle me-1"></i> Deseleccionar Todos';
        }
    });

    // --- Validaciones Personalizadas del Formulario de Decremento ---
    function validarFormularioDecremento() {
        let isValid = true;

        const tipoPrecioSelected = radioPrecioMinorista.checked || radioPrecioMayorista.checked;
        if (!tipoPrecioSelected) {
            feedbackTipoPrecio.style.display = 'block';
            isValid = false;
        } else {
            feedbackTipoPrecio.style.display = 'none';
        }

        const tipoDecrementoSelected = radioMontoFijo.checked || radioPorcentaje.checked;
        const valor = parseFloat(valorDecrementoInput.value);

        // Para decremento, el valor debe ser positivo y no cero (el signo negativo se aplica en el JS)
        if (!tipoDecrementoSelected || isNaN(valor) || valor <= 0) {
            valorDecrementoInput.classList.add('is-invalid');
            feedbackValorDecremento.textContent = "El valor del ajuste es obligatorio y debe ser un número positivo (mayor a 0).";
            feedbackValorDecremento.style.display = 'block';
            isValid = false;
        } else {
            valorDecrementoInput.classList.remove('is-invalid');
            feedbackValorDecremento.style.display = 'none';
        }

        // Asegúrate de que productCheckboxes esté actualizado con los elementos actuales de la tabla
        productCheckboxes = document.querySelectorAll('.product-checkbox');
        const productosSeleccionados = Array.from(productCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
        if (productosSeleccionados.length === 0) {
            showToast('Debes seleccionar al menos un producto para ajustar su precio.', 'warning', 'Productos No Seleccionados');
            isValid = false;
        }

        return isValid;
    }

    // Escuchar cambios en los inputs para limpiar la validación visual
    Array.from(document.querySelectorAll('input[name="tipoPrecio"]')).forEach(radio => {
        radio.addEventListener('change', () => {
            feedbackTipoPrecio.style.display = 'none';
        });
    });

    Array.from(document.querySelectorAll('input[name="tipoDecremento"]')).forEach(radio => {
        radio.addEventListener('change', () => {
            const valor = parseFloat(valorDecrementoInput.value);
            if (!isNaN(valor) && valor > 0) { // Limpiar si ya era válido
                valorDecrementoInput.classList.remove('is-invalid');
                feedbackValorDecremento.style.display = 'none';
            }
        });
    });

    valorDecrementoInput.addEventListener('input', () => {
        const valor = parseFloat(valorDecrementoInput.value);
        if (!isNaN(valor) && valor > 0) {
            valorDecrementoInput.classList.remove('is-invalid');
            feedbackValorDecremento.style.display = 'none';
        }
    });

    // --- Manejar el Envío del Formulario de Decremento (UTILIZA ENDPOINTS MASIVOS) ---
    formDecrementarPrecio.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Quitar validaciones previas de Bootstrap antes de volver a validar
        formDecrementarPrecio.classList.remove('was-validated');
        valorDecrementoInput.classList.remove('is-invalid');

        if (!validarFormularioDecremento()) {
            return;
        }

        // Si las validaciones personalizadas pasaron, usar la validación nativa del formulario
        if (!this.checkValidity()) {
            e.stopPropagation();
            this.classList.add('was-validated');
            return;
        }

        // Obtener los productos seleccionados
        productCheckboxes = document.querySelectorAll('.product-checkbox'); // Asegurarse de tener los checkboxes actuales
        const productosSeleccionadosIds = Array.from(productCheckboxes).filter(cb => cb.checked).map(cb => parseInt(cb.value));

        const tipoPrecio = document.querySelector('input[name="tipoPrecio"]:checked').value;
        const tipoAjuste = document.querySelector('input[name="tipoDecremento"]:checked').value;
        let valorAjuste = parseFloat(valorDecrementoInput.value);

        // Si es porcentaje, convertir el valor a formato decimal (ej. 5% -> 0.05)
        if (tipoAjuste === 'porcentaje') {
            valorAjuste /= 100;
        }

        // Para DECREMENTAR, el valor de ajuste debe ser NEGATIVO al enviarlo al backend
        // `Math.abs` asegura que trabajamos con el valor absoluto, y luego lo hacemos negativo.
        valorAjuste = -Math.abs(valorAjuste); 

        const confirmacion = confirm(`¿Estás seguro de aplicar un decremento de ${tipoAjuste === 'monto' ? '$' : ''}${parseFloat(valorDecrementoInput.value).toFixed(2)}${tipoAjuste === 'porcentaje' ? '%' : ''} al precio ${tipoPrecio} para los ${productosSeleccionadosIds.length} productos seleccionados?`);
        if (!confirmacion) {
            showToast('Operación de ajuste de precios cancelada.', 'info');
            return;
        }

        // Deshabilitar el botón para evitar envíos múltiples
        btnAplicarDecremento.disabled = true;
        btnAplicarDecremento.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Aplicando...';

        const token = getJwtToken();
        if (!token) {
            showToast('Su sesión ha expirado. Por favor, inicie sesión nuevamente.', 'danger', 'Error de Autenticación');
            setTimeout(() => { window.location.href = 'login.html'; }, 3000);
            return;
        }

        // --- CONSTRUCCIÓN DEL PAYLOAD Y URL PARA LA ÚNICA LLAMADA MASIVA ---
        let endpointUrl;
        let payload;

        if (tipoAjuste === 'monto') {
            endpointUrl = `${API_BASE_URL}/precios/${tipoPrecio}/monto`;
            payload = productosSeleccionadosIds.map(id => ({
                id: id,
                monto: valorAjuste // Ya es negativo
            }));
        } else { // tipoAjuste === 'porcentaje'
            endpointUrl = `${API_BASE_URL}/precios/${tipoPrecio}/porcentaje`;
            payload = productosSeleccionadosIds.map(id => ({
                id: id,
                porcentaje: valorAjuste // Ya es negativo
            }));
        }

        try {
            const response = await fetch(endpointUrl, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText || 'Error desconocido' }));
                throw new Error(`Error en la actualización de precio de varios productos: ${errorData.message}`);
            }

            const results = await response.json();
            
            showToast('Precios decrementados con éxito para los productos seleccionados.', 'success', 'Ajuste de Precios Exitoso');
            console.log('Resultados de la actualización:', results);

            await cargarProductosEnTabla(); // Recargar la tabla para mostrar los precios actualizados

        } catch (error) {
            console.error('Error al ajustar precios:', error);
            showToast(`Hubo un error al ajustar los precios: ${error.message}.`, 'danger', 'Error al Ajustar Precios');
        } finally {
            // Re-habilitar el botón y limpiar el formulario
            btnAplicarDecremento.disabled = false;
            btnAplicarDecremento.innerHTML = '<i class="fas fa-arrow-alt-circle-down me-2"></i> Aplicar Decremento';

            formDecrementarPrecio.reset();
            productCheckboxes = document.querySelectorAll('.product-checkbox'); 
            productCheckboxes.forEach(checkbox => checkbox.checked = false);
            seleccionarTodosBtn.innerHTML = '<i class="fas fa-check-double me-1"></i> Seleccionar Todos';
            formDecrementarPrecio.classList.remove('was-validated');
            valorDecrementoInput.classList.remove('is-invalid');
            feedbackTipoPrecio.style.display = 'none';
            feedbackValorDecremento.style.display = 'none';
        }
    });
});