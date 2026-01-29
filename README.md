# Condominio API Server

Backend API para la aplicación móvil "Condominio" construido con **Bun**, **ElysiaJS** y **Supabase**.

## 🏗️ Arquitectura

Este proyecto sigue **Clean Architecture** con separación clara de capas:

```
src/
├── core/               # Configuración, Logger, Errores compartidos
├── infrastructure/     # Supabase Client, Storage Service
└── modules/            # Módulos de negocio
    ├── auth/
    │   ├── domain/     # Entidades, Interfaces, Use Cases
    │   ├── data/       # Implementación de Repositorios
    │   └── presentation/ # Rutas y Controladores
    ├── users/
    ├── buildings/
    ├── payments/
    └── dashboard/
```

## 🚀 Inicio Rápido

### Requisitos Previos

- **Bun** v1.0+ instalado ([Instalar Bun](https://bun.sh))
- Cuenta de **Supabase** con proyecto creado

### Configuración

1. **Clonar el repositorio**
   ```bash
   git clone <repo-url>
   cd condominio-server
   ```

2. **Instalar dependencias**
   ```bash
   bun install
   ```

3. **Configurar variables de entorno**
   
   Crea un archivo `.env` en la raíz del proyecto:
   ```env
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_ANON_KEY=tu_anon_key_aqui
   PORT=3000
   NODE_ENV=development
   ```

4. **Ejecutar en modo desarrollo**
   ```bash
   bun dev
   ```

   El servidor estará disponible en `http://localhost:3000`

5. **Documentación Swagger**
   
   Visita `http://localhost:3000/swagger` para ver la documentación interactiva de la API.

## 🐳 Docker

### Desarrollo Local con Docker

```bash
docker-compose up -d --build
```

### Producción

```bash
# Construir imagen
docker build -t condominio-api .

# Ejecutar contenedor
docker run -d -p 3000:3000 \
  -e SUPABASE_URL=tu_url \
  -e SUPABASE_ANON_KEY=tu_key \
  condominio-api
```

## 📡 API Endpoints

### Autenticación (`/auth`)

- `POST /auth/register` - Registrar nuevo residente
- `POST /auth/login` - Iniciar sesión

### Usuarios (`/users`)

- `GET /users/me` - Obtener perfil del usuario actual 🔒
- `PATCH /users/me` - Actualizar perfil 🔒

### Edificios (`/buildings`)

- `GET /buildings` - Listar edificios disponibles
- `GET /buildings/:id` - Obtener edificio por ID

### Pagos (`/payments`)

- `GET /payments` - Historial de pagos del usuario 🔒
  - Query param: `?year=2024` (opcional)
- `GET /payments/:id` - Detalle de un pago 🔒
- `POST /payments` - Reportar nuevo pago 🔒
  - Content-Type: `multipart/form-data`
  - Campos: `amount`, `date`, `method`, `reference`, `bank`, `proof_image` (File), `period`

### Dashboard (`/dashboard`)

- `GET /dashboard/summary` - Resumen con estado de solvencia 🔒

🔒 = Requiere autenticación (Header: `Authorization: Bearer <token>`)

## 🧪 Testing

```bash
# Ejecutar todos los tests
bun test

# Tests en modo watch
bun test --watch
```

## 🗄️ Base de Datos (Supabase)

### Tablas Requeridas

#### `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  unit TEXT,
  building_id UUID REFERENCES buildings(id),
  role TEXT DEFAULT 'resident',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `buildings`
```sql
CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `payments`
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL,
  method TEXT NOT NULL,
  reference TEXT,
  bank TEXT,
  proof_url TEXT,
  status TEXT DEFAULT 'PENDING',
  period TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Storage Bucket

Crear un bucket público llamado `payment-proofs` en Supabase Storage para almacenar los comprobantes de pago.

## 📝 Características Principales

### ✅ Logging y Trazabilidad

- Cada request tiene un `X-Request-ID` único
- Logs estructurados con **Pino**
- Trazabilidad completa de errores

### ✅ Manejo de Errores

- Errores de dominio mapeados a códigos HTTP
- Validación automática con **TypeBox**
- Respuestas de error consistentes

### ✅ Autenticación JWT

- Integración con Supabase Auth
- Middleware de protección de rutas
- Validación de tokens en cada request protegido

### ✅ Subida de Archivos

- Soporte para `multipart/form-data`
- Almacenamiento en Supabase Storage
- URLs públicas para comprobantes

### ✅ Lógica de Solvencia

- Cálculo automático de estado (SOLVENT/PENDING/OVERDUE)
- Período de gracia de 5 días
- Tracking de períodos pendientes

## 🛠️ Scripts Disponibles

```bash
bun dev      # Modo desarrollo con hot-reload
bun start    # Modo producción
bun test     # Ejecutar tests
```

## 📦 Dependencias Principales

- **elysia** - Framework web ultrarrápido
- **@supabase/supabase-js** - Cliente de Supabase
- **pino** - Logger de alto rendimiento
- **@elysiajs/swagger** - Documentación automática

## 🔐 Seguridad

- Variables de entorno para credenciales
- JWT para autenticación
- Validación de ownership en endpoints de pagos
- CORS configurado (si es necesario)

## 📄 Licencia

Privado - Uso interno del proyecto Condominio
