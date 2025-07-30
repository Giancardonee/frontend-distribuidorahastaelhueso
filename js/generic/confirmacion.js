// js/confirmationDialog.js

/**
 * Muestra un modal de confirmación con botones "Sí" y "No" de Bootstrap 5.
 * Requiere que el HTML del modal con id="confirmationModal" esté presente en el DOM.
 *
 * @param {string} message - El mensaje principal de la confirmación que se mostrará en el cuerpo del modal.
 * @param {string} [title='Confirmación'] - El título del modal.
 * @param {string} [type='info'] - El tipo de mensaje. Determina el color del encabezado del modal.
 * Valores posibles: 'success', 'danger', 'warning', 'info', 'primary', 'secondary', 'light', 'dark'.
 * @param {string} [btnYesText='Sí'] - Texto para el botón de confirmación.
 * @param {string} [btnNoText='No'] - Texto para el botón de cancelación.
 * @returns {Promise<boolean>} - Una promesa que resuelve a `true` si el usuario confirma (hace clic en el botón de confirmación),
 * `false` si cancela (hace clic en el botón de cancelación, cierra el modal, o presiona ESC).
 */
function showConfirmationDialog(message, title = 'Confirmación', type = 'info', btnYesText = 'Sí', btnNoText = 'No') {
    return new Promise((resolve) => {
        const confirmModalElement = document.getElementById('confirmationModal');
        if (!confirmModalElement) {
            console.error('El modal de confirmación (confirmationModal) no se encontró en el DOM. Asegúrate de que existe el div con id="confirmationModal".');
            alert(`${title}: ${message}\n\n${btnYesText} o ${btnNoText}?`); // Fallback a alert
            resolve(confirm(`¿Confirmas? ${message}`)); // Fallback a confirm nativo
            return;
        }

        const confirmModal = new bootstrap.Modal(confirmModalElement);
        const confirmModalLabel = document.getElementById('confirmationModalLabel');
        const confirmModalBody = document.getElementById('confirmationModalBody');
        const btnConfirmYes = document.getElementById('btnConfirmYes');
        const btnConfirmNo = document.getElementById('btnConfirmNo');
        const confirmationModalHeader = confirmModalElement.querySelector('.modal-header');

        // Limpiar clases previas del header
        confirmationModalHeader.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info', 'bg-primary', 'bg-secondary', 'bg-light', 'bg-dark');
        confirmationModalHeader.classList.remove('text-white', 'text-dark');
        
        let bgClass = 'bg-info'; // Default
        let textColorClass = 'text-white';

        switch (type) {
            case 'success':
                bgClass = 'bg-success';
                textColorClass = 'text-white';
                break;
            case 'danger':
                bgClass = 'bg-danger';
                textColorClass = 'text-white';
                break;
            case 'warning':
                bgClass = 'bg-warning';
                textColorClass = 'text-dark';
                break;
            case 'info':
                bgClass = 'bg-info';
                textColorClass = 'text-white';
                break;
            case 'primary':
                bgClass = 'bg-primary';
                textColorClass = 'text-white';
                break;
            case 'secondary':
                bgClass = 'bg-secondary';
                textColorClass = 'text-white';
                break;
            case 'light':
                bgClass = 'bg-light';
                textColorClass = 'text-dark';
                break;
            case 'dark':
                bgClass = 'bg-dark';
                textColorClass = 'text-white';
                break;
        }

        confirmationModalHeader.classList.add(bgClass, textColorClass);
        confirmModalLabel.textContent = title;
        confirmModalBody.textContent = message;
        btnConfirmYes.textContent = btnYesText;
        btnConfirmNo.textContent = btnNoText;

        // Limpiar listeners previos para evitar múltiples disparos y memory leaks
        const clearListeners = () => {
            btnConfirmYes.removeEventListener('click', onYesClick);
            btnConfirmNo.removeEventListener('click', onNoClick);
            confirmModalElement.removeEventListener('hidden.bs.modal', onHidden);
        };

        const onYesClick = () => {
            clearListeners();
            confirmModal.hide();
            resolve(true);
        };

        const onNoClick = () => {
            clearListeners();
            confirmModal.hide();
            resolve(false);
        };

        const onHidden = () => {
            clearListeners();
            resolve(false); // Considerar como "No" si se cierra sin usar los botones
        };

        btnConfirmYes.addEventListener('click', onYesClick);
        btnConfirmNo.addEventListener('click', onNoClick);
        confirmModalElement.addEventListener('hidden.bs.modal', onHidden);

        confirmModal.show();
    });
}