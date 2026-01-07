const seed = require('./seed');
const db = require('./db');

(async () => {
    console.log('⏳ Spouštím inicializaci databáze (Tables creation)...');
    try {
        await seed();
        console.log('✅ Databáze úspěšně inicializována.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Chyba při inicializaci:', err);
        process.exit(1);
    }
})();