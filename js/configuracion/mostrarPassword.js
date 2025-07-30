document.addEventListener('DOMContentLoaded', () => {
    // Función para alternar la visibilidad de la contraseña
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.dataset.target; // Obtiene el ID del input asociado desde el atributo data-target
            const passwordInput = document.getElementById(targetId); // Encuentra el input de contraseña
            // const icon = this.querySelector('i'); // Ya no necesitamos el icono si no vamos a cambiar su clase

            // Verificación por si el input no se encuentra (aunque no debería pasar si el targetId es correcto)
            if (!passwordInput) {
                console.error('Error: No se encontró el input de contraseña para el ID:', targetId);
                return; // Salir de la función si el input no se encuentra
            }

            if (passwordInput.type === 'password') {
                passwordInput.type = 'text'; // Cambia el tipo a texto para mostrar la contraseña
                // icon.classList.remove('fa-eye'); // Se elimina esta línea
                // icon.classList.add('fa-eye-slash'); // Se elimina esta línea
            } else {
                passwordInput.type = 'password'; // Cambia el tipo a password para ocultar la contraseña
                // icon.classList.remove('fa-eye-slash'); // Se elimina esta línea
                // icon.classList.add('fa-eye'); // Se elimina esta línea
            }
        });
    });

    // Opcional: Limpiar los campos del modal y resetear los inputs a tipo 'password' cuando se cierra el modal
    const changePasswordModal = document.getElementById('changePasswordModal');
    if (changePasswordModal) {
        changePasswordModal.addEventListener('hidden.bs.modal', function () {
            const form = document.getElementById('changePasswordForm');
            if (form) {
                form.reset(); // Reinicia todos los campos del formulario a su estado inicial (vacíos)
                
                // Asegúrate de que los inputs vuelvan a ser de tipo 'password'
                form.querySelectorAll('.toggle-password').forEach(button => {
                    const targetId = button.dataset.target;
                    const passwordInput = document.getElementById(targetId);

                    if (passwordInput) { // Solo si el input existe
                        passwordInput.type = 'password'; 
                    }
                    
                });
            }
        });
    }
});