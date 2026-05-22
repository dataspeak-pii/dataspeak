import type { Metadata } from "next";
import { Host_Grotesk, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const hostGrotesk = Host_Grotesk({
  variable: "--font-host-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DataSpeak — Pergunte aos seus dados em linguagem natural",
  description: "Sistema de tradução de perguntas em linguagem natural para consultas SQL sobre estruturas de dados SAP, com explicação contextualizada e execução em banco simulado.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${hostGrotesk.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background tracking-[-0.02em] cursor-default">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--color-bg-a1)",
              color: "var(--color-fg-1)",
              border: "1px solid var(--color-border)",
              fontFamily: "var(--font-sans)",
              borderRadius: "14px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
            },
            className: "!rounded-[14px]",
          }}
        />
      </body>
    </html>
  );
}
