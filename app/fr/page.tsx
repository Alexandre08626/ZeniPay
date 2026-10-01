import { IntentLanding, intentMetadata } from "@/app/components/marketing/IntentLanding";
import { FR_HOME } from "@/app/components/marketing/intent-pages";

export const metadata = intentMetadata(FR_HOME);

export default function Page() {
  return <IntentLanding d={FR_HOME} />;
}
