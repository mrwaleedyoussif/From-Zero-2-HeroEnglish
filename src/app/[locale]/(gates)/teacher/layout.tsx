import { GateLayout } from "@/gates/components/gate-layout";
import { teacherGate } from "@/gates/teacher.config";

export default function Layout({ children, params }: LayoutProps<"/[locale]/teacher">) {
  return (
    <GateLayout gate={teacherGate} params={params}>
      {children}
    </GateLayout>
  );
}
