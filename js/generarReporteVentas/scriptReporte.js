// --- API Configuration ---
const API_BASE_URL = 'http://localhost:8080/distribuidora'; // Ajusta esto a la URL de tu backend
const SALES_ENDPOINT = `${API_BASE_URL}/ventas`;
const DETAIL_SALES_ENDPOINT = `${API_BASE_URL}/detalle_ventas/venta`;
const PRODUCTS_ENDPOINT = `${API_BASE_URL}/productos`; // Aunque no se usa directamente para filtro, se usa para detalles de venta
const BRANDS_ENDPOINT = `${API_BASE_URL}/marcas`;
const CLIENTS_ENDPOINT = `${API_BASE_URL}/clientes`;

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const BAR_COLORS = [
    '#FF6384',  // Rosado
    '#36A2EB',  // Azul
    '#FFCE56',  // Amarillo
    '#4BC0C0',  // Turquesa
    '#9966FF',  // Violeta
    '#FF9F40',  // Naranja
    '#C9CBCE',  // Gris
    '#A3E4D7',  // Verde menta
    '#FADBD8',  // Rosa pálido
    '#E8DAEF',  // Morado claro
    '#A9CCE3',  // Azul cielo
    '#A2D9CE'   // Aguamarina
];

let myBarChart; // Global variable to hold the chart instance
let allFetchedSales = []; // Store all sales data from API to filter client-side
let allFetchedBrands = [];   // Store all brands from API for modal
let allFetchedClients = [];  // Store all clients from API for modal

// --- Filter State Variables ---
let currentFilter = {
    type: 'all_products', // 'all_products', 'specific_brand', 'specific_client'
    brandId: null,
    brandName: null,
    clientId: null,
    clientName: null
};

// --- Helper function to get JWT Token ---
function getJwtToken() {
    return localStorage.getItem('jwtToken');
}

// --- Generic API Fetch Function ---
async function fetchData(url, errorMessage) {
    const token = getJwtToken();
    if (!token) {
        console.error('No se encontró el token JWT. Por favor, inicie sesión.');
        // Reemplazado alert() por showToast()
        showToast('Su sesión ha expirado o no ha iniciado sesión. Por favor, inicie sesión nuevamente.', 'danger', 'Error de Autenticación', 7000);
        return null;
    }

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        // Modificación para manejar respuestas 204 No Content
        if (response.status === 204) {
            console.warn(`API returned 204 No Content for ${url}. Returning empty array.`);
            return []; // Retorna un array vacío para "No Content"
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        return await response.json();

    } catch (error) {
        console.error(`Error al obtener los datos de ${errorMessage}:`, error);
        document.getElementById("noDataMessage").textContent = `Error al cargar la información: ${errorMessage} (${error.message}).`;
        document.getElementById("noDataMessage").style.display = 'block';
        document.getElementById("salesBarChart").style.display = 'none';
        // Reemplazado la actualización de texto por showToast()
        showToast(`No se pudieron cargar los datos de ${errorMessage}. Detalle: ${error.message}`, 'danger', 'Error de Carga', 7000);
        return null; // Return null to indicate failure
    }
}

// --- Fetch Sales Data from API ---
async function fetchAllSalesFromAPI() {
    const data = await fetchData(SALES_ENDPOINT, 'ventas');
    if (data) {
        allFetchedSales = data;
        populateYearSelector(data); // Populate years after fetching sales
    } else {
        // Añadido showToast para el caso de que fetchAllSalesFromAPI falle
        showToast('No se pudieron obtener todas las ventas. El gráfico podría estar vacío.', 'warning', 'Advertencia de Datos');
    }
}

// --- Fetch Brands from API ---
async function fetchAllBrandsFromAPI() {
    const data = await fetchData(BRANDS_ENDPOINT, 'marcas');
    if (data) {
        allFetchedBrands = data;
    } else {
        // Añadido showToast para el caso de que fetchAllBrandsFromAPI falle
        showToast('No se pudieron cargar las marcas.', 'danger', 'Error de Carga');
    }
    return data || []; // Ensure it returns an array
}

// --- Fetch Clients from API ---
async function fetchAllClientsFromAPI() {
    const data = await fetchData(`${CLIENTS_ENDPOINT}/buscarTodos`, 'clientes'); // Using buscarTodos endpoint
    if (data) {
        allFetchedClients = data;
    } else {
        // Añadido showToast para el caso de que fetchAllClientsFromAPI falle
        showToast('No se pudieron cargar los clientes.', 'danger', 'Error de Carga');
    }
    return data || []; // Ensure it returns an array
}

// --- Populate Year Selector ---
function populateYearSelector(salesData) {
    const yearSelector = document.getElementById('yearSelector');
    yearSelector.innerHTML = ''; // Clear existing options

    const years = new Set();
    salesData.forEach(sale => {
        const saleDate = new Date(sale.fecha);
        years.add(saleDate.getFullYear());
    });

    const sortedYears = Array.from(years).sort((a, b) => b - a); // Sort descending

    // Add current year if it's not present (even if no sales yet)
    const currentYear = new Date().getFullYear();
    if (!sortedYears.includes(currentYear)) {
        sortedYears.unshift(currentYear);
    }

    sortedYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelector.appendChild(option);
    });

    // Select the current year by default
    yearSelector.value = currentYear;
}

// --- Process Sales Data for Chart ---
function processSalesForChart(salesData, year, filter) {
    const monthlySales = new Array(12).fill(0);
    const salesByMonth = new Array(12).fill(null).map(() => ({ total: 0, sales: [] }));

    salesData.forEach(venta => {
        const saleDate = new Date(venta.fecha);
        const saleYear = saleDate.getFullYear();
        const saleMonth = saleDate.getMonth(); // 0-indexed

        if (saleYear === parseInt(year)) {
            let matchesFilter = true;

            // Apply advanced filters
            if (filter.type === 'specific_brand' && filter.brandId) {
                matchesFilter = venta.detalles.some(detalle => {
                    // ESTA ES LA LÓGICA ORIGINAL QUE HAS PROPORCIONADO Y MANTENDREMOS
                    const matchedBrand = allFetchedBrands.find(b => b.idMarca === filter.brandId);
                    return matchedBrand && detalle.marcaProducto === matchedBrand.nombre;
                });
            } else if (filter.type === 'specific_client' && filter.clientId) {
                matchesFilter = venta.cliente && venta.cliente.id === filter.clientId;
            }
            // 'all_products' does not require specific filtering here

            if (matchesFilter) {
                monthlySales[saleMonth] += venta.total;
                salesByMonth[saleMonth].total += venta.total;
                salesByMonth[saleMonth].sales.push(venta);
            }
        }
    });

    processedMonthlySales = salesByMonth; // Store for modal access
    return monthlySales;
}

// --- Update Chart Function ---
async function updateChart() {
    Chart.defaults.global.defaultFontFamily = '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
    Chart.defaults.global.defaultFontColor = '#292b2c';

    const selectedYear = document.getElementById('yearSelector').value;

    // Ensure allFetchedSales is populated (e.g., on first load or after refresh)
    if (allFetchedSales.length === 0) {
        await fetchAllSalesFromAPI();
        if (allFetchedSales.length === 0) { // If fetching failed, stop
            return;
        }
    }

    const rawSalesDataForChart = processSalesForChart(allFetchedSales, selectedYear, currentFilter);

    const date = new Date();
    const currentYear = date.getFullYear();
    const currentMonthIndex = date.getMonth();

    let displayMonths = MONTH_NAMES;
    let displaySalesData = rawSalesDataForChart;
    let displayColors = BAR_COLORS;

    if (parseInt(selectedYear) === currentYear) {
        displayMonths = MONTH_NAMES.slice(0, currentMonthIndex + 1);
        displaySalesData = rawSalesDataForChart.slice(0, currentMonthIndex + 1);
        displayColors = BAR_COLORS.slice(0, currentMonthIndex + 1);
    } else {
        let lastValidIndex = displaySalesData.length - 1;
        while (lastValidIndex >= 0 && displaySalesData[lastValidIndex] === 0) {
            lastValidIndex--;
        }
        displayMonths = displayMonths.slice(0, lastValidIndex + 1);
        displaySalesData = displaySalesData.slice(0, lastValidIndex + 1);
        displayColors = displayColors.slice(0, lastValidIndex + 1);
    }

    const chartCanvas = document.getElementById("salesBarChart");
    const noDataMessage = document.getElementById("noDataMessage");
    const chartTitle = document.getElementById("chartTitle");

    const hasData = displaySalesData.some(value => value > 0);

    if (!hasData) {
        chartCanvas.style.display = 'none';
        noDataMessage.style.display = 'block';
        noDataMessage.textContent = "No hay datos de ventas disponibles para el período o filtros seleccionados.";
        if (myBarChart) {
            myBarChart.destroy();
            myBarChart = null;
        }
        // Añadido showToast para el caso de no haber datos
        showToast('No se encontraron ventas para los filtros seleccionados.', 'info', 'Sin Datos');
    } else {
        chartCanvas.style.display = 'block';
        noDataMessage.style.display = 'none';

        if (myBarChart) {
            myBarChart.data.labels = displayMonths;
            myBarChart.data.datasets[0].data = displaySalesData;
            myBarChart.data.datasets[0].backgroundColor = displayColors;
            myBarChart.data.datasets[0].borderColor = displayColors;
            myBarChart.options.scales.yAxes[0].ticks.max = Math.max(...displaySalesData) * 1.2;
            myBarChart.update();
        } else {
            myBarChart = new Chart(chartCanvas, {
                type: 'bar',
                data: {
                    labels: displayMonths,
                    datasets: [{
                        label: "Ventas",
                        backgroundColor: displayColors,
                        borderColor: displayColors,
                        data: displaySalesData,
                    }],
                },
                options: {
                    maintainAspectRatio: false,
                    scales: {
                        xAxes: [{
                            gridLines: { display: false },
                            ticks: { maxTicksLimit: displayMonths.length, autoSkip: false }
                        }],
                        yAxes: [{
                            ticks: {
                                min: 0,
                                max: Math.max(...displaySalesData) * 1.2,
                                maxTicksLimit: 5,
                                callback: function(value, index, values) { return '$' + value.toLocaleString(); }
                            },
                            gridLines: { display: true }
                        }],
                    },
                    legend: { display: false },
                    tooltips: {
                        callbacks: {
                            label: function(tooltipItem, chart) {
                                var datasetLabel = chart.datasets[tooltipItem.datasetIndex].label || '';
                                return datasetLabel + ': $' + tooltipItem.yLabel.toLocaleString();
                            }
                        }
                    },
                    plugins: {
                        datalabels: {
                            anchor: 'end',
                            align: 'top',
                            formatter: function(value, context) { return value > 0 ? '$' + value.toLocaleString() : ''; },
                            font: { weight: 'bold', size: 10 },
                            color: '#333'
                        }
                    },
                    onClick: function(evt, activeElements) {
                        if (activeElements.length > 0) {
                            const chartElement = activeElements[0];
                            const monthIndex = chartElement._index;
                            const selectedMonthName = displayMonths[monthIndex];
                            const monthDetail = processedMonthlySales[monthIndex];
                            
                            if (monthDetail && monthDetail.total > 0) {
                                openSalesDetailModal(selectedMonthName, monthDetail.total, selectedYear, currentFilter, monthDetail.sales);
                            } else {
                                openSalesDetailModal(selectedMonthName, 0, selectedYear, currentFilter, []);
                                // Añadido showToast para cuando no hay detalles de ventas para un mes
                                showToast(`No hay ventas registradas para ${selectedMonthName} con los filtros actuales.`, 'info', 'Sin Detalles');
                            }
                        }
                    }
                }
            });
        }
    }
    // Update chart title based on applied filter
    let filterTypeText = '';
    if (currentFilter.type === 'specific_brand' && currentFilter.brandName) {
        filterTypeText = ` (Marca: ${currentFilter.brandName})`;
    } else if (currentFilter.type === 'specific_client' && currentFilter.clientName) {
        filterTypeText = ` (Cliente: ${currentFilter.clientName})`;
    }
    chartTitle.innerHTML = `<i class="fas fa-chart-bar me-2"></i> Ventas Mensuales ${selectedYear}${filterTypeText}`;
}

// --- Modal Functions (Sales Detail) ---
const salesDetailModal = document.getElementById('salesDetailModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalTitle = document.getElementById('modalTitle');
const modalTotalSales = document.getElementById('modalTotalSales');
const salesList = document.getElementById('salesList');
const downloadMonthlyReportBtn = document.getElementById('downloadMonthlyReportBtn');

async function openSalesDetailModal(month, totalSales, year, filter, salesDataForMonth) {
    modalTitle.textContent = `Detalle de Ventas de ${month} ${year}`;
    modalTotalSales.textContent = `$${(totalSales || 0).toLocaleString()}`;

    salesList.innerHTML = ''; // Clear previous list

    if (salesDataForMonth && salesDataForMonth.length > 0) {
        for (const sale of salesDataForMonth) {
            const saleItem = document.createElement('li');
            saleItem.classList.add('mb-3', 'p-2', 'border', 'rounded', 'bg-light'); // Add some styling
            saleItem.innerHTML = `<strong>Venta #${sale.idVenta}</strong> - Cliente: ${sale.cliente ? sale.cliente.nombre + ' ' + sale.cliente.apellido : 'N/A'} - Total: $${(sale.total || 0).toLocaleString()}<br>`;
            saleItem.innerHTML += `Fecha: ${new Date(sale.fecha).toLocaleDateString()}<br>`;
            
            if (sale.detalles && sale.detalles.length > 0) {
                saleItem.innerHTML += `Detalles de Productos:<ul>`;
                sale.detalles.forEach(detail => {
                    saleItem.innerHTML += `<li>${detail.nombreProducto} (${detail.marcaProducto || 'N/A'}) - Cantidad: ${detail.cantidad} - P. Unitario: $${(detail.precioUnitario || 0).toLocaleString()} - Subtotal: $${(detail.subtotal || 0).toLocaleString()}</li>`;
                });
                saleItem.innerHTML += `</ul>`;
            } else {
                salesList.innerHTML += `<li><em>No se encontraron detalles de productos para esta venta.</em></li>`;
            }
            salesList.appendChild(saleItem);
        }
    } else {
        salesList.innerHTML = '<li class="text-muted">No hay ventas registradas para este mes o tipo de filtro.</li>';
        // Añadido showToast aquí también para cuando no hay ventas en el modal de detalle
        showToast(`No hay ventas registradas para este mes o tipo de filtro.`, 'info', 'Sin Detalles');
    }

  downloadMonthlyReportBtn.onclick = function() {
    generateMonthlySalesPdfReport(month, totalSales, year, filter, salesDataForMonth);
    };

    salesDetailModal.classList.add('show');
}



// Dentro de openSalesDetailModal(month, totalSales, year, filter, salesDataForMonth)
downloadMonthlyReportBtn.onclick = function() {
    generateMonthlySalesPdfReport(month, totalSales, year, filter, salesDataForMonth);
};

// Nueva función para generar el PDF del reporte mensual
async function generateMonthlySalesPdfReport(month, totalSales, year, filter, salesDataForMonth) {
    showToast(`Generando reporte PDF para las ventas de ${month} ${year}...`, 'info', 'Generando Reporte');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Título del reporte
    doc.setFontSize(22);
    doc.text(`Reporte de Ventas - ${month} ${year}`, 14, 25);

    // Información del filtro
    let filterInfo = 'Tipo de Filtro: Todos los productos';
    if (filter.type === 'specific_brand' && filter.brandName) {
        filterInfo = `Tipo de Filtro: Marca - ${filter.brandName}`;
    } else if (filter.type === 'specific_client' && filter.clientName) {
        filterInfo = `Tipo de Filtro: Cliente - ${filter.clientName}`;
    }
    doc.setFontSize(12);
    doc.text(filterInfo, 14, 35);
    doc.text(`Total de Ventas del Mes: $${(totalSales || 0).toLocaleString()}`, 14, 45);

    let yOffset = 60; // Posición inicial para el contenido de las ventas

    if (salesDataForMonth && salesDataForMonth.length > 0) {
        doc.setFontSize(10);
        salesDataForMonth.forEach(sale => {
            if (yOffset > 280) { // Si el contenido excede la página, añade una nueva
                doc.addPage();
                yOffset = 20; // Reinicia la posición Y en la nueva página
            }

            doc.text(`Venta #${sale.idVenta} - Cliente: ${sale.cliente ? sale.cliente.nombre + ' ' + sale.cliente.apellido : 'N/A'} - Total: $${(sale.total || 0).toLocaleString()}`, 14, yOffset);
            yOffset += 7;
            doc.text(`Fecha: ${new Date(sale.fecha).toLocaleDateString()}`, 14, yOffset);
            yOffset += 7;

            if (sale.detalles && sale.detalles.length > 0) {
                sale.detalles.forEach(detail => {
                    if (yOffset > 280) { // Si los detalles exceden la página
                        doc.addPage();
                        yOffset = 20;
                    }
                    doc.text(`  - ${detail.nombreProducto} (${detail.marcaProducto || 'N/A'}) - Cantidad: ${detail.cantidad} - P. Unitario: $${(detail.precioUnitario || 0).toLocaleString()} - Subtotal: $${(detail.subtotal || 0).toLocaleString()}`, 18, yOffset);
                    yOffset += 6;
                });
            } else {
                if (yOffset > 280) { doc.addPage(); yOffset = 20; }
                doc.text(`  No se encontraron detalles de productos para esta venta.`, 18, yOffset);
                yOffset += 6;
            }
            yOffset += 10; // Espacio entre ventas
        });
    } else {
        doc.setFontSize(12);
        doc.text('No hay ventas registradas para este mes o tipo de filtro.', 14, yOffset);
    }

    doc.save(`reporte_ventas_mensual_${month}_${year}.pdf`);
    showToast('Reporte PDF mensual generado exitosamente.', 'success', 'Reporte Creado');
}



function closeSalesDetailModal() {
    salesDetailModal.classList.remove('show');
}

// --- Modal Functions (Advanced Filter) ---
const advancedFilterModal = document.getElementById('advancedFilterModal');
const openAdvancedFilterModalBtn = document.getElementById('openAdvancedFilterModalBtn');
const closeAdvancedFilterModalBtn = document.getElementById('closeAdvancedFilterModalBtn');
const cancelFilterBtn = document.getElementById('cancelFilterBtn');
const applyFilterBtn = document.getElementById('applyFilterBtn');

// Filter Radio Buttons
const filterOptionRadios = document.querySelectorAll('input[name="filterOption"]');

// Specific sections (only brand and client remain)
const specificBrandSection = document.getElementById('specificBrandSection');
const specificClientSection = document.getElementById('specificClientSection');

// Brand Filter Elements
const brandList = document.getElementById('brandList');
const selectedBrandInfo = document.getElementById('selectedBrandInfo');

// Client Filter Elements
const clientSearchInput = document.getElementById('clientSearchInput');
const searchClientBtn = document.getElementById('searchClientBtn');
const clientList = document.getElementById('clientList');
const selectedClientInfo = document.getElementById('selectedClientInfo');

// Temporary variables to hold selections before applying
let tempFilter = { ...currentFilter }; // Copy current filter when opening modal

function showHideFilterSections() {
    // Hide all specific sections first
    specificBrandSection.style.display = 'none';
    specificClientSection.style.display = 'none';

    // Show the relevant section based on tempFilter.type
    switch (tempFilter.type) {
        case 'specific_brand':
            specificBrandSection.style.display = 'block';
            break;
        case 'specific_client':
            specificClientSection.style.display = 'block';
            break;
    }
}

async function openAdvancedFilterModal() {
    tempFilter = { ...currentFilter }; // Reset tempFilter to current active filter

    // Set radio button based on tempFilter.type
    const selectedRadioId = `filterOption${tempFilter.type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')}`;
    const selectedRadio = document.getElementById(selectedRadioId);
    if (selectedRadio) {
        selectedRadio.checked = true;
    }

    await loadModalData(); // Load brands and clients for the modal
    updateSelectedInfoDisplays(); // Update info texts
    showHideFilterSections(); // Show/hide sections based on active radio

    advancedFilterModal.classList.add('show');
}

function closeAdvancedFilterModal() {
    advancedFilterModal.classList.remove('show');
}

function applyFilters() {
    currentFilter = { ...tempFilter }; // Apply temporary filter to current
    updateChart(); // Re-render chart with new filters
    closeAdvancedFilterModal();
    // Añadido showToast para confirmación de filtros aplicados
    let filterMessage = 'Filtros aplicados con éxito.';
    if (currentFilter.type === 'specific_brand' && currentFilter.brandName) {
        filterMessage = `Filtro por marca "${currentFilter.brandName}" aplicado.`;
    } else if (currentFilter.type === 'specific_client' && currentFilter.clientName) {
        filterMessage = `Filtro por cliente "${currentFilter.clientName}" aplicado.`;
    } else if (currentFilter.type === 'all_products') {
        filterMessage = 'Se muestran ventas de todos los productos.';
    }
    showToast(filterMessage, 'success', 'Filtros Aplicados');
}

function cancelFilters() {
    closeAdvancedFilterModal();
    // Añadido showToast para cancelación de filtros
    showToast('Filtros avanzados cancelados.', 'info', 'Cancelado');
}

async function loadModalData() {
    // Load brands
    if (allFetchedBrands.length === 0) {
        const brandsLoaded = await fetchAllBrandsFromAPI();
        if (brandsLoaded.length === 0) {
            // Añadido showToast si no hay marcas disponibles
            showToast('No se encontraron marcas para cargar.', 'info', 'Sin Marcas');
        }
    }
    populateBrandList(allFetchedBrands);

    // Load clients
    if (allFetchedClients.length === 0) {
        const clientsLoaded = await fetchAllClientsFromAPI();
        if (clientsLoaded.length === 0) {
            // Añadido showToast si no hay clientes disponibles
            showToast('No se encontraron clientes para cargar.', 'info', 'Sin Clientes');
        }
    }
}

function populateBrandList(brands) {
    brandList.innerHTML = '<option value="">Seleccione una marca</option>'; 
    if (brands.length === 0) {
        brandList.innerHTML = '<option value="">No hay marcas disponibles</option>';
        return;
    }
    brands.forEach(brand => {
        const option = document.createElement('option');
        option.value = brand.idMarca;
        option.textContent = brand.nombre;
        brandList.appendChild(option);
    });

    if (tempFilter.type === 'specific_brand' && tempFilter.brandId) {
        brandList.value = tempFilter.brandId;
    }
}

function populateClientList(clients) {
    clientList.innerHTML = '';
    if (clients.length === 0) {
        const option = document.createElement('option');
        option.textContent = 'No se encontraron clientes.';
        clientList.appendChild(option);
        return;
    }
    clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.id; // Assuming id from ClienteSimpleDTO
        option.textContent = `${client.nombre} ${client.apellido || ''}`;
        clientList.appendChild(option);
    });
    // Select previously selected client if applicable
    if (tempFilter.type === 'specific_client' && tempFilter.clientId) {
        clientList.value = tempFilter.clientId;
    }
}

function updateSelectedInfoDisplays() {
    selectedBrandInfo.textContent = `Marca Seleccionada: ${tempFilter.brandName || 'Ninguna'}`;
    selectedClientInfo.textContent = `Cliente Seleccionado: ${tempFilter.clientName || 'Ninguno'}`;
}

// --- Event Listeners ---
window.addEventListener('DOMContentLoaded', async event => {
    await fetchAllSalesFromAPI(); 
    updateChart(); 
    document.getElementById('downloadPdfBtn').addEventListener('click', function() {
        generateChartPdfReport();
    });

    // Nueva función para generar el PDF del gráfico
async function generateChartPdfReport() {
    showToast('Generando reporte PDF del gráfico actual...', 'info', 'Reporte PDF');

    const chartCanvas = document.getElementById("salesBarChart");
    const chartTitle = document.getElementById("chartTitle");

    if (!chartCanvas || !chartTitle) {
        showToast('No se encontró el gráfico para generar el reporte.', 'danger', 'Error de PDF');
        return;
    }

    try {
        // Usa html2canvas para capturar el gráfico como una imagen
        const canvasImage = await html2canvas(chartCanvas, {
            scale: 2, // Aumenta la escala para mejor resolución
            useCORS: true // Importante si tienes imágenes de otros dominios
        });

        const imgData = canvasImage.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape'); // 'landscape' para orientación horizontal

        const imgWidth = 280; // Ancho de la imagen en el PDF
        const pageHeight = doc.internal.pageSize.height;
        const imgHeight = canvasImage.height * imgWidth / canvasImage.width;
        let heightLeft = imgHeight;

        let position = 10; // Posición inicial del contenido

        // Añadir título al documento PDF
        doc.setFontSize(18);
        doc.text(chartTitle.textContent, 14, position + 10);
        position += 20; // Espacio después del título

        // Añadir la imagen del gráfico
        doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Si la imagen es más grande que una página, añade nuevas páginas
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            doc.addPage();
            doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        doc.save(`reporte_ventas_grafico_${document.getElementById('yearSelector').value}.pdf`);
        showToast('Reporte PDF del gráfico generado exitosamente.', 'success', 'Reporte Creado');

    } catch (error) {
        console.error('Error al generar el PDF del gráfico:', error);
        showToast('Error al generar el reporte PDF del gráfico: ' + error.message, 'danger', 'Error de PDF');
    }
}


    // Filter event listeners (now they just trigger updateChart, which uses cached data)
    document.getElementById('yearSelector').addEventListener('change', updateChart);
    
    // Advanced Filter Modal Events
    openAdvancedFilterModalBtn.addEventListener('click', openAdvancedFilterModal);
    closeAdvancedFilterModalBtn.addEventListener('click', closeAdvancedFilterModal);
    cancelFilterBtn.addEventListener('click', cancelFilters);
    applyFilterBtn.addEventListener('click', applyFilters);

    // Radio button change listener
    filterOptionRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            tempFilter.type = e.target.value;
            // Reset specific filter selections when changing type
            if (tempFilter.type !== 'specific_brand') {
                tempFilter.brandId = null;
                tempFilter.brandName = null;
                brandList.value = ''; // Reset select
            }
            if (tempFilter.type !== 'specific_client') {
                tempFilter.clientId = null;
                tempFilter.clientName = null;
                clientSearchInput.value = ''; // Clear search input
                populateClientList(allFetchedClients); // Repopulate with all clients
            }
            updateSelectedInfoDisplays();
            showHideFilterSections();
        });
    });

    // Brand selection functionality
    brandList.addEventListener('change', () => {
        const selectedOption = brandList.options[brandList.selectedIndex];
        if (selectedOption && selectedOption.value) {
            tempFilter.brandId = parseInt(selectedOption.value);
            tempFilter.brandName = selectedOption.textContent;
            // Añadido showToast para selección de marca provisional
            showToast(`Marca "${tempFilter.brandName}" seleccionada provisionalmente.`, 'info', 'Marca Seleccionada');
        } else {
            tempFilter.brandId = null;
            tempFilter.brandName = null;
            // Añadido showToast para deselección de marca
            showToast('Ninguna marca seleccionada.', 'info', 'Marca Deseleccionada');
        }
        updateSelectedInfoDisplays();
    });

    // Client search functionality
    searchClientBtn.addEventListener('click', async () => {
        const query = clientSearchInput.value.trim();
        if (query) {
            const clients = await fetchData(`${CLIENTS_ENDPOINT}/buscarPorNombreOApellido?query=${encodeURIComponent(query)}`, 'clientes');
            if (clients && clients.length > 0) {
                populateClientList(clients);
                // Reemplazado alert() por showToast()
                showToast(`Se encontraron ${clients.length} clientes para "${query}".`, 'success', 'Búsqueda de Clientes');
            } else {
                populateClientList([]);
                // Reemplazado alert() por showToast()
                showToast('No se encontraron clientes con ese nombre o apellido.', 'warning', 'Clientes no Encontrados');
            }
        } else {
            populateClientList(allFetchedClients); // Show all if search is empty
            // Añadido showToast cuando se muestran todos los clientes
            showToast('Mostrando todos los clientes disponibles.', 'info', 'Búsqueda de Clientes');
        }
    });
    // Select client from list
    clientList.addEventListener('change', () => {
        const selectedOption = clientList.options[clientList.selectedIndex];
        if (selectedOption && selectedOption.value) {
            tempFilter.clientId = parseInt(selectedOption.value);
            tempFilter.clientName = selectedOption.textContent;
            // Añadido showToast para selección de cliente provisional
            showToast(`Cliente "${tempFilter.clientName}" seleccionado provisionalmente.`, 'info', 'Cliente Seleccionado');
        } else {
            tempFilter.clientId = null;
            tempFilter.clientName = null;
            // Añadido showToast para deselección de cliente
            showToast('Ningún cliente seleccionado.', 'info', 'Cliente Deseleccionado');
        }
        updateSelectedInfoDisplays();
    });

    // Close salesDetailModal when clicking outside (FIXED)
    salesDetailModal.addEventListener('click', function(e) {
        if (e.target === salesDetailModal) {
            closeSalesDetailModal();
        }
    });
    // Close advancedFilterModal when clicking outside (FIXED)
    advancedFilterModal.addEventListener('click', function(e) {
        if (e.target === advancedFilterModal) {
            closeAdvancedFilterModal();
        }
    });

    // FIX: Add specific event listener for the 'X' button on salesDetailModal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent click from bubbling to the overlay
            closeSalesDetailModal();
        });
    } else {
        console.error('Error: closeModalBtn element not found in the DOM.');
    }
});