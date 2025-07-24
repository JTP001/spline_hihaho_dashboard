FROM node:22 AS build
WORKDIR /hihaho-dashboard-frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm install

COPY frontend/ .

RUN npm run build

# Serve with Nginx
FROM nginx:1.25

COPY --from=build /hihaho-dashboard-frontend/build /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf