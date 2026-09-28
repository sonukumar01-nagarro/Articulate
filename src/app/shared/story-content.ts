export function hasStoryContent(html: string): boolean {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;|&#xA0;/gi, ' ').trim();
  return !!text || /<img\b[^>]*\bsrc\s*=\s*["'](?:https:\/\/[^"']+|data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+)["']/i.test(html);
}

export function storyExceedsSizeLimit(html: string): boolean {
  return new TextEncoder().encode(html).length > 500000;
}
