import katex from "katex";
import "katex/dist/katex.min.css";

type Props = {
  /** Plain text with optional inline math segments wrapped in single $...$ */
  text: string;
  className?: string;
};

/**
 * Renders a sentence where substrings between $ delimiters are KaTeX inline math.
 * Backend descriptions use this pattern (e.g. parts integration with $u = ...$).
 */
export function KatexMixedDescription({ text, className }: Props) {
  const parts = text.split("$");

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (i % 2 === 0) {
          return <span key={i}>{part}</span>;
        }
        const trimmed = part.trim();
        if (!trimmed) {
          return null;
        }
        try {
          const html = katex.renderToString(trimmed, {
            throwOnError: false,
            displayMode: false,
          });
          return (
            <span
              key={i}
              className="d-inline-block align-middle mx-1"
              style={{ maxWidth: "100%" }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return <span key={i}>{part}</span>;
        }
      })}
    </span>
  );
}
