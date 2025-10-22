
const modal = document.getElementById('modal-overlay');
const addButton = document.getElementById('pridat-produkt');
const closeButton = document.getElementById('close-modal');
const cancelButton = document.getElementById('cancel-btn');
const addItemButton = document.getElementById('add-item-btn');
const productNameInput = document.getElementById('product-name');
const barcodeInput = document.getElementById('barcode-input');
const itemsContainer = document.getElementById('prijem-polozky');

let currentBarcode = null;

// ----- Otevření modalu -----
addButton.addEventListener('click', () => {
    modal.style.display = 'flex';
    barcodeInput.value = '';
    productNameInput.value = '';
    currentBarcode = null;
    barcodeInput.focus();
});

// ----- Zavření modalu -----
function closeModal() {
    modal.style.display = 'none';
    barcodeInput.value = '';
    productNameInput.value = '';
    currentBarcode = null;
}
closeButton.addEventListener('click', closeModal);
cancelButton.addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.style.display === 'flex') closeModal(); });

// ----- Skenování barcode -----
document.getElementById('scan-button').addEventListener('click', async () => {
    const barcodeRaw = prompt("Naskenujte čárový kód:");
    if (!barcodeRaw) return;

    currentBarcode = barcodeRaw.trim();
    barcodeInput.value = currentBarcode;

    try {
        const res = await fetch(`http://localhost:3000/api/products/${encodeURIComponent(currentBarcode)}`);
        const data = await res.json();

        productNameInput.value = data.exists ? data.productName || '' : '';
        showNotification(data.exists ? `Produkt nalezen: ${data.productName}` : 'Nový produkt — zadejte název a potvrďte');

    } catch (err) {
        console.error(err);
        alert('Chyba při komunikaci s databází');
    }
});

// ----- Načtení produktů ze skladu -----
async function loadWarehouse() {
    try {
        const res = await fetch('http://localhost:3000/api/warehouse');
        const products = await res.json();

        itemsContainer.innerHTML = ''; // smažeme placeholder, ale nic víc nesmažeme

        products.forEach(p => {
            const now = new Date();
            const dateTime = now.toLocaleString('cs-CZ');

            const itemElement = document.createElement('div');
            itemElement.className = 'item-card';
            itemElement.dataset.barcode = p.barcode;
            itemElement.innerHTML = `
                <div class="item-header">
                    <h3>${p.productName}</h3>
                </div>
                <div class="item-details">
                    <p><strong>Barcode:</strong> ${p.barcode}</p>
                    <p><strong>Na skladě:</strong> ${p.product_in} kusů</p>
                    <p><strong>Datum a čas:</strong> ${dateTime}</p>
                </div>
            `;
            itemsContainer.appendChild(itemElement);
        });

        if (products.length === 0) {
            itemsContainer.innerHTML = `
                <div class="placeholder-content">
                    <p>Zde se budou zobrazovat přidané položky...</p>
                </div>
            `;
        }

    } catch (err) {
        console.error('Chyba při načítání skladu:', err);
    }
}
document.addEventListener('DOMContentLoaded', loadWarehouse);

addItemButton.addEventListener('click', async () => {
    const productName = productNameInput.value.trim();
    const barcode = currentBarcode || barcodeInput.value.trim();
    const token = localStorage.getItem('token');

    if (!barcode || !productName) {
        alert('Prosím vyplňte čárový kód i název produktu');
        return;
    }

    if (!token) {
        alert('Nejste přihlášen');
        return;
    }

    try {
        const res = await fetch('http://localhost:3000/api/products', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ barcode, productName })
        });

        const data = await res.json();
        if (!res.ok) {
            alert(data.error || 'Chyba při ukládání produktu');
            return;
        }

        loadWarehouse(); // znovu načteme sklad
        closeModal();
        showNotification('Položka byla úspěšně přidána!');

    } catch (err) {
        console.error(err);
        alert('Chyba při ukládání produktu');
    }
});


// ----- Notifikace -----
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

// ----- Navigace přes data-nav -----
document.querySelectorAll('[data-nav]').forEach(button => {
    button.addEventListener('click', () => {
        const target = button.dataset.nav;
        if (target) window.location.href = target;
    });
});
