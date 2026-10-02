import { GuideArticle, guideMetadata } from "@/app/components/marketing/GuideArticle";
import { FR_GUIDE_INSTALLMENTS } from "@/app/components/marketing/guides";

export const metadata = guideMetadata(FR_GUIDE_INSTALLMENTS);

export default function Page() {
  return <GuideArticle d={FR_GUIDE_INSTALLMENTS} />;
}
