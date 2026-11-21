import { GateHome } from "@/gates/components/gate-home";
import { coachGate } from "@/gates/coach.config";

export default function Page({ params }: PageProps<"/[locale]/coach">) {
  return <GateHome gate={coachGate} params={params} />;
}
