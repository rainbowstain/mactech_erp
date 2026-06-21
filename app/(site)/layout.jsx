import "./site.css";

const SITE_URL = "https://mactech.cl/";
const OG_IMAGE = "https://mactech.cl/iPhone-repair-side-image.png";

export const metadata = {
  metadataBase: new URL("https://mactech.cl"),
  title: "MacTech Arica | Reparación de iPhone, iPad, Mac, PC y Android",
  description:
    "Servicio técnico en Arica: reparamos iPhone, iPad, Mac, MacBook, PC, notebooks, Android y consolas. Cambio de pantalla y batería, microsoldadura y baño químico de placa. Repuestos de calidad y garantía de 90 días.",
  keywords: [
    "MacTech",
    "MacTech Chile",
    "MacTech Arica",
    "Mac Tech",
    "servicio técnico Arica",
    "servicio técnico Apple Arica",
    "técnico Apple Arica",
    "reparar iPhone Arica",
    "reparación iPhone Arica",
    "arreglar iPhone Arica",
    "reparar iPad Arica",
    "reparación iPad Arica",
    "reparar Mac Arica",
    "reparar MacBook Arica",
    "reparación Mac Arica",
    "reparar PC Arica",
    "reparación PC Arica",
    "reparar notebook Arica",
    "reparación de computadores Arica",
    "reparar celulares Arica",
    "reparación de celulares Arica",
    "reparar tablet Arica",
    "reparar Samsung Arica",
    "reparar Xiaomi Arica",
    "reparación Android Arica",
    "cambio de pantalla iPhone Arica",
    "cambio de batería iPhone Arica",
    "cambio de pantalla Arica",
    "cambio de batería Arica",
    "microsoldadura Arica",
    "baño químico de placa Arica",
    "liberación de celulares Arica",
  ],
  category: "Servicio técnico",
  authors: [{ name: "MacTech Servicio Técnico" }],
  alternates: { canonical: SITE_URL },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.png" },
  openGraph: {
    type: "website",
    locale: "es_CL",
    siteName: "MacTech Servicio Técnico",
    title: "MacTech Arica | Reparación de iPhone, iPad, Mac, PC y Android",
    description:
      "Tu equipo, como nuevo. Reparamos iPhone, iPad, Mac, PC, notebooks y Android en Arica, con repuestos de calidad y garantía de 90 días.",
    url: SITE_URL,
    images: [{ url: OG_IMAGE, alt: "Reparación técnica MacTech en Arica" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MacTech Arica | Reparación de iPhone, iPad, Mac y PC",
    description: "Reparación de iPhone, iPad, Mac, PC, Android y consolas en Arica.",
    images: [OG_IMAGE],
  },
  other: {
    "geo.region": "CL-AP",
    "geo.placename": "Arica, Chile",
    "geo.position": "-18.4783;-70.3126",
    ICBM: "-18.4783, -70.3126",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://mactech.cl/#business",
  name: "MacTech Servicio Técnico",
  alternateName: ["MacTech Chile", "MacTech Arica", "Mac Tech Servicio Técnico"],
  url: "https://mactech.cl/",
  image: OG_IMAGE,
  logo: "https://mactech.cl/mactech-logo.svg",
  description:
    "Servicio técnico en Arica: reparación de iPhone, iPad, Mac, MacBook, PC, notebooks, Android y consolas. Cambio de pantalla y batería, microsoldadura y baño químico de placa.",
  priceRange: "$$",
  currenciesAccepted: "CLP",
  paymentAccepted: "Efectivo, Débito, Transferencia",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Bolognesi 340, Local 18",
    addressLocality: "Arica",
    addressRegion: "Arica y Parinacota",
    postalCode: "1000000",
    addressCountry: "CL",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: -18.4783,
    longitude: -70.3126,
  },
  hasMap: "https://www.google.com/maps/search/?api=1&query=Bolognesi%20340%20Local%2018%20Arica",
  areaServed: [
    { "@type": "City", name: "Arica" },
    { "@type": "City", name: "Putre" },
    { "@type": "AdministrativeArea", name: "Región de Arica y Parinacota" },
    { "@type": "Country", name: "Chile" },
  ],
  knowsAbout: [
    "Reparación de iPhone",
    "Reparación de iPad",
    "Reparación de Mac y MacBook",
    "Reparación de PC y notebooks",
    "Reparación de Android",
    "Microsoldadura",
    "Cambio de pantalla",
    "Cambio de batería",
  ],
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:30",
      closes: "19:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Saturday",
      opens: "11:00",
      closes: "18:00",
    },
  ],
  sameAs: [
    "https://www.instagram.com/mactech.cl/",
    "https://www.tiktok.com/@mactech.cl",
    "https://www.facebook.com/profile.php?id=61590618352242",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    url: "https://wa.me/message/F55DFSIY3UPNE1",
    areaServed: "CL",
    availableLanguage: "es",
  },
  makesOffer: [
    { "@type": "Offer", itemOffered: { "@type": "Service", name: "Reparación de iPhone en Arica" } },
    { "@type": "Offer", itemOffered: { "@type": "Service", name: "Reparación de iPad y tablets en Arica" } },
    { "@type": "Offer", itemOffered: { "@type": "Service", name: "Reparación de Mac y MacBook en Arica" } },
    { "@type": "Offer", itemOffered: { "@type": "Service", name: "Reparación de PC y notebooks en Arica" } },
    { "@type": "Offer", itemOffered: { "@type": "Service", name: "Reparación de Android (Samsung, Xiaomi, Huawei) en Arica" } },
    { "@type": "Offer", itemOffered: { "@type": "Service", name: "Cambio de pantalla" } },
    { "@type": "Offer", itemOffered: { "@type": "Service", name: "Cambio de batería" } },
    { "@type": "Offer", itemOffered: { "@type": "Service", name: "Microsoldadura y reparación de placas" } },
    { "@type": "Offer", itemOffered: { "@type": "Service", name: "Baño químico de placa por daño de líquidos" } },
  ],
};

export default function SiteLayout({ children }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
