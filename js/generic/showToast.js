// js/scripts.js

/**
 * Muestra un toast de Bootstrap 5.
 *
 * @param {string} message - El mensaje principal a mostrar en el toast.
 * @param {string} type - El tipo de toast. Determina el color de fondo y el icono.
 * Valores posibles: 'success', 'danger', 'warning', 'info', 'primary', 'secondary', 'light', 'dark'.
 * @param {string} [title] - Título opcional para el toast. Si no se proporciona, se usará un título predeterminado según el tipo.
 * @param {number} [delay=5000] - Tiempo en milisegundos que el toast permanecerá visible antes de ocultarse automáticamente.
 * Si es 0 o negativo, el toast no se ocultará automáticamente.
 */
function showToast(message, type = 'info', title = '', delay = 5000) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        console.error('El contenedor de toasts (toastContainer) no se encontró en el DOM. Asegúrate de que existe el div con id="toastContainer".');
        // Fallback: mostrar un alert nativo si el contenedor no está presente
        alert(`${title ? title + ': ' : ''}${message}`);
        return;
    }
    
    let bgClass = '';
    let textColorClass = 'text-white'; // Default text color for dark backgrounds
    let defaultTitle = '';
    let iconHtml = '';

    switch (type) {
        case 'success':
            bgClass = 'bg-success';
            defaultTitle = 'Éxito';
            iconHtml = '<i class="fas fa-check-circle me-2"></i>';
            break;
        case 'danger':
            bgClass = 'bg-danger';
            defaultTitle = 'Error';
            iconHtml = '<i class="fas fa-times-circle me-2"></i>';
            break;
        case 'warning':
            bgClass = 'bg-warning';
            textColorClass = 'text-dark'; // Yellow background needs dark text
            defaultTitle = 'Advertencia';
            iconHtml = '<i class="fas fa-exclamation-triangle me-2"></i>';
            break;
        case 'info':
            bgClass = 'bg-info';
            defaultTitle = 'Información';
            iconHtml = '<i class="fas fa-info-circle me-2"></i>';
            break;
        case 'primary':
            bgClass = 'bg-primary';
            defaultTitle = 'Mensaje';
            iconHtml = '<i class="fas fa-bell me-2"></i>';
            break;
        case 'secondary':
            bgClass = 'bg-secondary';
            defaultTitle = 'Notificación';
            iconHtml = '<i class="fas fa-comment-alt me-2"></i>';
            break;
        case 'light':
            bgClass = 'bg-light';
            textColorClass = 'text-dark'; // Light background needs dark text
            defaultTitle = 'Mensaje';
            iconHtml = '<i class="fas fa-bell me-2"></i>';
            break;
        case 'dark':
            bgClass = 'bg-dark';
            defaultTitle = 'Mensaje';
            iconHtml = '<i class="fas fa-bell me-2"></i>';
            break;
        default:
            bgClass = 'bg-primary'; // Default a primary si el tipo no es reconocido
            defaultTitle = 'Notificación';
            iconHtml = '<i class="fas fa-bell me-2"></i>';
            break;
    }

    // Usa el título proporcionado o el predeterminado
    const finalTitle = title || defaultTitle;

    // Crea el elemento HTML del toast
    const toastElement = document.createElement('div');
    toastElement.className = `toast align-items-center ${bgClass} ${textColorClass} border-0`;
    toastElement.setAttribute('role', 'alert');
    toastElement.setAttribute('aria-live', 'assertive');
    toastElement.setAttribute('aria-atomic', 'true');
    toastElement.setAttribute('data-bs-delay', delay.toString()); // Convertir a string

    toastElement.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${iconHtml}<strong>${finalTitle}:</strong> ${message}
            </div>
            <button type="button" class="btn-close ${textColorClass === 'text-white' ? 'btn-close-white' : ''} me-2 m-auto" data-bs-dismiss="toast" aria-label="Cerrar"></button>
        </div>
    `;

    // Agrega el toast al contenedor
    toastContainer.appendChild(toastElement);

    // Inicializa el toast de Bootstrap
    const bsToast = new bootstrap.Toast(toastElement);
    bsToast.show();

    // Elimina el toast del DOM una vez que se ha ocultado para evitar acumulación
    toastElement.addEventListener('hidden.bs.toast', function () {
        toastElement.remove();
    });
}
