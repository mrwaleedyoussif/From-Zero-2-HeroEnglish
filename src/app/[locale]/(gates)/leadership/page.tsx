import { GateHome } from "@/gates/components/gate-home";
import { leadershipGate } from "@/gates/leadership.config";

export default function Page({ params }: PageProps<"/[locale]/leadership">) {
  return <GateHome gate={leadershipGate} params={params} />;
}
