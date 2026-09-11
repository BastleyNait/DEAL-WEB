import DOMPurify from "dompurify";

/**
 * Las descripciones las escribe cualquier vendedor de eBay, así que renderizar
 * su HTML sin más sería una puerta de XSS: el dashboard es público y lleva la
 * clave de Supabase en el bundle. El backend ya hace una primera pasada al
 * guardar, y acá se sanea de nuevo antes de mostrar — la única capa que
 * realmente cuenta, porque es la última antes del DOM.
 *
 * La lista blanca es de formato, no de maquetación: se conserva lo que hace
 * legible un texto (párrafos, listas, negritas, tablas de specs) y se descarta
 * todo lo demás, incluidos estilos e imágenes remotas, que en estas
 * publicaciones son banners de marketing que romperían el modal.
 */
const ALLOWED_TAGS = [
  "p", "br", "div", "span",
  "strong", "b", "em", "i", "u", "s",
  "ul", "ol", "li", "dl", "dt", "dd",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "table", "thead", "tbody", "tr", "th", "td",
  "blockquote", "pre", "code", "hr",
];

export function sanitizeDescription(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    // Sin atributos: ni style, ni class, ni href. Un enlace dentro del detalle
    // no aporta (el botón de eBay ya está) y evita llevarse al usuario a
    // cualquier lado.
    ALLOWED_ATTR: [],
    // El texto de <p> y <li> se conserva aunque la etiqueta no pase el filtro.
    KEEP_CONTENT: true,
  });
}

/** true si, ya saneado, queda algo que valga la pena mostrar. */
export function hasRenderableDescription(html: string | null | undefined): boolean {
  if (!html) return false;
  return sanitizeDescription(html).replace(/<[^>]*>/g, "").trim().length > 0;
}
