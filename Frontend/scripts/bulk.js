document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal-overlay-bulk');
    const bulkButton = document.getElementById('bulk-receive-btn');
    const closeButton = document.getElementById('close-modal-bulk');
    const cancelButton = document.getElementById('cancel-btn-bulk');
    const addItemsButton = document.getElementById('add-items-btn-bulk');
    const scanButton = document.getElementById('scan-button-bulk');
    const cartContainer = document.getElementById('cart-items-bulk');

    let cart = [];

    function showNotification(msg) {
        const n = document.createElement('div');
        n.className = 'notification';
        n.textContent = msg;
        document.body.appendChild(n);
        setTimeout(() => n.classList.add('show'), 100);
        setTimeout(() => { n.classList.remove('show'); setTimeout(() => document.body.removeChild(n), 300); }, 3000);
    }

    function openModal() {
        modal.style.display = 'flex';
        cart = [];
        renderCart();
    }

    function closeModal() {
        modal.style.display = 'none';
        cart = [];
    }

    [closeButton, cancelButton].forEach(btn => btn.addEventListener('click', closeModal));
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.style.display === 'flex') closeModal(); });

    bulkButton.addEventListener('click', openModal);

    scanButton.addEventListener('click', async () => {
        if (modal.style.display !== 'flex') return;
        const barcodeRaw = prompt("Naskenujte čárový kód:");
        if (!barcodeRaw) return;
        const barcode = barcodeRaw.trim();

        try {
            const res = await fetch(`/api/products/${encodeURIComponent(barcode)}`);
            const data = await res.json();
            if (!data.exists) {
                showNotification("Produkt neexistuje, přidejte ho přes klasický příjem");
                return;
            }
            addToCart({ barcode: data.barcode, productName: data.productName, safetyStock: data.safetyStock });
            showNotification(`Produkt přidán do kosíku: ${data.productName}`);
        } catch {
            alert('Chyba při komunikaci s DB');
        }
    });

    addItemsButton.addEventListener('click', async () => {
        if (cart.length === 0) return alert("Kosík je prázdný");

        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/products/bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ items: cart.map(i => ({ barcode: i.barcode, quantity: i.quantity, safety_stock: i.safetyStock })) })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Chyba při odesílání');
            cart = [];
            renderCart();
            closeModal();
            showNotification("Dávkový příjem dokončen!");
        } catch (err) {
            alert("Chyba při komunikaci se serverem: " + err.message);
        }
    });

    function addToCart(item) {
        const existing = cart.find(c => c.barcode === item.barcode);
        if (existing) existing.quantity += 1;
        else cart.push({ ...item, quantity: 1 });
        renderCart();
    }

    function renderCart() {
        cartContainer.innerHTML = '';
        if (cart.length === 0) {
            cartContainer.innerHTML = `<div class="placeholder-content"><p>Kosík je prázdný...</p></div>`;
            return;
        }
        cart.forEach((item, idx) => {
            const el = document.createElement('div');
            el.className = 'cart-item';
            el.innerHTML = `${item.productName} (${item.barcode}) x ${item.quantity} | Safety stock: ${item.safetyStock} <button data-index="${idx}">&times;</button>`;
            cartContainer.appendChild(el);
            el.querySelector('button').addEventListener('click', () => {
                cart.splice(idx, 1);
                renderCart();
            });
        });
    }
});