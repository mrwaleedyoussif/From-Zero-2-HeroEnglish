import { GateLayout } from "@/gates/components/gate-layout";
import { coachGate } from "@/gates/coach.config";

export default function Layout({ children, params }: LayoutProps<"/[locale]/coach">) {
  return (
    <GateLayout gate={coachGate} params={params}>
      {children}
    </GateLayout>
  );
}
