import "./styles.css";

export const metadata = {
  title: "MacTech ERP",
  description: "ERP local moderno para MacTech"
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
