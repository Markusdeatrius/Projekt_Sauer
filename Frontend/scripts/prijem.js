document.addEventListener('DOMContentLoaded', () => {

    // --- Logout tlačítko ---
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        if (localStorage.getItem("token")) logoutBtn.style.display = "inline-block";
        logoutBtn.addEventListener("click", async () => {
            const token = localStorage.getItem("token");
            if (!token) return;
            try {
                const res = await fetch("http://localhost:5050/api/logout", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${token}` },
                });
                const data = await res.json();
                if (data.success) {
                    localStorage.removeItem("token");
                    window.location.href = "/logIn.html";
                }
            } catch (err) { console.error("Chyba při odhlášení:", err); }
        });
    }

    const modal = document.getElementById('modal-overlay');
    const singleButton = document.getElementById('single-receive-btn');
    const closeButton = document.getElementById('close-modal');
    const cancelButton = document.getElementById('cancel-btn');
    const addItemButton = document.getElementById('add-item-btn');
    const productNameInput = document.getElementById('product-name');
    const safetyStockInput = document.getElementById('safety-stock');
    const scanButton = document.getElementById('scan-button');

    let currentBarcode = null;

    function showNotification(msg) {
        const n = document.createElement('div');
        n.className = 'notification';
        n.textContent = msg;
        document.body.appendChild(n);
        setTimeout(() => n.classList.add('show'), 100);
        setTimeout(() => { 
            n.classList.remove('show'); 
            setTimeout(() => document.body.removeChild(n), 300); 
        }, 3000);
    }

    function openModal() {
        modal.style.display = 'flex';
        currentBarcode = null;
        productNameInput.value = '';
        safetyStockInput.value = '';
    }

    function closeModal() {
        modal.style.display = 'none';
        currentBarcode = null;
    }

    [closeButton, cancelButton].forEach(btn => btn.addEventListener('click', closeModal));
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.style.display === 'flex') closeModal(); });

    singleButton.addEventListener('click', openModal);

    scanButton.addEventListener('click', async () => {
        if (modal.style.display !== 'flex') return;
        const barcodeRaw = prompt("Naskenujte čárový kód:");
        if (!barcodeRaw) return;

        currentBarcode = barcodeRaw.trim();

        try {
            const res = await fetch(`http://localhost:5050/api/products/${encodeURIComponent(currentBarcode)}`);
            const data = await res.json();

            if (!data.exists) {
                showNotification("Produkt neexistuje, přidejte ho ručně");
                return;
            }

            productNameInput.value = data.productName || '';
            safetyStockInput.value = (data.safetyStock != null) ? data.safetyStock : '';
            showNotification(`Produkt nalezen: ${data.productName}`);
        } catch(err) {
            alert('Chyba při komunikaci s DB: ' + err.message);
        }
    });

    addItemButton.addEventListener('click', async () => {
        if (!currentBarcode) {
            const manualBarcode = prompt("Zadejte čárový kód:");
            if (!manualBarcode) return;
            currentBarcode = manualBarcode.trim();
        }

        const barcode = currentBarcode;
        const productName = productNameInput.value.trim();
        const safetyStockRaw = safetyStockInput.value.trim();
        const safetyStock = safetyStockRaw === '' ? undefined : Number(safetyStockRaw);

        if (!barcode || !productName) return alert("Vyplňte čárový kód a název produktu");

        try {
            const res = await fetch('http://localhost:5050/api/products', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ 
                    barcode, 
                    productName, 
                    safety_stock: safetyStock 
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Chyba serveru');
            }

            showNotification('Položka přidána!');
            productNameInput.value = '';
            safetyStockInput.value = '';
            currentBarcode = null;
        } catch(err) {
            alert('Chyba při ukládání do DB: ' + err.message);
        }
    });

    document.querySelectorAll('[data-nav]').forEach(btn => btn.addEventListener('click', () => {
        const target = btn.dataset.nav;
        if (target) window.location.href = target;
    }));

});
