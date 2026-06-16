import { BottomNav } from "@/components/layout/BottomNav";
import { CommandPaletteLoader } from "@/components/layout/CommandPaletteLoader";
import { NavRail } from "@/components/layout/NavRail";
import { requireOnboardedUser } from "@/lib/profile";

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Gate every authenticated page: not allowlisted → /request-access;
  // not onboarded → /onboarding. (Prisma can't run in proxy.ts/edge.)
  await requireOnboardedUser();

  return (
    <>
      <NavRail />
      <BottomNav />
      <CommandPaletteLoader />
      <main className="min-h-screen px-5 pt-8 pb-24 md:pr-12 md:pb-12 md:pl-[7.5rem]">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </>
  );
}
