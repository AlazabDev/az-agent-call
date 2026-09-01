# Nginx configuration for daftra.alazab.com
# Managed by Alazab Infrastructure & Certbot Automated SSL

server {
    listen 80;
    listen [::]:80;
    server_name daftra.alazab.com;

    client_max_body_size 10m;

    # Security Headers
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy no-referrer always;
    add_header X-Frame-Options DENY always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Root redirect to Admin Console
    location = / {
        return 302 /admin/;
    }

    # Admin Control Panel (React/Vite Dashboard)
    location /admin/ {
        proxy_pass http://127.0.0.1:3400;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    # Admin REST API
    location /api/ {
        proxy_pass http://127.0.0.1:3400;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    # Alazab Central MCP Protocol (Telephony, Daftra & Templates)
    location ~ ^/(call|mail) {
        proxy_pass http://127.0.0.1:3400;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # Public Health Endpoint
    location = /healthz {
        proxy_pass http://127.0.0.1:3400;
    }

    # Internal Local Readiness Check
    location = /readyz {
        allow 127.0.0.1;
        allow ::1;
        deny all;
        proxy_pass http://127.0.0.1:3400;
    }
}
