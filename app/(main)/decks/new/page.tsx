import { DeckForm } from "@/components/deck/DeckForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { createDeck } from "@/lib/actions/decks";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";

export default async function NewDeckPage() {
  // Pre-fill the use-case + language from onboarding so a new deck matches what
  // the learner said they're here for (they can still change it).
  const user = await requireUser();
  const profile = await getProfile(user.id);

  return (
    <div>
      <PageHeader title="new deck" />
      <DeckForm
        action={createDeck}
        submitLabel="Create deck"
        initial={{
          subject: profile?.primarySubject ?? undefined,
          language: profile?.primaryLanguage ?? undefined,
        }}
      />
    </div>
  );
}
