import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, Users, Trophy, Search } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { generateRoomCode } from "@/lib/gameLogic";

export default function Home() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");

  const validatePlayerName = (name: string) => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      alert("Name must be at least 2 characters long");
      return null;
    }
    if (trimmed.length > 24) {
      alert("Name must be 24 characters or fewer");
      return null;
    }
    if (!/^[\w\s'-]+$/.test(trimmed)) {
      alert("Name can only contain letters, numbers, spaces, apostrophes, and hyphens");
      return null;
    }
    return trimmed;
  };

  const handleCreateRoom = () => {
    const validated = validatePlayerName(playerName);
    if (!validated) return;
    const newRoomCode = generateRoomCode();
    localStorage.setItem("playerName", validated);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("musicshowdown.pendingRole", "host");
      sessionStorage.setItem("musicshowdown.lastRole", "host");
    }
    navigate({ to: "/music-showdown/game/$roomCode", params: { roomCode: newRoomCode } });
  };

  const handleJoinRoom = () => {
    const validated = validatePlayerName(playerName);
    if (!validated) return;
    if (!roomCode.trim()) {
      alert("Please enter a room code");
      return;
    }
    if (roomCode.length !== 6) {
      alert("Room code must be 6 characters");
      return;
    }
    localStorage.setItem("playerName", validated);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("musicshowdown.pendingRole", "peer");
      sessionStorage.setItem("musicshowdown.lastRole", "peer");
    }
    navigate({
      to: "/music-showdown/game/$roomCode",
      params: { roomCode: roomCode.toUpperCase() },
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-50 via-emerald-100 to-emerald-200 text-foreground transition-colors dark:from-emerald-950 dark:via-emerald-900 dark:to-emerald-950">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10">
        <div className="container mx-auto px-4 py-16">
          <header className="mx-auto max-w-3xl text-center">
            <h1 className="mb-4 text-5xl font-heading font-bold tracking-tight md:text-6xl">
              Music Showdown
            </h1>
            <p className="text-lg text-muted-foreground md:text-xl">
              Pick a name, create or join a room, and start guessing songs with friends.
            </p>
          </header>

          <section className="mx-auto mt-12 max-w-4xl">
            <Card className="w-full border border-emerald-200/60 bg-background/90 shadow-sm backdrop-blur-sm dark:border-emerald-800/60 dark:bg-card/90">
              <CardHeader>
                <CardTitle className="text-2xl font-heading">1. Choose your display name</CardTitle>
                <CardDescription>Everyone in the room will see you by this name.</CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateRoom()}
                  className="text-lg"
                  data-testid="input-player-name"
                />
              </CardContent>
            </Card>
          </section>

          <section className="mx-auto mt-10 max-w-4xl">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border border-emerald-200/60 bg-background/90 shadow-sm backdrop-blur-sm dark:border-emerald-800/60 dark:bg-card/90">
                <CardHeader>
                  <CardTitle className="text-xl font-heading">2A. Host a new room</CardTitle>
                  <CardDescription>Create a room and share the code with your friends.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleCreateRoom}
                    size="lg"
                    className="w-full text-lg font-semibold"
                    disabled={!playerName.trim()}
                    data-testid="button-create-room"
                  >
                    Create Room
                  </Button>
                </CardContent>
              </Card>

              <Card className="border border-emerald-200/60 bg-background/90 shadow-sm backdrop-blur-sm dark:border-emerald-800/60 dark:bg-card/90">
                <CardHeader>
                  <CardTitle className="text-xl font-heading">2B. Join an existing room</CardTitle>
                  <CardDescription>Enter the room code shared by the host.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Room code"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                    className="font-mono uppercase text-lg"
                    maxLength={6}
                    data-testid="input-room-code"
                  />
                  <Button
                    onClick={handleJoinRoom}
                    variant="secondary"
                    disabled={!playerName.trim() || !roomCode.trim()}
                    data-testid="button-join-room"
                  >
                    Join Room
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* How to Play */}
          <section className="mx-auto mt-16 max-w-5xl">
            <h2 className="mb-8 text-center text-3xl font-heading font-bold">
              How to Play
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Users,
                  title: "1. Create Room",
                  description: "Host creates a room and shares the code with friends",
                },
                {
                  icon: Music,
                  title: "2. Pick Songs",
                  description: "Host sets a theme, players search YouTube for matching songs",
                },
                {
                  icon: Search,
                  title: "3. Guess Away",
                  description: "Listen to each song and try to guess the title quickly",
                },
                {
                  icon: Trophy,
                  title: "4. Win Points",
                  description: "First and fastest correct guesses earn the most points",
                },
              ].map((step, i) => (
                <Card
                  key={i}
                  className="border border-emerald-200/60 bg-background/90 text-center shadow-sm backdrop-blur-sm dark:border-emerald-800/60 dark:bg-card/90"
                >
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-200/60 dark:bg-emerald-900/40">
                      <step.icon className="h-8 w-8 text-emerald-700 dark:text-emerald-300" />
                    </div>
                    <CardTitle className="text-lg font-heading">{step.title}</CardTitle>
                    <CardDescription className="text-sm">{step.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>

        </div>
      </div>

      <a
        className="block px-4 pb-6 text-center text-xs text-muted-foreground/80"
        href="https://www.flaticon.com/free-icons/music-note"
        title="music note icons"
      >
        Music note icons created by Freepik - Flaticon
      </a>
    </div>
  );
}
