import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Financeiro",
  description: "Livro-razão permanente",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="sticky top-0 z-30 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto flex items-center gap-6 h-12">
            <span className="font-bold text-neutral-900 dark:text-neutral-100 text-sm tracking-tight">
              Financeiro
            </span>
            <Link
              href="/lancamentos"
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition"
            >
              Lançamentos
            </Link>
            <Link
              href="/cartoes"
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition"
            >
              Cartões
            </Link>
            <Link
              href="/venda"
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition"
            >
              Venda
            </Link>
            <Link
              href="/antecipacao"
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition"
            >
              Antecipação
            </Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
