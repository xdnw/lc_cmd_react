import DOMPurify from "dompurify";

export default function SanitizedHtml({ value }: { value: string }) {
  const sanitized = DOMPurify.sanitize(value ?? "");
  return <span dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
