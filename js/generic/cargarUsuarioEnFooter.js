document.addEventListener('DOMContentLoaded', async () => {
    const jwtToken = localStorage.getItem('jwtToken'); // Obtenemos el token del localStorage
    const nombreEnFooterElement = document.getElementById('nombreEnFooter');

    // Si el elemento del footer no existe, salimos
    if (!nombreEnFooterElement) {
        console.warn('El elemento con ID "nombreEnFooter" no se encontró en el DOM. El nombre del usuario no se mostrará en el footer.');
        return;
    }

    // Verificamos si existe un token
    if (!jwtToken) {
        console.warn('No se encontró un token JWT. No se puede cargar el nombre del usuario en el footer.');
        nombreEnFooterElement.textContent = 'Invitado'; // O un mensaje de "No autenticado"
        return; 
    }

    // Definimos la URL de tu endpoint para obtener el perfil
    // Asegúrate de que este endpoint devuelve al menos el 'nombreUsuario'
    const apiUrl = `${window.API_BASE_URL}/auth/perfil`;

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
            // Asumiendo que el campo para el nombre de usuario en la respuesta es 'nombreUsuario'
            nombreEnFooterElement.textContent = userData.nombreUsuario || 'Usuario Desconocido';
        } else {
            // Si la respuesta no fue exitosa (ej. 401 Unauthorized, 404 Not Found)
            const errorData = await response.json();
            console.error('Error al cargar el nombre de usuario para el footer:', errorData.message || 'Error desconocido.');
            nombreEnFooterElement.textContent = 'Error al cargar usuario';
            localStorage.removeItem('jwtToken'); // Limpiamos el token inválido
            // Opcional: Podrías redirigir al login si el error es de autenticación
            // window.location.href = 'login.html'; 
        }
    } catch (error) {
        console.error('Error de conexión al obtener el perfil para el footer:', error);
        nombreEnFooterElement.textContent = 'Error de conexión';
        // Opcional: Aquí no redirigimos al login automáticamente, solo mostramos un mensaje
    }
});