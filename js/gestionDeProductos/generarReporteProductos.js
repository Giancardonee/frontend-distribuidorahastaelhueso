// js/gestionDeProductos/generarReporteProductos.js

document.addEventListener('DOMContentLoaded', () => {

    const API_BASE_URL = 'http://localhost:8080/distribuidora/productos';
    const reporteModal = new bootstrap.Modal(document.getElementById('reporteModal')); //
    const formReporte = document.getElementById('formReporte'); //
    const tipoPrecioReporteSelect = document.getElementById('tipoPrecioReporte'); //
    const btnGenerarReporte = document.getElementById('btnGenerarReporte'); //
    const btnAbrirModalReporte = document.getElementById('btnAbrirModalReporte'); //

    // Array de colores para las marcas (RGB)
    const BRAND_COLORS = [
    [230, 150, 150],  // Rojo crema oscuro
    [150, 210, 240],  // Celeste suavemente oscuro
    [180, 150, 210],  // Violeta lavanda más oscuro
    [240, 240, 150],  // Amarillo crema más oscuro
    [150, 210, 150]   // Verde suave más oscuro
    ];
    let colorIndex = 0; // Para rotar los colores

    function getToken() {
        return localStorage.getItem('jwtToken'); //
    }

    function checkAuthAndRedirect() {
        const token = getToken(); //
        if (!token) {
            showToast('No hay sesión activa. Por favor, inicie sesión.', 'warning', 'Sesión Requerida'); //
            window.location.href = 'login.html'; //
            return false;
        }
        return true;
    }

    // Event listener para el botón "Generar Reporte PDF"
    btnAbrirModalReporte.addEventListener('click', () => {
        if (!checkAuthAndRedirect()) return; //
        formReporte.reset(); // Limpiar el formulario
        formReporte.classList.remove('was-validated'); // Quitar validación visual
        reporteModal.show(); // Mostrar el modal
    });

    // Event listener para el botón "Generar Reporte" dentro del modal
    btnGenerarReporte.addEventListener('click', async () => {
        if (!checkAuthAndRedirect()) return; //

        const tipoPrecio = tipoPrecioReporteSelect.value; //

        if (!tipoPrecio) {
            formReporte.classList.add('was-validated'); // Mostrar error de validación
            return;
        }

        reporteModal.hide(); // Ocultar el modal
        showToast('Generando reporte PDF...', 'info', 'Generando'); // Mensaje informativo

        await generateProductReportPDF(tipoPrecio); // Llamar a la función de generación
    });

    async function fetchProducts() {
        const token = getToken(); //
        try {
            const response = await fetch(API_BASE_URL, {
                headers: {
                    'Authorization': `Bearer ${token}` //
                }
            });
            if (!response.ok) {
                if (response.status === 401) {
                    showToast('Sesión expirada o no autorizada. Por favor, inicie sesión nuevamente.', 'danger', 'Error de Autenticación'); //
                    window.location.href = 'login.html'; //
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json(); //
        } catch (error) {
            console.error('Error al obtener productos:', error);
            showToast('Error al cargar los productos para el reporte. Por favor, inténtalo de nuevo.', 'danger', 'Error de Carga'); //
            return []; // Retorna un array vacío en caso de error
        }
    }

    async function generateProductReportPDF(priceType) {
        const products = await fetchProducts(); //
        if (products.length === 0) {
            showToast('No hay productos para generar el reporte o hubo un error al cargarlos.', 'warning', 'Reporte Vacío'); //
            return;
        }

        const doc = new window.jspdf.jsPDF(); // Inicializa jsPDF
        const today = new Date(); //
        const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`; //
        const priceTypeName = priceType === 'mayorista' ? 'Mayorista' : 'Minorista'; //
        const title = `Hasta el Hueso ${formattedDate} ${priceTypeName}`; //

        // Add title
        doc.setFontSize(18); //
        doc.text(title, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' }); //

        let finalY = 30; // Starting Y position for the table content
        colorIndex = 0; // Reset color index for each report generation

        // Group products by brand
        const productsByBrand = products.reduce((acc, product) => {
            const brandName = product.nombreMarca || 'Sin Marca'; //
            if (!acc[brandName]) {
                acc[brandName] = [];
            }
            // Filter products based on price type and value
            const priceValue = priceType === 'minorista' ? product.precioMinorista : product.precioMayorista; //
            if (priceValue !== null && priceValue > 0) { // Excluir productos con precio nulo o cero
                acc[brandName].push(product);
            }
            return acc;
        }, {});

        // Iterate through each brand to add tables
        for (const brandName in productsByBrand) {
            const brandProducts = productsByBrand[brandName];

            // Only add brand header and table if there are products for this brand after filtering
            if (brandProducts.length > 0) {
                // Add brand header
                const currentColor = BRAND_COLORS[colorIndex % BRAND_COLORS.length]; //
                doc.setFillColor(currentColor[0], currentColor[1], currentColor[2]); // Set fill color
                doc.rect(14, finalY, doc.internal.pageSize.getWidth() - 28, 10, 'F'); // Draw a filled rectangle
                doc.setFontSize(12); //
                doc.setTextColor(255, 255, 255); // White text for header
                doc.text(brandName.toUpperCase(), 17, finalY + 7); // Text inside the rectangle
                doc.setTextColor(0, 0, 0); // Reset text color to black for product rows
                finalY += 12; // Move Y position after brand header

                const tableHeaders = [['Producto', 'Peso', `Precio ${priceTypeName}`]]; //
                const tableData = brandProducts.map(product => {
                    const price = priceType === 'minorista' ? product.precioMinorista : product.precioMayorista; //
                    return [
                        product.nombre, //
                        product.peso !== null ? `${product.peso.toFixed(2)} kg` : '', //
                        price !== null ? `$${price.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A' //
                    ];
                });

                // AutoTable configuration
                doc.autoTable({
                    head: tableHeaders, //
                    body: tableData, //
                    startY: finalY, //
                    theme: 'grid', // Add borders
                    styles: {
                        fontSize: 10, //
                        cellPadding: 2, //
                        valign: 'middle', //
                        halign: 'left' //
                    },
                    headStyles: {
                        fillColor: [60, 60, 60], // Dark grey for header
                        textColor: [255, 255, 255], // White text
                        fontStyle: 'bold' // Bold font
                    },
                    columnStyles: {
                        0: { cellWidth: 'auto' }, // Producto
                        1: { cellWidth: 30, halign: 'right' }, // Peso
                        2: { cellWidth: 40, halign: 'right' }  // Precio
                    },
                    didDrawPage: function (data) {
                        // Footer (optional, if you want page numbers)
                        let str = "Página " + doc.internal.getNumberOfPages(); //
                        doc.setFontSize(10); //
                        doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10); //
                    },
                    margin: { top: 10, right: 14, bottom: 10, left: 14 } //
                });

                finalY = doc.autoTable.previous.finalY + 10; // Update finalY for the next table
                colorIndex++; // Move to the next color

                // Add a small gap between brand tables if it's not the last one
                if (brandName !== Object.keys(productsByBrand)[Object.keys(productsByBrand).length - 1]) {
                    finalY += 5;
                }
            }
        }

        doc.save(`Reporte_Productos_${priceTypeName}_${formattedDate}.pdf`); // Save the PDF
        showToast('Reporte PDF generado con éxito.', 'success', 'Éxito'); //
    }
});