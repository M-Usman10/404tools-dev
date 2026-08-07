import { Skeleton } from "@/components/ui/skeleton"

// Three cards of the same shape as the real forms: a title, a description, and
// the fields. The last one has a single row rather than two because the account
// card is read-only detail, not a form.
export default function SettingsLoading() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your name, your password, and the details of your account.
        </p>
      </div>

      <div className="space-y-6">
        {[1, 2, 3].map((card) => (
          <div key={card} className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            {Array.from({ length: card === 2 ? 2 : 1 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
            {card !== 3 && <Skeleton className="h-9 w-32 rounded-md" />}
          </div>
        ))}
      </div>
    </div>
  )
}
