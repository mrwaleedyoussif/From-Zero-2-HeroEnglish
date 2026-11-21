import { GateLayout } from "@/gates/components/gate-layout";
import { leadershipGate } from "@/gates/leadership.config";

export default function Layout({ children, params }: LayoutProps<"/[locale]/leadership">) {
  return (
    <GateLayout gate={leadershipGate} params={params}>
      {children}
    </GateLayout>
  );
}
