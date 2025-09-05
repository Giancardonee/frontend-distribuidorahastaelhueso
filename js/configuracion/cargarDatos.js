

document.addEventListener('DOMContentLoaded', async () => {
    const jwtToken = localStorage.getItem('jwtToken'); // Obtenemos el token del localStorage

    // Verificamos si existe un token
    if (!jwtToken) {
        console.warn('No se encontró un token JWT. Redirigiendo al login...');
        // Si no hay token, redirigimos al login (o mostramos un mensaje de error)
        window.location.href = 'login.html'; 
        return; 
    }

    // Definimos la URL de tu nuevo endpoint para obtener el perfil
    const apiUrl = `${API_BASE_URL}/auth/perfil`;

    try {
        const response = await fetch(apiUrl, {
            method: 'GET', 
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}` // Enviamos el token en el header Authorization
            },
        });

        if (response.ok) {
            const userData = await response.json(); // Parseamos la respuesta JSON
            console.log('Datos del usuario cargados:', userData);

            // Rellenar los campos en el HTML
            document.getElementById('nombreUsuario').value = userData.nombre || '';
            document.getElementById('apellidoUsuario').value = userData.apellido || '';
            document.getElementById('nombreDeUsuario').textContent = userData.nombreUsuario || '';
            document.getElementById('correoElectronico').value = userData.mail || '';

            // Rellenar el nombre de usuario en el footer
            document.getElementById('nombreEnFooter').textContent = userData.nombreUsuario || 'Usuario Desconocido';

        } else {
            // Si la respuesta no fue exitosa (ej. 401 Unauthorized, 404 Not Found)
            const errorData = await response.json();
            console.error('Error al cargar los datos del perfil:', errorData.message || 'Error desconocido.');
            
            alert('Error al cargar el perfil. Por favor, inicia sesión de nuevo.');
            localStorage.removeItem('jwtToken'); 
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Error de conexión al obtener el perfil:', error);
        alert('No se pudo conectar con el servidor para obtener los datos del perfil. Inténtalo de nuevo más tarde.');
         window.location.href = 'login.html';
    }
});