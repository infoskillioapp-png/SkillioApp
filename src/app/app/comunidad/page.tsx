import { headers } from "next/headers";
import { getCurrentSkillioUser } from "@/lib/db";
import { listPublicNotes } from "@/lib/api/community";
import { redirect } from "next/navigation";
import { CommunityView } from "./_components/community-view";

export default async function ComunidadPage() {
  const user = await getCurrentSkillioUser();
  if (!user) redirect("/login");

  const notes = await listPublicNotes({ limit: 60 });

  // Construir referral URL desde headers (host actual)
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const referralUrl = `${proto}://${host}/registro?ref=${user.clerk_user_id}`;

  return (
    <div className="px-6 sm:px-10 py-10 max-w-6xl mx-auto">
      <CommunityView
        notes={notes}
        referralUrl={referralUrl}
        myReferrals={0}
      />
    </div>
  );
}
