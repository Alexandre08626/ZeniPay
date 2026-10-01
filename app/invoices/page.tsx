import { IntentLanding, intentMetadata } from "@/app/components/marketing/IntentLanding";
import { EN_INVOICE } from "@/app/components/marketing/intent-pages";

export const metadata = intentMetadata(EN_INVOICE);

export default function Page() {
  return <IntentLanding d={EN_INVOICE} />;
}
