import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface ConnectionScreenProps {
  title?: string;
  description?: string;
  roomCode?: string;
  topRightSlot?: ReactNode;
}

export function ConnectionScreen({
  title = "Connecting",
  description = "Hang tight while we get everything ready.",
  roomCode,
  topRightSlot,
}: ConnectionScreenProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      {topRightSlot}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_theme(colors.primary/15),transparent_60%)]" />
      <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-border/50 bg-background/90 p-10 text-center shadow-xl backdrop-blur">
          <div className="flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-heading">{title}</h2>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {roomCode ? (
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-4 py-2 font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Room
                <span className="text-foreground">{roomCode}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
