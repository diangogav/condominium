# HTTPS Deployment en EC2

## 🔐 Opciones para HTTPS

### Opción 1: Nginx + Let's Encrypt (Recomendado)
**Ventajas**: Gratis, automático, fácil renovación  
**Desventajas**: Requiere dominio propio

### Opción 2: AWS Application Load Balancer (ALB)
**Ventajas**: Managed por AWS, escalable  
**Desventajas**: Costo adicional (~$16/mes)

### Opción 3: Cloudflare (Proxy)
**Ventajas**: Gratis, CDN incluido, DDoS protection  
**Desventajas**: Requiere cambiar nameservers

---

## 🚀 Opción 1: Nginx + Let's Encrypt (Paso a Paso)

### Prerequisitos

1. **Dominio propio** apuntando a tu IP de EC2:
   ```
   A Record: api.tudominio.com -> [IP de EC2]
   ```

2. **Security Group de EC2** con puertos abiertos:
   - Puerto 80 (HTTP)
   - Puerto 443 (HTTPS)
   - Puerto 22 (SSH)

---

## 📋 Pasos de Instalación

### 1. Conectar a EC2

```bash
ssh -i tu-key.pem ubuntu@tu-ip-ec2
```

### 2. Instalar Docker y Docker Compose

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Agregar usuario al grupo docker
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar instalación
docker --version
docker-compose --version
```

### 3. Clonar tu Repositorio

```bash
git clone https://github.com/tu-usuario/condominio-server.git
cd condominio-server
```

### 4. Configurar Variables de Entorno

```bash
# Crear archivo .env
nano .env
```

Contenido del `.env`:
```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key
PORT=3000
NODE_ENV=production
```

### 5. Crear Configuración de Nginx

```bash
mkdir -p nginx
nano nginx/nginx.conf
```

Contenido de `nginx/nginx.conf`:
```nginx
events {
    worker_connections 1024;
}

http {
    upstream api {
        server api:3000;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name api.tudominio.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name api.tudominio.com;

        # SSL Configuration
        ssl_certificate /etc/letsencrypt/live/api.tudominio.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/api.tudominio.com/privkey.pem;
        
        # SSL Security Settings
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Proxy to API
        location / {
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

### 6. Actualizar docker-compose.yml

```bash
nano docker-compose.yml
```

Contenido actualizado:
```yaml
version: '3.8'

services:
  api:
    build: .
    container_name: condominio-api
    restart: unless-stopped
    env_file:
      - .env
    environment:
      - NODE_ENV=production
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "bun", "run", "-e", "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    container_name: condominio-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - api
    networks:
      - app-network

  certbot:
    image: certbot/certbot
    container_name: condominio-certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

networks:
  app-network:
    driver: bridge
```

### 7. Obtener Certificado SSL (Primera Vez)

Primero, crea una versión temporal de nginx.conf sin SSL:

```bash
nano nginx/nginx-init.conf
```

```nginx
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name api.tudominio.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 200 'OK';
            add_header Content-Type text/plain;
        }
    }
}
```

Ejecuta:

```bash
# Usar configuración temporal
cp nginx/nginx-init.conf nginx/nginx.conf

# Iniciar solo nginx
docker-compose up -d nginx

# Obtener certificado
docker-compose run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email tu-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d api.tudominio.com

# Restaurar configuración completa
cp nginx/nginx.conf.backup nginx/nginx.conf

# Reiniciar servicios
docker-compose down
docker-compose up -d
```

### 8. Verificar Deployment

```bash
# Ver logs
docker-compose logs -f

# Verificar que todo esté corriendo
docker-compose ps

# Probar HTTPS
curl https://api.tudominio.com/health
```

---

## 🔄 Renovación Automática de Certificados

El contenedor `certbot` se encarga de renovar automáticamente los certificados cada 12 horas. Los certificados de Let's Encrypt duran 90 días.

Para forzar una renovación manual:

```bash
docker-compose run --rm certbot renew
docker-compose restart nginx
```

---

## 🛡️ Security Group de EC2

Asegúrate de tener estas reglas en tu Security Group:

| Tipo | Protocolo | Puerto | Origen |
|------|-----------|--------|--------|
| HTTP | TCP | 80 | 0.0.0.0/0 |
| HTTPS | TCP | 443 | 0.0.0.0/0 |
| SSH | TCP | 22 | Tu IP |

---

## 🧪 Testing

```bash
# Test HTTP redirect
curl -I http://api.tudominio.com

# Test HTTPS
curl https://api.tudominio.com/health

# Test SSL certificate
openssl s_client -connect api.tudominio.com:443 -servername api.tudominio.com
```

---

## 📊 Monitoreo

```bash
# Ver logs en tiempo real
docker-compose logs -f api

# Ver uso de recursos
docker stats

# Verificar certificados
docker-compose run --rm certbot certificates
```

---

## 🔧 Troubleshooting

### Error: "Certificate not found"
```bash
# Verificar que el certificado existe
ls -la certbot/conf/live/api.tudominio.com/

# Si no existe, volver a ejecutar certbot
docker-compose run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email tu-email@example.com \
  --agree-tos \
  -d api.tudominio.com
```

### Error: "Connection refused"
```bash
# Verificar que nginx está corriendo
docker-compose ps

# Verificar logs de nginx
docker-compose logs nginx

# Verificar que el puerto 443 está abierto
sudo netstat -tlnp | grep 443
```

### Error: "502 Bad Gateway"
```bash
# Verificar que la API está corriendo
docker-compose ps api

# Verificar logs de la API
docker-compose logs api

# Verificar health check
docker exec condominio-api curl http://localhost:3000/health
```

---

## 🚀 Comandos Útiles

```bash
# Iniciar servicios
docker-compose up -d

# Detener servicios
docker-compose down

# Reiniciar servicios
docker-compose restart

# Ver logs
docker-compose logs -f

# Actualizar código
git pull
docker-compose build
docker-compose up -d

# Backup de certificados
tar -czf certbot-backup.tar.gz certbot/

# Limpiar todo
docker-compose down -v
```

---

## 💰 Costos Estimados

- **EC2 t2.micro**: ~$8-10/mes (Free tier: 12 meses gratis)
- **Let's Encrypt**: Gratis
- **Dominio**: ~$10-15/año
- **Total**: ~$10/mes después del free tier

---

## 🎯 Próximos Pasos

1. Configurar dominio apuntando a EC2
2. Instalar Docker en EC2
3. Clonar repositorio
4. Configurar nginx
5. Obtener certificado SSL
6. Iniciar servicios
7. Verificar HTTPS funcionando
