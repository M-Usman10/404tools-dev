"use client"

import { useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, Check, Copy, KeyRound, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export interface ApiKey {
  id: string
  name: string
  key_prefix: string
  last_used_at: string | null
  request_count: number
  created_at: string
}

interface CreatedKey extends ApiKey {
  plaintext: string
}

// Server and browser can disagree about what day a timestamp falls on when
// their timezones differ, which React reports as a hydration mismatch. The
// dates here are decoration around the key itself, so the warning is silenced
// rather than the display being deferred to an effect.
function formatDate(value: string | null): string {
  if (!value) return "Never"
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

async function copyToClipboard(value: string, message: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(message)
    return true
  } catch {
    // Clipboard access is refused outside a secure context and in some embedded
    // browsers, and silently doing nothing would look like a broken button.
    toast.error("Could not copy. Select the key and copy it manually.")
    return false
  }
}

export function ApiKeysContent({ initialKeys }: { initialKeys: ApiKey[] }) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState("")
  const [creating, setCreating] = useState(false)
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null)
  const [copied, setCopied] = useState(false)
  const [revoking, setRevoking] = useState<ApiKey | null>(null)
  const [revokePending, setRevokePending] = useState(false)

  const openCreate = () => {
    setName("")
    setCreateOpen(true)
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? "Could not create an API key.")
        return
      }

      const key = data.key as CreatedKey
      setKeys((current) => [key, ...current])
      setCreateOpen(false)
      setCopied(false)
      // The plaintext lives in component state and nowhere else. Closing the
      // reveal dialog drops it for good, which is exactly the guarantee the
      // warning in that dialog is making.
      setCreatedKey(key)
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async () => {
    if (!revoking) return
    setRevokePending(true)
    try {
      const res = await fetch(`/api/keys/${revoking.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? "Could not revoke that API key.")
        return
      }
      setKeys((current) => current.filter((key) => key.id !== revoking.id))
      toast.success(`"${revoking.name}" was revoked.`)
      setRevoking(null)
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setRevokePending(false)
    }
  }

  const handleCopyCreated = async () => {
    if (!createdKey) return
    const ok = await copyToClipboard(createdKey.plaintext, "API key copied")
    if (ok) setCopied(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {keys.length === 0
            ? "No active keys."
            : `${keys.length} active ${keys.length === 1 ? "key" : "keys"}.`}
        </p>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create key
        </Button>
      </div>

      {keys.length === 0 ? (
        <Empty className="rounded-xl border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <KeyRound />
            </EmptyMedia>
            <EmptyTitle>No API keys yet</EmptyTitle>
            <EmptyDescription>
              The OCR API is reachable only with a key. Create one to start sending documents.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create key
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium text-foreground">{key.name}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                      {key.key_prefix}
                      <span aria-hidden="true">…</span>
                      <span className="sr-only">, remainder hidden</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      <span suppressHydrationWarning>{formatDate(key.created_at)}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      <span suppressHydrationWarning>{formatDate(key.last_used_at)}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {Number(key.request_count ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Revoke ${key.name}`}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setRevoking(key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="app-shell sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create an API key</DialogTitle>
            <DialogDescription>
              Name it after the thing that will use it, so you know what breaks when you revoke it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="key-name">Name</Label>
            <Input
              id="key-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Production backend"
              maxLength={64}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter" && !creating) void handleCreate()
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()} disabled={creating}>
              {creating ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Creating...
                </>
              ) : (
                "Create key"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createdKey !== null} onOpenChange={(open) => !open && setCreatedKey(null)}>
        {/* Every casual way out of this dialog is closed until the key has been
            copied. Only the digest was stored, so an Escape keypress or a stray
            click on the backdrop would destroy the one copy of the plaintext
            that will ever exist, with nothing to undo it. */}
        <DialogContent
          className="app-shell sm:max-w-lg"
          showCloseButton={false}
          onEscapeKeyDown={(event) => {
            if (!copied) event.preventDefault()
          }}
          onInteractOutside={(event) => {
            if (!copied) event.preventDefault()
          }}
        >
          <DialogHeader>
            <DialogTitle>Copy your API key now</DialogTitle>
            <DialogDescription>
              {createdKey ? `"${createdKey.name}" is ready to use.` : null}
            </DialogDescription>
          </DialogHeader>

          {/* Only the SHA-256 digest was stored, so this really is unrecoverable
              and the warning has to be impossible to skim past. */}
          <div className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm text-foreground">
              Copy it now. This key is shown once and cannot be recovered.
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              readOnly
              value={createdKey?.plaintext ?? ""}
              onFocus={(event) => event.currentTarget.select()}
              className="bg-muted font-mono text-sm"
              aria-label="Your new API key"
            />
            <Button variant="outline" className="shrink-0" onClick={() => void handleCopyCreated()}>
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>

          <DialogFooter>
            <Button onClick={() => setCreatedKey(null)}>
              {copied ? "Done" : "I have saved it"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={revoking !== null} onOpenChange={(open) => !open && setRevoking(null)}>
        <AlertDialogContent className="app-shell">
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this API key?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{revoking?.name}&quot; stops working immediately and anything still sending it
              will get a 401. This cannot be undone. Your usage history keeps the key so past
              spend still resolves.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                // The action closes the dialog by default, which would unmount
                // the pending state before the request comes back.
                event.preventDefault()
                void handleRevoke()
              }}
              disabled={revokePending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokePending ? "Revoking..." : "Revoke key"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
