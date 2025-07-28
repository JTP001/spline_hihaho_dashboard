FROM node:22 AS build
WORKDIR /hihaho-dashboard-frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm install

COPY frontend/ .

RUN npm run build

# Serve with Nginx
FROM nginx:1.25

COPY --from=build /hihaho-dashboard-frontend/build /usr/share/nginx/html
COPY nginx/templates/default.conf.template /etc/nginx/templates/default.conf.template

# Add entrypoint and env injection
COPY nginx/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]