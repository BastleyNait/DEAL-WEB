# Deal Hunter — Revolt Laptops (dashboard)

Dashboard web del [Deal Hunter](../DEAL%20HUNTER) (repo separado, backend en
Supabase + eBay). Muestra cada oferta encontrada con su link a la publicación
de eBay, imagen, precio, puntaje y un filtro para ver solo las "ofertazas".

Hecho en **Vue 3 + Vite + TypeScript**. Lee los datos por REST desde la vista
pública `deals_public` del backend — no escribe nada, es de solo lectura.

## Arquitectura

```
src/
  domain/types.ts                  Deal + interfaz DealsRepository (el "puerto").
  infrastructure/
    SupabaseDealsRepository.ts     Única implementación concreta hoy. Si el
                                    backend cambiara de Supabase a otra cosa,
                                    esta es la única pieza que se reescribe.
  composables/useDeals.ts          Estado + lógica de filtrado/orden/autorefresh,
                                    recibe el repositorio por parámetro (no
                                    importa Supabase directo) — así se puede
                                    testear con un repositorio fake.
  components/
    StatsBar.vue      Totales (ofertas, ofertazas, precio promedio).
    FilterBar.vue      Checkbox "solo ofertazas" + selector de orden.
    DealCard.vue        Una tarjeta = una publicación (link a eBay incluido).
    DealGrid.vue        Grilla de tarjetas + estado vacío.
  App.vue               Composition root: arma SupabaseDealsRepository con las
                         env vars y se lo pasa a useDeals().
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

El **anon key** es seguro de usar acá: solo tiene permiso de lectura sobre la
vista `deals_public`, que ya filtra qué se expone (ver el backend).

## 3. Correr en desarrollo

```bash
npm run dev
```

## 4. Build y deploy

```bash
npm run build
```

Genera `dist/` (estático, sin servidor). Opciones para publicarlo:

- **Netlify / Vercel**: conectá el repo, build command `npm run build`,
  output `dist`, y cargá las mismas env vars del `.env` en su dashboard.
- **Supabase Storage**: creá un bucket público y subí el contenido de `dist/`.
- **GitHub Pages**: subí `dist/` a la rama `gh-pages` (con
  [gh-pages](https://www.npmjs.com/package/gh-pages) o una GitHub Action).

Se autorefresca cada 60s.
