import "./globals.css";

export const metadata = {
  title: "Kuy BL",
  description: "Billiard Event App",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}