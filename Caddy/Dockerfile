FROM caddy:2-alpine

# Kopírujeme tvůj konfig na místo, kde ho Caddy automaticky hledá
COPY Caddyfile /etc/caddy/Caddyfile

# Tento řádek není technicky nutný, protože obraz už ho má, 
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]