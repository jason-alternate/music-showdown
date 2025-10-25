import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getPlayerColor, getPlayerInitials } from "@/lib/gameLogic";

interface PlayerAvatarProps {
  playerId: string;
  playerName: string;
  size?: "sm" | "md" | "lg";
}

export function PlayerAvatar({ playerId, playerName, size = "md" }: PlayerAvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-12 w-12 text-sm",
    lg: "h-16 w-16 text-base",
  };

  return (
    <Avatar className={sizeClasses[size]}>
      <AvatarFallback
        className={`bg-linear-to-br ${getPlayerColor(playerId)} text-white font-semibold`}
      >
        {getPlayerInitials(playerName)}
      </AvatarFallback>
    </Avatar>
  );
}
