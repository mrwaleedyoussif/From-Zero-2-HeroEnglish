import { GateHome } from "@/gates/components/gate-home";
import { ownerGate } from "@/gates/owner.config";

export default function Page({ params }: PageProps<"/[locale]/owner">) {
  return <GateHome gate={ownerGate} params={params} />;
}
