import { IntentLanding, intentMetadata } from "@/app/components/marketing/IntentLanding";
import { FR_PAYLINK } from "@/app/components/marketing/intent-pages";

export const metadata = intentMetadata(FR_PAYLINK);

export default function Page() {
  return <IntentLanding d={FR_PAYLINK} />;
}
