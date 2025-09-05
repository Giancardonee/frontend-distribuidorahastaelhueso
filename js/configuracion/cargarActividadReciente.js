document.addEventListener('DOMContentLoaded', () => {

    // Función para formatear la fecha y hora
    function formatLoginDateTime(isoString) {
        if (!isoString) return 'Fecha no disponible';
        const date = new Date(isoString);
        
        
        const options = {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true // Para AM/PM
        };
        
        return date.toLocaleString('es-ES', options); 
    }

    // Función para cargar la actividad reciente
    async function loadRecentActivity() {
        const token = localStorage.getItem('jwtToken'); 

        if (!token) {
            console.warn('No hay token de autenticación disponible. No se puede cargar la actividad reciente.');
            if (lastLoginPlaceholder) {
                lastLoginPlaceholder.innerHTML = '<small>No se pudo cargar la actividad (no autenticado).</small>';
            }
            return;
        }

        try {
            const response = await fetch('http://127.0.0.1:8080/distribuidora/usuarios/actividad-reciente/login', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const activities = await response.json();
                
                if (recentLoginsList) recentLoginsList.innerHTML = '';

                if (activities && activities.length > 0) {
                    const lastLogin = activities[0];
                    if (lastLoginPlaceholder) {
                        lastLoginPlaceholder.innerHTML = `<small>Último inicio de sesión: ${formatLoginDateTime(lastLogin.loginTimestamp)}</small>`;
                    }

                    if (recentLoginsList && activities.length > 1) {
                        const ul = document.createElement('ul');
                        ul.classList.add('list-unstyled', 'mt-2', 'small'); 
                        
                        for (let i = 1; i < activities.length; i++) {
                            const activity = activities[i];
                            const li = document.createElement('li');
                            li.textContent = `Acceso anterior: ${formatLoginDateTime(activity.loginTimestamp)}`;
                            ul.appendChild(li);
                        }
                        recentLoginsList.appendChild(ul);
                    } else if (recentLoginsList) {
                        recentLoginsList.innerHTML = '';
                    }

                } else {
                    if (lastLoginPlaceholder) {
                        lastLoginPlaceholder.innerHTML = '<small>No hay registros de inicio de sesión.</small>';
                    }
                    if (recentLoginsList) recentLoginsList.innerHTML = '';
                }

            } else {
                const errorText = await response.text();
                console.error('Error al cargar la actividad reciente:', errorText);
                if (lastLoginPlaceholder) {
                    lastLoginPlaceholder.innerHTML = `<small>Error al cargar la actividad: ${errorText}</small>`;
                }
            }
        } catch (error) {
            console.error('Error de red o de la solicitud de actividad reciente:', error);
            if (lastLoginPlaceholder) {
                lastLoginPlaceholder.innerHTML = '<small>Ocurrió un error de red al cargar la actividad.</small>';
            }
        }
    }

    loadRecentActivity();
});