# 🦆 Guía Completa: DuckDNS para Condominio API

## 📋 ¿Qué es DuckDNS?

DuckDNS es un servicio **gratuito** de DNS dinámico que te da:
- ✅ Subdominio gratis (ej: `condominio-api.duckdns.org`)
- ✅ Compatible con Let's Encrypt (SSL gratis)
- ✅ Actualización automática de IP
- ✅ Sin límites de tiempo
- ✅ Sin necesidad de tarjeta de crédito

---

## 🚀 Paso 1: Crear Cuenta en DuckDNS

### 1.1 Ir a DuckDNS
Abre tu navegador y ve a: **https://www.duckdns.org**

### 1.2 Iniciar Sesión
Haz clic en uno de estos botones para autenticarte:
- **Google** (recomendado)
- **GitHub**
- **Reddit**
- **Twitter**

> 💡 No necesitas crear cuenta, solo autorizar con tu cuenta existente.

---

## 🎯 Paso 2: Crear tu Subdominio

### 2.1 Elegir Nombre
En la página principal, verás un campo que dice **"sub domain"**.

Escribe el nombre que quieras (sin espacios, solo letras, números y guiones):
```
Ejemplos:
- condominio-api
- mi-condominio
- condominio-backend
```

### 2.2 Agregar Subdominio
1. Escribe tu nombre elegido
2. Haz clic en **"add domain"**
3. Verás tu nuevo dominio en la lista: `tu-nombre.duckdns.org`

### 2.3 Configurar IP
1. En el campo **"current ip"**, pega la **IP pública de tu EC2**
2. Haz clic en **"update ip"**

> 💡 **¿Cómo obtener la IP de EC2?**
> - Ve a AWS Console → EC2 → Instances
> - Copia la "Public IPv4 address"
> - O desde terminal: `curl ifconfig.me`

### 2.4 Guardar Token
En la parte superior de la página, verás un **token** (una cadena larga de letras y números).

**¡GUARDA ESTE TOKEN!** Lo necesitarás después.

Ejemplo de token:
```
a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

---

## ✅ Paso 3: Verificar Configuración

### 3.1 Verificar DNS
Abre una terminal y ejecuta:

```bash
# Verificar que el dominio apunta a tu IP
nslookup tu-nombre.duckdns.org

# O con dig
dig tu-nombre.duckdns.org
```

Deberías ver tu IP de EC2 en la respuesta.

### 3.2 Verificar desde Navegador
Intenta acceder (sin HTTPS todavía):
```
http://tu-nombre.duckdns.org:3000/health
```

> ⚠️ Si no funciona, espera 1-2 minutos para que el DNS se propague.

---

## 🔐 Paso 4: Configurar SSL con Let's Encrypt

### 4.1 Conectar a EC2
```bash
ssh -i tu-key.pem ubuntu@tu-ip-ec2
```

### 4.2 Ir al Directorio del Proyecto
```bash
cd condominio-server
```

### 4.3 Ejecutar Script de SSL
```bash
./setup-ssl.sh tu-nombre.duckdns.org tu-email@gmail.com
```

Ejemplo real:
```bash
./setup-ssl.sh condominio-api.duckdns.org diangogavidia@gmail.com
```

### 4.4 Esperar a que Complete
El script hará automáticamente:
1. ✅ Configurar Nginx
2. ✅ Obtener certificado SSL de Let's Encrypt
3. ✅ Configurar renovación automática
4. ✅ Iniciar todos los servicios

Verás algo como:
```
=== Condominio API - SSL Setup ===

Domain: condominio-api.duckdns.org
Email: tu-email@gmail.com

[1/6] Updating Nginx configuration...
✓ Nginx configuration updated

[2/6] Creating certbot directories...
✓ Directories created

...

=== Setup Complete! ===
Your API is now available at: https://condominio-api.duckdns.org
Swagger UI: https://condominio-api.duckdns.org/swagger
```

---

## 🧪 Paso 5: Probar tu API con HTTPS

### 5.1 Test Health Check
```bash
curl https://tu-nombre.duckdns.org/health
```

Respuesta esperada:
```json
{
  "status": "ok",
  "timestamp": "2026-01-29T21:40:00.000Z"
}
```

### 5.2 Test Swagger
Abre en tu navegador:
```
https://tu-nombre.duckdns.org/swagger
```

Deberías ver la interfaz de Swagger con el candado 🔒 verde.

### 5.3 Test desde App Móvil
Actualiza la URL base en tu app móvil:
```typescript
const API_URL = 'https://condominio-api.duckdns.org';
```

---

## 🔄 Paso 6: Configurar Auto-Update de IP (Opcional)

Si tu IP de EC2 puede cambiar, configura actualización automática:

### 6.1 Crear Script de Update
```bash
nano ~/duckdns-update.sh
```

Contenido:
```bash
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=TU-NOMBRE&token=TU-TOKEN&ip=" | curl -k -o ~/duckdns.log -K -
```

Reemplaza:
- `TU-NOMBRE` con tu subdominio (sin .duckdns.org)
- `TU-TOKEN` con el token que guardaste

### 6.2 Dar Permisos
```bash
chmod +x ~/duckdns-update.sh
```

### 6.3 Probar Script
```bash
~/duckdns-update.sh
cat ~/duckdns.log
```

Deberías ver: `OK`

### 6.4 Configurar Cron (Actualización cada 5 minutos)
```bash
crontab -e
```

Agrega esta línea al final:
```
*/5 * * * * ~/duckdns-update.sh >/dev/null 2>&1
```

---

## 📊 Resumen de URLs

Después de completar la configuración, tendrás:

| Servicio | URL |
|----------|-----|
| API Base | `https://tu-nombre.duckdns.org` |
| Health Check | `https://tu-nombre.duckdns.org/health` |
| Swagger UI | `https://tu-nombre.duckdns.org/swagger` |
| Login | `https://tu-nombre.duckdns.org/auth/login` |
| Register | `https://tu-nombre.duckdns.org/auth/register` |

---

## 🐛 Troubleshooting

### Problema: "Domain not found"
**Solución:**
1. Verifica que agregaste el dominio en DuckDNS
2. Espera 2-3 minutos para propagación DNS
3. Verifica con: `nslookup tu-nombre.duckdns.org`

### Problema: "Certificate validation failed"
**Solución:**
1. Verifica que el dominio apunta a la IP correcta
2. Asegúrate de que los puertos 80 y 443 estén abiertos en Security Group
3. Vuelve a ejecutar: `./setup-ssl.sh tu-nombre.duckdns.org tu-email@gmail.com`

### Problema: "Connection refused"
**Solución:**
```bash
# Verificar que los servicios están corriendo
docker-compose -f docker-compose.prod.yml ps

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Problema: "502 Bad Gateway"
**Solución:**
```bash
# Reiniciar API
docker-compose -f docker-compose.prod.yml restart api

# Verificar health
docker exec condominio-api curl http://localhost:3000/health
```

---

## 🎯 Checklist Final

- [ ] Cuenta creada en DuckDNS
- [ ] Subdominio creado (ej: `condominio-api.duckdns.org`)
- [ ] IP de EC2 configurada en DuckDNS
- [ ] Token guardado
- [ ] DNS verificado con `nslookup`
- [ ] Script SSL ejecutado exitosamente
- [ ] HTTPS funcionando (`curl https://tu-nombre.duckdns.org/health`)
- [ ] Swagger accesible con HTTPS
- [ ] Auto-update configurado (opcional)

---

## 💡 Tips Finales

1. **Guarda tu token de DuckDNS** en un lugar seguro
2. **Los certificados SSL se renuevan automáticamente** cada 12 horas
3. **No necesitas pagar nada** - DuckDNS es gratis para siempre
4. **Puedes crear hasta 5 subdominios** con una cuenta gratuita
5. **El dominio no expira** mientras lo uses al menos una vez cada 30 días

---

## 📞 Soporte

- **DuckDNS FAQ**: https://www.duckdns.org/faqs.jsp
- **Let's Encrypt Docs**: https://letsencrypt.org/docs/

---

**¡Listo!** Ahora tienes un dominio gratuito con HTTPS funcionando. 🎉
