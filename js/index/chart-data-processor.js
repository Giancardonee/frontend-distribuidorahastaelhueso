document.addEventListener('DOMContentLoaded', () => {
    // Función auxiliar para formatear números como moneda.
    const number_format = (number, decimals, dec_point, thousands_sep) => {
        number = (number + '').replace(',', '').replace(' ', '');
        var n = !isFinite(+number) ? 0 : +number,
            prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
            sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
            dec = (typeof dec_point === 'undefined') ? '.' : dec_point,
            s = '',
            toFixedFix = function(n, prec) {
                var k = Math.pow(10, prec);
                return '' + Math.round(n * k) / k;
            };
        s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
        if (s[0].length > 3) {
            s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
        }
        if ((s[1] || '').length < prec) {
            s[1] = s[1] || '';
            s[1] += new Array(prec - s[1].length + 1).join('0');
        }
        return s.join(dec);
    };

    const fetchAndProcessSalesData = async () => {
        try {
            const token = localStorage.getItem('jwtToken');

            if (!token) {
                console.warn('No se encontró un token JWT en el localStorage. Redirigiendo al login...');
                window.location.href = '/login.html';
                return;
            }

            const response = await fetch(`${window.API_BASE_URL}/ventas`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    console.error('Autenticación requerida o token expirado. Por favor, inicia sesión de nuevo.');
                    localStorage.removeItem('jwtToken');
                    window.location.href = '/login.html';
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const sales = await response.json();

            const monthlySales = {};
            const productSales = {};

            if (sales && Array.isArray(sales)) {
                sales.forEach(sale => {
                    if (sale.fecha && typeof sale.total === 'number') {
                        const saleDate = new Date(sale.fecha);
                        const yearMonth = `${saleDate.getFullYear()}-${(saleDate.getMonth() + 1).toString().padStart(2, '0')}`;

                        if (!monthlySales[yearMonth]) {
                            monthlySales[yearMonth] = 0;
                        }
                        monthlySales[yearMonth] += sale.total;
                    } else {
                        console.warn('Venta con fecha o total inválido, se omite para el cálculo mensual:', sale);
                    }

                    if (sale.detalles && Array.isArray(sale.detalles)) {
                        sale.detalles.forEach(detail => {
                            if (detail.nombreProducto && detail.marcaProducto && typeof detail.cantidad === 'number') {
                                const productName = detail.nombreProducto;
                                const productBrand = detail.marcaProducto;
                                const quantity = detail.cantidad;

                                const productLabel = `${productBrand} - ${productName}`;

                                if (!productSales[productLabel]) {
                                    productSales[productLabel] = 0;
                                }
                                productSales[productLabel] += quantity;
                            } else {
                                console.warn('Detalle de venta con producto, marca o cantidad inválido, se omite:', detail);
                            }
                        });
                    } else {
                        console.warn('Venta sin detalles o detalles no es un array válido:', sale);
                    }
                });
            } else {
                console.warn('Los datos de ventas recibidos no son un array válido:', sales);
            }

            const sortedMonths = Object.keys(monthlySales).sort();
            const monthlyLabels = sortedMonths.map(ym => {
                const [year, month] = ym.split('-');
                const date = new Date(year, parseInt(month) - 1, 1);
                return date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
            });
            const monthlyData = sortedMonths.map(ym => monthlySales[ym]);

            const sortedProducts = Object.entries(productSales)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5);

            // Guardamos las etiquetas completas para el tooltip
            const fullProductLabels = sortedProducts.map(([name,]) => name);
            // Creamos etiquetas vacías para el eje X
            const emptyProductLabels = sortedProducts.map(() => '');
            const productQuantities = sortedProducts.map(([, quantity]) => quantity);


            // --- Renderizado del gráfico de Área (Ventas Mensuales) ---
            const ctxArea = document.getElementById('myAreaChart');
            if (ctxArea) {
                if (window.myAreaChart instanceof Chart) {
                    window.myAreaChart.destroy();
                }
                window.myAreaChart = new Chart(ctxArea, {
                    type: 'line',
                    data: {
                        labels: monthlyLabels,
                        datasets: [{
                            label: 'Ventas',
                            lineTension: 0.3,
                            backgroundColor: 'rgba(2,117,216,0.2)',
                            borderColor: 'rgba(2,117,216,1)',
                            pointRadius: 5,
                            pointBackgroundColor: 'rgba(2,117,216,1)',
                            pointBorderColor: 'rgba(255,255,255,0.8)',
                            pointHoverRadius: 5,
                            pointHoverBackgroundColor: 'rgba(2,117,216,1)',
                            pointHitRadius: 50,
                            pointBorderWidth: 2,
                            data: monthlyData,
                        }],
                    },
                    options: {
                        scales: {
                            xAxes: [{
                                type: 'category',
                                time: {
                                    unit: 'date'
                                },
                                gridLines: {
                                    display: false
                                },
                                ticks: {
                                    autoSkip: false, // Desactiva el salto de etiquetas
                                    maxRotation: 20, // Rota las etiquetas para que no se superpongan
                                    minRotation: 20
                                }
                            }],
                            yAxes: [{
                                ticks: {
                                    min: 0,
                                    maxTicksLimit: 5,
                                    padding: 10,
                                    callback: function(value) {
                                        return '$' + number_format(value);
                                    }
                                },
                                gridLines: {
                                    color: 'rgba(0, 0, 0, .125)',
                                }
                            }],
                        },
                        legend: {
                            display: false
                        },
                        tooltips: {
                            callbacks: {
                                label: function(tooltipItem, chart) {
                                    const datasetLabel = chart.datasets[tooltipItem.datasetIndex].label || '';
                                    return datasetLabel + ': $' + number_format(tooltipItem.yLabel);
                                }
                            }
                        }
                    }
                });
            } else {
                console.error('Elemento canvas "myAreaChart" no encontrado.');
            }

            // --- Renderizado del gráfico de Barras (Productos Más Vendidos) ---
            const ctxBar = document.getElementById('myBarChart');
            if (ctxBar) {
                if (window.myBarChart instanceof Chart) {
                    window.myBarChart.destroy();
                }
                window.myBarChart = new Chart(ctxBar, {
                    type: 'bar',
                    data: {
                        labels: emptyProductLabels, // <<--- Usamos etiquetas vacías aquí para el eje X visible
                        datasets: [{
                            label: 'Cantidad Vendida',
                            backgroundColor: 'rgba(2,117,216,1)',
                            borderColor: 'rgba(2,117,216,1)',
                            data: productQuantities,
                        }],
                    },
                    options: {
                        scales: {
                            xAxes: [{
                                type: 'category',
                                gridLines: {
                                    display: false
                                },
                                ticks: {
                                    // Podemos ocultar los ticks completamente si no queremos ni el espacio
                                    // display: false,
                                    maxTicksLimit: 6
                                }
                            }],
                            yAxes: [{
                                ticks: {
                                    min: 0,
                                    maxTicksLimit: 5,
                                    padding: 10
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
                                title: function(tooltipItem, data) {
                                    // Este callback se encarga de mostrar el nombre completo del producto en el tooltip
                                    // Accedemos a las etiquetas completas que guardamos previamente
                                    return fullProductLabels[tooltipItem[0].index];
                                },
                                label: function(tooltipItem, data) {
                                    // Este callback muestra la cantidad vendida en el tooltip
                                    const datasetLabel = data.datasets[tooltipItem.datasetIndex].label || '';
                                    return datasetLabel + ': ' + tooltipItem.yLabel;
                                }
                            }
                        }
                    }
                });
            } else {
                console.error('Elemento canvas "myBarChart" no encontrado.');
            }

        } catch (error) {
            console.error('Error al obtener o procesar los datos de ventas:', error);
        }
    };

    fetchAndProcessSalesData();
});