document.addEventListener('DOMContentLoaded', event => {
    // Script para actualizar el nombre de usuario en el footer
    const nombreEnFooterSpan = document.getElementById('nombreEnFooter');
    if (nombreEnFooterSpan) {
        // Podrías obtener esto de una sesión o JWT, por ahora es estático
        nombreEnFooterSpan.textContent = "Usuario Admin"; 
    }

    // Inicializar Simple DataTables para la tabla de incremento de productos
    const datatablesIncremento = document.getElementById('datatablesIncremento');
    let productosDataTableInc; // Instancia de Simple DataTable para esta tabla

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
            showToast('No hay sesión activa. Por favor, inicie sesión.', 'warning', 'Sesión Expirada');
            window.location.href = 'login.html'; // Redirige a tu página de login
            return false;
        }
        return true;
    }

    // Función para cargar los productos y renderizar la tabla
    async function cargarProductosEnTabla() {
        if (!checkAuthAndRedirect()) return;

        const token = getJwtToken(); // Obtener el token

        try {
            const response = await fetch(API_BASE_URL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    // Incluir el token de autorización si existe
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });

            if (!response.ok) {
                // Si hay un error HTTP (ej. 401, 403, 404, 500), intenta leer el mensaje del backend
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (jsonError) {
                    // Si no se puede parsear como JSON, usa el statusText
                    errorMessage = response.statusText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            const productos = await response.json();

            // Destruir la instancia existente de DataTables si ya está inicializada
            if (productosDataTableInc) {
                productosDataTableInc.destroy();
            }

            // Construir los datos para la tabla
            const tableBody = document.querySelector('#datatablesIncremento tbody');
            tableBody.innerHTML = ''; // Limpiar el cuerpo de la tabla

            productos.forEach(producto => {
                // Aquí se accede a las propiedades del ProductoResponseDTO
                // Se ajusta el orden y se añade 'peso', eliminando 'descripcion'
                const row = `
                    <tr id="producto_inc_${producto.idProducto}">
                        <td><input type="checkbox" class="form-check-input product-checkbox" value="${producto.idProducto}"></td>
                        <td>${producto.idProducto}</td>
                        <td>${producto.nombreMarca || 'N/A'}</td> 
                        <td>${producto.nombre || ''}</td>
                        <td>${producto.peso !== undefined && producto.peso !== null ? producto.peso.toFixed(2) : 'N/A'}</td>
                        <td>${producto.stock !== undefined && producto.stock !== null ? producto.stock : 'N/A'}</td>
                        <td>$${producto.precioMinorista !== undefined && producto.precioMinorista !== null ? producto.precioMinorista.toFixed(2) : 'N/A'}</td>
                        <td>$${producto.precioMayorista !== undefined && producto.precioMayorista !== null ? producto.precioMayorista.toFixed(2) : 'N/A'}</td>
                    </tr>
                `;
                tableBody.insertAdjacentHTML('beforeend', row);
            });

            // Re-inicializar Simple DataTables
            productosDataTableInc = new simpleDatatables.DataTable(datatablesIncremento, {
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
            });

            // Re-asignar eventos a los checkboxes después de recargar la tabla
            productCheckboxes = document.querySelectorAll('.product-checkbox');

        } catch (error) {
            console.error('Error al cargar los productos:', error);
            showToast(`No se pudieron cargar los productos: ${error.message}. Asegúrate de haber iniciado sesión.`, 'danger', 'Error de Carga');
            // Opcional: Redirigir a la página de login si el error es 401
            // if (error.message.includes('401')) {
            //     window.location.href = 'login.html';
            // }
        }
    }

    // Cargar productos al inicio
    cargarProductosEnTabla();


    // --- Elementos del Formulario de Ajuste de Precios ---
    const formIncrementarPrecio = document.getElementById('formIncrementarPrecio');
    const radioPrecioMinorista = document.getElementById('radioPrecioMinorista');
    const radioPrecioMayorista = document.getElementById('radioPrecioMayorista');
    const radioMontoFijo = document.getElementById('radioMontoFijo');
    const radioPorcentaje = document.getElementById('radioPorcentaje');
    const valorIncrementoInput = document.getElementById('valorIncremento');
    const btnAplicarIncremento = document.getElementById('btnAplicarIncremento');

    const feedbackTipoPrecio = document.getElementById('feedbackTipoPrecio');
    const feedbackValorIncremento = document.getElementById('feedbackValorIncremento');

    let productCheckboxes = document.querySelectorAll('.product-checkbox'); // Se actualizará al cargar productos
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

    // --- Validaciones Personalizadas del Formulario de Ajuste ---
    function validarFormularioIncremento() {
        let isValid = true;

        const tipoPrecioSelected = radioPrecioMinorista.checked || radioPrecioMayorista.checked;
        if (!tipoPrecioSelected) {
            feedbackTipoPrecio.style.display = 'block';
            isValid = false;
        } else {
            feedbackTipoPrecio.style.display = 'none';
        }

        const tipoIncrementoSelected = radioMontoFijo.checked || radioPorcentaje.checked;
        const valor = parseFloat(valorIncrementoInput.value);

        // Permite valores negativos para decrementos, pero no cero o NaN
        if (!tipoIncrementoSelected || isNaN(valor) || valor === 0) {
            valorIncrementoInput.classList.add('is-invalid');
            feedbackValorIncremento.textContent = "El valor del ajuste es obligatorio y debe ser un número válido (no cero).";
            feedbackValorIncremento.style.display = 'block';
            isValid = false;
        } else {
            valorIncrementoInput.classList.remove('is-invalid');
            feedbackValorIncremento.style.display = 'none';
        }

        // Asegúrate de que productCheckboxes esté actualizado con los elementos actuales de la tabla
        productCheckboxes = document.querySelectorAll('.product-checkbox');
        const productosSeleccionados = Array.from(productCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
        if (productosSeleccionados.length === 0) {
            showToast('Debes seleccionar al menos un producto para ajustar su precio.', 'warning', 'Advertencia');
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

    Array.from(document.querySelectorAll('input[name="tipoIncremento"]')).forEach(radio => {
        radio.addEventListener('change', () => {
            const valor = parseFloat(valorIncrementoInput.value);
            if (!isNaN(valor) && valor !== 0) { // Limpiar si ya era válido
                valorIncrementoInput.classList.remove('is-invalid');
                feedbackValorIncremento.style.display = 'none';
            }
        });
    });

    valorIncrementoInput.addEventListener('input', () => {
        const valor = parseFloat(valorIncrementoInput.value);
        if (!isNaN(valor) && valor !== 0) {
            valorIncrementoInput.classList.remove('is-invalid');
            feedbackValorIncremento.style.display = 'none';
        }
    });

    // --- Manejar el Envío del Formulario de Ajuste (AHORA UTILIZA ENDPOINTS MASIVOS) ---
    formIncrementarPrecio.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Quitar validaciones previas de Bootstrap antes de volver a validar
        formIncrementarPrecio.classList.remove('was-validated');
        valorIncrementoInput.classList.remove('is-invalid');

        if (!validarFormularioIncremento()) {
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
        const productosSeleccionadosIds = Array.from(productCheckboxes).filter(cb => cb.checked).map(cb => parseInt(cb.value)); // Convertir a número

        const tipoPrecio = document.querySelector('input[name="tipoPrecio"]:checked').value; // 'minorista' o 'mayorista'
        const tipoAjuste = document.querySelector('input[name="tipoIncremento"]:checked').value; // 'monto' o 'porcentaje'
        let valorAjuste = parseFloat(valorIncrementoInput.value);

        // Si es porcentaje, convertir el valor a formato decimal (ej. 5% -> 0.05)
        if (tipoAjuste === 'porcentaje') {
            valorAjuste /= 100;
        }

        // Mensaje de confirmación usando confirm (no toast aquí ya que es una pregunta)
        const confirmacion = confirm(`¿Estás seguro de aplicar un ajuste de ${tipoAjuste === 'monto' ? '$' : ''}${valorIncrementoInput.value}${tipoAjuste === 'porcentaje' ? '%' : ''} al precio ${tipoPrecio} para los ${productosSeleccionadosIds.length} productos seleccionados?`);
        if (!confirmacion) {
            return; // El usuario canceló la operación
        }

        // Deshabilitar el botón para evitar envíos múltiples
        btnAplicarIncremento.disabled = true;
        btnAplicarIncremento.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Aplicando...';

        const token = getJwtToken(); // Obtener el token para las peticiones PATCH

        // --- CONSTRUCCIÓN DEL PAYLOAD Y URL PARA LA ÚNICA LLAMADA MASIVA ---
        let endpointUrl;
        let payload;

        if (tipoAjuste === 'monto') {
            endpointUrl = `${API_BASE_URL}/precios/${tipoPrecio}/monto`;
            payload = productosSeleccionadosIds.map(id => ({
                id: id,
                monto: valorAjuste // Puede ser positivo o negativo
            }));
        } else { // tipoAjuste === 'porcentaje'
            endpointUrl = `${API_BASE_URL}/precios/${tipoPrecio}/porcentaje`;
            payload = productosSeleccionadosIds.map(id => ({
                id: id,
                porcentaje: valorAjuste // Ya es un porcentaje en formato decimal, puede ser positivo o negativo
            }));
        }

        try {
            const response = await fetch(endpointUrl, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    // ¡IMPORTANTE! Incluir el token de autorización aquí
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: JSON.stringify(payload) // Enviamos el array de DTOs
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText || 'Error desconocido' }));
                throw new Error(`Error en la actualización masiva: ${errorData.message}`);
            }

            const results = await response.json(); // La respuesta es la lista de ProductoResponseDTO actualizados
            showToast('Precios actualizados con éxito para los productos seleccionados.', 'success', 'Éxito');
            console.log('Resultados de la actualización masiva:', results);

            await cargarProductosEnTabla(); // Recargar la tabla para mostrar los precios actualizados

        } catch (error) {
            console.error('Error al ajustar precios:', error);
            showToast(`Hubo un error al ajustar los precios: ${error.message}. Asegúrate de tener permisos y que los datos sean válidos.`, 'danger', 'Error de Ajuste');
        } finally {
            // Re-habilitar el botón y limpiar el formulario
            btnAplicarIncremento.disabled = false;
            btnAplicarIncremento.innerHTML = '<i class="fas fa-arrow-alt-circle-up me-2"></i> Aplicar Ajuste';

            formIncrementarPrecio.reset();
            productCheckboxes.forEach(checkbox => checkbox.checked = false); // Desmarcar todos los checkboxes
            seleccionarTodosBtn.innerHTML = '<i class="fas fa-check-double me-1"></i> Seleccionar Todos'; // Resetear texto del botón "Seleccionar Todos"
            formIncrementarPrecio.classList.remove('was-validated');
            valorIncrementoInput.classList.remove('is-invalid');
            feedbackTipoPrecio.style.display = 'none';
            feedbackValorIncremento.style.display = 'none';
        }
    });

    // Función para actualizar el texto en el footer (ejemplo, si aplicara)
    const nombreEnFooter = document.getElementById('nombreEnFooter');
    if (nombreEnFooter) {
        // Puedes reemplazar con el nombre de usuario real si lo tienes almacenado en algún lugar
        nombreEnFooter.textContent = "Tu Usuario"; 
    }
});