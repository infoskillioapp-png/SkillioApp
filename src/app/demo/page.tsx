import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getCurrentSkillioUser } from "@/lib/db";
import { DEMO } from "@/lib/demo/demo-source";
import { DemoFlow } from "./_components/demo-flow";

// Demo guiado de 3 pasos: cae acá apenas termina el onboarding (perfil). Fuerza
// la experiencia real (generación con IA) antes de soltar al usuario en la app.
export default async function DemoPage() {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const user = await getCurrentSkillioUser();
  if (!user) redirect("/login");
  if (!user.onboarding_completed) redirect("/onboarding");
  if (user.demo_completed) redirect("/app/ia");

  const firstName = user.full_name?.split(" ")[0] ?? "estudiante";

  return (
    <DemoFlow
      firstName={firstName}
      demo={{
        title: DEMO.title,
        subject: DEMO.subject,
        text: DEMO.text,
        fileName: DEMO.fileName,
        pdfUrl: DEMO.pdfUrl,
      }}
    />
  );
}
