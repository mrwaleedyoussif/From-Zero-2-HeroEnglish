import { GateLayout } from "@/gates/components/gate-layout";
import { ownerGate } from "@/gates/owner.config";

export default function Layout({ children, params }: LayoutProps<"/[locale]/owner">) {
  return (
    <GateLayout gate={ownerGate} params={params}>
      {children}
    </GateLayout>
  );
}
