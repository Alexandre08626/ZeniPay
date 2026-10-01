import { IntentLanding, intentMetadata } from "@/app/components/marketing/IntentLanding";
import { EN_PAYMENTS } from "@/app/components/marketing/intent-pages";

export const metadata = intentMetadata(EN_PAYMENTS);

export default function Page() {
  return <IntentLanding d={EN_PAYMENTS} />;
}
