// --- API Configuration ---
const API_BASE_URL = window.API_BASE_URL;
const REPORT_PRODUCTS_BASE_URL = `${API_BASE_URL}/productos`;
const OUT_OF_STOCK_ENDPOINT = `${REPORT_PRODUCTS_BASE_URL}/sin-stock`;
const TOP_SELLING_ENDPOINT = `${REPORT_PRODUCTS_BASE_URL}/mas-vendidos`;
const LEAST_SELLING_ENDPOINT = `${REPORT_PRODUCTS_BASE_URL}/menos-vendidos`;

// Definiciones de encabezados de tabla y mapeo de datos para cada reporte
const REPORT_CONFIGS = {
    out_of_stock: {
        headers: ["Nro Producto", "Marca", "Nombre del Producto", "Peso", "Stock Actual"],
        cardTitle: "Productos sin Stock",
        pageTitle: "Reporte de Productos sin Stock",
        breadcrumb: "Reportes / Productos sin Stock",
        apiUrl: OUT_OF_STOCK_ENDPOINT,
        dataMapping: product => [
            product.idProducto, // Keeping idProducto as per current logic, only changing header display
            product.nombreMarca || 'N/A',
            product.nombre,
            (product.peso ? product.peso + ' kg' : 'N/A'),
            product.stock
        ],
        noDataMessage: "No hay productos sin stock en este momento."
    },
    top_selling: {
        headers: ["Nro Producto", "Marca", "Nombre del Producto", "Peso", "Unidades Vendidas", "Ingresos Totales"],
        cardTitle: "Productos Más Vendidos",
        pageTitle: "Reporte de Productos Más Vendidos",
        breadcrumb: "Reportes / Productos Más Vendidos",
        apiUrl: TOP_SELLING_ENDPOINT,
        dataMapping: product => [
            product.idProducto, // Keeping idProducto as per current logic, only changing header display
            product.nombreMarca || 'N/A',
            product.nombreProducto,
            (product.peso ? product.peso + ' kg' : 'N/A'),
            product.unidadesVendidas,
            `$${product.ingresosTotales.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ],
        noDataMessage: "No hay productos más vendidos en este momento."
    },
    least_selling: {
        headers: ["Nro Producto", "Marca", "Nombre del Producto", "Peso", "Unidades Vendidas", "Ingresos Totales"],
        cardTitle: "Productos Menos Vendidos",
        pageTitle: "Reporte de Productos Menos Vendidos",
        breadcrumb: "Reportes / Productos Menos Vendidos",
        apiUrl: LEAST_SELLING_ENDPOINT,
        dataMapping: product => [
            product.idProducto, // Keeping idProducto as per current logic, only changing header display
            product.nombreMarca || 'N/A',
            product.nombreProducto,
            (product.peso ? product.peso + ' kg' : 'N/A'),
            product.unidadesVendidas,
            `$${product.ingresosTotales.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ],
        noDataMessage: "No hay productos menos vendidos en este momento."
    }
};

let dataTableInstance = null; // Instancia global de Simple-DataTables

// Función showToast (asumiendo que ya está definida globalmente o importada)
function showToast(message, type, title = 'Notificación') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.warn('Toast container not found. Messages will only be logged to console.');
        console.log(`[${title}] ${message}`);
        return;
    }
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0 show`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <strong>${title}:</strong> ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

/**
 * Carga y muestra los productos según el tipo de reporte seleccionado.
 * @param {string} reportType - El tipo de reporte a cargar (ej. 'out_of_stock', 'top_selling').
 */
async function loadProductsReport(reportType) {
    const productTableElement = document.getElementById('productReportTable'); // Get the table itself
    const reportCardTitle = document.getElementById('reportCardTitle');
    const reportPageTitle = document.getElementById('reportPageTitle');
    const reportBreadcrumb = document.getElementById('reportBreadcrumb');

    const config = REPORT_CONFIGS[reportType];
    
    // 1. Destruir la instancia existente de Simple-DataTables si la hay
    if (dataTableInstance) {
        dataTableInstance.destroy();
        dataTableInstance = null;
    }

    // 2. Limpiar completamente la estructura de la tabla para evitar residuos
    //    y reconstruir los encabezados y cuerpo de forma controlada.
    if (productTableElement) {
        // Recrear una estructura básica con thead y tbody vacíos (o con un placeholder)
        productTableElement.innerHTML = `
            <thead>
                <tr></tr>
            </thead>
            <tbody id="productTableBody"></tbody>
        `;
    } else {
        console.error("Error: No se encontró el elemento #productReportTable.");
        showToast('Error interno: La tabla no se encontró en el HTML.', 'danger', 'Error Crítico');
        return;
    }

    // Ahora que la estructura básica está garantizada, obtenemos las referencias
    const productTableHeadContainer = productTableElement.querySelector('thead');
    const productTableHeadRow = productTableHeadContainer ? productTableHeadContainer.querySelector('tr') : null;
    const productTableBody = productTableElement.querySelector('tbody'); // Re-obtener la referencia al tbody

    if (!productTableHeadContainer || !productTableHeadRow || !productTableBody) {
         console.error("Error: No se pudo obtener la referencia al thead, tr o tbody dentro de la tabla.");
         showToast('Error interno: Falló la inicialización de los elementos de la tabla.', 'danger', 'Error de UI');
         return;
    }

    // Si reportType está vacío (opción "Seleccione un Reporte..."), mostrar mensaje inicial
    if (!reportType || !config) {
        reportCardTitle.textContent = "Seleccione un Reporte";
        reportPageTitle.textContent = "Reportes de Productos";
        reportBreadcrumb.textContent = "Reportes / Productos";
        productTableHeadRow.innerHTML = ''; // Limpiar encabezados
        productTableBody.innerHTML = `
            <tr>
                <td colspan="100%" class="text-center">Por favor, seleccione un tipo de reporte del menú desplegable.</td>
            </tr>
        `;
        // No inicializar simple-datatables si no hay un reporte seleccionado
        return;
    }

    // Si es un reporte válido, actualizar títulos y breadcrumb
    reportCardTitle.textContent = config.cardTitle;
    reportPageTitle.textContent = config.pageTitle;
    reportBreadcrumb.textContent = config.breadcrumb;

    // Limpiar y actualizar encabezados de la tabla HTML
    productTableHeadRow.innerHTML = ''; // Limpiar solo el tr de encabezados
    config.headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        productTableHeadRow.appendChild(th);
    });
    
    // Limpiar el cuerpo de la tabla antes de cargar nuevos datos
    productTableBody.innerHTML = '';


    try {
        const jwtToken = localStorage.getItem('jwtToken');
        const fetchHeaders = {
            'Content-Type': 'application/json',
        };
        if (jwtToken) {
            fetchHeaders['Authorization'] = `Bearer ${jwtToken}`;
        }

        const response = await fetch(config.apiUrl, {
            method: 'GET',
            headers: fetchHeaders,
        });

        if (!response.ok) {
            if (response.status === 401) {
                showToast('No autorizado. Por favor, inicie sesión nuevamente.', 'danger', 'Error de Autenticación');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const productsData = await response.json();

        // Llenar el cuerpo de la tabla con los datos obtenidos
        if (productsData.length === 0) {
            // Simple-DataTables maneja el mensaje 'noRows'
            showToast(config.noDataMessage, 'info', 'Sin Datos');
        } else {
            productsData.forEach(product => {
                const row = productTableBody.insertRow();
                const mappedData = config.dataMapping(product);
                mappedData.forEach(data => {
                    const cell = row.insertCell();
                    cell.textContent = data;
                });
            });
        }

        // 5. Inicializar Simple-DataTables con los datos (o la falta de ellos)
        if (productTableElement) { // Usar el elemento de la tabla principal
            const dataTableOptions = {
                labels: {
                    placeholder: "Buscar...",
                    perPage: "Registros por página",
                    noRows: config.noDataMessage,
                    info: "Mostrando {start} a {end} de {rows} registros",
                    noResults: "No se encontraron resultados para su búsqueda.",
                },
                // Puedes descomentar estas opciones si no quieres ordenación o búsqueda predeterminada
                // "ordering": false,
                // "searching": false
            };
            dataTableInstance = new simpleDatatables.DataTable("#productReportTable", dataTableOptions);
        }

    } catch (error) {
        console.error(`Error al obtener el reporte de ${reportType}:`, error);
        showToast(`Error al cargar el reporte: ${error.message}`, 'danger', 'Error de Conexión');
        
        // En caso de error, asegurarnos de que la tabla muestra un mensaje adecuado
        if (productTableBody) {
            productTableBody.innerHTML = `
                <tr>
                    <td colspan="100%" class="text-center">Error al cargar los datos. ${error.message}. Por favor, intente nuevamente.</td>
                </tr>
            `;
        }
        // Intentar re-inicializar simple-datatables para manejar su estado visual de "no rows" o error
        if (productTableElement) {
             dataTableInstance = new simpleDatatables.DataTable("#productReportTable", {
                labels: {
                    placeholder: "Buscar...",
                    perPage: "Registros por página",
                    noRows: `Error al cargar los datos. Intente nuevamente.`, // Este mensaje se superpondrá con el de tbody si no se gestiona bien.
                    info: "Mostrando {start} a {end} de {rows} registros",
                    noResults: "No se encontraron resultados para su búsqueda.",
                }
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const reportTypeSelect = document.getElementById('reportTypeSelect');
    const downloadProductReportPdfBtn = document.getElementById('downloadProductReportPdfBtn');

    // Inicializar la tabla y el select con el estado de "Seleccione un Reporte..."
    loadProductsReport(''); // Llamar con un tipo de reporte vacío para el estado inicial

    // Listener para el cambio en el selector de tipo de reporte
    reportTypeSelect.addEventListener('change', (event) => {
        const selectedReportType = event.target.value;
        loadProductsReport(selectedReportType);
    });

    // Listener para el botón de descarga de PDF
    downloadProductReportPdfBtn.addEventListener('click', async function() {
        const selectedReportType = reportTypeSelect.value;
        const config = REPORT_CONFIGS[selectedReportType];

        if (!config || !selectedReportType) { // También verificar si no hay un reporte seleccionado
            showToast('Por favor, seleccione un tipo de reporte antes de descargar el PDF.', 'warning', 'Advertencia');
            return;
        }

        showToast(`Generando reporte PDF de ${config.cardTitle}...`, 'info', 'Reporte PDF');

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('portrait');

        doc.setFontSize(20);
        doc.text(config.pageTitle, 14, 25);
        doc.setFontSize(10);
        doc.text('Fecha del Reporte: ' + new Date().toLocaleDateString('es-AR'), 14, 35);

        let productsForPdf = [];
        try {
            const jwtToken = localStorage.getItem('jwtToken');
            const fetchHeadersPdf = {
                'Content-Type': 'application/json',
            };
            if (jwtToken) {
                fetchHeadersPdf['Authorization'] = `Bearer ${jwtToken}`;
            }

            const responsePdf = await fetch(config.apiUrl, {
                method: 'GET',
                headers: fetchHeadersPdf,
            });

            if (!responsePdf.ok) {
                if (responsePdf.status === 401) {
                    showToast('No autorizado para generar PDF. Por favor, inicie sesión.', 'danger', 'Error de Autenticación');
                }
                throw new Error(`HTTP error! status: ${responsePdf.status}`);
            }
            productsForPdf = await responsePdf.json();
        } catch (error) {
            console.error("Error al obtener datos para PDF del backend:", error);
            showToast(`Error al generar el PDF: ${error.message}`, 'danger', 'Error de PDF');
            return;
        }

        // Mapear los datos obtenidos para la tabla PDF
        const tableRows = productsForPdf.map(config.dataMapping);

        // Uso de la API moderna de autoTable para evitar el warning de "deprecated"
        doc.autoTable({
            head: [config.headers], // Los encabezados ahora van dentro de un array anidado en 'head'
            body: tableRows,
            startY: 45
        });
        
        let filename = '';
        if (selectedReportType === 'out_of_stock') {
            filename = 'reporte_productos_sin_stock.pdf';
        } else if (selectedReportType === 'top_selling') {
            filename = 'reporte_productos_mas_vendidos.pdf';
        } else if (selectedReportType === 'least_selling') {
            filename = 'reporte_productos_menos_vendidos.pdf';
        } else {
            filename = 'reporte_productos.pdf'; // Fallback
        }
        doc.save(filename);
        showToast('Reporte PDF generado exitosamente.', 'success', 'Reporte Creado');
    });
});