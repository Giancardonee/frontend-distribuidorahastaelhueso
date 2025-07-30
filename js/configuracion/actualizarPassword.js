// js/configuracion/cambiarPassword.js

document.addEventListener('DOMContentLoaded', () => {

    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            // Referencias a los campos del formulario
            const currentPasswordInput = document.getElementById('currentPassword');
            const newPasswordInput = document.getElementById('newPassword');
            const confirmNewPasswordInput = document.getElementById('confirmNewPassword');

            const currentPassword = currentPasswordInput.value;
            const newPassword = newPasswordInput.value;
            const confirmNewPassword = confirmNewPasswordInput.value;

            // Limpiar validaciones previas de Bootstrap
            currentPasswordInput.classList.remove('is-invalid');
            newPasswordInput.classList.remove('is-invalid');
            confirmNewPasswordInput.classList.remove('is-invalid');

            // ***** VALIDACIÓN EN EL FRONTEND: NUEVA CONTRASEÑA Y REPETIR NUEVA CONTRASEÑA *****
            if (newPassword !== confirmNewPassword) {
                // Usar showToast en lugar de alert
                showToast('La nueva contraseña y la confirmación no coinciden. Por favor, inténtalo de nuevo.', 'warning', 'Error de Contraseña');
                
                // Añadir clases de Bootstrap para indicar el error
                newPasswordInput.classList.add('is-invalid');
                confirmNewPasswordInput.classList.add('is-invalid');
                
                newPasswordInput.focus(); // Enfocar el primer campo con error
                return; // Detiene el envío del formulario
            }

            // También puedes añadir validación para la longitud o complejidad de la contraseña aquí
            if (newPassword.length < 6) { // Ejemplo de validación
                showToast('La nueva contraseña debe tener al menos 6 caracteres.', 'warning', 'Contraseña Demasiado Corta');
                newPasswordInput.classList.add('is-invalid');
                newPasswordInput.focus();
                return;
            }

            // **********************************************************************************
            const usernameLabel = document.getElementById('nombreDeUsuario');
            // Obtener el nombre de usuario del texto del label. Asegúrate de que este label esté presente.
            const nombreDeUsuario = usernameLabel ? usernameLabel.textContent.trim() : null;

            if (!nombreDeUsuario || nombreDeUsuario === '') {
                // Usar showToast en lugar de alert
                showToast('Error: No se pudo obtener el nombre de usuario para la solicitud. Asegúrate de que el usuario esté logueado.', 'danger', 'Error de Usuario');
                console.error('No se pudo obtener el nombre de usuario del elemento con ID "nombreDeUsuario".');
                return;
            }

            // Deshabilitar el botón para evitar envíos múltiples
            const submitButton = changePasswordForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Cambiando...';
            }

            try {
                const token = localStorage.getItem('jwtToken');
                if (!token) {
                    showToast('Su sesión ha expirado o no ha iniciado sesión. Por favor, inicie sesión nuevamente.', 'danger', 'Sesión Requerida');
                    setTimeout(() => { window.location.href = 'login.html'; }, 3000);
                    return;
                }

                const response = await fetch(`http://localhost:8080/distribuidora/usuarios/cambiar-password/${nombreDeUsuario}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` // Asegúrate de que tu token se llame 'jwtToken'
                    },
                    body: JSON.stringify({
                        passwordActual: currentPassword,
                        passwordNuevo: newPassword
                    })
                });

                if (response.ok) {
                    // Usar showToast en lugar de alert
                    showToast('Contraseña actualizada exitosamente.', 'success', 'Contraseña Cambiada');
                    
                    // Cerrar el modal (asumiendo que es un modal de Bootstrap)
                    const changePasswordModal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
                    if (changePasswordModal) {
                        changePasswordModal.hide();
                    }
                    
                    // Limpiar el formulario después de un cambio exitoso
                    changePasswordForm.reset();
                    changePasswordForm.classList.remove('was-validated'); // Limpiar validación visual
                    currentPasswordInput.classList.remove('is-invalid');
                    newPasswordInput.classList.remove('is-invalid');
                    confirmNewPasswordInput.classList.remove('is-invalid');

                } else {
                    const errorText = await response.text();
                    // Usar showToast en lugar de alert
                    showToast(`Error al cambiar la contraseña: ${errorText}`, 'danger', 'Fallo al Cambiar Contraseña');
                    // Opcional: Marcar el campo de contraseña actual como inválido si el error es por credenciales incorrectas
                    currentPasswordInput.classList.add('is-invalid');
                    currentPasswordInput.focus();
                }
            } catch (error) {
                console.error('Error de red o de la solicitud:', error);
                // Usar showToast en lugar de alert
                showToast('Ocurrió un error al intentar cambiar la contraseña. Intenta nuevamente.', 'danger', 'Error de Conexión');
            } finally {
                // Re-habilitar el botón y restaurar su texto original
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = 'Cambiar Contraseña'; // O el texto original
                }
            }
        });
    }

    // Opcional: Limpiar el formulario y validación cuando el modal se cierra
    const changePasswordModalElement = document.getElementById('changePasswordModal');
    if (changePasswordModalElement) {
        changePasswordModalElement.addEventListener('hidden.bs.modal', function () {
            const form = document.getElementById('changePasswordForm');
            if (form) {
                form.reset();
                form.classList.remove('was-validated');
                form.querySelectorAll('.form-control').forEach(input => {
                    input.classList.remove('is-invalid');
                    input.setCustomValidity(""); // Limpiar mensajes de validación personalizados
                });
            }
        });
    }

});