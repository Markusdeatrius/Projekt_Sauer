document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const logoutBtn = document.getElementById("logout-btn");

    // Přepínání formulářů
    const showRegisterLink = document.getElementById("show-register");
    const showLoginLink = document.getElementById("show-login");

    loginForm.style.display = "block";
    registerForm.style.display = "none";

    showRegisterLink.addEventListener("click", () => {
        loginForm.style.display = "none";
        registerForm.style.display = "block";
    });

    showLoginLink.addEventListener("click", () => {
        loginForm.style.display = "block";
        registerForm.style.display = "none";
    });

    // Registrace
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const firstname = document.getElementById('register-firstname').value;
        const surname = document.getElementById('register-surname').value;
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;

        try {
            const res = await fetch('http://localhost:5050/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firstname, surname, username, password }),
                credentials: 'include'
            });

            const data = await res.json();

            if (res.ok) {
                alert(`Registrace úspěšná: ${data.username}`);
                registerForm.reset();
                loginForm.style.display = "block";
                registerForm.style.display = "none";
            } else {
                alert(data.message || 'Chyba při registraci.');
            }
        } catch (err) {
            console.error('Chyba:', err);
        }
    });

    // Přihlášení
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        try {
            const res = await fetch('http://localhost:5050/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                // Uložíme JWT
                localStorage.setItem('token', data.token);
                window.location.href = "/prijem_vydej.html";
            } else {
                alert(data.message || 'Přihlášení se nezdařilo.');
            }
        } catch (err) {
            console.error('Chyba:', err);
        }
    });

    // Odhlášení
    if (logoutBtn) {
        // Zobraz tlačítko jen pokud je token
        if (localStorage.getItem("token")) logoutBtn.style.display = "inline-block";

        logoutBtn.addEventListener("click", async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) return;

                const res = await fetch("http://localhost:5050/api/logout", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${token}` },
                });

                const data = await res.json();
                if (data.success) {
                    localStorage.removeItem("token");
                    window.location.href = "/logIn.html";
                }
            } catch (err) {
                console.error("Chyba při odhlášení:", err);
            }
        });
    }
});
