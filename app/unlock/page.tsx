import { unlock } from "./actions";

export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="type-display text-4xl">
          lexadeck<span className="text-coral">.</span>
        </h1>
        <p className="label-caps mt-3 text-muted">Private study room</p>

        <form action={unlock} className="mt-10 flex flex-col gap-3">
          <input
            type="password"
            name="password"
            placeholder="PASSWORD"
            autoFocus
            className="h-12 border-[1.5px] border-line bg-bg px-4 text-sm font-bold tracking-[0.14em] text-ink outline-none placeholder:text-muted focus:bg-soft/40"
          />
          {error && (
            <p className="text-sm font-bold text-coral">
              That wasn&apos;t it — try again.
            </p>
          )}
          <button
            type="submit"
            className="h-12 bg-ink text-sm font-extrabold tracking-[0.1em] text-bg uppercase transition-colors hover:bg-coral"
          >
            Enter →
          </button>
        </form>
      </div>
    </div>
  );
}
