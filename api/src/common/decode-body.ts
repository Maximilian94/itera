/**
 * Decodifica o corpo de uma resposta HTTP respeitando o charset declarado —
 * sites de órgãos públicos brasileiros ainda servem muita página em
 * ISO-8859-1/Latin-1, que vira mojibake ("P�BLICO") se lida como UTF-8.
 * Ordem: charset do Content-Type → <meta charset> no início do HTML → UTF-8.
 */
export function decodeHtmlBody(
  buffer: Buffer,
  contentType: string | null,
): string {
  let charset = /charset=["']?([\w-]+)/i.exec(contentType ?? '')?.[1];
  if (!charset) {
    // Sniff no <head>: bytes ASCII do início são legíveis em qualquer charset.
    const head = buffer.subarray(0, 4096).toString('latin1');
    charset = /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1];
  }
  try {
    return new TextDecoder(charset ?? 'utf-8').decode(buffer);
  } catch {
    // Charset desconhecido/aliás inválido → melhor esforço em UTF-8.
    return buffer.toString('utf8');
  }
}
