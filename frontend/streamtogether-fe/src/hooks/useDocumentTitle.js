import { useEffect } from "react";

export default function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · StreamTogether` : "StreamTogether";
    return () => {
      document.title = previous;
    };
  }, [title]);
}
