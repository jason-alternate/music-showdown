import { Progress } from "@/components/ui/progress";
import { Clock } from "lucide-react";

interface TimerProps {
  timeRemaining: number;
  totalTime: number;
  variant?: "default" | "accent";
}

export function Timer({ timeRemaining, totalTime, variant = "default" }: TimerProps) {
  const percentage = (timeRemaining / totalTime) * 100;
  const isLowTime = percentage < 25;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Clock
            className={`w-4 h-4 ${isLowTime ? "text-accent animate-pulse" : "text-muted-foreground"}`}
          />
          <span className={isLowTime ? "text-accent font-bold" : ""}>
            {Math.max(0, Math.ceil(timeRemaining))}s
          </span>
        </div>
        <span className="text-xs text-muted-foreground">/ {totalTime}s</span>
      </div>
      <Progress
        value={percentage}
        className={`h-2 ${isLowTime ? "animate-pulse" : ""}`}
        data-testid="progress-timer"
      />
    </div>
  );
}
