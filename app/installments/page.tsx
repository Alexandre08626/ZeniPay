import { IntentLanding, intentMetadata } from "@/app/components/marketing/IntentLanding";
import { EN_INSTALLMENTS } from "@/app/components/marketing/intent-pages";

export const metadata = intentMetadata(EN_INSTALLMENTS);

export default function Page() {
  return <IntentLanding d={EN_INSTALLMENTS} />;
}
