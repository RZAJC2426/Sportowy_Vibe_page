import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const SITE_URL = 'https://sportowyvibe.pl';
const SITE_NAME = 'Sportowy Vibe';
const MAX_DESCRIPTION = 158;

interface SeoOptions {
  /** Tytuł podstrony. Gdy undefined (np. dane jeszcze się ładują), hook niczego nie zmienia. */
  title?: string;
  description?: string | null;
  image?: string | null;
  type?: 'website' | 'article';
  noindex?: boolean;
}

function clip(text: string, max = MAX_DESCRIPTION): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > 80 ? cut.slice(0, lastSpace) : cut;
  return base.replace(/[.,;:\-–—\s]+$/, '') + '…';
}

function absoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

type Undo = () => void;

function setHeadTag(
  tag: 'meta' | 'link',
  attr: string,
  key: string,
  valueAttr: 'content' | 'href',
  value: string,
): Undo {
  let el = document.head.querySelector<HTMLElement>(`${tag}[${attr}="${key}"]`);
  const existed = !!el;
  const previous = el?.getAttribute(valueAttr) ?? null;
  if (!el) {
    el = document.createElement(tag);
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute(valueAttr, value);
  return () => {
    if (!existed) el?.remove();
    else if (previous === null) el?.removeAttribute(valueAttr);
    else el?.setAttribute(valueAttr, previous);
  };
}

/**
 * Ustawia title, description, canonical oraz og:* / twitter:* dla bieżącej podstrony
 * i przy wyjściu ze strony przywraca poprzednie wartości (SPA nie przeładowuje head).
 */
export function useSeo({ title, description, image, type = 'website', noindex = false }: SeoOptions) {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!title) return;

    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    const desc = description ? clip(description) : null;
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/';
    const canonical = `${SITE_URL}${path === '/' ? '/' : path}`;
    const img = image ? absoluteUrl(image) : null;

    const undo: Undo[] = [];
    const previousTitle = document.title;
    document.title = fullTitle;
    undo.push(() => { document.title = previousTitle; });

    undo.push(setHeadTag('link', 'rel', 'canonical', 'href', canonical));
    undo.push(setHeadTag('meta', 'property', 'og:title', 'content', fullTitle));
    undo.push(setHeadTag('meta', 'property', 'og:url', 'content', canonical));
    undo.push(setHeadTag('meta', 'property', 'og:type', 'content', type));
    undo.push(setHeadTag('meta', 'name', 'twitter:title', 'content', fullTitle));

    if (desc) {
      undo.push(setHeadTag('meta', 'name', 'description', 'content', desc));
      undo.push(setHeadTag('meta', 'property', 'og:description', 'content', desc));
      undo.push(setHeadTag('meta', 'name', 'twitter:description', 'content', desc));
    }
    if (img) {
      undo.push(setHeadTag('meta', 'property', 'og:image', 'content', img));
      undo.push(setHeadTag('meta', 'name', 'twitter:image', 'content', img));
      undo.push(setHeadTag('meta', 'name', 'twitter:card', 'content', 'summary_large_image'));
    }
    if (noindex) {
      undo.push(setHeadTag('meta', 'name', 'robots', 'content', 'noindex, nofollow'));
    }

    return () => {
      undo.reverse().forEach((fn) => fn());
    };
  }, [title, description, image, type, noindex, pathname]);
}
