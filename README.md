# Projekt Sauer

Dokumentace pro vývoj, nasazení a konfiguraci projektu **Sauer**. Aplikace se skládá z Node.js backendu, frontendové části a využívá Docker pro kontejnerizaci.

---

## Požadavky

Před spuštěním se ujistěte, že máte nainstalované následující nástroje:

* **Node.js** (pro lokální vývoj backendu i frontendu)
* **Docker** a **Docker Compose**
* **Porty:**
* *Interní:* 3000, 5050, 8081
* *Externí:* 80/443 (Caddy Proxy), 9443 (Portainer)



---

## Konfigurace (.env)

Projekt vyžaduje soubor `.env` v kořenovém adresáři (nebo nastavení proměnných v Portaineru).

### Aplikační nastavení

| Proměnná | Popis | Příklad |
| --- | --- | --- |
| `PORT` | Port backendu | `5050` |
| `JWT_SECRET_KEY` | **(Povinné)** Tajný klíč pro JWT tokeny | `super_tajny_klic` |
| `TOKEN_HEADER_KEY` | Název HTTP hlavičky pro token | `x-access-token` |

### Databáze (Připojení aplikace)

Tyto proměnné využívá backend pro připojení k DB.
| Proměnná | Popis | Příklad |
| :--- | :--- | :--- |
| `DB_HOST` | Host databáze | `sauer_db` (v Dockeru) |
| `DB_USER` | Uživatelské jméno pro DB | `app_user` |
| `DB_PASSWORD` | **(Povinné)** Heslo uživatele | `tajne_heslo` |
| `DB_NAME` | Název databáze | `sauer_db` |

### MySQL Kontejner (Inicializace)

Tyto proměnné slouží pouze pro prvotní vytvoření MySQL kontejneru.
| Proměnná | Popis |
| :--- | :--- |
| `MYSQL_ROOT_PASSWORD` | **(Povinné)** Root heslo pro MySQL |
| `MYSQL_DATABASE` | Název DB, kterou MySQL vytvoří |
| `MYSQL_USER` | Uživatelské jméno pro MySQL |
| `MYSQL_PASSWORD` | Heslo pro uživatele MySQL |

### SMTP a E-maily (Volitelné)

Pokud není vyplněno, odesílání e-mailů nebude fungovat.
| Proměnná | Popis |
| :--- | :--- |
| `SMTP_HOST` | Adresa SMTP serveru |
| `SMTP_PORT` | Port SMTP serveru (např. 587) |
| `SMTP_SECURE` | Použít TLS (`true`/`false`) |
| `MAILERSEND_FROM` | Odesílatelská adresa |
| `MAILERSEND_API_KEY` | API klíč pro MailerSend |
| `NOTIFY_EMAIL` | E-mail pro zasílání notifikací |

---

## Nasazení přes Docker (Produkce)

Docker Compose automaticky zajistí síťování, volumes a závislosti.

1. **Příprava:** Ujistěte se, že existuje soubor `.env`.
2. **Spuštění:**
```bash
docker-compose up --build -d

```


* Stack běží na pozadí (`-d`).
* Reverzní proxy **Caddy** automaticky směruje provoz:
* `/api/*` ➝ `sauer_backend:5050`
* `/*` ➝ `sauer_frontend:8081`




3. **Přístup k aplikaci:**
* Web: `http://localhost/` (nebo IP serveru)
* Portainer (pokud je zapnut): `https://<IP_serveru>:9443`



### Aktualizace aplikace

Pro stažení změn z Gitu a přebudování kontejnerů (data ve volumes zůstanou zachována):

```bash
git pull
docker-compose up -d --build

```

---

## 🛠 Lokální vývoj (Bez Dockeru)

Pokud chcete vyvíjet bez kontejnerů přímo na hostitelském stroji.

### 1. Backend

Backend bude naslouchat na portu **5050**.

```bash
cd backend/
npm install
npm run start

```

### 2. Frontend

Frontend bude naslouchat na portu **8081**.

```bash
cd Frontend/
npm install
npm run dev

```

> **Poznámka:** Při lokálním vývoji bez Caddy musíte přistupovat k frontendu na portu 8081 a backendu na 5050 napřímo.

---

## Technické poznámky a architektura

* **Databáze:** Port `3306` (MySQL) **není** vystaven do internetu. Je přístupný pouze uvnitř Docker sítě pro backend.
* **Routing (Caddy):**
* Caddy slouží jako vstupní bod (Gateway).
* Směruje frontend a backend interně.
* TLS není pro interní komunikaci vyžadováno.


* **Zálohy a Data:** Docker volumes zajišťují, že data databáze přežijí restart nebo smazání kontejneru.
* **Logs:** Pokud spustíte `docker-compose up` bez přepínače `-d`, uvidíte logy v terminálu v reálném čase.
