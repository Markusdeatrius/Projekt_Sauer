===== Projekt Sauer =====

Požadavky:
- Node.js (nutné pro backend a frontend)
- Docker a Docker Compose
- Interní porty: 3000, 5050, 8081
- Externí porty: 80/443 (Caddy), 9443 (Portainer)

Lokální vývoj (bez Dockeru):

  Backend:
    cd backend/
    npm install
    npm run start
    (Backend naslouchá na portu 5050)

  Frontend:
    cd Frontend/
    npm install
    npm run dev
    (Frontend naslouchá na portu 8081)

Deploy přes Docker Compose:

1. Zajistit, aby .env soubor byl dostupný (lokálně nebo přes Portainer environment variables)
2. V kořenovém adresáři projektu spustit:
    docker-compose up --build -d
   - Stack poběží na pozadí
   - Backend a frontend jsou směrovány přes Caddy:
       /api/* → sauer_backend:5050
       *      → sauer_frontend:8081

3. Portainer UI (volitelné):
    https://<IP_serveru>:9443

Update aplikace:

    git pull
    docker-compose up -d --build
    (Kontejnery se překompilují a restartují, data z volumes zůstávají)

Lokální vývoj na vlastním PC (bez serveru):
- Přístup k aplikaci:
    http://localhost/
- Portainer (pokud běží) přes:
    https://localhost:9443
- Caddy směruje frontend a backend interně, TLS není potřeba
- Vše běží lokálně, nezávisle na internetu

Poznámky:
- DB port 3306 není vystaven ven; přístup pouze přes backend
- Docker Compose zajistí vše: síť, volumes, závislosti mezi kontejnery
- docker-compose up -d = spuštění na pozadí; bez -d běží logy v terminálu
