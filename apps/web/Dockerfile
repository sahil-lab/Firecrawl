FROM nginxinc/nginx-unprivileged:stable-alpine
COPY infra/docker/nginx-main.conf /etc/nginx/nginx.conf
COPY infra/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/web/dist/ /usr/share/nginx/html/
EXPOSE 8080
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
