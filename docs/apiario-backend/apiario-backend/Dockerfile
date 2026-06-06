# =========================================================
#  Dockerfile — backend "Il Mio Apiario" (immagine di produzione)
# =========================================================
FROM node:20-alpine

WORKDIR /app

# 1) Solo i manifest prima: così il layer delle dipendenze resta in cache
#    finché non cambiano package.json / package-lock.json.
COPY package.json package-lock.json ./

# 2) Install riproducibile dal lockfile, senza devDependencies (no nodemon).
RUN npm ci --omit=dev

# 3) Il resto del codice.
COPY . .

# La porta effettiva è letta da PORT (default 3000).
EXPOSE 3000

# Avvio del server.
CMD ["npm", "start"]
