import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lista Casa",
  description: "Lista compartida de tareas y compras",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
