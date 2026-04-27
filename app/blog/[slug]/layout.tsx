import type { Metadata } from "next";
import { findPost } from "../posts";

interface Props {
  params: Promise<{ slug: string }> | { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await Promise.resolve(params);
  const post = findPost(slug);
  if (!post) {
    return {
      title: "Article not found",
      robots: { index: false, follow: true },
    };
  }
  return {
    title: post.title,
    description: post.description,
    keywords: post.tags,
    openGraph: {
      title: `${post.title} | ZeniPay`,
      description: post.description,
      url: `https://zenipay.ca/blog/${post.slug}`,
      type: "article",
      publishedTime: post.date,
      authors: ["ZeniPay"],
      tags: post.tags,
      images: [{ url: "/zenipay-logo.png", width: 1200, height: 1200, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: ["/zenipay-logo.png"],
    },
    alternates: {
      canonical: `https://zenipay.ca/blog/${post.slug}`,
    },
  };
}

export default function BlogPostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
