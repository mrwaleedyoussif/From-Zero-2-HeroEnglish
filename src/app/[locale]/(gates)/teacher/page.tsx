import { GateHome } from "@/gates/components/gate-home";
import { teacherGate } from "@/gates/teacher.config";

export default function Page({ params }: PageProps<"/[locale]/teacher">) {
  return <GateHome gate={teacherGate} params={params} />;
}
