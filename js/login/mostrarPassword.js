            function togglePassword() {
                const passwordInput = document.getElementById("inputPassword");
                const icon = document.querySelector(".password-toggle");
                const type = passwordInput.getAttribute("type");

                if (type === "password") {
                    passwordInput.setAttribute("type", "text");
                    icon.classList.remove("fa-eye");
                    icon.classList.add("fa-eye-slash");
                } else {
                    passwordInput.setAttribute("type", "password");
                    icon.classList.remove("fa-eye-slash");
                    icon.classList.add("fa-eye");
                }
            }