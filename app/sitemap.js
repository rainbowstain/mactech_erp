// Sitemap de la landing pública de MacTech.
export default function sitemap() {
  return [
    {
      url: "https://mactech.cl/",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: "https://mactech.cl/terminos",
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
