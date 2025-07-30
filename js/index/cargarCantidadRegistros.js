// cargar cantidad de registros

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Obtener el token JWT del localStorage
    const jwtToken = localStorage.getItem('jwtToken');

    // Si no hay token, el usuario no está autenticado, redirigir a login
    if (!jwtToken) {
        console.warn('No JWT token found. Redirecting to login.');
        window.location.href = 'login.html'; // Asegúrate que esta es la ruta correcta a tu login
        return; // Detener la ejecución del script
    }

    // 2. Función genérica para obtener el conteo de un endpoint
    // Incluye el token JWT en la cabecera
    const fetchCount = async (endpoint) => {
        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwtToken}` // ¡IMPORTANTE! Envía el token JWT
                }
            });

            if (response.ok) {
                const count = await response.json(); // Esperamos un número (long)
                return count;
            } else if (response.status === 401 || response.status === 403) {
                console.error(`Authentication/Authorization error for ${endpoint}:`, response.status);
                // Si el token es inválido/expirado, redirigir a login para reautenticar
                alert('Su sesión ha expirado o no tiene permisos. Por favor, inicie sesión nuevamente.');
                localStorage.removeItem('jwtToken'); // Limpiar token inválido
                window.location.href = 'login.html';
                return null;
            } else {
                const errorData = await response.json();
                console.error(`Error fetching count from ${endpoint}:`, errorData.message || response.statusText);
                return null;
            }
        } catch (error) {
            console.error(`Network error fetching count from ${endpoint}:`, error);
            return null;
        }
    };

    // 3. URLs de tus endpoints de conteo (ajusta si es necesario)
    const baseUrl = 'http://localhost:8080/distribuidora'; 
    const endpoints = {
        ventas: `${baseUrl}/ventas/contarRegistros`,    // CAMBIADO A /contarRegistros
        productos: `${baseUrl}/productos/contarRegistros`, // CAMBIADO A /contarRegistros
        clientes: `${baseUrl}/clientes/contarRegistros`, // CAMBIADO A /contarRegistros
        marcas: `${baseUrl}/marcas/contarRegistros`      
    };

    // 4. Obtener referencias a los elementos donde se mostrarán los conteos
    const ventasCard = document.getElementById('cantidadVentas'); // Reemplaza con tus IDs reales
    const productosCard = document.getElementById('cantidadProductos'); // Reemplaza con tus IDs reales
    const clientesCard = document.getElementById('cantidadClientes'); // Reemplaza con tus IDs reales
    const marcasCard = document.getElementById('cantidadMarcas');     // Reemplaza con tus IDs reales

    // ¡IMPORTANTE! Asegúrate de que los IDs en tu HTML coincidan con estos.
    // Si tus cards tienen los conteos dentro de un <div> o <p> con un ID específico,
    // asegúrate de seleccionar ese elemento. Por ejemplo:
    // <div class="card-body">
    //     <div id="cantidadVentas" class="h5 mb-0 font-weight-bold text-gray-800"></div>
    // </div>


    // 5. Cargar todos los conteos en paralelo
    const [ventasCount, productosCount, clientesCount, marcasCount] = await Promise.all([
        fetchCount(endpoints.ventas),
        fetchCount(endpoints.productos),
        fetchCount(endpoints.clientes),
        fetchCount(endpoints.marcas)
    ]);

    // 6. Actualizar las cards con los conteos obtenidos
    if (ventasCard && ventasCount !== null) {
        ventasCard.textContent = ventasCount;
    } else {
        // Manejar el caso donde no se pudo obtener el conteo o el elemento no existe
        if (ventasCard) ventasCard.textContent = 'N/A'; // O un mensaje de error
    }

    if (productosCard && productosCount !== null) {
        productosCard.textContent = productosCount;
    } else {
        if (productosCard) productosCard.textContent = 'N/A';
    }

    if (clientesCard && clientesCount !== null) {
        clientesCard.textContent = clientesCount;
    } else {
        if (clientesCard) clientesCard.textContent = 'N/A';
    }

    if (marcasCard && marcasCount !== null) {
        marcasCard.textContent = marcasCount;
    } else {
        if (marcasCard) marcasCard.textContent = 'N/A';
    }

    // Opcional: Si quieres mostrar el nombre de usuario, asumiendo que tu token JWT lo contiene
    // (Esto requeriría decodificar el token en el frontend o tener un endpoint de usuario)
    // Para simplificar, si quieres el nombre, es mejor tener un endpoint /api/user/me que devuelva los detalles del usuario logueado.
    // Por ahora, no lo incluyo, pero es una extensión común.
});

// Puedes agregar una función para cerrar sesión si tienes un botón de "Logout"
document.getElementById('logoutButton')?.addEventListener('click', () => {
    localStorage.removeItem('jwtToken');
    window.location.href = 'login.html';
});