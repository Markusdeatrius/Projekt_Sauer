document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');

    // Registrace
    if (registerForm && registerBtn) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const res = await fetch('http://localhost:3000/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                    credentials: 'include'
                });

                if (res.ok) {
                    window.location.href = "/prijem_vydej.html";
                } else {
                    const data = await res.json();
                    alert(data.message || 'Chyba při registraci.');
                }
            } catch (err) {
                console.error('Chyba:', err);
            }
        });
    }

    // Přihlášení
    if (loginForm && loginBtn) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const res = await fetch('http://localhost:3000/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                    credentials: 'include'
                });

                const data = await res.json();

                if (res.ok && data.success) {
                    window.location.href = "/prijem_vydej.html";
                } else {
                    alert(data.message || 'Přihlášení se nezdařilo.');
                }
            } catch (err) {
                console.error('Chyba:', err);
            }
        });
    }


    const showRegisterLink = document.getElementById("show-register");
    const showLoginLink = document.getElementById("show-login");

    loginForm.style.display = "block";
    registerForm.style.display = "none";

    showRegisterLink.addEventListener("click", function () {
        loginForm.style.display = "none";
        registerForm.style.display = "block";
    });

    showLoginLink.addEventListener("click", function () {
        loginForm.style.display = "block";
        registerForm.style.display = "none";
    });


});
