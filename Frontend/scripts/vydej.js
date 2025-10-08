const currentUser = localStorage.getItem('currentUser');
const modal = document.getElementById('modal-overlay-vydej');
const addButton = document.getElementById('vydat-produkt');
const closeButton = document.getElementById('close-modal-vydej');
const cancelButton = document.getElementById('cancel-btn-vydej');
const issueItemButton = document.getElementById('issue-item-btn');
const productNameInput = document.getElementById('product-name-vydej');
const itemsContainer = document.getElementById('vydej-polozky');

// Otevřít okno
addButton.addEventListener('click', () => {
    modal.style.display = 'flex';
    productNameInput.focus();
});

// Zavřít okno
[closeButton, cancelButton].forEach(btn => {
    btn.addEventListener('click', () => {
        modal.style.display = 'none';
        productNameInput.value = '';
    });
});

// Zavření kliknutím mimo modal
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
        productNameInput.value = '';
    }
});

// Skenování čárového kódu a uložení do DB
document.getElementById('scan-button-vydej').addEventListener('click', async () => {
    const barcode = prompt("Naskenujte čárový kód:");

    if (!barcode) return;

    try {
        const response = await fetch("http://localhost:3000/api/out", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ barcode })
        });

        const data = await response.json();

        if (data.error) {
            alert("❌ " + data.error);
        } else {
            productNameInput.value = data.name; // vyplní název produktu
            showNotification(`✅ ${data.name} bylo vydáno`);
        }
    } catch (err) {
        console.error(err);
        alert("Chyba při ukládání do databáze");
    }
});

// Přidání položky do seznamu (UI)
issueItemButton.addEventListener('click', () => {
    const productName = productNameInput.value.trim();

    if (!productName) {
        alert('Prosím naskenujte produkt');
        return;
    }

    const now = new Date();
    const dateTime = now.toLocaleString('cs-CZ');
    const itemId = Date.now();

    const placeholder = itemsContainer.querySelector('.placeholder-content');
    if (placeholder) {
        placeholder.remove();
    }

    const itemElement = document.createElement('div');
    itemElement.className = 'item-card';
    itemElement.style.borderLeft = '4px solid #e74c3c';
    itemElement.innerHTML = `
        <div class="item-header">
            <h3>${productName}</h3>
            <button class="delete-item" data-id="${itemId}">&times;</button>
        </div>
        <div class="item-details">
            <p><strong>Uživatel:</strong> ${currentUser}</p>
            <p><strong>Datum a čas výdeje:</strong> ${dateTime}</p>
            <p><strong>Status:</strong> <span style="color: #e74c3c; font-weight: bold;">Vydáno</span></p>
        </div>
    `;

    itemsContainer.appendChild(itemElement);

    modal.style.display = 'none';
    productNameInput.value = '';

    showNotification('Položka byla úspěšně vydána!');
});

// Smazání položky z UI
itemsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-item')) {
        const itemCard = e.target.closest('.item-card');
        itemCard.remove();

        if (itemsContainer.children.length === 0) {
            itemsContainer.innerHTML = `
                <div class="placeholder-content">
                    <p>Zde se budou zobrazovat vydané položky...</p>
                </div>
            `;
        }

        showNotification('Položka byla odstraněna');
    }
});

// 📌 Funkce pro notifikace
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Zavření ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
        modal.style.display = 'none';
        productNameInput.value = '';
    }
});

// Zpět button
document.querySelectorAll("[data-nav]").forEach(button => {
    button.addEventListener("click", () => {
        const target = button.dataset.nav;
        if (target) {
            window.location.href = target;
        }
    });
});


