import { IntentLanding, intentMetadata } from "@/app/components/marketing/IntentLanding";
import { FR_INSTALLMENTS } from "@/app/components/marketing/intent-pages";

export const metadata = intentMetadata(FR_INSTALLMENTS);

export default function Page() {
  return <IntentLanding d={FR_INSTALLMENTS} />;
}
