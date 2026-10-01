import { IntentLanding, intentMetadata } from "@/app/components/marketing/IntentLanding";
import { EN_PAYLINK } from "@/app/components/marketing/intent-pages";

export const metadata = intentMetadata(EN_PAYLINK);

export default function Page() {
  return <IntentLanding d={EN_PAYLINK} />;
}
