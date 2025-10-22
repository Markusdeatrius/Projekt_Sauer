const itemsContainer = document.getElementById('warehouse-items');
const searchInput = document.getElementById('search-input');

async function loadWarehouse() {
    try {
        const res = await fetch('http://localhost:3000/api/warehouse');
        const products = await res.json();

        itemsContainer.innerHTML = ''; // smažeme placeholder

        products.forEach(p => {
            const now = new Date();
            const dateTime = now.toLocaleString('cs-CZ');

            const itemElement = document.createElement('div');
            itemElement.className = 'item-card';
            itemElement.dataset.barcode = p.barcode;
            itemElement.innerHTML = `
                <div class="item-name">${p.productName}</div>
                <div class="item-barcode">Barcode: ${p.barcode}</div>
                <div class="item-stock">Na skladě: ${p.product_in} kusů</div>
                <div class="item-date">${dateTime}</div>
            `;
            itemsContainer.appendChild(itemElement);

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

// ---------- filtr ----------
searchInput.addEventListener('input', () => {
    const filter = searchInput.value.toLowerCase();
    const items = itemsContainer.querySelectorAll('.item-card');

    items.forEach(item => {
        const name = item.querySelector('.item-name').textContent.toLowerCase();
        const barcode = item.querySelector('.item-barcode').textContent.toLowerCase();

        if (name.includes(filter) || barcode.includes(filter)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
});

document.addEventListener('DOMContentLoaded', loadWarehouse);
