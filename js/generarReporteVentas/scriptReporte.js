// --- API Configuration ---
const API_BASE_URL = window.API_BASE_URL;

const SALES_ENDPOINT = `${API_BASE_URL}/ventas`;
const DETAIL_SALES_ENDPOINT = `${API_BASE_URL}/detalle_ventas/venta`;
const PRODUCTS_ENDPOINT = `${API_BASE_URL}/productos`;
const BRANDS_ENDPOINT = `${API_BASE_URL}/marcas`;
const CLIENTS_ENDPOINT = `${API_BASE_URL}/clientes`;

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const BAR_COLORS = [
    '#FF6384',
    '#36A2EB',
    '#FFCE56',
    '#4BC0C0',
    '#9966FF',
    '#FF9F40',
    '#C9CBCE',
    '#A3E4D7',
    '#FADBD8',
    '#E8DAEF',
    '#A9CCE3',
    '#A2D9CE'
];

let myBarChart;
let allFetchedSales = [];
let allFetchedBrands = [];
let allFetchedClients = [];
let processedMonthlySales = [];

let currentFilter = {
    type: 'all_products',
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

        if (response.status === 204) {
            console.warn(`API returned 204 No Content for ${url}. Returning empty array.`);
            return [];
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
        showToast(`No se pudieron cargar los datos de ${errorMessage}. Detalle: ${error.message}`, 'danger', 'Error de Carga', 7000);
        return null;
    }
}

// --- Fetch Sales Data from API ---
async function fetchAllSalesFromAPI() {
    const data = await fetchData(SALES_ENDPOINT, 'ventas');
    if (data) {
        allFetchedSales = data;
        populateYearSelector(data);
    } else {
        showToast('No se pudieron obtener todas las ventas. El gráfico podría estar vacío.', 'warning', 'Advertencia de Datos');
    }
}

// --- Fetch Brands from API ---
async function fetchAllBrandsFromAPI() {
    const data = await fetchData(BRANDS_ENDPOINT, 'marcas');
    if (data) {
        allFetchedBrands = data;
    } else {
        showToast('No se pudieron cargar las marcas.', 'danger', 'Error de Carga');
    }
    return data || [];
}

// --- Fetch Clients from API ---
async function fetchAllClientsFromAPI() {
    const data = await fetchData(`${CLIENTS_ENDPOINT}/buscarTodos`, 'clientes');
    if (data) {
        allFetchedClients = data;
    } else {
        showToast('No se pudieron cargar los clientes.', 'danger', 'Error de Carga');
    }
    return data || [];
}

// --- Populate Year Selector ---
function populateYearSelector(salesData) {
    const yearSelector = document.getElementById('yearSelector');
    yearSelector.innerHTML = '';

    const years = new Set();
    salesData.forEach(sale => {
        const saleDate = new Date(sale.fecha + 'T00:00:00');
        years.add(saleDate.getFullYear());
    });

    const sortedYears = Array.from(years).sort((a, b) => b - a);

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

    yearSelector.value = currentYear;
}

// --- Process Sales Data for Chart ---
function processSalesForChart(salesData, year, filter) {
    const monthlySales = new Array(12).fill(0);
    const salesByMonth = new Array(12).fill(null).map(() => ({ total: 0, sales: [] }));

    salesData.forEach(venta => {
        const saleDate = new Date(venta.fecha + 'T00:00:00');
        const saleYear = saleDate.getFullYear();
        const saleMonth = saleDate.getMonth();

        if (saleYear === parseInt(year)) {
            let matchesFilter = true;

            if (filter.type === 'specific_brand' && filter.brandId) {
                matchesFilter = venta.detalles.some(detalle => {
                    const matchedBrand = allFetchedBrands.find(b => b.idMarca === filter.brandId);
                    return matchedBrand && detalle.marcaProducto.trim().toLowerCase() === matchedBrand.nombre.trim().toLowerCase();
                });
            } else if (filter.type === 'specific_client' && filter.clientId) {
                matchesFilter = venta.cliente && venta.cliente.id === filter.clientId;
            }

            if (matchesFilter) {
                monthlySales[saleMonth] += venta.total;
                salesByMonth[saleMonth].total += venta.total;
                salesByMonth[saleMonth].sales.push(venta);
            }
        }
    });

    processedMonthlySales = salesByMonth;
    return monthlySales;
}

// --- Update Chart Function ---
async function updateChart() {
    Chart.defaults.global.defaultFontFamily = '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
    Chart.defaults.global.defaultFontColor = '#292b2c';

    const selectedYear = document.getElementById('yearSelector').value;

    if (allFetchedSales.length === 0) {
        await fetchAllSalesFromAPI();
        if (allFetchedSales.length === 0) {
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
        displayColors = BAR_COLORS.slice(0, lastValidIndex + 1);
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
                                openSalesDetailModal(selectedMonthName, monthDetail.total, selectedYear, currentFilter, monthDetail.sales, monthIndex);
                            } else {
                                openSalesDetailModal(selectedMonthName, 0, selectedYear, currentFilter, [], monthIndex);
                                showToast(`No hay ventas registradas para ${selectedMonthName} con los filtros actuales.`, 'info', 'Sin Detalles');
                            }
                        }
                    }
                }
            });
        }
    }
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

async function openSalesDetailModal(monthName, totalSales, year, filter, salesDataForMonth, monthIndex) {
    modalTitle.textContent = `Detalle de Ventas de ${monthName} ${year}`;
    modalTotalSales.textContent = `$${(totalSales || 0).toLocaleString()}`;

    salesList.innerHTML = '';

    if (salesDataForMonth && salesDataForMonth.length > 0) {
        for (const sale of salesDataForMonth) {
            const saleItem = document.createElement('li');
            saleItem.classList.add('mb-3', 'p-2', 'border', 'rounded', 'bg-light');
            saleItem.innerHTML = `<strong>Venta #${sale.idVenta}</strong> - Cliente: ${sale.cliente ? sale.cliente.nombre + ' ' + sale.cliente.apellido : 'N/A'} - Total: $${(sale.total || 0).toLocaleString()}<br>`;
            saleItem.innerHTML += `Fecha: ${sale.fecha}<br>`;

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
        showToast(`No hay ventas registradas para este mes o tipo de filtro.`, 'info', 'Sin Detalles');
    }

    downloadMonthlyReportBtn.onclick = function() {
        generateMonthlyReportPdf(monthIndex);
    };

    salesDetailModal.classList.add('show');
}

function closeSalesDetailModal() {
    salesDetailModal.classList.remove('show');
}

// --- Función para generar el PDF del reporte mensual a través del backend ---
async function generateMonthlyReportPdf(selectedMonth) {
    const yearSelector = document.getElementById('yearSelector');
    const selectedYear = yearSelector.value;
    
    let filtroBackend = 'Todos los productos';
    if (currentFilter.type === 'specific_brand' && currentFilter.brandName) {
        filtroBackend = currentFilter.brandName;
    } else if (currentFilter.type === 'specific_client' && currentFilter.clientName) {
        filtroBackend = currentFilter.clientName;
    }

    if (!selectedYear || selectedMonth === undefined) {
        showToast('Por favor, selecciona un año y un mes válidos para generar el reporte.', 'warning', 'Faltan datos');
        return;
    }

    // El backend espera el número del mes de 1 a 12, el DOM devuelve de 0 a 11.
    const mesParaBackend = parseInt(selectedMonth) + 1;
    
    // Construir la URL con los parámetros correctos
    const url = `${SALES_ENDPOINT}/reporteMensualPdf?anio=${selectedYear}&mes=${mesParaBackend}&filtro=${encodeURIComponent(filtroBackend)}`;
    const token = getJwtToken();

    if (!token) {
        showToast('No se encontró el token JWT. Por favor, inicie sesión.', 'danger', 'Error de Autenticación', 7000);
        return;
    }

    try {
        showToast(`Generando reporte PDF para las ventas de ${MONTH_NAMES[selectedMonth]} ${selectedYear}...`, 'info', 'Generando Reporte');
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error al generar el PDF: ${response.status} - ${errorText}`);
        }

        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'reporte_ventas.pdf';
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
            }
        }

        const blob = await response.blob();
        const urlBlob = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = urlBlob;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(urlBlob);

        showToast('El reporte se ha generado y descargado correctamente.', 'success');

    } catch (error) {
        console.error('Error en la descarga del reporte:', error);
        showToast(`Error al descargar el reporte: ${error.message}`, 'danger', 'Error de Descarga', 7000);
    }
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
let tempFilter = { ...currentFilter };

function showHideFilterSections() {
    specificBrandSection.style.display = 'none';
    specificClientSection.style.display = 'none';

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
    tempFilter = { ...currentFilter };
    const selectedRadioId = `filterOption${tempFilter.type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')}`;
    const selectedRadio = document.getElementById(selectedRadioId);
    if (selectedRadio) {
        selectedRadio.checked = true;
    }

    await loadModalData();
    updateSelectedInfoDisplays();
    showHideFilterSections();
    advancedFilterModal.classList.add('show');
}

function closeAdvancedFilterModal() {
    advancedFilterModal.classList.remove('show');
}

function applyFilters() {
    currentFilter = { ...tempFilter };
    updateChart();
    closeAdvancedFilterModal();
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
    showToast('Filtros avanzados cancelados.', 'info', 'Cancelado');
}

async function loadModalData() {
    if (allFetchedBrands.length === 0) {
        const brandsLoaded = await fetchAllBrandsFromAPI();
        if (brandsLoaded.length === 0) {
            showToast('No se encontraron marcas para cargar.', 'info', 'Sin Marcas');
        }
    }
    populateBrandList(allFetchedBrands);

    if (allFetchedClients.length === 0) {
        const clientsLoaded = await fetchAllClientsFromAPI();
        if (clientsLoaded.length === 0) {
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
        option.value = client.id;
        option.textContent = `${client.nombre} ${client.apellido || ''}`;
        clientList.appendChild(option);
    });
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

    document.getElementById('yearSelector').addEventListener('change', updateChart);

    openAdvancedFilterModalBtn.addEventListener('click', openAdvancedFilterModal);
    closeAdvancedFilterModalBtn.addEventListener('click', closeAdvancedFilterModal);
    cancelFilterBtn.addEventListener('click', cancelFilters);
    applyFilterBtn.addEventListener('click', applyFilters);

    filterOptionRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            tempFilter.type = e.target.value;
            if (tempFilter.type !== 'specific_brand') {
                tempFilter.brandId = null;
                tempFilter.brandName = null;
                brandList.value = '';
            }
            if (tempFilter.type !== 'specific_client') {
                tempFilter.clientId = null;
                tempFilter.clientName = null;
                clientSearchInput.value = '';
                populateClientList(allFetchedClients);
            }
            updateSelectedInfoDisplays();
            showHideFilterSections();
        });
    });

    brandList.addEventListener('change', () => {
        const selectedOption = brandList.options[brandList.selectedIndex];
        if (selectedOption && selectedOption.value) {
            tempFilter.brandId = parseInt(selectedOption.value);
            tempFilter.brandName = selectedOption.textContent;
            showToast(`Marca "${tempFilter.brandName}" seleccionada provisionalmente.`, 'info', 'Marca Seleccionada');
        } else {
            tempFilter.brandId = null;
            tempFilter.brandName = null;
            showToast('Ninguna marca seleccionada.', 'info', 'Marca Deseleccionada');
        }
        updateSelectedInfoDisplays();
    });

    searchClientBtn.addEventListener('click', async () => {
        const query = clientSearchInput.value.trim();
        if (query) {
            const clients = await fetchData(`${CLIENTS_ENDPOINT}/buscarPorNombreOApellido?query=${encodeURIComponent(query)}`, 'clientes');
            if (clients && clients.length > 0) {
                populateClientList(clients);
                showToast(`Se encontraron ${clients.length} clientes para "${query}".`, 'success', 'Búsqueda de Clientes');
            } else {
                populateClientList([]);
                showToast('No se encontraron clientes con ese nombre o apellido.', 'warning', 'Clientes no Encontrados');
            }
        } else {
            populateClientList(allFetchedClients);
            showToast('Mostrando todos los clientes disponibles.', 'info', 'Búsqueda de Clientes');
        }
    });

    clientList.addEventListener('change', () => {
        const selectedOption = clientList.options[clientList.selectedIndex];
        if (selectedOption && selectedOption.value) {
            tempFilter.clientId = parseInt(selectedOption.value);
            tempFilter.clientName = selectedOption.textContent;
            showToast(`Cliente "${tempFilter.clientName}" seleccionado provisionalmente.`, 'info', 'Cliente Seleccionado');
        } else {
            tempFilter.clientId = null;
            tempFilter.clientName = null;
            showToast('Ningún cliente seleccionado.', 'info', 'Cliente Deseleccionado');
        }
        updateSelectedInfoDisplays();
    });

    closeModalBtn.addEventListener('click', closeSalesDetailModal);
});