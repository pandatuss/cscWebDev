import { useMemo } from "react";
import sanitize from "sanitize-html";

export function sanitizeHtml(html: string) {
  return sanitize(html, {
    allowedTags: [
      "p", "br", "strong", "b", "em", "i", "u", "h2", "h3", "h4",
      "ul", "ol", "li", "a", "blockquote", "img", "span", "div", "hr",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https"] },
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    transformTags: {
      a: sanitize.simpleTransform("a", { rel: "noopener noreferrer nofollow" }),
    },
  });
}

export function RichText({ html, className }: { html: string; className?: string }) {
  const clean = useMemo(() => sanitizeHtml(html ?? ""), [html]);
  return (
    <div
      className={`prose-csc ${className ?? ""}`}

      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
