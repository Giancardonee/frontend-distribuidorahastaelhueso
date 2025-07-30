// js/logout.js (o agrégalo a scripts.js)

document.addEventListener('DOMContentLoaded', function() {
    const logoutButton = document.getElementById('logoutButton');

    if (logoutButton) {
        logoutButton.addEventListener('click', function(event) {
            event.preventDefault(); // Evita que el enlace recargue la página

            // 1. Eliminar el token del localStorage usando la clave correcta
            localStorage.removeItem('jwtToken'); 

            console.log('Token JWT eliminado del localStorage.');

            // 2. Redirigir a la página de inicio de sesión
            window.location.href = 'login.html'; 
        });
    }
});