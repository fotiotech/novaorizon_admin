import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import Script from "next/script";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"], // Choose the subsets you need
  weight: ["400", "700"], // Specify font weights
});

export const metadata: Metadata = {
  title: "dyfkcameroun.com | Your One-Stop E-Commerce Store in Cameroun",
  description:
    "Discover the best products at unbeatable prices on dyfkCameroun.com. Shop now for a seamless online shopping experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google Tag Manager */}
        <Script
          id="google-tag-manager"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-PKXZ9B9T');
            `,
          }}
        />
        {/* Monetbil Widget */}
        <Script
          src="https://www.monetbil.com/widget/v2/monetbil.min.js"
          strategy="afterInteractive"
        />
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PKXZ9B9T"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          ></iframe>
        </noscript>
        <div className={`${inter.className}  `}>
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
