

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

            // ***** VALIDACIÓN DEL FRONTEND: NUEVA CONTRASEÑA Y REPETIR NUEVA CONTRASEÑA *****
            if (newPassword !== confirmNewPassword) {
                showToast('La nueva contraseña y la confirmación no coinciden. Por favor, inténtalo de nuevo.', 'warning', 'Error de Contraseña');
                
                newPasswordInput.classList.add('is-invalid');
                confirmNewPasswordInput.classList.add('is-invalid');
                
                newPasswordInput.focus(); // Enfocar el primer campo con error
                return; // Detiene el envío del formulario
            }

            if (newPassword.length < 6) { 
                showToast('La nueva contraseña debe tener al menos 6 caracteres.', 'warning', 'Contraseña Demasiado Corta');
                newPasswordInput.classList.add('is-invalid');
                newPasswordInput.focus();
                return;
            }

            // **********************************************************************************
            const usernameLabel = document.getElementById('nombreDeUsuario');
            // Obtener el nombre de usuario del texto del label.
            const nombreDeUsuario = usernameLabel ? usernameLabel.textContent.trim() : null;

            if (!nombreDeUsuario || nombreDeUsuario === '') {
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

                const response = await fetch(`${API_BASE_URL}/usuarios/cambiar-password/${nombreDeUsuario}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({
                        passwordActual: currentPassword,
                        passwordNuevo: newPassword
                    })
                });

                if (response.ok) {
                    showToast('Contraseña actualizada exitosamente.', 'success', 'Contraseña Cambiada');
                    
                    // Cerrar el modal 
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
                    showToast(`Error al cambiar la contraseña: ${errorText}`, 'danger', 'Fallo al Cambiar Contraseña');
                    currentPasswordInput.classList.add('is-invalid');
                    currentPasswordInput.focus();
                }
            } catch (error) {
                console.error('Error de red o de la solicitud:', error);
                showToast('Ocurrió un error al intentar cambiar la contraseña. Intenta nuevamente.', 'danger', 'Error de Conexión');
            } finally {
                // Re-habilitar el botón y restaurar su texto original
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = 'Cambiar Contraseña'; 
                }
            }
        });
    }

    // Limpia el formulario y validación cuando el modal se cierra
    const changePasswordModalElement = document.getElementById('changePasswordModal');
    if (changePasswordModalElement) {
        changePasswordModalElement.addEventListener('hidden.bs.modal', function () {
            const form = document.getElementById('changePasswordForm');
            if (form) {
                form.reset();
                form.classList.remove('was-validated');
                form.querySelectorAll('.form-control').forEach(input => {
                    input.classList.remove('is-invalid');
                    input.setCustomValidity(""); 
                });
            }
        });
    }

});