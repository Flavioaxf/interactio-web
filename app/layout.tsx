import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Interactio | Participante",
  description: "Participe da apresentação interativa em tempo real.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      {/* O 'font-sans' do Tailwind puxa a fonte nativa do sistema, igualzinho ao Expo! */}
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}