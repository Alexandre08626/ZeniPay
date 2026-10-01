import { IntentLanding, intentMetadata } from "@/app/components/marketing/IntentLanding";
import { FR_PROCESSOR } from "@/app/components/marketing/intent-pages";

export const metadata = intentMetadata(FR_PROCESSOR);

export default function Page() {
  return <IntentLanding d={FR_PROCESSOR} />;
}
