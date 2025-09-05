

// Nota: Asumimos que la variable API_BASE_URL está definida en el archivo config.js
// que se carga antes en el HTML.

function getToken() {
    return localStorage.getItem('jwtToken');
}

function showToast(message, type, title) {
    console.log(`Toast: ${title} - ${type} - ${message}`);
   
}

function obtenerNombreMes(mes) {
    const nombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    return nombres[mes - 1];
}

async function fetchData(url, errorMsg, responseType = 'json') {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };

    try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
            if (response.status === 204) { // No Content
                return null;
            }
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
        }
        return responseType === 'text' ? await response.text() : await response.json();
    } catch (error) {
        console.error(`Error en la petición a la API: ${errorMsg}`, error);
        showToast(error.message, 'danger', 'Error de API');
        return null;
    }
}

// --- Funciones para cargar los datos de las cards ---
async function cargarDatosTarjetas(year, month) {
    try {
        // Total de ventas
        const totalVentas = await fetchData(`${API_BASE_URL}/ventas/total-ventas/${year}/${month}`, "Total de ventas");
        document.getElementById('totalVentasMes').textContent = totalVentas !== null 
            ? totalVentas.toLocaleString('es-AR') 
            : '0';

        // Total recaudado
        const totalRecaudado = await fetchData(`${API_BASE_URL}/ventas/total-recaudado/${year}/${month}`, "Recaudación total");
        document.getElementById('totalRecaudadoMes').textContent = totalRecaudado !== null 
            ? `$${totalRecaudado.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
            : '$0,00';

        // Marca más vendida (texto plano)
        const marcaMasVendida = await fetchData(
            `${API_BASE_URL}/ventas/marca-mas-vendida/${year}/${month}`,
            "Marca más vendida",
            'text'
        );
        document.getElementById('diaMasVendido').textContent = marcaMasVendida || 'N/A';

        // Producto más vendido
        const productosTop = await fetchData(`${API_BASE_URL}/productos/top-vendidos/${year}/${month}`, "Producto más vendido");
        let nombreProducto = "N/A";
        if (productosTop && Array.isArray(productosTop) && productosTop.length > 0) {
            const p = productosTop[0];
            // CORREGIDO: Se muestra la marca, nombre y peso.
            nombreProducto = `${p.marca} ${p.nombreProducto} (${p.peso.toFixed(2)} kg)`;
        }
        document.getElementById('productoMasVendido').textContent = nombreProducto;
        
    } catch (error) {
        console.error('Error al cargar datos de las tarjetas:', error);
        showToast(error.message, 'danger', 'Error de API');
    }
}

// --- Funciones para cargar los datos de los gráficos ---
async function cargarGraficos(year, month) {
    console.log(`Cargando gráficos para Año: ${year}, Mes: ${month}`);

    // --- Gráfico de Recaudación Mensual (Histórico) ---
    await cargarGraficoRecaudacionHistorica();

    // --- Gráfico de Ventas por Día de la Semana ---
    await cargarGraficoVentasPorDia(year, month);

    // --- Gráfico de Clientes Destacados del Mes ---
    await cargarGraficoClientesDestacados(year, month);
    
    // --- Gráfico de Estado de los Envíos ---
    await cargarGraficoEstadoEnvios(year, month);
    
    // --- Gráfico de Productos TOP del Mes ---
    await cargarGraficoProductosTop(year, month);
    
    console.log("Todos los gráficos han sido cargados.");
}

// Función para el gráfico de Recaudación Mensual (Histórico)
async function cargarGraficoRecaudacionHistorica() {
    const data = await fetchData(`${API_BASE_URL}/ventas/recaudacion-historica`, "Recaudación Histórica");
    if (!data) {
        console.log("No hay datos de recaudación histórica para mostrar.");
        return;
    }

    const labels = data.map(item => `${obtenerNombreMes(item.mes)} ${item.anio}`);
    const values = data.map(item => item.totalRecaudado);

    const ctx = document.getElementById('recaudacionChartPlaceholder');
    // Para evitar errores, destruye el gráfico si ya existe
    if (Chart.getChart('recaudacionChartPlaceholder')) {
        Chart.getChart('recaudacionChartPlaceholder').destroy();
    }
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Recaudación Total',
                data: values,
                backgroundColor: 'rgba(255, 159, 64, 0.2)',
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 2,
                fill: true,
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Monto Recaudado ($)'
                    }
                }
            }
        }
    });
}

// Función para el gráfico de Ventas por Día de la Semana
async function cargarGraficoVentasPorDia(year, month) {
    const data = await fetchData(`${API_BASE_URL}/ventas/ventas-por-dia/${year}/${month}`, "Ventas por Día de la Semana");
    if (!data) {
        console.log("No hay datos de ventas por día para este mes.");
        return;
    }

    const labels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    
    const ctx = document.getElementById('ventasPorDiaChartPlaceholder');
    if (Chart.getChart('ventasPorDiaChartPlaceholder')) {
        Chart.getChart('ventasPorDiaChartPlaceholder').destroy();
    }
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ventas del Día',
                data: data,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Cantidad de Ventas'
                    }
                }
            }
        }
    });
}

// Función para el gráfico de Clientes Destacados
async function cargarGraficoClientesDestacados(year, month) {
    const data = await fetchData(`${API_BASE_URL}/clientes/destacados/${year}/${month}`, "Clientes Destacados");
    if (!data) {
        console.log("No hay clientes destacados para este mes.");
        return;
    }

    const topClientes = data.slice(0, 5);
    const labels = topClientes.map(c => c.nombreCompleto);
    const values = topClientes.map(c => c.totalGastado);

    const ctx = document.getElementById('clientesDestacadosChartPlaceholder');
    if (Chart.getChart('clientesDestacadosChartPlaceholder')) {
        Chart.getChart('clientesDestacadosChartPlaceholder').destroy();
    }

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Pagado ($)',
                data: values,
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y', // Hace el gráfico de barras horizontal
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Total Pagado ($)'
                    }
                }
            }
        }
    });
}

// Función para el gráfico de Estado de los Envíos
async function cargarGraficoEstadoEnvios(year, month) {
    const data = await fetchData(`${API_BASE_URL}/envios/estado-distribucion/${year}/${month}`, "Estado de Envíos");
    if (!data) {
        console.log("No hay datos de estado de envíos para este mes.");
        return;
    }

    const labels = Object.keys(data);
    const values = Object.values(data);

    const ctx = document.getElementById('estadoEnviosChartPlaceholder');
    if (Chart.getChart('estadoEnviosChartPlaceholder')) {
        Chart.getChart('estadoEnviosChartPlaceholder').destroy();
    }

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cantidad de Envíos',
                data: values,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 206, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)'
                ],
                borderColor: 'rgba(255, 255, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true
        }
    });
}

// Función para el gráfico de Productos TOP del Mes
async function cargarGraficoProductosTop(year, month) {
    const data = await fetchData(`${API_BASE_URL}/productos/top-vendidos/${year}/${month}`, "Productos TOP del Mes");
    if (!data) {
        console.log("No hay productos top para este mes.");
        return;
    }

    const topProductos = data.slice(0, 5);
    const labels = topProductos.map(p => {
        // CORREGIDO: Se muestra la marca, nombre y peso en las etiquetas del gráfico
        return `${p.marca} ${p.nombreProducto} (${p.peso.toFixed(2)} kg)`;
    });
    // CORREGIDO: La API devuelve 'totalVendido' no 'cantidadVendida'
    const values = topProductos.map(p => p.totalVendido);
    
    const ctx = document.getElementById('productosTopMesChartPlaceholder');
    if (Chart.getChart('productosTopMesChartPlaceholder')) {
        Chart.getChart('productosTopMesChartPlaceholder').destroy();
    }

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cantidad Vendida',
                data: values,
                backgroundColor: 'rgba(153, 102, 255, 0.5)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Unidades Vendidas'
                    }
                }
            }
        }
    });
}

// Lógica para poblar el selector de meses
async function poblarSelectorDeMeses() {
    const selector = document.getElementById('mesSelector');
    if (!selector) return;

    selector.innerHTML = '';
    
    try {
        const primerMesVenta = await fetchData(`${API_BASE_URL}/ventas/primer-mes-venta`, "primer mes de venta");
        if (!primerMesVenta) {
            console.warn("No se encontraron ventas para poblar el selector de meses.");
            return;
        }

        const [startYear, startMonth] = primerMesVenta.split('-').map(Number);
        const hoy = new Date();
        let currentMonth = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

        while (currentMonth.getFullYear() > startYear || (currentMonth.getFullYear() === startYear && currentMonth.getMonth() + 1 >= startMonth)) {
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth() + 1;
            
            const option = document.createElement('option');
            option.value = `${year}-${String(month).padStart(2, '0')}`;
            option.textContent = `${obtenerNombreMes(month)} ${year}`;
            selector.appendChild(option);

            currentMonth.setMonth(currentMonth.getMonth() - 1);
        }
        
        console.log("Selector de meses poblado y valor por defecto establecido.");

    } catch (error) {
        console.error('Error al poblar el selector de meses:', error);
    }
}

// --- Lógica principal que se ejecuta al cargar la página ---
document.addEventListener('DOMContentLoaded', async () => {
    await poblarSelectorDeMeses();

    const selector = document.getElementById('mesSelector');
    if (selector && selector.value) {
        const [initialYear, initialMonth] = selector.value.split('-').map(Number);
        await cargarDatosDashboard(initialYear, initialMonth);
    } else {
        const today = new Date();
        await cargarDatosDashboard(today.getFullYear(), today.getMonth() + 1);
    }
    
    if (selector) {
        selector.addEventListener('change', async (e) => {
            const [newYear, newMonth] = e.target.value.split('-').map(Number);
            await cargarDatosDashboard(newYear, newMonth);
        });
    }
});

async function cargarDatosDashboard(year, month) {
    try {
        await cargarDatosTarjetas(year, month);
        await cargarGraficos(year, month);
    } catch (error) {
        console.error('Error al cargar datos del dashboard:', error);
    }
}