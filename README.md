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
              → sauer_frontend:8081

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

Server a aplikace používají tyto environment proměnné pro konfiguraci:

Aplikační port a zabezpečení
  PORT=                        Port, na kterém běží backend (obvykle 5050)
  JWT_SECRET_KEY=              Tajný klíč pro JWT tokeny
  TOKEN_HEADER_KEY=            Název HTTP headeru pro tokeny

SMTP pro odesílání e-mailů
  SMTP_HOST                    Host SMTP serveru
  SMTP_PORT                    Port SMTP serveru (např. 587)
  SMTP_SECURE                  true/false, zda použít TLS
  MAILERSEND_FROM              Odesílatelská adresa
  MAILERSEND_API_KEY           API klíč pro MailerSend
  NOTIFY_EMAIL                 E-mail, kam se posílají notifikace

Připojení k databázi (aplikace)
  DB_HOST=                     Host databáze (např. sauer_db pro Docker)
  DB_USER=                     Uživatelské jméno pro DB
  DB_PASSWORD=                 Heslo uživatele pro DB
  DB_NAME=                     Název databáze

MySQL (pro Docker kontejner)
  MYSQL_ROOT_PASSWORD=         Root heslo MySQL
  MYSQL_DATABASE=              Název DB, kterou MySQL vytvoří
  MYSQL_USER=                  Uživatelské jméno pro MySQL
  MYSQL_PASSWORD=              Heslo pro uživatele MySQL

Poznámky:
- Hodnoty s "=" musí být vyplněny, jinak kontejner nebo aplikace spadne
- Proměnné DB_* se používají v backendu
- Proměnné MYSQL_* se používají při inicializaci MySQL kontejneru
- Proměnné SMTP_* a MAILERSEND_* jsou volitelné, pokud není potřeba odesílání e-mailů


