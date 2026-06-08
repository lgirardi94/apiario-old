# ============================================================
# Dockerfile — Frontend "Il Mio Apiario"
# ============================================================
# Impacchetta i file statici dell'app (HTML/CSS/JS) in un piccolo
# contenitore nginx. nginx serve i file e inoltra le chiamate /api/
# al backend (vedi nginx.conf).
#
# Build:   docker build -t apiario-frontend .
# Run:     docker run -p 8080:80 apiario-frontend
# (di norma però si avvia tramite docker-compose insieme al backend)
# ============================================================

FROM nginx:alpine

# Config nginx personalizzata (serve statici + proxy verso il backend)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia tutti i file del frontend nella cartella servita da nginx
COPY . /usr/share/nginx/html

# Rimuove dalla cartella pubblica i file di infrastruttura che non
# devono essere serviti al browser (restano comunque nel repo).
RUN rm -f /usr/share/nginx/html/Dockerfile \
          /usr/share/nginx/html/nginx.conf \
          /usr/share/nginx/html/.dockerignore

# nginx ascolta sulla porta 80 dentro il contenitore
EXPOSE 80

# (nginx:alpine avvia nginx da solo; nessun CMD necessario)
