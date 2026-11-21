import { GateLayout } from "@/gates/components/gate-layout";
import { studentGate } from "@/gates/student.config";

export default function Layout({ children, params }: LayoutProps<"/[locale]/student">) {
  return (
    <GateLayout gate={studentGate} params={params}>
      {children}
    </GateLayout>
  );
}
