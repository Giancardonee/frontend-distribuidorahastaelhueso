// js/realizarVenta/programarEnvio.js

document.addEventListener('DOMContentLoaded', () => {
    const selectOpcionEnvio = document.getElementById('selectOpcionEnvio');
    const modalSeleccionarFecha = new bootstrap.Modal(document.getElementById('modalSeleccionarFecha'));
    const calendarioEnvios = document.getElementById('calendarioEnvios');
    const btnConfirmarFecha = document.getElementById('btnConfirmarFecha');
    const fechaEntregaSeleccionadaContainer = document.getElementById('fechaEntregaSeleccionadaContainer');
    const fechaEntregaSeleccionadaSpan = document.getElementById('fechaEntregaSeleccionada');
    const modalTitle = document.getElementById('modalSeleccionarFechaLabel');

    let fechaSeleccionada = null;
    let modoCalendario = '';

    // Mapa para guardar los envíos por fecha obtenidos del backend.
    let enviosPorDiaDelBackend = {};

    selectOpcionEnvio.addEventListener('change', (e) => {
        const opcion = e.target.value;
        fechaSeleccionada = null;
        fechaEntregaSeleccionadaContainer.style.display = 'none';
        btnConfirmarFecha.disabled = true;

        if (opcion === 'seleccionar_fecha') {
            modoCalendario = 'futuro';
            modalTitle.textContent = 'Seleccionar fecha de entrega';
            generarCalendario(modoCalendario);
            modalSeleccionarFecha.show();
        } else if (opcion === 'ya_entregado') {
            modoCalendario = 'pasado';
            modalTitle.textContent = 'Seleccionar fecha de entrega realizada';
            generarCalendario(modoCalendario);
            modalSeleccionarFecha.show();
        } else if (opcion === 'programar_mas_tarde') {
            fechaSeleccionada = null;
        }
    });

    // NUEVA FUNCIÓN: Obtiene los envíos del backend
    async function fetchEnviosPorFecha(modo) {
        const hoy = new Date();
        const diasAMostrar = 10;
        let fechaInicio = new Date(hoy);
        let fechaFin = new Date(hoy);

        if (modo === 'pasado') {
            fechaInicio.setDate(hoy.getDate() - (diasAMostrar - 1));
        } else if (modo === 'futuro') {
            fechaFin.setDate(hoy.getDate() + (diasAMostrar - 1));
        }

        const fechaInicioStr = fechaInicio.toISOString().split('T')[0];
        const fechaFinStr = fechaFin.toISOString().split('T')[0];
        
        const jwtToken = localStorage.getItem('jwtToken');
        if (!jwtToken) {
            console.error('No se encontró el token JWT. No se pueden cargar los envíos.');
            return;
        }

        const baseUrl = 'http://localhost:8080/distribuidora';
        const url = `${baseUrl}/envios/cantidad-por-fecha?fechaInicio=${fechaInicioStr}&fechaFin=${fechaFinStr}`;

        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${jwtToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                // Rellenamos el mapa con los datos del backend
                enviosPorDiaDelBackend = data.reduce((map, item) => {
                    map[item.fecha] = item.cantidad;
                    return map;
                }, {});
            } else {
                console.error('Error al obtener la cantidad de envíos por fecha:', response.status);
            }
        } catch (error) {
            console.error('Error de red al obtener los envíos:', error);
        }
    }

    async function generarCalendario(modo) {
        calendarioEnvios.innerHTML = '';
        await fetchEnviosPorFecha(modo); // Esperamos a que el backend devuelva los datos

        const hoy = new Date();
        const diasAMostrar = 10;
        let fechaInicio = new Date(hoy);

        if (modo === 'pasado') {
            fechaInicio.setDate(hoy.getDate() - (diasAMostrar - 1));
        }

        for (let i = 0; i < diasAMostrar; i++) {
            const dia = new Date(fechaInicio);
            dia.setDate(fechaInicio.getDate() + i);

            const fechaKey = dia.toISOString().split('T')[0];
            const diaDeLaSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][dia.getDay()];
            const diaDelMes = dia.getDate();
            
            // Usamos los datos del backend, si no existen usamos 0
            const numEnvios = enviosPorDiaDelBackend[fechaKey] || 0;

            const diaElemento = document.createElement('div');
            diaElemento.classList.add('col-12', 'col-md-auto', 'text-center', 'py-3', 'dia-envio', 'position-relative');
            diaElemento.dataset.fecha = fechaKey;

            const hoySinTiempo = new Date();
            hoySinTiempo.setHours(0, 0, 0, 0);
            if (dia.setHours(0, 0, 0, 0) === hoySinTiempo.setHours(0, 0, 0, 0)) {
                diaElemento.classList.add('bg-light');
            }

            const cardContent = `
                <p class="mb-0 fw-bold">${diaDeLaSemana}</p>
                <h4 class="mb-0">${diaDelMes}</h4>
                <div class="badge bg-primary rounded-pill mt-2">${numEnvios} envíos</div>
            `;
            diaElemento.innerHTML = cardContent;

            diaElemento.addEventListener('click', () => {
                document.querySelectorAll('.dia-envio.border.border-primary').forEach(el => {
                    el.classList.remove('border', 'border-primary', 'shadow');
                });

                diaElemento.classList.add('border', 'border-primary', 'shadow');
                fechaSeleccionada = diaElemento.dataset.fecha;
                btnConfirmarFecha.disabled = false;
            });

            calendarioEnvios.appendChild(diaElemento);
        }
    }

    btnConfirmarFecha.addEventListener('click', () => {
        if (fechaSeleccionada) {
            fechaEntregaSeleccionadaSpan.textContent = fechaSeleccionada;
            fechaEntregaSeleccionadaContainer.style.display = 'block';
            modalSeleccionarFecha.hide();
        }
    });
});

// FUNCIÓN PÚBLICA PARA LLAMAR DESDE EL OTRO SCRIPT
async function registrarEnvio(idVenta) {
    const selectOpcionEnvio = document.getElementById('selectOpcionEnvio');
    const fechaEntregaSeleccionadaSpan = document.getElementById('fechaEntregaSeleccionada');
    const opcionEnvioSeleccionada = selectOpcionEnvio.value;

    let estadoEnvio = '';
    let fechaParaEnvio = null;

    if (opcionEnvioSeleccionada === 'programar_mas_tarde') {
        estadoEnvio = 'SIN_FECHA';
    } else if (opcionEnvioSeleccionada === 'ya_entregado' || opcionEnvioSeleccionada === 'seleccionar_fecha') {
        if (!fechaEntregaSeleccionadaSpan.textContent) {
            console.error('No se ha seleccionado una fecha de entrega.');
            alert('Error: Debe seleccionar una fecha de entrega.');
            return;
        }
        estadoEnvio = (opcionEnvioSeleccionada === 'ya_entregado') ? 'ENTREGADO' : 'PENDIENTE';
        fechaParaEnvio = fechaEntregaSeleccionadaSpan.textContent;
    }
    
    const jwtToken = localStorage.getItem('jwtToken');
    if (!jwtToken) {
        console.error('No se encontró el token JWT.');
        alert('Sesión expirada. Por favor, vuelva a iniciar sesión.');
        window.location.href = 'login.html';
        return;
    }

    const envioDTO = {
        idVenta: idVenta,
        estado: estadoEnvio,
        fechaEntrega: fechaParaEnvio
    };
    
    try {
        const baseUrl = 'http://localhost:8080/distribuidora';
        const response = await fetch(`${baseUrl}/envios/programar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify(envioDTO)
        });

        if (response.ok) {
            const nuevoEnvio = await response.json();
            console.log('Envío registrado con éxito:', nuevoEnvio);

            // 1. Reinicia el select a la opción por defecto.
            selectOpcionEnvio.value = 'programar_mas_tarde'; 

            // 2. Limpia el contenido del <span> que contiene la fecha seleccionada.
            fechaEntregaSeleccionadaSpan.textContent = ''; 
            
            // 3. Oculta el contenedor completo para que no se vea el fondo ni el borde.
            fechaEntregaSeleccionadaContainer.style.display = 'none';

        } else {
            const errorData = await response.json();
            console.error('Error al registrar el envío:', errorData.message);
            alert('Error al registrar el envío: ' + errorData.message);
        }
    } catch (error) {
        console.error('Error de red al registrar el envío:', error);
        alert('Error de conexión al registrar el envío.');
    }
}