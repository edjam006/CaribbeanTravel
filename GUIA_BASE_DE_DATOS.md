# Base de datos y panel de administración — paso a paso

Todo es gratuito:

| Pieza | Servicio | Plan gratis |
|---|---|---|
| Base de datos de destinos | Supabase (Postgres) | 500 MB |
| Fotos | Supabase Storage | 1 GB (las fotos se comprimen a ~150–400 KB) |
| Usuario administrador | Supabase Auth | 50.000 usuarios/mes |
| Publicar el sitio y el panel | Cloudflare Pages | Ilimitado para sitios estáticos |
| Mantener Supabase despierto | Tarea diaria del bot (Cloudflare) | Incluido |

> El plan gratis de Supabase **pausa el proyecto tras 7 días sin actividad**. El bot hace una consulta diaria (paso 9) para evitarlo. Si alguna vez se pausa, se reactiva con un clic en el panel de Supabase.

---

## 1. Crear el proyecto en Supabase
1. Entra a **supabase.com** › *Start your project* › inicia sesión con GitHub o correo.
2. **New project**: nombre `caribbean-travel`, inventa una **contraseña de base de datos** (guárdala), región **East US** o **South America (São Paulo)**, plan **Free**.
3. Espera 1–2 minutos a que termine.

## 2. Crear las tablas
1. Menú izquierdo › **SQL Editor** › **New query**.
2. Abre `supabase/01_esquema.sql` en VS Code, copia **todo** y pégalo.
3. **Run**. Debe decir *Success. No rows returned*.

Crea: `destinos`, `destino_fotos`, `salidas`, `admins`, las reglas de seguridad y el almacén de fotos `destinos`.

## 3. Cerrar el registro público
**Authentication › Sign In / Providers** (o *Settings*) › desactiva **Allow new users to sign up** › Save.
Así nadie más puede crearse una cuenta.

## 4. Crear el usuario administrador
1. **Authentication › Users › Add user › Create new user**.
2. Correo y contraseña del admin · marca **Auto Confirm User** › Create.
3. **SQL Editor › New query**: pega `supabase/02_crear_admin.sql`, cambia el correo por el del paso anterior › **Run**. Debe aparecer el correo en el resultado.

Para más admins, repite el paso 4.

## 5. Conectar el sitio
1. **Project Settings › API Keys** (o el botón **Connect** arriba).
2. Copia la **Project URL** y la **Publishable key** (`sb_publishable_…`). Si solo ves claves "legacy", usa la **anon public**.
3. Pégalas en `sitio-web/js/config.js`:
   ```js
   supabaseUrl: "https://xxxxxxxx.supabase.co",
   supabaseClave: "sb_publishable_xxxxxxxx",
   ```
   ⚠️ Nunca uses la **secret / service_role**: esa da control total.

## 6. Probar y migrar en tu computadora
1. En VS Code, clic derecho en `sitio-web/admin/index.html` › **Open with Live Server**.
2. Entra con el correo y contraseña del admin.
3. Toca **Importar destinos iniciales**: sube los 8 destinos con las fotos, precios y fechas de Panamá.
4. Abre `sitio-web/index.html` con Live Server: los destinos ahora vienen de la base de datos.

## 7. Publicar en Cloudflare Pages (gratis)
En la terminal, dentro de `chatbot-whatsapp` (ya tiene wrangler instalado):
```
npx wrangler pages deploy ../sitio-web --project-name caribbean-travel
```
- La primera vez pregunta la rama de producción: escribe `main`.
- Queda en `https://caribbean-travel.pages.dev` y el panel en `https://caribbean-travel.pages.dev/admin/`.
- Para cambios de diseño o código, vuelve a correr el mismo comando. **Los destinos no requieren publicar**: se cambian desde el panel.
- Dominio propio: Cloudflare › Workers y Pages › caribbean-travel › **Custom domains** › `caribbeantravelvacaciones.com`.

## 8. Recuperar contraseña (opcional)
**Authentication › URL Configuration**:
- **Site URL**: `https://caribbean-travel.pages.dev` (o el dominio final).
- **Redirect URLs**: agrega `https://caribbean-travel.pages.dev/admin/**` y `http://127.0.0.1:5500/**`.

El enlace "¿Olvidaste tu contraseña?" del panel envía un correo (el plan gratis permite pocos por hora).

## 9. Mantener Supabase activo
En `chatbot-whatsapp/wrangler.toml` completa:
```toml
SUPABASE_URL = "https://xxxxxxxx.supabase.co"
SUPABASE_KEY = "sb_publishable_xxxxxxxx"
```
y publica: `npm run deploy`. El bot consultará la base todos los días a las 08:17.

---

## Uso diario del panel
- **+ Nuevo destino**: nombre, país, frase, descripción, categorías, fotos (la primera es la portada), qué incluye, itinerario, precio, ruta, aerolínea, fechas de salida.
- **Publicado** apagado = borrador: no aparece en el sitio.
- **Destacado**: sus fechas aparecen en la franja azul "Salidas confirmadas" de la portada (se usa el primero destacado con fechas futuras).
- **Orden**: número menor aparece primero.
- Las fechas pasadas se ocultan solas en el sitio.

## Seguridad
La clave publishable es pública por diseño: las reglas de la base (RLS) impiden que cualquiera que no esté en la tabla `admins` lea borradores, cree, edite o borre destinos, o suba fotos. Probado: un usuario sin permisos no puede modificar nada ni volverse admin.

## Si algo falla
| Síntoma | Solución |
|---|---|
| El panel dice "Conecta la base de datos" | Falta la URL o la clave en `js/config.js`. |
| "Correo o contraseña incorrectos" | Revisa el usuario en Authentication › Users. |
| "El correo aún no está confirmado" | Crea el usuario con **Auto Confirm User**. |
| "Esta cuenta no es administradora" | Corre `02_crear_admin.sql` con ese correo. |
| "No tiene permisos…" al guardar | Igual que arriba, o vuelve a correr `01_esquema.sql`. |
| El sitio muestra los destinos viejos | La base no responde o falta config: el sitio usa `js/datos.js` como respaldo. Revisa la consola del navegador (F12). |
