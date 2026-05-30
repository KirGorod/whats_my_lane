import { useEffect, useMemo, useState } from "react";
import { Library, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../../components/ui/alert-dialog";
import { TeamFormDialog } from "../../../components/teams/TeamFormDialog";
import {
  createSavedTeam,
  deleteSavedTeam,
  subscribeTeamLibrary,
  updateSavedTeam,
} from "../../../lib/teamLibrary";
import { isTeamNameTaken } from "../../../lib/teamNames";
import type { Team } from "../../../types/team";
import type { SavedTeam } from "../../../types/teamLibrary";

function CompactAthletesList({ athletes }: { athletes: string[] }) {
  if (!athletes.length) {
    return (
      <p className="text-xs text-muted-foreground mt-0.5">Немає атлетів</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {athletes.map((name, index) => (
        <span
          key={`${name}-${index}`}
          className="inline-block max-w-full truncate rounded bg-slate-100 px-1.5 py-0.5 text-[11px] leading-tight text-slate-600"
          title={name}
        >
          {name}
        </span>
      ))}
    </div>
  );
}

export function TeamLibraryModal({
  competitionTeamNameKeys = new Set<string>(),
  addTeam,
}: {
  competitionTeamNameKeys?: Set<string>;
  addTeam?: (team: Omit<Team, "id">) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<SavedTeam[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const unsub = subscribeTeamLibrary(
      (next) => {
        setTeams(next);
        setLoading(false);
      },
      () => {
        toast.error("Не вдалося завантажити бібліотеку команд");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [open]);

  const filteredTeams = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return teams;
    return teams.filter(
      (team) =>
        team.name.toLowerCase().includes(term) ||
        team.city?.toLowerCase().includes(term) ||
        team.athletes.some((athlete) => athlete.toLowerCase().includes(term))
    );
  }, [teams, searchTerm]);

  const handleCreate = async (team: Omit<SavedTeam, "id">) => {
    try {
      await createSavedTeam(team);
      toast.success("Команду збережено в бібліотеці");
    } catch (err) {
      console.error(err);
      toast.error("Не вдалося зберегти команду");
    }
  };

  const handleUpdate = async (team: SavedTeam, patch: Omit<SavedTeam, "id">) => {
    try {
      await updateSavedTeam(team.id, patch);
      toast.success("Команду оновлено");
    } catch (err) {
      console.error(err);
      toast.error("Не вдалося оновити команду");
    }
  };

  const handleDelete = async (team: SavedTeam) => {
    try {
      await deleteSavedTeam(team.id);
      toast.success("Команду видалено з бібліотеки");
    } catch (err) {
      console.error(err);
      toast.error("Не вдалося видалити команду");
    }
  };

  const handleAddToQueue = async (team: SavedTeam) => {
    if (!addTeam) return;
    if (isTeamNameTaken(team.name, competitionTeamNameKeys)) {
      toast.error(`Команда «${team.name.trim()}» уже є в цьому змаганні`);
      return;
    }
    try {
      await addTeam({
        name: team.name,
        ...(team.city ? { city: team.city } : {}),
        athletes: team.athletes ?? [],
      });
    } catch (err) {
      console.error(err);
      toast.error("Не вдалося додати команду до черги");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="Бібліотека команд"
          className="h-8 w-8"
        >
          <Library className="w-5 h-5 text-violet-600" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Бібліотека команд</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2">
          <Input
            placeholder="Пошук команди, міста або атлета"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <TeamFormDialog
            title="Додати команду в бібліотеку"
            submitLabel="Зберегти"
            onSubmit={handleCreate}
            trigger={
              <Button type="button" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Додати
              </Button>
            }
          />
        </div>

        <div className="flex-1 min-h-0 mt-3 rounded border overflow-y-auto divide-y">
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground text-center">
              Завантаження...
            </p>
          ) : filteredTeams.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">
              {teams.length === 0
                ? "Бібліотека порожня. Додайте першу команду."
                : "Нічого не знайдено"}
            </p>
          ) : (
            filteredTeams.map((team) => (
              <div
                key={team.id}
                className="flex items-start justify-between gap-3 px-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{team.name}</p>
                  {team.city ? (
                    <p className="text-xs text-muted-foreground truncate">
                      {team.city}
                    </p>
                  ) : null}
                  <CompactAthletesList athletes={team.athletes} />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {addTeam && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-blue-600 hover:text-blue-700 disabled:opacity-40"
                      title={
                        isTeamNameTaken(team.name, competitionTeamNameKeys)
                          ? "Команда уже в змаганні"
                          : "Додати до черги"
                      }
                      disabled={isTeamNameTaken(team.name, competitionTeamNameKeys)}
                      onClick={() => void handleAddToQueue(team)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                  <TeamFormDialog
                    title="Редагувати команду в бібліотеці"
                    submitLabel="Зберегти"
                    initialTeam={team}
                    onSubmit={(patch) => handleUpdate(team, patch)}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Редагувати"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    }
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                        title="Видалити"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Видалити команду?</AlertDialogTitle>
                        <AlertDialogDescription>
                          «{team.name}» буде видалено з бібліотеки. Команди в уже
                          створених змаганнях не зміняться.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Скасувати</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(team)}>
                          Видалити
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
