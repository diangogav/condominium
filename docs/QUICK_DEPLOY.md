# 🚀 Quick Deployment Guide - EC2 con HTTPS

## Prerequisitos

1. ✅ Instancia EC2 corriendo (Ubuntu 22.04 recomendado)
2. ✅ Dominio apuntando a la IP de EC2 (registro A)
3. ✅ Security Group con puertos 80, 443, 22 abiertos

## 🎯 Deployment en 5 Pasos

### 1. Conectar a EC2

```bash
ssh -i tu-key.pem ubuntu@tu-ip-ec2
```

### 2. Instalar Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Relogin para aplicar cambios de grupo
exit
# Volver a conectar con SSH
```

### 3. Clonar Repositorio

```bash
git clone https://github.com/tu-usuario/condominio-server.git
cd condominio-server
```

### 4. Configurar Variables de Entorno

```bash
nano .env
```

Contenido:
```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key-aqui
PORT=3000
NODE_ENV=production
```

### 5. Ejecutar Script de SSL

```bash
./setup-ssl.sh api.tudominio.com tu-email@example.com
```

**¡Listo!** Tu API estará disponible en `https://api.tudominio.com`

---

## 🔧 Comandos Útiles

```bash
# Ver logs
docker-compose -f docker-compose.prod.yml logs -f

# Reiniciar servicios
docker-compose -f docker-compose.prod.yml restart

# Detener servicios
docker-compose -f docker-compose.prod.yml down

# Actualizar código
git pull
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Renovar certificado SSL (manual)
docker-compose -f docker-compose.prod.yml run --rm certbot renew
docker-compose -f docker-compose.prod.yml restart nginx
```

---

## 📊 Verificar Deployment

```bash
# Test health check
curl https://api.tudominio.com/health

# Test Swagger
curl https://api.tudominio.com/swagger

# Ver certificado SSL
openssl s_client -connect api.tudominio.com:443 -servername api.tudominio.com | grep "Verify return code"
```

---

## 🐛 Troubleshooting

### Error: "Connection refused"
```bash
# Verificar que los servicios están corriendo
docker-compose -f docker-compose.prod.yml ps

# Ver logs
docker-compose -f docker-compose.prod.yml logs nginx
docker-compose -f docker-compose.prod.yml logs api
```

### Error: "Certificate not found"
```bash
# Volver a ejecutar el script de SSL
./setup-ssl.sh api.tudominio.com tu-email@example.com
```

### Error: "502 Bad Gateway"
```bash
# Verificar que la API está respondiendo
docker exec condominio-api curl http://localhost:3000/health

# Reiniciar la API
docker-compose -f docker-compose.prod.yml restart api
```

---

## 📚 Documentación Completa

Para más detalles, ver: `docs/HTTPS_DEPLOYMENT.md`

---

## 💡 Tips

- Los certificados SSL se renuevan automáticamente cada 12 horas
- Los certificados de Let's Encrypt duran 90 días
- Usa `docker-compose logs -f` para debugging en tiempo real
- Configura un dominio antes de ejecutar el script de SSL
