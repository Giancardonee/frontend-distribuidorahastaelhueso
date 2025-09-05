
// Define la URL base de tu backend
const BASE_URL = window.API_BASE_URL;


/**
 * Función para mostrar mensajes al usuario (éxito o error).
 * @param {string} message - El mensaje a mostrar.
 * @param {string} type - El tipo de mensaje ('success' o 'danger' para Bootstrap).
 */
function displayMessage(message, type) {
    const messageContainer = document.getElementById('messageContainer');
    if (messageContainer) {
        messageContainer.innerHTML = `<div class="alert alert-${type}" role="alert">${message}</div>`;
    }
}

/**
 * Lógica para la página de solicitud de restablecimiento de contraseña.
 * (solicitar-restablecimiento.html)
 */
function setupPasswordResetRequest() {
    const form = document.getElementById('passwordResetRequestForm');
    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault(); // Evita que el formulario se envíe de forma tradicional

            const email = document.getElementById('inputEmail').value;
            displayMessage('Enviando solicitud...', 'info'); // Mensaje de carga

            try {
                const response = await fetch(`${BASE_URL}/distribuidora/resetPass/password-reset/request`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email: email })
                });

                // La respuesta del backend siempre es 200 OK por seguridad,
                // con un mensaje genérico.
                const result = await response.text(); // O response.json() si el backend devuelve JSON

                // Aunque el backend siempre devuelva 200 OK, podemos mostrar el mensaje
                // que viene en el cuerpo de la respuesta.
                displayMessage(result, 'success'); 
                // O un mensaje predefinido si prefieres:
                // displayMessage('Si el email está registrado, recibirás un enlace para restablecer tu contraseña.', 'success');

            } catch (error) {
                console.error('Error al solicitar restablecimiento:', error);
                displayMessage('Ocurrió un error al procesar tu solicitud. Intenta de nuevo más tarde.', 'danger');
            }
        });
    }
}

/**
 * Lógica para la página de confirmación de restablecimiento de contraseña.
 * (restablecer-contrasena.html)
 */
function setupPasswordResetConfirm() {
    const form = document.getElementById('passwordResetConfirmForm');
    if (form) {
        // Extraer el token de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
            displayMessage('Token de restablecimiento no encontrado en la URL. El enlace es inválido.', 'danger');
            form.style.display = 'none'; // Oculta el formulario si no hay token
            return; // Detiene la ejecución si no hay token
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault(); // Evita que el formulario se envíe de forma tradicional

            const passwordNuevo = document.getElementById('inputPassword').value;
            const confirmarPassword = document.getElementById('inputConfirmPassword').value;

            // Validaciones básicas del lado del cliente
            if (passwordNuevo.length < 6) {
                displayMessage('La nueva contraseña debe tener al menos 6 caracteres.', 'danger');
                return;
            }
            if (passwordNuevo !== confirmarPassword) {
                displayMessage('Las contraseñas no coinciden.', 'danger');
                return;
            }

            displayMessage('Restableciendo contraseña...', 'info'); // Mensaje de carga

            try {
                const response = await fetch(`${BASE_URL}/distribuidora/resetPass/password-reset/confirm`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        token: token,
                        passwordNuevo: passwordNuevo,
                        confirmarPassword: confirmarPassword
                    })
                });

                const result = await response.text(); // O response.json() si el backend devuelve JSON

                if (response.ok) { // Si la respuesta es 2xx (ej. 200 OK)
                    displayMessage(result, 'success');
                    // Opcional: Redirigir al login después de un breve retraso
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 3000); 
                } else { // Si la respuesta es un error (ej. 400 Bad Request)
                    displayMessage(result, 'danger');
                }

            } catch (error) {
                console.error('Error al confirmar restablecimiento:', error);
                displayMessage('Ocurrió un error al restablecer tu contraseña. Intenta de nuevo más tarde.', 'danger');
            }
        });
    }
}

// Ejecuta la función correspondiente según la URL de la página
document.addEventListener('DOMContentLoaded', () => {
    // Detecta si estamos en la página de solicitud o de confirmación
    const path = window.location.pathname;

    if (path.includes('solicitar-restablecimiento.html')) {
        setupPasswordResetRequest();
    } else if (path.includes('restablecer-contrasena.html')) {
        setupPasswordResetConfirm();
    }
    // Puedes añadir más condiciones si tienes otras páginas que usan scripts.js
});
