"use client";

/** Last-resort error page (the layout itself failed): no translations available, so both languages. */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "grid",
          placeItems: "center",
          minHeight: "100vh",
          margin: 0,
          background: "#F8FAFC",
          color: "#0F172A",
        }}
      >
        <main style={{ textAlign: "center", padding: 24 }}>
          <h1>Something went wrong</h1>
          <p dir="rtl" lang="ar">
            حدث خطأ ما
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "8px 16px",
              background: "#1E3A8A",
              color: "#fff",
              border: 0,
              borderRadius: 6,
            }}
          >
            Try again · حاول مرة أخرى
          </button>
        </main>
      </body>
    </html>
  );
}
