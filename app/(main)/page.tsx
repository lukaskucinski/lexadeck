function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "buenos días";
  if (h < 19) return "buenas tardes";
  return "buenas noches";
}

export default function DashboardPage() {
  return (
    <div>
      <h1 className="type-display text-5xl md:text-7xl">
        {greeting()},
        <br />
        <span className="text-coral">lukas.</span>
      </h1>
      <p className="mt-5 max-w-[40ch] font-medium text-muted">
        Your decks will appear here once the data layer lands.
      </p>
    </div>
  );
}
