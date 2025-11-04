import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const HTML_ENTITY_FALLBACKS: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

const HTML_ENTITY_PATTERN = /&(amp|lt|gt|quot|#39);/g;

let domParser: DOMParser | null = null;

export function decodeHtmlEntities(value: string): string {
  if (!value) {
    return "";
  }

  if (typeof DOMParser !== "undefined") {
    domParser ??= new DOMParser();
    const document = domParser.parseFromString(value, "text/html");
    const decoded = document.documentElement.textContent;

    if (decoded !== null) {
      return decoded;
    }
  }

  return value.replace(HTML_ENTITY_PATTERN, (match) => HTML_ENTITY_FALLBACKS[match] ?? match);
}
