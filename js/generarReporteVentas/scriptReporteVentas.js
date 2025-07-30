
            // --- Static Data (will be replaced by dynamic data later) ---
            const ALL_SALES_DATA = {
                2023: {
                    all: [300000, 350000, 280000, 400000, 380000, 420000, 450000, 480000, 500000, 520000, 550000, 600000],
                    electronics: [100000, 120000, 90000, 150000, 140000, 160000, 180000, 190000, 200000, 210000, 220000, 250000],
                    clothing: [80000, 90000, 70000, 100000, 95000, 110000, 120000, 130000, 140000, 150000, 160000, 170000],
                    books: [50000, 55000, 45000, 60000, 58000, 62000, 65000, 70000, 72000, 75000, 78000, 80000]
                },
                2024: {
                    all: [650000, 700000, 680000, 750000, 720000, 800000, 850000, 900000, 920000, 950000, 980000, 1000000],
                    electronics: [200000, 220000, 210000, 250000, 240000, 270000, 280000, 300000, 310000, 320000, 330000, 350000],
                    clothing: [150000, 160000, 140000, 170000, 165000, 180000, 190000, 200000, 210000, 220000, 230000, 240000],
                    books: [80000, 85000, 75000, 90000, 88000, 92000, 95000, 100000, 102000, 105000, 108000, 110000]
                },
                2025: { // Data for current year, up to July
                    all: [450000, 600000, 550000, 700000, 680000, 800000, 950000, 0, 0, 0, 0, 0],
                    electronics: [150000, 200000, 180000, 230000, 220000, 260000, 300000, 0, 0, 0, 0, 0],
                    clothing: [120000, 160000, 140000, 180000, 170000, 200000, 250000, 0, 0, 0, 0, 0],
                    books: [80000, 100000, 90000, 110000, 100000, 120000, 150000, 0, 0, 0, 0, 0]
                }
            };

            const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            
            // Nueva paleta de 12 colores distintos
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

            // --- Function to update the chart ---
            function updateChart() {
                Chart.defaults.global.defaultFontFamily = '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
                Chart.defaults.global.defaultFontColor = '#292b2c';

                const selectedYear = document.getElementById('yearSelector').value;
                const selectedProductType = document.getElementById('productTypeFilter').value;

                // Get current month to filter data for the current year
                const date = new Date();
                const currentYear = date.getFullYear();
                const currentMonthIndex = date.getMonth(); // 0-indexed

                let rawData = ALL_SALES_DATA[selectedYear] ? ALL_SALES_DATA[selectedYear][selectedProductType] : [];

                let displayMonths = MONTH_NAMES;
                let displaySalesData = rawData;
                let displayColors = BAR_COLORS;

                // If current year is selected, only show up to current month
                if (parseInt(selectedYear) === currentYear) {
                    displayMonths = MONTH_NAMES.slice(0, currentMonthIndex + 1);
                    displaySalesData = rawData.slice(0, currentMonthIndex + 1);
                    displayColors = BAR_COLORS.slice(0, currentMonthIndex + 1);
                }
                
                // Remove trailing zeros/empty months if they are at the end for past years
                // For 2025, we want to show zeros for future months explicitly.
                if (parseInt(selectedYear) !== currentYear) {
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

                // Check for no data
                const hasData = displaySalesData.some(value => value > 0);

                if (!hasData) {
                    chartCanvas.style.display = 'none';
                    noDataMessage.style.display = 'block';
                    if (myBarChart) { // Destroy existing chart if no data
                        myBarChart.destroy();
                        myBarChart = null; // Set to null after destroying
                    }
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
                                        gridLines: {
                                            display: false
                                        },
                                        ticks: {
                                            maxTicksLimit: displayMonths.length,
                                            autoSkip: false // Ensure all labels are shown
                                        }
                                    }],
                                    yAxes: [{
                                        ticks: {
                                            min: 0,
                                            max: Math.max(...displaySalesData) * 1.2,
                                            maxTicksLimit: 5,
                                            callback: function(value, index, values) {
                                                return '$' + value.toLocaleString();
                                            }
                                        },
                                        gridLines: {
                                            display: true
                                        }
                                    }],
                                },
                                legend: {
                                    display: false
                                },
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
                                        formatter: function(value, context) {
                                            return value > 0 ? '$' + value.toLocaleString() : ''; // Only show if value > 0
                                        },
                                        font: {
                                            weight: 'bold',
                                            size: 10
                                        },
                                        color: '#333'
                                    }
                                },
                                // Click event for bars
                                onClick: function(evt, activeElements) {
                                    if (activeElements.length > 0) {
                                        const chartElement = activeElements[0];
                                        const monthIndex = chartElement._index;
                                        const selectedMonthName = displayMonths[monthIndex];
                                        const selectedMonthSales = displaySalesData[monthIndex];
                                        
                                        // Open the modal with details
                                        openSalesDetailModal(selectedMonthName, selectedMonthSales, selectedYear, selectedProductType);
                                    }
                                }
                            }
                        });
                    }
                }
                // Update dynamic chart title
                let productTypeText = selectedProductType === 'all' ? '' : ` (Tipo: ${selectedProductType.charAt(0).toUpperCase() + selectedProductType.slice(1)})`;
                chartTitle.innerHTML = `<i class="fas fa-chart-bar me-2"></i> Ventas Mensuales ${selectedYear}${productTypeText}`;
            }

            // --- Modal Functions ---
            const salesDetailModal = document.getElementById('salesDetailModal');
            const closeModalBtn = document.getElementById('closeModalBtn');
            const modalTitle = document.getElementById('modalTitle');
            const modalTotalSales = document.getElementById('modalTotalSales');
            const salesList = document.getElementById('salesList');
            const downloadMonthlyReportBtn = document.getElementById('downloadMonthlyReportBtn');

            function openSalesDetailModal(month, totalSales, year, productType) {
                modalTitle.textContent = `Detalle de Ventas de ${month} ${year}`;
                // CORRECCIÓN AQUÍ: Asegura que totalSales sea un número antes de usar toLocaleString()
                modalTotalSales.textContent = `$${(totalSales || 0).toLocaleString()}`;

                // Populate static sales list (replace with dynamic data from your backend later)
                salesList.innerHTML = '';
                if (totalSales > 0) {
                    // Example static sales items, these would come from your DB for the specific month
                    salesList.innerHTML += `<li>Venta #S${Math.floor(Math.random() * 10000)} - Producto X - $${(totalSales * 0.3).toFixed(2)}</li>`;
                    salesList.innerHTML += `<li>Venta #S${Math.floor(Math.random() * 10000)} - Producto Y - $${(totalSales * 0.4).toFixed(2)}</li>`;
                    salesList.innerHTML += `<li>Venta #S${Math.floor(Math.random() * 10000)} - Producto Z - $${(totalSales * 0.3).toFixed(2)}</li>`;
                    salesList.innerHTML += `<li class="text-secondary mt-2">(Categoría: ${productType === 'all' ? 'Todas' : productType.charAt(0).toUpperCase() + productType.slice(1)})</li>`;

                } else {
                    salesList.innerHTML = '<li class="text-muted">No hay ventas registradas para este mes.</li>';
                }

                downloadMonthlyReportBtn.onclick = function() {
                    alert(`Generando reporte PDF para las ventas de ${month} ${year} (${productType})...`);
                    // Here you would implement jsPDF or a backend call to generate the detailed monthly report
                };

                salesDetailModal.classList.add('show');
            }

            function closeSalesDetailModal() {
                salesDetailModal.classList.remove('show');
            }

            // --- Event Listeners ---
            window.addEventListener('DOMContentLoaded', event => {
                // Initial chart render
                updateChart();

                // Chart PDF Download button
                document.getElementById('downloadPdfBtn').addEventListener('click', function() {
                    alert('Generando reporte PDF del gráfico actual...');
                    // Logic to download chart as PDF (e.g., using html2canvas + jsPDF)
                });

                // Filter event listeners
                document.getElementById('yearSelector').addEventListener('change', updateChart);
                document.getElementById('productTypeFilter').addEventListener('change', updateChart);

                // Modal event listeners
                closeModalBtn.addEventListener('click', closeSalesDetailModal);
                salesDetailModal.addEventListener('click', function(e) {
                    if (e.target === salesDetailModal) { // Close when clicking outside the modal content
                        closeSalesDetailModal();
                    }
                });
            });