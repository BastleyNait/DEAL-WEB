# Deal Hunter — Revolt Laptops (dashboard)

Dashboard web del [Deal Hunter](../DEAL%20HUNTER) (repo separado, backend en
Supabase + eBay). Muestra cada oferta encontrada con su link a la publicación
de eBay, imagen, precio, puntaje y un filtro para ver solo las "ofertazas".

Hecho en **Vue 3 + Vite + TypeScript**. Lee las ofertas de la vista pública
`deals_public` y guarda cuáles ya revisaste en `deal_views`, la única tabla
donde la clave pública puede escribir.

## Arquitectura

```
src/
  domain/
    types.ts            Deal + los puertos DealsRepository y SeenRepository.
    listing-specs.ts    Extrae RAM/almacenamiento/pantalla del título de eBay.
  infrastructure/
    SupabaseDealsRepository.ts  Lee deals_public.
    SupabaseSeenRepository.ts   Lee y escribe deal_views (visto / no visto).
  composables/
    useDeals.ts            Traer, filtrar, ordenar y autorefrescar. Recibe el
                            repositorio por parámetro (no importa Supabase
                            directo) — así se puede testear con un fake.
    useSeenDeals.ts        Estado de visto, con escritura optimista y reversión
                            si el backend rechaza.
    useDealPresentation.ts Todo lo derivado para mostrar una oferta, compartido
                            por la fila y la tarjeta para que no diverjan.
    useLayout.ts           Lista/grilla y tarjetas por fila.
    useTheme.ts            Claro/oscuro.
    useClock.ts            Un solo reloj para todas las cuentas regresivas.
  components/
    DeskHeader.vue   Identidad, contadores y estado de la última lectura.
    Toolbar.vue      Vistas, buscador, formato, orden, densidad, lista/grilla.
    DealRow.vue      Fila densa (para escanear muchas).
    DealCard.vue     Tarjeta (para comparar estado visual).
    DealList.vue     Contenedor que conmuta entre ambas + estado vacío.
  App.vue            Composition root: arma los repositorios con las env vars.
```

Nada queda hardcodeado: la URL y la key de Supabase salen de variables de
entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), no de un valor
pegado en el código.

## 1. Requisitos

- [Node.js](https://nodejs.org/) 20+ y npm.
- El backend (`deal-hunter-backend`) ya desplegado, con la migración `0002`
  aplicada (crea la vista `deals_public`).

## 2. Configurar

```bash
npm install
cp .env.example .env
```

Editá `.env` con los datos de tu proyecto (Supabase Dashboard → Project
Settings → API):

```
VITE_SUPABASE_URL=https://TU_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_PUBLIC_KEY
```

## 3. Correr en desarrollo

```bash
npm run dev
```

## 4. Desplegar en Vercel

```bash
npm run build
```

Genera `dist/`: es un sitio estático, sin servidor. Vercel detecta Vite solo
(build `npm run build`, output `dist`), así que lo único que hay que cargar a
mano son las dos variables de entorno, en **Project Settings → Environment
Variables**, con los mismos valores del `.env`:

| Variable | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://TU_PROJECT_REF.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | tu `anon public` key |

Se compilan dentro del bundle, así que hay que definirlas **antes** del primer
build; si las agregás después, hay que volver a desplegar.

Dos formas de subirlo:

- **Desde GitHub**: subí este repo a GitHub e importalo en Vercel. Cada push
  vuelve a desplegar.
- **Desde la máquina**: `npx vercel` en esta carpeta (`npx vercel --prod` para
  producción). No hace falta repo remoto.

## Qué queda expuesto al publicarlo

El dashboard no tiene login, así que cualquiera con la URL puede ver las ofertas
y marcarlas como vistas. Lo que **no** puede hacer, aunque tenga la clave del
bundle:

- Leer `seen_listings` (todo el historial, incluidos los descartados y por qué),
  `search_config` (tu criterio de búsqueda) o `hunt_runs`: no tienen ninguna
  policy para el rol anónimo, así que devuelven vacío.
- Escribir en cualquier tabla que no sea `deal_views`.
- Meter basura en `deal_views`: la foreign key solo acepta ids de ofertas que el
  cazador realmente encontró.

Si más adelante querés cerrarlo del todo, el camino es Supabase Auth: un usuario
tuyo, y cambiar las policies de `anon` a `authenticated`.

Se autorefresca cada 60s.
