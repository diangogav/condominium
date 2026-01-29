# Configuración de Base de Datos en Supabase

## Pasos para Configurar la Base de Datos

### 1. Accede a tu Proyecto Supabase

Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard) y selecciona tu proyecto.

### 2. Ejecuta el Script SQL

1. En el panel izquierdo, haz clic en **SQL Editor**
2. Crea una nueva query
3. Copia y pega el contenido completo de [`database/schema.sql`](file:///home/diango/code/condominio-server/database/schema.sql)
4. Haz clic en **Run** (o presiona `Ctrl+Enter`)

### 3. Verifica la Creación

Ejecuta estas queries para verificar:

```sql
-- Ver todas las tablas creadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Ver edificios de ejemplo
SELECT * FROM public.buildings;

-- Verificar que RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### 4. Crea el Bucket de Storage (Alternativa Manual)

Si el script no creó el bucket automáticamente:

1. Ve a **Storage** en el panel izquierdo
2. Haz clic en **New bucket**
3. Nombre: `payment-proofs`
4. **Public bucket**: ✅ Activado
5. Haz clic en **Create bucket**

### 5. Obtén tus Credenciales

1. Ve a **Settings** > **API**
2. Copia:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
3. Pégalas en tu archivo `.env`

## Estructura de Tablas Creadas

### `buildings`
- Edificios disponibles para registro
- 3 edificios de ejemplo pre-insertados

### `profiles`
- Perfiles de usuarios (extiende `auth.users`)
- Vinculado con `buildings`
- RLS habilitado (cada usuario solo ve su perfil)

### `payments`
- Historial de pagos
- Vinculado con `profiles`
- RLS habilitado (cada usuario solo ve sus pagos)
- Índices para optimizar queries

### Storage: `payment-proofs`
- Bucket público para comprobantes de pago
- Políticas configuradas para upload autenticado y lectura pública

## Datos de Prueba (Opcional)

Si quieres agregar un usuario de prueba con pagos:

```sql
-- Primero registra un usuario desde la app o desde Supabase Auth
-- Luego inserta pagos de ejemplo (reemplaza el UUID con el ID real del usuario)

INSERT INTO public.payments (user_id, amount, payment_date, method, status, period)
VALUES 
    ('tu-user-id-aqui', 50.00, '2024-01-05', 'PAGO_MOVIL', 'APPROVED', '2024-01'),
    ('tu-user-id-aqui', 50.00, '2024-02-03', 'TRANSFER', 'APPROVED', '2024-02'),
    ('tu-user-id-aqui', 50.00, '2024-03-10', 'PAGO_MOVIL', 'PENDING', '2024-03');
```

## Troubleshooting

### Error: "relation does not exist"
- Asegúrate de haber ejecutado el script completo
- Verifica que estás en el schema `public`

### Error: "permission denied"
- Verifica que las políticas RLS se crearon correctamente
- Asegúrate de estar autenticado con un token válido

### Bucket no aparece
- Crea el bucket manualmente desde el Dashboard
- Verifica que el nombre sea exactamente `payment-proofs`
