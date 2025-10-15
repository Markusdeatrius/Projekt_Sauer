const itemsContainer = document.getElementById('warehouse-items');

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
