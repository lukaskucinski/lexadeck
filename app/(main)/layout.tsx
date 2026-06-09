import { BottomNav } from "@/components/layout/BottomNav";
import { NavRail } from "@/components/layout/NavRail";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <NavRail />
      <BottomNav />
      <main className="min-h-screen px-5 pt-8 pb-24 md:pr-12 md:pb-12 md:pl-[7.5rem]">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </>
  );
}
