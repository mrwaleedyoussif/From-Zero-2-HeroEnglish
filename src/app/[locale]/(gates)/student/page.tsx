import { GateHome } from "@/gates/components/gate-home";
import { studentGate } from "@/gates/student.config";

export default function Page({ params }: PageProps<"/[locale]/student">) {
  return <GateHome gate={studentGate} params={params} />;
}
