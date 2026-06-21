// robots.txt — indexar la landing pública, mantener fuera el ERP y la API.
export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/erp/", "/api/"],
      },
    ],
    sitemap: "https://mactech.cl/sitemap.xml",
    host: "https://mactech.cl",
  };
}
