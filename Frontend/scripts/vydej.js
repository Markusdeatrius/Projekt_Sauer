const modal = document.getElementById('modal-overlay-vydej');
const addButton = document.getElementById('vydat-produkt');
const closeButton = document.getElementById('close-modal-vydej');
const cancelButton = document.getElementById('cancel-btn-vydej');
const scanButton = document.getElementById('scan-button-vydej');
const issueItemButton = document.getElementById('issue-item-btn');
const backButton = document.getElementById('back');

const itemsContainer = document.getElementById('issued-items-list');

let issueList = []; // [{ barcode, productName, quantity }]

// ---------- Otevření a zavření modalu ----------
addButton.addEventListener('click', () => {
    modal.style.display = 'flex';
    renderIssueList();
});

[closeButton, cancelButton].forEach(btn => btn.addEventListener('click', () => {
    modal.style.display = 'none';
}));

modal.addEventListener('click', e => {
    if (e.target === modal) modal.style.display = 'none';
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.style.display === 'flex') modal.style.display = 'none';
});

// ---------- tlačítko Zpět ----------
backButton.addEventListener('click', () => {
    const target = backButton.dataset.nav;
    if (target) window.location.href = target;
});

// ---------- funkce pro vykreslení seznamu ----------
function renderIssueList() {
    itemsContainer.innerHTML = '';
    if (issueList.length === 0) {
        itemsContainer.innerHTML = `<div class="placeholder-content"><p>Zde se budou zobrazovat vydané položky...</p></div>`;
        return;
    }

    const listEl = document.createElement('div');
    listEl.className = 'issue-list';

    issueList.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'issue-item';
        el.innerHTML = `
            <span>${item.productName} (ks: ${item.quantity})</span>
            <button class="remove-item-btn" data-index="${index}">&times;</button>
        `;
        listEl.appendChild(el);
    });

    itemsContainer.appendChild(listEl);

    // Přidání listeneru na odebrání jednotlivých položek
    listEl.querySelectorAll('.remove-item-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.index, 10);
            issueList.splice(idx, 1);
            renderIssueList();
        });
    });
}

// ---------- skenování a přidání do seznamu ----------
scanButton.addEventListener('click', async () => {
    const barcodeRaw = prompt('Naskenujte čárový kód:');
    if (!barcodeRaw) return;

    const barcode = barcodeRaw.trim();

    try {
        const res = await fetch(`http://localhost:3000/api/products/${encodeURIComponent(barcode)}`);
        const data = await res.json();

        if (!data.exists) {
            showNotification('Produkt neexistuje!');
            return;
        }

        if (data.productIn <= 0) {
            showNotification('Produkt není skladem!');
            return;
        }

        // Pokud je skladem, přidat do seznamu (zvýšit počet pokud už tam je)
        const idx = issueList.findIndex(i => i.barcode === barcode);
        if (idx !== -1) {
            issueList[idx].quantity += 1;
        } else {
            issueList.push({
                barcode,
                productName: data.productName,
                quantity: 1
            });
        }

        renderIssueList();
        showNotification(`Přidáno do seznamu: ${data.productName}`);

    } catch (err) {
        console.error(err);
        showNotification('Chyba při komunikaci s API');
    }
});

issueItemButton.addEventListener('click', async () => {
    if (issueList.length === 0) {
        showNotification('Seznam je prázdný!');
        return;
    }

    if (!confirm('Opravdu vydat všechny položky?')) return;

    const token = localStorage.getItem('token');
    if (!token) {
        alert('Nejste přihlášen');
        return;
    }

    try {
        const payload = { items: issueList.map(i => ({ barcode: i.barcode, quantity: i.quantity })) };
        const res = await fetch('http://localhost:3000/api/out/issue', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        if (!res.ok) {
            showNotification('Chyba: ' + (result.error || JSON.stringify(result)));
            return;
        }

        showNotification('Výdej dokončen!');
        issueList = [];
        renderIssueList();
        modal.style.display = 'none';

    } catch (err) {
        console.error(err);
        showNotification('Chyba při komunikaci s API');
    }
});


// ---------- Notifikace ----------
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
