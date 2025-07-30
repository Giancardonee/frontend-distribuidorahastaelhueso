// js/login/auth.js

document.addEventListener('DOMContentLoaded', () => {
    // Obtenemos una referencia al formulario de login por su ID
    const loginForm = document.getElementById('loginForm');
    // Obtenemos una referencia al input de nombre de usuario por su ID
    const inputNombreUsuario = document.getElementById('inputNombreUsuario'); 
    // Obtenemos una referencia al input de contraseña por su ID
    const inputPassword = document.getElementById('inputPassword');
    // Obtenemos una referencia al elemento donde mostraremos el error específico del formulario
    const formSpecificErrorMessage = document.getElementById('formSpecificErrorMessage');

    // Verificamos que el formulario de login exista antes de añadir el event listener
    if (loginForm && inputNombreUsuario && inputPassword && formSpecificErrorMessage) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Evita el comportamiento predeterminado del formulario (recargar la página)

            // Siempre limpia y oculta el mensaje de error al inicio de un nuevo intento de login
            formSpecificErrorMessage.style.display = 'none'; // Oculta el div del mensaje de error
            formSpecificErrorMessage.textContent = ''; // Limpia su contenido

            // Obtenemos los valores de los campos de usuario y contraseña
            const nombreUsuario = inputNombreUsuario.value.trim(); // Usa .trim() para eliminar espacios en blanco
            const password = inputPassword.value.trim();

            // Validación del lado del cliente para campos vacíos
            if (!nombreUsuario || !password) {
                formSpecificErrorMessage.textContent = 'Por favor, ingresa tu nombre de usuario y contraseña.';
                formSpecificErrorMessage.style.display = 'block'; // Muestra el div del mensaje de error
                return; // Detiene la función si la validación falla
            }

            // Definimos la URL de tu endpoint de login en el backend
            const apiUrl = 'http://localhost:8080/distribuidora/auth/login';

            try {
                // Realizamos la solicitud POST a la API
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json', // Indicamos que enviamos JSON
                    },
                    body: JSON.stringify({
                        // Convertimos los datos a JSON. Las claves deben coincidir con tu DTO de backend.
                        nombreUsuario: nombreUsuario, 
                        password: password
                    }),
                });

                // Verificamos si la respuesta de la API fue exitosa (código 2xx)
                if (response.ok) {
                    const data = await response.json(); // Parseamos la respuesta JSON del backend
                    console.log('Inicio de sesión exitoso:', data);

                    // Si el backend devuelve un token, lo guardamos en localStorage
                    if (data.token) {
                        localStorage.setItem('jwtToken', data.token); // Almacenamos el token para futuras solicitudes
                        console.log('Token JWT guardado:', data.token);
                    }
                    
                    // NEW: Mensaje de éxito si lo deseas, aunque la redirección es común.
                    // Si quieres mostrar un mensaje de éxito rápido ANTES de la redirección:
                    // formSpecificErrorMessage.textContent = '¡Inicio de sesión exitoso! Redirigiendo...';
                    // formSpecificErrorMessage.style.display = 'block';
                    // formSpecificErrorMessage.style.color = 'green'; // Opcional: cambiar color a verde para éxito
                    
                    // Redirigimos al usuario a la página principal o dashboard después del login exitoso
                    // Es mejor redirigir directamente si no hay un mensaje de éxito prolongado.
                    window.location.href = 'index.html'; 
                    
                } else {
                    // Si la respuesta no fue exitosa (ej. 401 Unauthorized, 400 Bad Request, etc.)
                    let errorData = { message: 'Error desconocido en el servidor.' };
                    try {
                        // Intentamos parsear JSON del error del backend. Tu backend *debería* enviar errores en JSON.
                        errorData = await response.json(); 
                    } catch (jsonError) {
                        console.error("Error al parsear la respuesta JSON del servidor:", jsonError);
                        errorData.message = "Respuesta inválida o inesperada del servidor.";
                    }
                    
                    const displayMessage = errorData.message || 'Error en el inicio de sesión.';
                    
                    console.error('Error en el inicio de sesión:', displayMessage);

                    // NEW: Solo muestra el error en el formSpecificErrorMessage
                    if (response.status === 401) { // No autorizado (ej. credenciales inválidas)
                        formSpecificErrorMessage.textContent = 'El nombre de usuario o la contraseña son incorrectos.';
                    } else if (response.status === 400) { // Bad Request (ej. errores de validación del backend)
                        formSpecificErrorMessage.textContent = `Error en la solicitud: ${displayMessage}`;
                    } else { // Otros errores del servidor (500, etc.)
                        formSpecificErrorMessage.textContent = `Ocurrió un error inesperado: ${displayMessage}`;
                    }
                    formSpecificErrorMessage.style.display = 'block'; // Muestra el mensaje de error en el formulario
                }
            } catch (error) {
                // Capturamos y manejamos errores de red o cualquier otra excepción durante la solicitud (ej. servidor no está corriendo, problemas de CORS)
                console.error('Error de conexión:', error);
                // NEW: Solo muestra el error en el formSpecificErrorMessage
                formSpecificErrorMessage.textContent = 'No se pudo conectar al servidor. Asegúrate de que el servidor esté funcionando.';
                formSpecificErrorMessage.style.display = 'block'; // Muestra el mensaje de error en el formulario
            }
        });
    } else {
        // En caso de que algún elemento del formulario no se encuentre en el DOM (esto sería un error crítico)
        console.error("Error: No se encontraron todos los elementos del formulario. Asegúrate de que los IDs 'loginForm', 'inputNombreUsuario', 'inputPassword' y 'formSpecificErrorMessage' existan en el HTML.");
        // Un alert aquí puede ser aceptable ya que es un error de desarrollo/configuración, no de usuario.
        alert('Error interno de la aplicación. Faltan elementos esenciales en la página. Por favor, contacta al soporte.');
    }
});