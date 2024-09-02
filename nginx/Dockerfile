FROM nginx:alpine

RUN apk add --no-cache openssl

COPY nginx.conf /etc/nginx/nginx.conf

# Create directories for SSL certificates
RUN mkdir -p /etc/ssl/certs /etc/ssl/private

# Copy your SSL certificates
# COPY /etc/letsencrypt/live/mat.matcon.in/fullchain.pem /etc/ssl/certs/fullchain.pem
# COPY /etc/letsencrypt/live/mat.matcon.in/privkey.pem /etc/ssl/private/privkey.pem

EXPOSE 80
EXPOSE 443
