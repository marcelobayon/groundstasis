import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@/components/Analytics";
import { RouteAnalytics } from "@/components/route-analytics";
import { Nav, Footer } from "@/components/chrome";
import { SITE } from "@/lib/config/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Ground Stasis — Know when construction goes quiet",
    template: "%s · Ground Stasis",
  },
  description: SITE.subheadline,
  applicationName: SITE.name,
  keywords: [
    "construction loan monitoring",
    "satellite construction monitoring",
    "construction lender site monitoring",
    "construction project stalled alert",
    "construction loan risk monitoring",
  ],
  openGraph: {
    title: "Ground Stasis — Know when construction goes quiet",
    description: SITE.subheadline,
    url: SITE.url,
    siteName: SITE.name,
    type: "website",
    images: [
      { url: "/og.png", width: 1200, height: 630, alt: "Ground Stasis — know when construction goes quiet" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ground Stasis — Know when construction goes quiet",
    description: SITE.subheadline,
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Sitewide identity. SoftwareApplication (with the product's offers)
            lives on the homepage only, so product/offer markup is not repeated
            on every tool and content page. */}
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            name: SITE.name,
            url: SITE.url,
            description: SITE.subheadline,
            logo: `${SITE.url}/gs-icon-navy-512.png`,
            sameAs: [
              "https://www.linkedin.com/company/groundstasis",
              "https://www.crunchbase.com/organization/ground-stasis",
              "https://www.youtube.com/@GroundStasis",
              "https://www.facebook.com/profile.php?id=61595704503002",
              "https://www.instagram.com/groundstasis",
              "https://share.google/TlFroqpLnFkX71PGk",
              "https://www.g2.com/sellers/ground-stasis",
              "https://www.aecplustech.com/companies/ground-stasis",
            ],
          }}
        />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE.name,
            url: SITE.url,
          }}
        />
        <Nav />
        <main>{children}</main>
        <Footer />
        <Analytics gaId={SITE.gaId} />
        <RouteAnalytics />
      </body>
    </html>
  );
}
