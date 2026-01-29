# Guía de Migraciones con Supabase CLI

## 📦 Configuración Completada

El proyecto ya está configurado con Supabase CLI como dependencia de desarrollo.

## 🚀 Comandos Disponibles

### Gestión de Migraciones

```bash
# Crear una nueva migración
bun run db:migration:new nombre_de_la_migracion

# Aplicar migraciones pendientes a tu proyecto remoto
bun run db:migration:up

# Ver estado de Supabase local (si lo usas)
bun run db:status

# Resetear base de datos local (si usas Supabase local)
bun run db:reset

# Generar diff de cambios (comparar local vs remoto)
bun run db:diff nombre_archivo
```

### Desarrollo Local (Opcional)

```bash
# Iniciar Supabase local con Docker
bun run db:start

# Detener Supabase local
bun run db:stop
```

## 📁 Estructura de Migraciones

```
supabase/
├── config.toml                           # Configuración de Supabase
├── seed.sql                              # Datos de seed (opcional)
└── migrations/
    ├── 20260129185929_initial_schema.sql # Tablas, RLS, Storage
    └── 20260129185956_seed_buildings.sql # Datos iniciales
```

## 🔄 Workflow de Migraciones

### 1. Aplicar Migraciones a tu Proyecto Remoto

**IMPORTANTE**: Antes de aplicar, necesitas vincular tu proyecto:

```bash
# Opción A: Vincular con project-ref
npx supabase link --project-ref tu-project-ref

# Opción B: Usar directamente la URL de conexión
bun run db:migration:up --db-url "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

Encuentra tu `project-ref` en la URL del dashboard: `https://supabase.com/dashboard/project/[project-ref]`

### 2. Crear Nuevas Migraciones

Cuando necesites hacer cambios en la BD:

```bash
# 1. Crear archivo de migración
bun run db:migration:new add_user_preferences

# 2. Editar el archivo generado en supabase/migrations/
# 3. Aplicar
bun run db:migration:up
```

### 3. Generar Migraciones desde Cambios Existentes

Si hiciste cambios en el dashboard y quieres capturarlos:

```bash
bun run db:diff mi_nueva_migracion
```

## ✅ Migraciones Actuales

### `20260129185929_initial_schema.sql`
- ✅ Tabla `buildings`
- ✅ Tabla `profiles` con RLS
- ✅ Tabla `payments` con RLS
- ✅ Storage bucket `payment-proofs`
- ✅ Triggers para `updated_at`
- ✅ Permisos y políticas

### `20260129185956_seed_buildings.sql`
- ✅ 3 edificios de ejemplo

## 🎯 Aplicar Migraciones AHORA

### Método Recomendado: Via Dashboard

1. Ve a tu proyecto en Supabase Dashboard
2. SQL Editor
3. Copia el contenido de `supabase/migrations/20260129185929_initial_schema.sql`
4. Ejecuta
5. Copia el contenido de `supabase/migrations/20260129185956_seed_buildings.sql`
6. Ejecuta

### Método Alternativo: Via CLI

```bash
# Primero, vincula tu proyecto (solo una vez)
npx supabase link --project-ref TU_PROJECT_REF

# Luego aplica las migraciones
bun run db:migration:up
```

## 📝 Buenas Prácticas

1. **Nunca edites migraciones ya aplicadas** - Crea una nueva migración para cambios
2. **Usa nombres descriptivos** - `add_payment_status_column` mejor que `update1`
3. **Una migración = un cambio lógico** - No mezcles features no relacionados
4. **Incluye rollback cuando sea posible** - Aunque Supabase no lo hace automático
5. **Prueba en local primero** - Si usas `supabase start`

## 🔍 Troubleshooting

### Error: "relation already exists"
Las migraciones usan `IF NOT EXISTS`, pero si ya ejecutaste el schema manualmente, puedes:
- Ignorar el error (las migraciones son idempotentes)
- O resetear la BD y aplicar migraciones desde cero

### Error: "permission denied"
Asegúrate de tener los permisos correctos en tu proyecto Supabase.

### ¿Cómo sé qué migraciones se han aplicado?
Supabase mantiene un registro en la tabla `supabase_migrations.schema_migrations`.

```sql
SELECT * FROM supabase_migrations.schema_migrations;
```
