FROM nginx:alpine

RUN apk add --no-cache openssl

# Replace default config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]