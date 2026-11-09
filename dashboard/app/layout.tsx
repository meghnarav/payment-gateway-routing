import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Route / Control Room",
  description: "Enterprise payment gateway routing observability dashboard"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
