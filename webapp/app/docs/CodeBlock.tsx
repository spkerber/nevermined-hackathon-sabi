"use client";

import { useState, useCallback } from "react";

interface CodeBlockProps {
  code: string;
  className?: string;
}

export function CodeBlock({ code, className = "" }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <div className="relative group">
      <pre className={`bg-sabi-surface border border-sabi-border rounded p-4 text-sm overflow-x-auto text-sabi-text pr-12 ${className}`}>
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy code"
        className="absolute top-2 right-2 rounded border border-sabi-border bg-sabi-surface px-2 py-1 text-xs text-sabi-muted hover:text-sabi-text hover:border-sabi-muted transition-colors"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
