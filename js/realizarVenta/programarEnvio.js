document.addEventListener('DOMContentLoaded', () => {
    const selectOpcionEnvio = document.getElementById('selectOpcionEnvio');
    const modalSeleccionarFecha = new bootstrap.Modal(document.getElementById('modalSeleccionarFecha'));
    const calendarioEnvios = document.getElementById('calendarioEnvios');
    const btnConfirmarFecha = document.getElementById('btnConfirmarFecha');
    const fechaEntregaSeleccionadaContainer = document.getElementById('fechaEntregaSeleccionadaContainer');
    const fechaEntregaSeleccionadaSpan = document.getElementById('fechaEntregaSeleccionada');

    let fechaSeleccionada = null;
    let fechaHoy = new Date();
    
    // Simulación de datos estáticos de envíos por día (esto lo reemplazaríamos por el back)
    const enviosEstaticos = {
        '2025-08-05': 3,
        '2025-08-06': 5,
        '2025-08-07': 1,
        '2025-08-08': 0
    };

    // Evento para el select de opciones de envío
    selectOpcionEnvio.addEventListener('change', (e) => {
        if (e.target.value === 'seleccionar_fecha') {
            generarCalendarioSemanal();
            modalSeleccionarFecha.show();
        } else {
            // Si no se selecciona una fecha, reseteamos la visualización
            fechaSeleccionada = null;
            fechaEntregaSeleccionadaContainer.style.display = 'none';
        }
    });

    // Función para generar el calendario semanal de forma dinámica
    function generarCalendarioSemanal() {
        calendarioEnvios.innerHTML = '';
        let hoy = new Date();
        // Encuentra el primer día de la semana (por ejemplo, el lunes)
        let diaDeSemana = hoy.getDay(); // 0 = Domingo, 1 = Lunes
        let primerDiaSemana = new Date(hoy.setDate(hoy.getDate() - (diaDeSemana === 0 ? 6 : diaDeSemana - 1)));

        for (let i = 0; i < 7; i++) {
            let dia = new Date(primerDiaSemana);
            dia.setDate(primerDiaSemana.getDate() + i);

            // Formatear la fecha para la clave del objeto y la visualización
            const fechaKey = dia.toISOString().split('T')[0];
            const diaDeLaSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][dia.getDay()];
            const diaDelMes = dia.getDate();
            const numEnvios = enviosEstaticos[fechaKey] || 0;

            const diaElemento = document.createElement('div');
            diaElemento.classList.add('col-12', 'col-md-auto', 'text-center', 'py-3', 'dia-envio', 'position-relative');
            diaElemento.dataset.fecha = fechaKey;

            if (dia.setHours(0,0,0,0) < fechaHoy.setHours(0,0,0,0)) {
                diaElemento.classList.add('text-muted');
                diaElemento.style.cursor = 'not-allowed';
            }

            if (fechaKey === fechaSeleccionada) {
                diaElemento.classList.add('selected');
                btnConfirmarFecha.disabled = false;
            }

            diaElemento.innerHTML = `
                <div class="fw-bold">${diaDeLaSemana}</div>
                <div>${diaDelMes}</div>
                <span class="badge rounded-pill bg-info badge-envios" title="Envíos programados">${numEnvios}</span>
            `;

            diaElemento.addEventListener('click', () => {
                if (dia.setHours(0,0,0,0) >= fechaHoy.setHours(0,0,0,0)) {
                    document.querySelectorAll('.dia-envio').forEach(el => el.classList.remove('selected'));
                    diaElemento.classList.add('selected');
                    fechaSeleccionada = diaElemento.dataset.fecha;
                    btnConfirmarFecha.disabled = false;
                }
            });

            calendarioEnvios.appendChild(diaElemento);
        }
    }

    // Evento para confirmar la fecha del modal
    btnConfirmarFecha.addEventListener('click', () => {
        if (fechaSeleccionada) {
            fechaEntregaSeleccionadaSpan.textContent = new Date(fechaSeleccionada + 'T00:00:00').toLocaleDateString();
            fechaEntregaSeleccionadaContainer.style.display = 'block';
            modalSeleccionarFecha.hide();
        }
    });

    // Validar el formulario al enviar (requiere una opción de envío)
    document.querySelector('form').addEventListener('submit', (e) => {
        if (selectOpcionEnvio.value === '') {
            e.preventDefault();
            selectOpcionEnvio.classList.add('is-invalid');
        } else {
            selectOpcionEnvio.classList.remove('is-invalid');
            // Aquí iría la lógica para enviar la venta, incluyendo la opción de envío y la fecha seleccionada
            console.log('Opción de envío seleccionada:', selectOpcionEnvio.value);
            if (selectOpcionEnvio.value === 'seleccionar_fecha' && fechaSeleccionada) {
                console.log('Fecha de entrega:', fechaSeleccionada);
            }
            if (selectOpcionEnvio.value === 'ya_entregado') {
                 console.log('La fecha de entrega es hoy:', fechaHoy.toISOString().split('T')[0]);
            }
            // Por ahora, solo evitamos el envío para fines de demostración
            e.preventDefault(); 
        }
    });
});