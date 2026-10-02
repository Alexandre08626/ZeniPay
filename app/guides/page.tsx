import { GuidesIndex, guidesIndexMetadata } from "@/app/components/marketing/GuideArticle";
import { EN_GUIDES } from "@/app/components/marketing/guides";

export const metadata = guidesIndexMetadata("en", EN_GUIDES);

export default function Page() {
  return <GuidesIndex lang="en" list={EN_GUIDES} />;
}
