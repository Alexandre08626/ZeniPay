import { GuideArticle, guideMetadata } from "@/app/components/marketing/GuideArticle";
import { EN_GUIDE_PAYLINK } from "@/app/components/marketing/guides";

export const metadata = guideMetadata(EN_GUIDE_PAYLINK);

export default function Page() {
  return <GuideArticle d={EN_GUIDE_PAYLINK} />;
}
