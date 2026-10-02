import { GuidesIndex, guidesIndexMetadata } from "@/app/components/marketing/GuideArticle";
import { FR_GUIDES } from "@/app/components/marketing/guides";

export const metadata = guidesIndexMetadata("fr", FR_GUIDES);

export default function Page() {
  return <GuidesIndex lang="fr" list={FR_GUIDES} />;
}
