document.addEventListener('DOMContentLoaded', () => {
    // Función para alternar la visibilidad de la contraseña
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.dataset.target; // Obtiene el ID del input asociado desde el atributo data-target
            const passwordInput = document.getElementById(targetId); // Encuentra el input de contraseña

            if (!passwordInput) {
                console.error('Error: No se encontró el input de contraseña para el ID:', targetId);
                return; // Salir de la función si el input no se encuentra
            }

            if (passwordInput.type === 'password') {
                passwordInput.type = 'text'; 
            } else {
                passwordInput.type = 'password'; 
            }
        });
    });

    //Limpia los campos del modal y resetear los inputs a tipo 'password' cuando se cierra el modal
    const changePasswordModal = document.getElementById('changePasswordModal');
    if (changePasswordModal) {
        changePasswordModal.addEventListener('hidden.bs.modal', function () {
            const form = document.getElementById('changePasswordForm');
            if (form) {
                form.reset(); // Reinicia todos los campos del formulario a su estado inicial (vacíos)
                
            
                form.querySelectorAll('.toggle-password').forEach(button => {
                    const targetId = button.dataset.target;
                    const passwordInput = document.getElementById(targetId);

                    if (passwordInput) { 
                        passwordInput.type = 'password'; 
                    }
                    
                });
            }
        });
    }
});