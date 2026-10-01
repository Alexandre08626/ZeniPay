import { IntentLanding, intentMetadata } from "@/app/components/marketing/IntentLanding";
import { FR_INVOICE } from "@/app/components/marketing/intent-pages";

export const metadata = intentMetadata(FR_INVOICE);

export default function Page() {
  return <IntentLanding d={FR_INVOICE} />;
}
