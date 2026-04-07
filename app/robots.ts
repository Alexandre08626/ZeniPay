import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/app/", "/api/", "/dashboard/", "/sandbox/"],
      },
    ],
    sitemap: "https://zenipay.ca/sitemap.xml",
  };
}
