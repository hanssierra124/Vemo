// ════════════════════════════════════════════════════════════════════
// Render de Markdown SEGURO para el cuerpo de reseñas/comentarios.
// Estrategia anti-XSS: 1) escapar TODO HTML; 2) aplicar un subconjunto
// controlado de markdown sobre el texto ya escapado; 3) sólo permitir
// enlaces http/https. El resultado pasa además por el DomSanitizer de
// Angular al usarse con [innerHTML] (defensa en profundidad).
// Subconjunto soportado: **negrita**, _cursiva_ / *cursiva*, [txt](url),
// listas con "- ", y saltos de línea.
// ════════════════════════════════════════════════════════════════════

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeLink(label: string, url: string): string {
  // Sólo http/https. Cualquier otro protocolo → texto plano.
  if (!/^https?:\/\//i.test(url)) return label;
  const safeUrl = url.replace(/"/g, '%22');
  return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer nofollow">${label}</a>`;
}

export function renderSafeMarkdown(md: string | null | undefined): string {
  if (!md) return '';
  let text = escapeHtml(String(md));

  // Enlaces [texto](url) — antes que negrita/cursiva para no romper.
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, url) => safeLink(label, url));

  // Negrita **texto**
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Cursiva _texto_  y  *texto*
  text = text.replace(/(^|[\s(])_([^_]+)_/g, '$1<em>$2</em>');
  text = text.replace(/(^|[\s(])\*([^*]+)\*/g, '$1<em>$2</em>');

  // Listas: líneas que empiezan con "- "
  text = text.replace(/(^|\n)- (.+)/g, '$1• $2');

  // Saltos de línea
  text = text.replace(/\n/g, '<br>');

  return text;
}
