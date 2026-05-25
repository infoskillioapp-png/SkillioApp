import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LandingPage } from "./_components/landing/landing";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/app");
  return <LandingPage />;
}
