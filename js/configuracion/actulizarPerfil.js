// js/configuracion/actualizarPerfil.js

document.addEventListener('DOMContentLoaded', () => {
    const apiBaseUrl = 'http://localhost:8080/distribuidora/usuarios';

    const actualUsernameElement = document.getElementById('nombreDeUsuario');
    const nombreEnFooterSpan = document.getElementById('nombreEnFooter');

    if (!actualUsernameElement) {
        console.error('Error: Elemento con ID "nombreDeUsuario" no encontrado. No se puede determinar el nombre de usuario para las llamadas a la API.');
        showToast('Error de inicialización: No se pudo obtener el nombre de usuario.', 'danger', 'Error Crítico');
        return;
    }

    if (nombreEnFooterSpan) {
        nombreEnFooterSpan.textContent = actualUsernameElement.textContent.trim();
    }

    let currentUsername = actualUsernameElement.textContent.trim();

    if (!currentUsername || currentUsername === 'XXXXXXX') {
        console.warn('Advertencia: El nombre de usuario está vacío al inicio. Las llamadas a la API podrían fallar hasta que los datos reales se carguen en el DOM.');
    }

    const editButtons = document.querySelectorAll('.edit-btn');

    editButtons.forEach(button => {
        button.addEventListener('click', () => {
            currentUsername = actualUsernameElement.textContent.trim();

            if (!currentUsername || currentUsername === 'XXXXXXX') {
                showToast('Error: El nombre de usuario no es válido. No se puede realizar la actualización.', 'danger', 'Usuario Inválido');
                console.error('Error: El nombre de usuario no es válido. No se puede realizar la actualización.');
                return;
            }

            const infoFieldDiv = button.closest('.info-field');
            const inputField = infoFieldDiv.querySelector('input');
            const errorMsgDiv = infoFieldDiv.querySelector('.error-msg');
            const originalEditButton = button;

            if (originalEditButton.dataset.mode === 'editing') {
                return;
            }

            infoFieldDiv.classList.add('editing');
            inputField.readOnly = false;
            inputField.focus();
            clearError(errorMsgDiv);
            inputField.classList.remove('is-invalid');

            originalEditButton.style.display = 'none';
            originalEditButton.dataset.mode = 'editing';

            let saveButton = infoFieldDiv.querySelector('.save-btn');
            let cancelButton = infoFieldDiv.querySelector('.cancel-btn');

            if (!saveButton) {
                saveButton = document.createElement('button');
                saveButton.className = 'btn btn-primary btn-sm ms-2 save-btn rounded-md';
                saveButton.textContent = 'Guardar Cambios';
                saveButton.setAttribute('aria-label', 'Guardar cambios');
                saveButton.setAttribute('title', 'Guardar cambios');

                cancelButton = document.createElement('button');
                cancelButton.className = 'btn btn-secondary btn-sm ms-2 cancel-btn rounded-md';
                cancelButton.textContent = 'Cancelar';
                cancelButton.setAttribute('aria-label', 'Cancelar edición');
                cancelButton.setAttribute('title', 'Cancelar edición');

                infoFieldDiv.appendChild(saveButton);
                infoFieldDiv.appendChild(cancelButton);

                // --- Event listener para Guardar Cambios ---
                saveButton.addEventListener('click', async () => {
                    const fieldId = inputField.id;
                    const newValue = inputField.value.trim();

                    let fieldNameForDto;
                    let isValid = true;
                    let errorMessage = '';
                    // Capturar el texto de la etiqueta (label) para usarlo en los mensajes
                    const fieldLabel = infoFieldDiv.querySelector('label')?.textContent.replace(':', '').trim() || 'este campo';


                    inputField.classList.remove('is-invalid');
                    clearError(errorMsgDiv);

                    if (fieldId === 'nombreUsuario') {
                        fieldNameForDto = 'nombre';
                        isValid = validateNotEmpty(newValue);
                        if (!isValid) errorMessage = 'El nombre no puede estar vacío.';
                    } else if (fieldId === 'apellidoUsuario') {
                        fieldNameForDto = 'apellido';
                        isValid = validateNotEmpty(newValue);
                        if (!isValid) errorMessage = 'El apellido no puede estar vacío.';
                    } else if (fieldId === 'correoElectronico') {
                        fieldNameForDto = 'mail';
                        isValid = validateEmail(newValue);
                        if (!isValid) errorMessage = 'Formato de correo electrónico inválido. Ej: usuario@ejemplo.com';
                    }

                    if (!isValid) {
                        showError(errorMsgDiv, errorMessage);
                        inputField.classList.add('is-invalid');
                        inputField.focus();
                        return;
                    }

                    const updatePayload = {};
                    updatePayload[fieldNameForDto] = newValue;

                    saveButton.disabled = true;
                    saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...';

                    try {
                        const response = await updateUserProfile(currentUsername, updatePayload);

                        if (response.ok) {
                            // ****** CAMBIO AQUÍ: Usamos fieldLabel ******
                            showToast(`El campo '${fieldLabel}' se ha actualizado correctamente.`, 'success', 'Actualización Exitosa');
                            console.log(`Campo '${fieldNameForDto}' actualizado correctamente.`);
                            
                            if (fieldId === 'nombreUsuario' && nombreEnFooterSpan) {
                                nombreEnFooterSpan.textContent = newValue;
                            }

                            infoFieldDiv.classList.remove('editing');
                            inputField.readOnly = true;
                            originalEditButton.style.display = 'block';
                            originalEditButton.dataset.mode = '';
                            saveButton.remove();
                            cancelButton.remove();
                            clearError(errorMsgDiv);
                            inputField.classList.remove('is-invalid');

                        } else if (response.status === 401 || response.status === 403) {
                            showToast('Su sesión ha expirado o no tiene permisos. Por favor, inicie sesión nuevamente.', 'danger', 'Acceso Denegado');
                            setTimeout(() => { window.location.href = 'login.html'; }, 3000);
                        } else {
                            const errorData = await response.json().catch(() => ({ message: response.statusText || 'Error desconocido del servidor.' }));
                            showError(errorMsgDiv, errorData.message || `Error al actualizar ${fieldLabel}.`);
                            inputField.classList.add('is-invalid');
                            // ****** CAMBIO AQUÍ: Usamos fieldLabel ******
                            showToast(`Error: ${errorData.message || `No se pudo actualizar el campo '${fieldLabel}'.`}`, 'danger', 'Fallo al Guardar');
                        }
                    } catch (error) {
                        console.error('Error durante la llamada a la API:', error);
                        showError(errorMsgDiv, `Error de conexión: No se pudo conectar con el servidor.`);
                        showToast(`Error de red: No se pudo conectar con el servidor al intentar actualizar '${fieldLabel}'.`, 'danger', 'Error de Conexión');
                    } finally {
                        saveButton.disabled = false;
                        saveButton.innerHTML = 'Guardar Cambios';
                    }
                });

                // --- Event listener para Cancelar ---
                cancelButton.addEventListener('click', () => {
                    inputField.readOnly = true;
                    infoFieldDiv.classList.remove('editing');
                    originalEditButton.style.display = 'block';
                    originalEditButton.dataset.mode = '';
                    saveButton.remove();
                    cancelButton.remove();
                    clearError(errorMsgDiv);
                    inputField.classList.remove('is-invalid');
                });
            } else {
                saveButton.style.display = 'block';
                cancelButton.style.display = 'block';
            }
        });
    });

    function validateNotEmpty(value) {
        return value.length > 0;
    }

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function showError(errorDiv, message) {
        errorDiv.textContent = message;
    }

    function clearError(errorDiv) {
        errorDiv.textContent = '';
    }

    async function updateUserProfile(username, data) {
        const jwtToken = localStorage.getItem('jwtToken');
        if (!jwtToken) {
            console.error('No se encontró un token JWT para la actualización del perfil.');
            return new Response(JSON.stringify({ message: 'Token JWT no encontrado.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        try {
            const response = await fetch(`${apiBaseUrl}/${username}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwtToken}`
                },
                body: JSON.stringify(data)
            });
            return response;
        } catch (error) {
            console.error('Error en la función updateUserProfile (red o servidor):', error);
            throw error;
        }
    }
});