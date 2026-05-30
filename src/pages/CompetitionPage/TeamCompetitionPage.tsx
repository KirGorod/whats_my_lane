import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  ArrowBigLeft,
  ArrowBigRight,
  ArrowBigRightDash,
  ArrowLeft,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Flag,
  Info,
  Pencil,
  Lock,
  List,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
  Unlock,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { db } from "../../firebase";
import {
  collectCompetitionTeamNameKeys,
  isTeamNameTaken,
  normalizeTeamName,
} from "../../lib/teamNames";
import { useAuth } from "../../context/AuthContext";
import { useAdminTeamAthletesView } from "../../hooks/useAdminTeamAthletesView";
import CompetitionHeader from "./components/CompetitionHeader";
import { TeamLibraryModal } from "./components/TeamLibraryModal";
import { TeamFormDialog } from "../../components/teams/TeamFormDialog";
import ScrollToTopButton from "../../components/main/ScrollToTopButton";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { Label } from "../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
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
} from "../../components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import type { ExerciseStatus, ExerciseType } from "../../types/exercise";
import type {
  LaneTeam,
  Team,
  TeamActionHistory,
  TeamLaneModel,
  TeamLanePatch,
  TeamPatch,
} from "../../types/team";

type FirestoreTeamLane = {
  id: number;
  team?: LaneTeam | null;
  readyUpTeam?: LaneTeam | null;
  locked?: boolean;
};

type ApiCompetition = {
  id: string;
  title?: string;
  date?: string;
  isTeam?: boolean | null;
};

type ApiTeam = {
  id?: string;
  name?: string | null;
  lastName?: string | null;
  userId?: string | null;
};

type ProtocolEntry = {
  rank?: number;
  userId?: string | null;
};

type PreviewTeam = {
  id: string;
  name: string;
  rank: number;
};

const API_BASE_URL = "https://apitrenvet.allstrongman.com/api";

const formatApiDate = (iso?: string) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "short",
  }).format(date);
};

const apiTeamName = (team?: ApiTeam | null) =>
  `${team?.lastName ?? ""} ${team?.name ?? ""}`.trim();

const protocolList = (payload: unknown): ProtocolEntry[] => {
  if (Array.isArray(payload)) return payload as ProtocolEntry[];
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { protocol?: unknown }).protocol)
  ) {
    return (payload as { protocol: ProtocolEntry[] }).protocol;
  }
  return [];
};

const teamPayload = (team: Team): LaneTeam => ({
  id: team.id,
  name: team.name,
  athletes: team.athletes ?? [],
});

const isSyntheticTeam = (team: LaneTeam | Team | null | undefined) =>
  !!team?.id && String(team.id).startsWith("skip-");

const teamPatch = (
  teamId: string,
  beforeStatus: TeamPatch["beforeStatus"],
  afterStatus: TeamPatch["afterStatus"],
  beforeOrderRank?: number,
  afterOrderRank?: number
): TeamPatch => {
  const patch: TeamPatch = {
    teamId,
    afterStatus,
  };
  if (beforeStatus !== undefined) patch.beforeStatus = beforeStatus;
  if (beforeOrderRank !== undefined) patch.beforeOrderRank = beforeOrderRank;
  if (afterOrderRank !== undefined) patch.afterOrderRank = afterOrderRank;
  return patch;
};

function AddTeamDialog({
  addTeam,
}: {
  addTeam: (team: Omit<Team, "id">) => Promise<void> | void;
}) {
  return (
    <TeamFormDialog
      title="Додати команду"
      submitLabel="Додати"
      mode="create"
      enableLibrarySave
      saveToLibraryLabel="Додати та зберегти в бібліотеку"
      onSubmit={addTeam}
      trigger={
        <Button variant="ghost" size="icon" title="Додати команду">
          <Plus className="w-5 h-5 text-blue-600" />
        </Button>
      }
    />
  );
}

function LoadProtocolTeamsDialog({
  addTeamsBulk,
}: {
  addTeamsBulk: (teams: Array<Omit<Team, "id">>) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [leagues, setLeagues] = useState<ApiCompetition[]>([]);
  const [competitions, setCompetitions] = useState<ApiCompetition[]>([]);
  const [selectedLeague, setSelectedLeague] = useState("");
  const [selectedCompetition, setSelectedCompetition] = useState("");
  const [preview, setPreview] = useState<PreviewTeam[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [loadingCompetitions, setLoadingCompetitions] = useState(false);
  const [loadingProtocol, setLoadingProtocol] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadLeagues = useCallback(async () => {
    setLoadingLeagues(true);
    try {
      const res = await fetch(`${API_BASE_URL}/competitions?filter=&size=9&page=0`);
      const data = await res.json();
      const next: ApiCompetition[] = data?.competitions ?? [];
      setLeagues(next);
      if (!selectedLeague && next.length) setSelectedLeague(next[0].id);
    } catch (err) {
      console.error(err);
      toast.error("Не вдалося завантажити ліги");
    } finally {
      setLoadingLeagues(false);
    }
  }, [selectedLeague]);

  const loadCompetitions = useCallback(async (leagueId: string) => {
    setLoadingCompetitions(true);
    setCompetitions([]);
    setSelectedCompetition("");
    setPreview([]);
    try {
      const all: ApiCompetition[] = [];
      for (let page = 0; page < 30; page += 1) {
        const url = `${API_BASE_URL}/competitions?filter=&size=9&page=${page}&parentCompetitionId=${leagueId}`;
        const res = await fetch(url);
        const data = await res.json();
        const next: ApiCompetition[] = data?.competitions ?? [];
        all.push(...next);
        if (!next.length || next.length < 9) break;
      }
      const teamCompetitions = all.filter((competition) => competition.isTeam);
      const visible = teamCompetitions.length ? teamCompetitions : all;
      setCompetitions(visible);
      if (visible.length) setSelectedCompetition(visible[0].id);
    } catch (err) {
      console.error(err);
      toast.error("Не вдалося завантажити змагання");
    } finally {
      setLoadingCompetitions(false);
    }
  }, []);

  useEffect(() => {
    if (!open || leagues.length) return;
    void loadLeagues();
  }, [open, leagues.length, loadLeagues]);

  useEffect(() => {
    if (!selectedLeague) return;
    void loadCompetitions(selectedLeague);
  }, [selectedLeague, loadCompetitions]);

  const loadProtocolTeams = async () => {
    if (!selectedCompetition) return toast.error("Оберіть змагання");
    setLoadingProtocol(true);
    try {
      const [protocolRes, athletesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/competitions/${selectedCompetition}/protocol`),
        fetch(`${API_BASE_URL}/competitions/${selectedCompetition}/athletes`),
      ]);
      const protocol = protocolList(await protocolRes.json()).sort(
        (a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER)
      );
      const athletes: ApiTeam[] = (await athletesRes.json()) ?? [];
      const teamById = new Map<string, ApiTeam>();
      athletes.forEach((team) => {
        if (team.id) teamById.set(String(team.id), team);
      });

      const seen = new Set<string>();
      const next = protocol.flatMap((entry, index) => {
        const id = entry.userId ? String(entry.userId) : "";
        const name = apiTeamName(teamById.get(id));
        const key = name.toLowerCase();
        if (!id || !name || seen.has(key)) return [];
        seen.add(key);
        return [{
          id,
          name,
          rank: entry.rank ?? index + 1,
        }];
      });

      setPreview(next);
      if (next.length) toast.success(`Завантажено ${next.length} команд`);
      else toast.error("Команд у протоколі не знайдено");
    } catch (err) {
      console.error(err);
      toast.error("Помилка при завантаженні протоколу");
    } finally {
      setLoadingProtocol(false);
    }
  };

  const saveTeams = async () => {
    if (!preview.length) return toast.error("Немає команд для додавання");
    const confirmed = window.confirm(`Додати ${preview.length} команд до черги?`);
    if (!confirmed) return;
    setSaving(true);
    try {
      await addTeamsBulk(preview.map((team) => ({
        name: team.name,
        athletes: [],
      })));
      setOpen(false);
      setPreview([]);
    } catch (err) {
      console.error(err);
      toast.error("Не вдалося додати команди");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) setPreview([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Завантажити команди з протоколу">
          <Download className="w-5 h-5 text-amber-600" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Завантажити команди з протоколу</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label>Ліга</Label>
              <Select value={selectedLeague} onValueChange={setSelectedLeague}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Оберіть лігу" />
                </SelectTrigger>
                <SelectContent>
                  {loadingLeagues ? (
                    <SelectItem value="loading" disabled>
                      Завантаження...
                    </SelectItem>
                  ) : (
                    leagues.map((league) => (
                      <SelectItem key={league.id} value={league.id}>
                        <span>{league.title ?? "Ліга"}</span>
                        {league.date && <span>{formatApiDate(league.date)}</span>}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1">
              <Label>Змагання</Label>
              <Select
                value={selectedCompetition}
                onValueChange={(value) => {
                  setSelectedCompetition(value);
                  setPreview([]);
                }}
                disabled={loadingCompetitions || !competitions.length}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Оберіть змагання" />
                </SelectTrigger>
                <SelectContent>
                  {loadingCompetitions ? (
                    <SelectItem value="loading" disabled>
                      Завантаження...
                    </SelectItem>
                  ) : (
                    competitions.map((competition) => (
                      <SelectItem key={competition.id} value={competition.id}>
                        {competition.title ?? "Змагання"}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={loadProtocolTeams}
              disabled={loadingProtocol || loadingCompetitions || !selectedCompetition}
            >
              {loadingProtocol ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Завантаження
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Завантажити протокол
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Попередній список ({preview.length})</p>
            {preview.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Після завантаження тут з'являться команди з протоколу.
              </p>
            ) : (
              <div className="h-56 rounded border overflow-y-auto divide-y">
                {preview.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <span className="text-sm font-medium">{team.name}</span>
                    <span className="text-xs text-muted-foreground">
                      #{team.rank}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Скасувати
          </Button>
          <Button onClick={saveTeams} disabled={saving || !preview.length}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Додаємо...
              </>
            ) : (
              "Додати до черги"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditTeamDialog({
  team,
  updateTeam,
}: {
  team: Team;
  updateTeam: (team: Team, patch: Omit<Team, "id">) => Promise<void> | void;
}) {
  return (
    <TeamFormDialog
      title="Редагувати команду"
      submitLabel="Зберегти"
      mode="edit"
      enableLibrarySave
      saveToLibraryLabel="Зберегти та зберегти в бібліотеку"
      initialTeam={team}
      onSubmit={(patch) => updateTeam(team, patch)}
      trigger={
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-500 hover:text-gray-900"
          title="Редагувати команду"
        >
          <Pencil className="w-4 h-4" />
        </Button>
      }
    />
  );
}

function TeamAthletesList({
  athletes,
  centered = false,
  compact = false,
}: {
  athletes: string[];
  centered?: boolean;
  compact?: boolean;
}) {
  if (compact) {
    if (!athletes.length) {
      return (
        <p className="mt-2 text-xs text-muted-foreground">Немає атлетів</p>
      );
    }
    return (
      <div className="mt-2 space-y-0.5 text-left">
        {athletes.map((athlete, index) => (
          <div
            key={`${athlete}-${index}`}
            className="text-sm leading-snug text-gray-600 break-words"
          >
            {athlete}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={[
        "mt-3 space-y-2",
        centered ? "text-center" : "text-left",
      ].join(" ")}
    >
      {athletes.map((athlete, index) => (
        <div
          key={`${athlete}-${index}`}
          className="rounded-md bg-white px-3 py-1.5 text-base leading-tight text-gray-700 xl:text-xl"
        >
          {athlete}
        </div>
      ))}
    </div>
  );
}

function TeamAthletesCount({
  count,
  athletes,
}: {
  count: number;
  athletes: string[];
}) {
  const label =
    count === 1
      ? "атлет"
      : count > 1 && count < 5
        ? "атлети"
        : "атлетів";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Показати атлетів команди"
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md bg-slate-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-slate-300 active:bg-slate-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span>
            {count} {label}
          </span>
          <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-auto min-w-[10rem] max-w-[min(20rem,calc(100vw-2rem))] border-lime-300 bg-lime-200 p-3"
      >
        <p className="text-sm font-medium text-gray-900">Атлети:</p>
        {athletes.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">Немає атлетів</p>
        ) : (
          <div className="mt-1 space-y-1">
            {athletes.map((athlete, index) => (
              <div
                key={`${athlete}-${index}`}
                className="flex items-start gap-2 text-sm text-gray-700 break-words"
              >
                <span className="shrink-0 text-gray-500" aria-hidden>
                  •
                </span>
                <span>{athlete}</span>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function TeamCard({
  team,
  position,
  onFill,
  onRemove,
  onReturn,
  onEdit,
  showAthleteNames = false,
  doneIndex,
  doneTotal,
}: {
  team: Team;
  position?: number;
  onFill?: (team: Team) => Promise<void> | void;
  onRemove?: (team: Team) => Promise<void> | void;
  onReturn?: (team: Team) => Promise<void> | void;
  onEdit?: (team: Team, patch: Omit<Team, "id">) => Promise<void> | void;
  showAthleteNames?: boolean;
  doneIndex?: number;
  doneTotal?: number;
}) {
  const { isAdmin } = useAuth();
  const showAthleteList = isAdmin && showAthleteNames;
  const number =
    typeof doneIndex === "number" && typeof doneTotal === "number"
      ? doneTotal - doneIndex
      : position;

  return (
    <div className="relative bg-slate-100 rounded-lg p-3 space-y-3">
      {isAdmin && onEdit && (
        <div className="absolute right-3 top-3">
          <EditTeamDialog team={team} updateTeam={onEdit} />
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 pr-10">
          <div className="flex items-start gap-2">
            {number ? (
              <span className="mt-0.5 px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-xs shrink-0">
                #{number}
              </span>
            ) : null}
            <div className="min-w-0 font-semibold text-gray-900 break-words text-base leading-snug xl:text-lg">
              {team.name}
            </div>
          </div>
          {showAthleteList ? (
            <TeamAthletesList
              athletes={team.athletes ?? []}
              compact
            />
          ) : (
            <TeamAthletesCount
              count={team.athletes?.length ?? 0}
              athletes={team.athletes ?? []}
            />
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="flex justify-between gap-1 pt-2">
          {onRemove && (
            <Button
              onClick={() => onRemove(team)}
              variant="ghost"
              size="icon"
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          {onReturn && (
            <Button
              onClick={() => onReturn(team)}
              variant="ghost"
              size="icon"
              className="text-blue-500 hover:text-blue-700"
            >
              <ArrowBigLeft className="w-5 h-5" />
            </Button>
          )}
          {onFill && (
            <Button
              onClick={() => onFill(team)}
              variant="ghost"
              size="icon"
              className="text-blue-500 hover:text-blue-700"
            >
              <ArrowBigRight className="w-5 h-5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function TeamList({
  teams,
  competitionTeamNameKeys,
  addTeam,
  addTeamsBulk,
  fillLaneWithTeam,
  removeTeam,
  updateTeam,
  removeAllTeams,
  undoRemoveAllTeams,
  showAthleteNames = false,
  onToggleShowAthleteNames,
  collapsed = false,
  onToggleCollapse,
}: {
  teams: Team[];
  competitionTeamNameKeys: Set<string>;
  addTeam: (team: Omit<Team, "id">) => Promise<void> | void;
  addTeamsBulk: (teams: Array<Omit<Team, "id">>) => Promise<void> | void;
  fillLaneWithTeam: (team: Team) => Promise<void> | void;
  removeTeam: (team: Team) => Promise<void> | void;
  updateTeam: (team: Team, patch: Omit<Team, "id">) => Promise<void> | void;
  removeAllTeams?: () => Promise<void> | void;
  undoRemoveAllTeams?: () => Promise<void> | void;
  showAthleteNames?: boolean;
  onToggleShowAthleteNames?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const { isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const handleRemoveAll = async () => {
    if (!removeAllTeams) return;
    const confirm = window.prompt(
      "Введіть 'remove' або 'видалити' щоб підтвердити видалення ВСІХ команд"
    );
    if (!confirm) return;
    const ok =
      confirm.trim().toLowerCase() === "remove" ||
      confirm.trim().toLowerCase() === "видалити";
    if (!ok) {
      toast.error("Потрібно ввести 'remove' або 'видалити'");
      return;
    }
    await removeAllTeams();
  };

  const handleUndoRemoveAll = async () => {
    if (!undoRemoveAllTeams) return;
    const ok = window.confirm("Відновити останніх видалених команд?");
    if (!ok) return;
    await undoRemoveAllTeams();
  };
  const filteredTeams = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return teams;
    return teams.filter(
      (team) =>
        team.name.toLowerCase().includes(term) ||
        team.athletes?.some((athlete) => athlete.toLowerCase().includes(term))
    );
  }, [teams, searchTerm]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200 space-y-2">
        <div
          className={[
            "flex items-center justify-between gap-2",
            collapsed ? "xl:flex-col" : "",
          ].join(" ")}
        >
          <div
            className={[
              "flex items-center gap-2 min-w-0",
              collapsed ? "xl:[writing-mode:vertical-rl] xl:rotate-180" : "",
            ].join(" ")}
          >
            <Users
              className={[
                "w-5 h-5 text-gray-600",
                collapsed ? "xl:rotate-90" : "",
              ].join(" ")}
            />
            <h2 className="text-lg font-semibold whitespace-nowrap">
              Команди ({teams.length})
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {onToggleCollapse && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title={collapsed ? "Показати команди" : "Сховати команди"}
                onClick={onToggleCollapse}
              >
                {collapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {isAdmin && !collapsed && (
          <div className="flex items-center justify-center gap-1 pt-1">
            <TeamLibraryModal
              competitionTeamNameKeys={competitionTeamNameKeys}
              addTeam={addTeam}
            />
            <LoadProtocolTeamsDialog addTeamsBulk={addTeamsBulk} />
            <AddTeamDialog addTeam={addTeam} />
            <Button
              variant="ghost"
              size="icon"
              className="text-red-600 hover:text-red-800"
              title="Видалити всіх"
              onClick={handleRemoveAll}
            >
              <Trash2 className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-blue-600 hover:text-blue-800"
              title="Відмінити останнє видалення"
              onClick={handleUndoRemoveAll}
              disabled={!undoRemoveAllTeams}
            >
              <RotateCcw className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>

      {!collapsed && (
        <>
          <div className="p-4 border-t border-gray-200 space-y-2">
            <Input
              placeholder="Пошук команди або атлета"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {isAdmin && onToggleShowAthleteNames && (
              <Button
                type="button"
                size="sm"
                variant={showAthleteNames ? "default" : "outline"}
                className="w-full"
                title={
                  showAthleteNames
                    ? "Сховати імена атлетів"
                    : "Показати імена атлетів"
                }
                onClick={onToggleShowAthleteNames}
              >
                <List className="w-4 h-4 mr-1" />
                Показати атлетів
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredTeams.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                Немає команд у черзі
              </div>
            ) : (
              filteredTeams.map((team, index) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  position={index + 1}
                  onFill={fillLaneWithTeam}
                  onRemove={removeTeam}
                  onEdit={updateTeam}
                  showAthleteNames={showAthleteNames}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TeamBlock({
  title,
  team,
  tone,
  onReturn,
  onEdit,
  showAthletes = true,
}: {
  title: string;
  team: LaneTeam | null;
  tone: "green" | "yellow";
  onReturn: () => Promise<void> | void;
  onEdit?: (team: Team, patch: Omit<Team, "id">) => Promise<void> | void;
  showAthletes?: boolean;
}) {
  const { isAdmin } = useAuth();
  const color =
    tone === "green"
      ? "bg-green-200 border-green-400 text-green-900"
      : "bg-yellow-100 border-yellow-400 text-yellow-900";
  const titleColor = tone === "green" ? "text-green-800" : "text-yellow-800";

  return (
    <div className={`${color} relative border rounded-lg p-3 flex flex-col gap-2`}>
      {isAdmin && team && onEdit && (
        <div className="absolute right-3 top-3">
          <EditTeamDialog
            team={{ ...team, status: undefined }}
            updateTeam={onEdit}
          />
        </div>
      )}
      <div className="flex items-center justify-center gap-2">
        {isAdmin && team && (
          <Button
            size="icon"
            variant="outline"
            className="h-7 w-7"
            title="Повернути в чергу"
            onClick={onReturn}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <span className={`text-sm font-medium ${titleColor}`}>{title}</span>
      </div>
      {team ? (
        <div className="text-center">
          <div className="text-2xl xl:text-4xl font-semibold break-words">
            {team.name}
          </div>
          {showAthletes && <TeamAthletesList athletes={team.athletes} centered />}
        </div>
      ) : (
        <div className="text-center text-sm italic opacity-75">Порожньо</div>
      )}
    </div>
  );
}

function TeamLaneCard({
  lane,
  isPending,
  onDone,
  onReturnFromNow,
  onReturnFromReadyUp,
  onToggleLock,
  onRemoveLane,
  onEditTeam,
  onAddSkip,
  showAthletes = true,
}: {
  lane: TeamLaneModel;
  isPending: boolean;
  onDone: () => Promise<void> | void;
  onReturnFromNow: () => Promise<void> | void;
  onReturnFromReadyUp: () => Promise<void> | void;
  onToggleLock: () => Promise<void> | void;
  onRemoveLane: () => Promise<void> | void;
  onEditTeam: (team: Team, patch: Omit<Team, "id">) => Promise<void> | void;
  onAddSkip: () => Promise<void> | void;
  showAthletes?: boolean;
}) {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();

  return (
    <Card
      className={[
        "relative border border-gray-200 flex flex-col rounded-lg overflow-hidden",
        isPending ? "opacity-60 saturate-0" : "",
      ].join(" ")}
    >
      {lane.locked && (
        <div className="pointer-events-none absolute inset-0 bg-red-500/40 backdrop-brightness-95 flex flex-col items-center justify-center text-black z-10">
          <Lock className="w-16 h-16 mb-2" />
          <span className="text-3xl font-bold">{t("LaneLocked")}</span>
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {t("Lane")} {lane.id}
          </CardTitle>
          {isAdmin && (
            <Button
              size="icon"
              variant={lane.locked ? "destructive" : "outline"}
              className="h-8 w-8"
              onClick={onToggleLock}
              disabled={isPending}
            >
              {lane.locked ? (
                <Unlock className="w-4 h-4" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 flex-grow">
        <TeamBlock
          title={t("Now")}
          team={lane.team}
          tone="green"
          onReturn={onReturnFromNow}
          onEdit={onEditTeam}
          showAthletes={showAthletes}
        />
        <TeamBlock
          title={t("ReadyUp")}
          team={lane.readyUpTeam}
          tone="yellow"
          onReturn={onReturnFromReadyUp}
          onEdit={onEditTeam}
          showAthletes={showAthletes}
        />
      </CardContent>

      {isAdmin && (
        <div className="flex items-center gap-2 px-4 pb-3">
          <Button
            onClick={onAddSkip}
            size="sm"
            variant="outline"
            disabled={
              isPending || lane.locked || (!!lane.team && !!lane.readyUpTeam)
            }
          >
            Пропуск
          </Button>
          <Button
            onClick={onDone}
            size="sm"
            className="flex-1"
            disabled={isPending || lane.locked || !lane.team}
          >
            {t("Done")}
          </Button>
          {!lane.team && !lane.readyUpTeam && !lane.locked && (
            <Button
              onClick={onRemoveLane}
              size="icon"
              variant="outline"
              className="h-9 w-9 text-red-600 hover:text-red-800"
              disabled={isPending}
              title={t("Remove")}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

function TeamLanes({
  exerciseId,
  lanes,
  lanesPerRow,
  autoFillLanes,
  clearLane,
  clearAllLanes,
  returnFromNow,
  returnFromReadyUp,
  updateTeam,
  teamNamesOnly,
  onToggleTeamNamesOnly,
  onLanesPerRowChange,
}: {
  exerciseId: string;
  lanes: TeamLaneModel[];
  lanesPerRow: number;
  autoFillLanes: () => Promise<void> | void;
  clearLane: (laneId: number) => Promise<void> | void;
  clearAllLanes: () => Promise<void> | void;
  returnFromNow: (laneId: number) => Promise<void> | void;
  returnFromReadyUp: (laneId: number) => Promise<void> | void;
  updateTeam: (team: Team, patch: Omit<Team, "id">) => Promise<void> | void;
  teamNamesOnly: boolean;
  onToggleTeamNamesOnly: () => void;
  onLanesPerRowChange: (value: number) => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const [undoBusy, setUndoBusy] = useState(false);
  const [pendingLaneIds, setPendingLaneIds] = useState<Set<number>>(new Set());
  const [isLg, setIsLg] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches
  );
  const occupiedLanes = lanes.filter((lane) => lane.team).length;
  const gridCols = Math.min(lanesPerRow, Math.max(lanes.length, 1));

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsLg(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const withLanePending =
    (laneId: number, action: () => Promise<void> | void) => async () => {
      setPendingLaneIds((prev) => new Set(prev).add(laneId));
      try {
        await action();
      } finally {
        setPendingLaneIds((prev) => {
          const next = new Set(prev);
          next.delete(laneId);
          return next;
        });
      }
    };

  const addLane = async () => {
    const existingIds = lanes.map((lane) => lane.id).sort((a, b) => a - b);
    let newId = 1;
    while (existingIds.includes(newId)) newId += 1;
    await addDoc(collection(db, "exercises", exerciseId, "lanes"), {
      id: newId,
      team: null,
      readyUpTeam: null,
      locked: false,
      createdAt: serverTimestamp(),
    });
  };

  const removeLane = async (lane: TeamLaneModel) => {
    if (lane.team || lane.readyUpTeam) {
      toast.warning("Неможливо видалити доріжку, якщо на ній є команда");
      return;
    }
    if (lane.locked) {
      toast.warning("Неможливо видалити заблоковану доріжку");
      return;
    }
    await deleteDoc(doc(db, "exercises", exerciseId, "lanes", lane.laneDocId));
  };

  const addSkipToLane = async (lane: TeamLaneModel) => {
    if (lane.locked) return toast.error("Lane is locked");
    if (lane.team && lane.readyUpTeam) {
      return toast.error("На доріжці немає вільного місця");
    }

    const target: "team" | "readyUpTeam" = lane.team ? "readyUpTeam" : "team";
    const skipTeam: LaneTeam = {
      id: `skip-${Date.now()}`,
      name: "Пропуск",
      athletes: [],
    };
    const before = {
      team: lane.team ?? null,
      readyUpTeam: lane.readyUpTeam ?? null,
    };
    const after = {
      team: target === "team" ? skipTeam : before.team,
      readyUpTeam: target === "readyUpTeam" ? skipTeam : before.readyUpTeam,
    };
    const batch = writeBatch(db);
    batch.update(doc(db, "exercises", exerciseId, "lanes", lane.laneDocId), after);
    batch.set(doc(collection(db, "exercises", exerciseId, "actions")), {
      action: "teamFillLane",
      createdAt: serverTimestamp(),
      createdBy: null,
      lanes: [{ laneDocId: lane.laneDocId, laneId: lane.id, before, after }],
      teams: [],
      undone: false,
    } satisfies TeamActionHistory);
    await batch.commit();
  };

  const undoLastAction = async () => {
    try {
      const snap = await getDocs(
        query(
          collection(db, "exercises", exerciseId, "actions"),
          where("undone", "==", false),
          orderBy("createdAt", "desc"),
          limit(1)
        )
      );
      if (snap.empty) return toast.message("Nothing to undo");

      const actionDoc = snap.docs[0];
      const action = actionDoc.data() as TeamActionHistory;
      if (!action.teams) return toast.error("Last action is not a team action");

      const batch = writeBatch(db);
      action.lanes.forEach((patch) => {
        batch.update(doc(db, "exercises", exerciseId, "lanes", patch.laneDocId), {
          team: patch.before.team ?? null,
          readyUpTeam: patch.before.readyUpTeam ?? null,
        });
      });
      action.teams.forEach((patch) => {
        const update: Record<string, unknown> = {
          status: patch.beforeStatus ?? "waiting",
        };
        if (patch.beforeOrderRank !== undefined) {
          update.orderRank = patch.beforeOrderRank;
        }
        batch.update(doc(db, "exercises", exerciseId, "teams", patch.teamId), update);
      });
      batch.update(actionDoc.ref, { undone: true, undoneAt: serverTimestamp() });
      await batch.commit();
      toast.success("Undone");
    } catch (err) {
      console.error(err);
      toast.error("Failed to undo last action");
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Flag className="w-5 h-5 text-gray-600 shrink-0" />
            <h2 className="text-lg font-semibold whitespace-nowrap">
              {t("Lanes")} ({occupiedLanes}/{lanes.length})
            </h2>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={onToggleTeamNamesOnly}
                size="sm"
                variant={teamNamesOnly ? "default" : "outline"}
              >
                Лише назви
              </Button>
              <div className="flex items-center gap-1.5">
                <Label htmlFor="lanesPerRow" className="text-xs whitespace-nowrap">
                  {t("LanesPerRow")}
                </Label>
                <Select
                  value={String(lanesPerRow)}
                  onValueChange={(value) => onLanesPerRowChange(Number(value))}
                >
                  <SelectTrigger
                    id="lanesPerRow"
                    size="sm"
                    className="h-8 min-w-[4.25rem] shrink-0 px-2 [&_[data-slot=select-value]]:line-clamp-none"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            <Button onClick={autoFillLanes} size="sm" variant="outline" className="flex-1">
              <Zap className="w-4 h-4 mr-1" />
              {t("AutoFill")}
            </Button>
            <Button
              onClick={clearAllLanes}
              size="sm"
              variant="outline"
              className="flex-1"
              disabled={occupiedLanes === 0}
            >
              <ArrowBigRightDash className="w-4 h-4 mr-1" />
              {t("NextRound")}
            </Button>
            <Button onClick={addLane} size="sm" variant="outline" className="flex-1">
              <Plus className="w-4 h-4 mr-1" />
              {t("Lane")}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="flex-1">
                  <RotateCcw className="mr-1 h-4 w-4" />
                  {t("Undo")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("UndoLastActionQuestion")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("UndoDescription")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={undoBusy}>{t("Cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={undoBusy}
                    onClick={async () => {
                      setUndoBusy(true);
                      try {
                        await undoLastAction();
                      } finally {
                        setUndoBusy(false);
                      }
                    }}
                  >
                    {undoBusy ? t("Undoing") : t("YesUndo")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <div
        className={[
          "grid gap-3 m-3",
          lanes.length === 1 ? "max-w-3xl mx-auto w-full" : "",
          !isLg ? "grid-cols-1" : "",
        ].join(" ")}
        style={
          isLg
            ? { gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }
            : undefined
        }
      >
        {lanes.map((lane) => (
          <TeamLaneCard
            key={lane.id}
            lane={lane}
            isPending={pendingLaneIds.has(lane.id)}
            onDone={withLanePending(lane.id, () => clearLane(lane.id))}
            onReturnFromNow={withLanePending(lane.id, () => returnFromNow(lane.id))}
            onReturnFromReadyUp={withLanePending(lane.id, () =>
              returnFromReadyUp(lane.id)
            )}
            onToggleLock={withLanePending(lane.id, async () => {
              await updateDoc(
                doc(db, "exercises", exerciseId, "lanes", lane.laneDocId),
                { locked: !lane.locked }
              );
            })}
            onRemoveLane={withLanePending(lane.id, () => removeLane(lane))}
            onEditTeam={updateTeam}
            onAddSkip={withLanePending(lane.id, () => addSkipToLane(lane))}
            showAthletes={!teamNamesOnly}
          />
        ))}
      </div>
    </div>
  );
}

function DoneTeamsList({
  teams,
  returnDoneTeamToLane,
  updateTeam,
  removeAllDone,
  undoRemoveAllDone,
  showAthleteNames = false,
  collapsed = false,
  onToggleCollapse,
}: {
  teams: Team[];
  returnDoneTeamToLane: (team: Team) => Promise<void> | void;
  updateTeam: (team: Team, patch: Omit<Team, "id">) => Promise<void> | void;
  removeAllDone?: () => Promise<void> | void;
  undoRemoveAllDone?: () => Promise<void> | void;
  showAthleteNames?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const { isAdmin } = useAuth();

  const handleRemoveAllDone = async () => {
    if (!removeAllDone) return;
    const confirm = window.prompt(
      "Введіть 'remove' або 'видалити' щоб підтвердити видалення усіх завершених команд"
    );
    if (!confirm) return;
    const ok =
      confirm.trim().toLowerCase() === "remove" ||
      confirm.trim().toLowerCase() === "видалити";
    if (!ok) return;
    await removeAllDone();
  };

  const handleUndoRemoveAllDone = async () => {
    if (!undoRemoveAllDone) return;
    const ok = window.confirm("Відновити останніх видалених завершених команд?");
    if (!ok) return;
    await undoRemoveAllDone();
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <div
          className={[
            "flex items-center justify-between gap-2",
            collapsed ? "xl:flex-col" : "",
          ].join(" ")}
        >
          <div
            className={[
              "flex items-center gap-2 min-w-0",
              collapsed ? "xl:[writing-mode:vertical-rl] xl:rotate-180" : "",
            ].join(" ")}
          >
            <CheckCircle
              className={[
                "w-5 h-5 text-gray-600",
                collapsed ? "xl:rotate-90" : "",
              ].join(" ")}
            />
            <h2 className="text-lg font-semibold whitespace-nowrap">
              Завершено ({teams.length})
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {isAdmin && removeAllDone && !collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="text-red-600 hover:text-red-800"
                title="Видалити всіх завершених"
                onClick={handleRemoveAllDone}
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            )}
            {isAdmin && undoRemoveAllDone && !collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="text-blue-600 hover:text-blue-800"
                title="Відмінити останнє видалення"
                onClick={handleUndoRemoveAllDone}
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
            )}
            {onToggleCollapse && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title={collapsed ? "Показати завершені" : "Сховати завершені"}
                onClick={onToggleCollapse}
              >
                {collapsed ? (
                  <ChevronLeft className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {teams.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Завершених команд немає
            </div>
          ) : (
            teams.map((team, index) => (
              <TeamCard
                key={team.id}
                team={team}
                doneIndex={index}
                doneTotal={teams.length}
                onReturn={returnDoneTeamToLane}
                onEdit={updateTeam}
                showAthleteNames={showAthleteNames}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function TeamCompetitionPage({
  exerciseId,
  name,
  status,
  type,
  teamNamesOnly,
  lanesPerRow,
}: {
  exerciseId: string;
  name?: string;
  status: ExerciseStatus;
  type: ExerciseType;
  teamNamesOnly: boolean;
  lanesPerRow: number;
}) {
  const { t } = useTranslation();
  const { showAthleteNames, toggleShowAthleteNames } = useAdminTeamAthletesView();
  const [activeTab, setActiveTab] = useState<"teams" | "lanes" | "done">(
    () =>
      typeof window !== "undefined" && window.innerWidth < 1024
        ? "lanes"
        : "teams"
  );
  const [teamsCollapsed, setTeamsCollapsed] = useState(false);
  const [doneCollapsed, setDoneCollapsed] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [doneTeams, setDoneTeams] = useState<Team[]>([]);
  const [lanes, setLanes] = useState<TeamLaneModel[]>([]);

  useEffect(() => {
    const waitingQuery = query(
      collection(db, "exercises", exerciseId, "teams"),
      where("status", "==", "waiting"),
      orderBy("orderRank", "asc")
    );
    const doneQuery = query(
      collection(db, "exercises", exerciseId, "teams"),
      where("status", "==", "done"),
      orderBy("order", "desc")
    );
    const lanesQuery = query(
      collection(db, "exercises", exerciseId, "lanes"),
      orderBy("id", "asc")
    );

    const unsubWaiting = onSnapshot(waitingQuery, (snap) => {
      setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Team)));
    });
    const unsubDone = onSnapshot(doneQuery, (snap) => {
      setDoneTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Team)));
    });
    const unsubLanes = onSnapshot(lanesQuery, (snap) => {
      setLanes(
        snap.docs.map((d) => {
          const data = d.data() as FirestoreTeamLane;
          return {
            laneDocId: d.id,
            id: data.id,
            team: data.team ?? null,
            readyUpTeam: data.readyUpTeam ?? null,
            locked: !!data.locked,
          } as TeamLaneModel;
        })
      );
    });

    return () => {
      unsubWaiting();
      unsubDone();
      unsubLanes();
    };
  }, [exerciseId]);

  const competitionTeamNameKeys = useMemo(
    () => collectCompetitionTeamNameKeys(teams, doneTeams, lanes),
    [teams, doneTeams, lanes]
  );

  const addTeam = async (team: Omit<Team, "id">) => {
    if (isTeamNameTaken(team.name, competitionTeamNameKeys)) {
      toast.error(`Команда «${team.name.trim()}» уже є в цьому змаганні`);
      return;
    }
    const maxRank = Math.max(...teams.map((t) => t.orderRank ?? 0), 0);
    await addDoc(collection(db, "exercises", exerciseId, "teams"), {
      ...team,
      status: "waiting",
      orderRank: maxRank + 1,
      createdAt: serverTimestamp(),
    });
    toast.success("Команду додано");
  };

  const addTeamsBulk = async (newTeams: Array<Omit<Team, "id">>) => {
    if (!newTeams.length) return;

    const keys = new Set(competitionTeamNameKeys);
    const toAdd: Array<Omit<Team, "id">> = [];
    let skipped = 0;

    for (const team of newTeams) {
      if (isTeamNameTaken(team.name, keys)) {
        skipped += 1;
        continue;
      }
      keys.add(normalizeTeamName(team.name));
      toAdd.push(team);
    }

    if (!toAdd.length) {
      toast.error(
        skipped
          ? "Усі команди вже є в цьому змаганні"
          : "Немає команд для додавання"
      );
      return;
    }

    const maxRank = Math.max(...teams.map((t) => t.orderRank ?? 0), 0);
    const batch = writeBatch(db);
    toAdd.forEach((team, index) => {
      batch.set(doc(collection(db, "exercises", exerciseId, "teams")), {
        ...team,
        status: "waiting",
        orderRank: maxRank + index + 1,
        createdAt: serverTimestamp(),
      });
    });
    await batch.commit();

    if (skipped > 0) {
      toast.warning(
        `Додано ${toAdd.length} команд, пропущено ${skipped} дублів`
      );
    } else {
      toast.success(`Додано ${toAdd.length} команд`);
    }
  };

  const updateTeam = async (team: Team, patch: Omit<Team, "id">) => {
    const updatedTeam: LaneTeam = {
      id: team.id,
      name: patch.name.trim(),
      athletes: patch.athletes ?? [],
    };
    const batch = writeBatch(db);
    if (!isSyntheticTeam(team)) {
      batch.update(doc(db, "exercises", exerciseId, "teams", team.id), {
        name: updatedTeam.name,
        athletes: updatedTeam.athletes,
      });
    }

    lanes.forEach((lane) => {
      const laneUpdate: Record<string, LaneTeam> = {};
      if (lane.team?.id === team.id) laneUpdate.team = updatedTeam;
      if (lane.readyUpTeam?.id === team.id) {
        laneUpdate.readyUpTeam = updatedTeam;
      }
      if (Object.keys(laneUpdate).length) {
        batch.update(
          doc(db, "exercises", exerciseId, "lanes", lane.laneDocId),
          laneUpdate
        );
      }
    });

    await batch.commit();
    toast.success("Команду оновлено");
  };

  const removeTeam = async (team: Team) => {
    const batch = writeBatch(db);
    batch.update(doc(db, "exercises", exerciseId, "teams", team.id), {
      status: "done",
      order: Date.now(),
    });
    batch.set(doc(collection(db, "exercises", exerciseId, "actions")), {
      action: "teamReturnDone",
      createdAt: serverTimestamp(),
      createdBy: null,
      lanes: [],
      teams: [teamPatch(team.id, team.status, "done", team.orderRank)],
      undone: false,
    } satisfies TeamActionHistory);
    await batch.commit();
  };

  const removeAllTeamsByStatus = async (status: "waiting" | "done") => {
    try {
      const q = query(
        collection(db, "exercises", exerciseId, "teams"),
        where("status", "==", status)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        toast.info(status === "waiting" ? "Список порожній" : "Завершених немає");
        return;
      }

      const snapshot = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      await addDoc(collection(db, "exercises", exerciseId, "removalLogs"), {
        status,
        teams: snapshot,
        createdAt: serverTimestamp(),
      });

      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      toast.success(
        status === "waiting"
          ? "Усі команди видалені"
          : "Усі завершені команди видалені"
      );
    } catch (err) {
      console.error(err);
      toast.error("Не вдалося очистити список");
    }
  };

  const undoLastTeamRemoval = async (status: "waiting" | "done") => {
    try {
      const logQuery = query(
        collection(db, "exercises", exerciseId, "removalLogs"),
        where("status", "==", status),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      const logSnap = await getDocs(logQuery);
      if (logSnap.empty) {
        toast.info("Немає що відновити");
        return;
      }
      const logDoc = logSnap.docs[0];
      const data = logDoc.data() as { teams?: Team[] };
      const teamsToRestore: Team[] = data.teams ?? [];
      if (!teamsToRestore.length) {
        toast.info("Лог порожній");
        return;
      }

      const batch = writeBatch(db);
      let baseRank = 0;
      if (status === "waiting") {
        baseRank = Math.max(...teams.map((t) => t.orderRank ?? 0), 0);
      }

      teamsToRestore.forEach((team, idx) => {
        const ref = team.id
          ? doc(db, "exercises", exerciseId, "teams", team.id)
          : doc(collection(db, "exercises", exerciseId, "teams"));

        const payload: Record<string, unknown> = {
          ...team,
          status: team.status ?? status,
          createdAt: serverTimestamp(),
        };

        if (status === "waiting") {
          payload.orderRank = baseRank + idx + 1;
        } else if (status === "done") {
          payload.order = team.order ?? Date.now() - idx;
        }

        Object.keys(payload).forEach((k) => {
          if (payload[k] === undefined) delete payload[k];
        });

        batch.set(ref, payload);
      });

      batch.delete(logDoc.ref);
      await batch.commit();
      toast.success(
        status === "waiting"
          ? "Повернули видалені команди"
          : "Повернули завершені команди"
      );
    } catch (err) {
      console.error(err);
      toast.error("Не вдалося відновити");
    }
  };

  const fillLaneWithTeam = async (team: Team) => {
    const nowLane = lanes.find((lane) => !lane.locked && !lane.team);
    const readyLane = nowLane
      ? null
      : lanes.find((lane) => !lane.locked && lane.team && !lane.readyUpTeam);
    const target = nowLane ?? readyLane;
    const slot = nowLane ? "team" : readyLane ? "readyUpTeam" : null;
    if (!target || !slot) return toast.error("Немає доступної доріжки");

    await runTransaction(db, async (tx) => {
      const laneRef = doc(db, "exercises", exerciseId, "lanes", target.laneDocId);
      const teamRef = doc(db, "exercises", exerciseId, "teams", team.id);
      const [laneSnap, teamSnap] = await Promise.all([tx.get(laneRef), tx.get(teamRef)]);
      if (!laneSnap.exists() || !teamSnap.exists()) throw new Error("Team or lane disappeared");
      const laneData = laneSnap.data() as FirestoreTeamLane;
      if (slot === "team" && laneData.team) throw new Error("Lane is occupied");
      if (slot === "readyUpTeam" && (!laneData.team || laneData.readyUpTeam)) {
        throw new Error("Ready up is occupied");
      }

      const before = {
        team: laneData.team ?? null,
        readyUpTeam: laneData.readyUpTeam ?? null,
      };
      const payload = teamPayload(team);
      const after = {
        team: slot === "team" ? payload : before.team,
        readyUpTeam: slot === "readyUpTeam" ? payload : before.readyUpTeam,
      };

      tx.update(laneRef, after);
      tx.update(teamRef, { status: slot === "team" ? "lane" : "ready" });
      tx.set(doc(collection(db, "exercises", exerciseId, "actions")), {
        action: "teamFillLane",
        createdAt: serverTimestamp(),
        createdBy: null,
        lanes: [{ laneDocId: target.laneDocId, laneId: target.id, before, after }],
        teams: [
          teamPatch(
            team.id,
            (teamSnap.data() as Team).status,
            slot === "team" ? "lane" : "ready",
            (teamSnap.data() as Team).orderRank
          ),
        ],
        undone: false,
      } satisfies TeamActionHistory);
    });
  };

  const autoFillLanes = async () => {
    const queue = [...teams];
    if (!queue.length) return toast.error("Немає команд для заповнення");

    const batch = writeBatch(db);
    const lanePatches: TeamLanePatch[] = [];
    const teamPatches: TeamPatch[] = [];

    for (const lane of lanes.filter((l) => !l.locked && !l.team)) {
      const nextTeam = queue.shift();
      if (!nextTeam) break;
      const payload = teamPayload(nextTeam);
      const before = { team: lane.team, readyUpTeam: lane.readyUpTeam };
      const after = { team: payload, readyUpTeam: lane.readyUpTeam };
      lanePatches.push({ laneDocId: lane.laneDocId, laneId: lane.id, before, after });
      teamPatches.push(teamPatch(nextTeam.id, "waiting", "lane", nextTeam.orderRank));
      batch.update(doc(db, "exercises", exerciseId, "lanes", lane.laneDocId), after);
      batch.update(doc(db, "exercises", exerciseId, "teams", nextTeam.id), {
        status: "lane",
      });
    }

    for (const lane of lanes.filter((l) => !l.locked && l.team && !l.readyUpTeam)) {
      const nextTeam = queue.shift();
      if (!nextTeam) break;
      const payload = teamPayload(nextTeam);
      const before = { team: lane.team, readyUpTeam: lane.readyUpTeam };
      const after = { team: lane.team, readyUpTeam: payload };
      lanePatches.push({ laneDocId: lane.laneDocId, laneId: lane.id, before, after });
      teamPatches.push(teamPatch(nextTeam.id, "waiting", "ready", nextTeam.orderRank));
      batch.update(doc(db, "exercises", exerciseId, "lanes", lane.laneDocId), after);
      batch.update(doc(db, "exercises", exerciseId, "teams", nextTeam.id), {
        status: "ready",
      });
    }

    if (!lanePatches.length) return toast.error("Немає доріжок для заповнення");
    batch.set(doc(collection(db, "exercises", exerciseId, "actions")), {
      action: "teamAutofill",
      createdAt: serverTimestamp(),
      createdBy: null,
      lanes: lanePatches,
      teams: teamPatches,
      undone: false,
    } satisfies TeamActionHistory);
    await batch.commit();
  };

  const clearLane = async (laneId: number) => {
    const lane = lanes.find((l) => l.id === laneId);
    if (!lane) return toast.error("Lane not found");

    await runTransaction(db, async (tx) => {
      const laneRef = doc(db, "exercises", exerciseId, "lanes", lane.laneDocId);
      const laneSnap = await tx.get(laneRef);
      if (!laneSnap.exists()) throw new Error("Lane disappeared");
      const data = laneSnap.data() as FirestoreTeamLane;
      const before = {
        team: data.team ?? null,
        readyUpTeam: data.readyUpTeam ?? null,
      };
      const after = {
        team: data.readyUpTeam ? { ...data.readyUpTeam } : null,
        readyUpTeam: null,
      };
      const teamPatches: TeamPatch[] = [];
      if (data.team?.id && !isSyntheticTeam(data.team)) {
        tx.update(doc(db, "exercises", exerciseId, "teams", data.team.id), {
          status: "done",
          order: Date.now(),
        });
        teamPatches.push(teamPatch(data.team.id, "lane", "done"));
      }
      if (data.readyUpTeam?.id && !isSyntheticTeam(data.readyUpTeam)) {
        tx.update(doc(db, "exercises", exerciseId, "teams", data.readyUpTeam.id), {
          status: "lane",
        });
        teamPatches.push(teamPatch(data.readyUpTeam.id, "ready", "lane"));
      }
      tx.update(laneRef, after);
      tx.set(doc(collection(db, "exercises", exerciseId, "actions")), {
        action: "teamClearLane",
        createdAt: serverTimestamp(),
        createdBy: null,
        lanes: [{ laneDocId: lane.laneDocId, laneId: lane.id, before, after }],
        teams: teamPatches,
        undone: false,
      } satisfies TeamActionHistory);
    });
  };

  const clearAllLanes = async () => {
    const batch = writeBatch(db);
    const lanePatches: TeamLanePatch[] = [];
    const teamPatches: TeamPatch[] = [];

    for (const lane of lanes.filter((l) => !l.locked && (l.team || l.readyUpTeam))) {
      const before = { team: lane.team, readyUpTeam: lane.readyUpTeam };
      const after = {
        team: lane.readyUpTeam ? { ...lane.readyUpTeam } : null,
        readyUpTeam: null,
      };
      if (lane.team && !isSyntheticTeam(lane.team)) {
        batch.update(doc(db, "exercises", exerciseId, "teams", lane.team.id), {
          status: "done",
          order: Date.now(),
        });
        teamPatches.push(teamPatch(lane.team.id, "lane", "done"));
      }
      if (lane.readyUpTeam && !isSyntheticTeam(lane.readyUpTeam)) {
        batch.update(doc(db, "exercises", exerciseId, "teams", lane.readyUpTeam.id), {
          status: "lane",
        });
        teamPatches.push(teamPatch(lane.readyUpTeam.id, "ready", "lane"));
      }
      batch.update(doc(db, "exercises", exerciseId, "lanes", lane.laneDocId), after);
      lanePatches.push({ laneDocId: lane.laneDocId, laneId: lane.id, before, after });
    }

    if (!lanePatches.length) return toast.error("Немає доріжок для оновлення");
    batch.set(doc(collection(db, "exercises", exerciseId, "actions")), {
      action: "teamNextRound",
      createdAt: serverTimestamp(),
      createdBy: null,
      lanes: lanePatches,
      teams: teamPatches,
      undone: false,
    } satisfies TeamActionHistory);
    await batch.commit();
  };

  const returnTeamToWaiting = async (laneId: number, slot: "team" | "readyUpTeam") => {
    const lane = lanes.find((l) => l.id === laneId);
    if (!lane) return toast.error("Lane not found");
    if (lane.locked) return toast.error("Lane is locked");

    await runTransaction(db, async (tx) => {
      const laneRef = doc(db, "exercises", exerciseId, "lanes", lane.laneDocId);
      const metaRef = doc(db, "exercises", exerciseId, "meta", "teamOrdering");
      const [laneSnap, metaSnap] = await Promise.all([tx.get(laneRef), tx.get(metaRef)]);
      if (!laneSnap.exists()) throw new Error("Lane disappeared");
      const data = laneSnap.data() as FirestoreTeamLane;
      let topCounter = metaSnap.exists() ? Number(metaSnap.data().topCounter ?? 0) : 0;
      topCounter -= 1;

      const returning = slot === "team" ? data.team : data.readyUpTeam;
      if (!returning?.id) throw new Error("No team in slot");

      const before = { team: data.team ?? null, readyUpTeam: data.readyUpTeam ?? null };
      const after =
        slot === "team"
          ? {
              team: data.readyUpTeam ? { ...data.readyUpTeam } : null,
              readyUpTeam: null,
            }
          : { team: data.team ?? null, readyUpTeam: null };
      const patches: TeamPatch[] = [];
      if (!isSyntheticTeam(returning)) {
        patches.push(
          teamPatch(
            returning.id,
            slot === "team" ? "lane" : "ready",
            "waiting",
            undefined,
            topCounter
          )
        );
        tx.update(doc(db, "exercises", exerciseId, "teams", returning.id), {
          status: "waiting",
          orderRank: topCounter,
        });
      }
      if (
        slot === "team" &&
        data.readyUpTeam?.id &&
        !isSyntheticTeam(data.readyUpTeam)
      ) {
        tx.update(doc(db, "exercises", exerciseId, "teams", data.readyUpTeam.id), {
          status: "lane",
        });
        patches.push(teamPatch(data.readyUpTeam.id, "ready", "lane"));
      }
      tx.update(laneRef, after);
      tx.set(metaRef, { topCounter }, { merge: true });
      tx.set(doc(collection(db, "exercises", exerciseId, "actions")), {
        action: "teamReturnToWaiting",
        createdAt: serverTimestamp(),
        createdBy: null,
        lanes: [{ laneDocId: lane.laneDocId, laneId: lane.id, before, after }],
        teams: patches,
        undone: false,
      } satisfies TeamActionHistory);
    });
  };

  const returnDoneTeamToLane = async (team: Team) => {
    await fillLaneWithTeam(team);
  };

  const toggleTeamNamesOnly = async () => {
    await updateDoc(doc(db, "exercises", exerciseId), {
      teamNamesOnly: !teamNamesOnly,
    });
  };

  const setLanesPerRow = async (value: number) => {
    await updateDoc(doc(db, "exercises", exerciseId), {
      lanesPerRow: value,
    });
  };

  const activeLanesCount = lanes.filter((lane) => !!lane.team).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <CompetitionHeader exerciseId={exerciseId} name={name} status={status} type={type} />

      <div className="hidden xl:flex">
        <div
          className={[
            "border-r border-gray-200 bg-white transition-[width] duration-200",
            teamsCollapsed ? "w-16" : "w-1/5",
          ].join(" ")}
        >
          <TeamList
            teams={teams}
            competitionTeamNameKeys={competitionTeamNameKeys}
            addTeam={addTeam}
            addTeamsBulk={addTeamsBulk}
            fillLaneWithTeam={fillLaneWithTeam}
            removeTeam={removeTeam}
            updateTeam={updateTeam}
            removeAllTeams={() => removeAllTeamsByStatus("waiting")}
            undoRemoveAllTeams={() => undoLastTeamRemoval("waiting")}
            showAthleteNames={showAthleteNames}
            onToggleShowAthleteNames={toggleShowAthleteNames}
            collapsed={teamsCollapsed}
            onToggleCollapse={() => setTeamsCollapsed((prev) => !prev)}
          />
        </div>
        <div className="flex-1 border-r border-gray-200 bg-white">
          <TeamLanes
            exerciseId={exerciseId}
            lanes={lanes}
            lanesPerRow={lanesPerRow}
            autoFillLanes={autoFillLanes}
            clearLane={clearLane}
            clearAllLanes={clearAllLanes}
            returnFromNow={(laneId) => returnTeamToWaiting(laneId, "team")}
            returnFromReadyUp={(laneId) => returnTeamToWaiting(laneId, "readyUpTeam")}
            updateTeam={updateTeam}
            teamNamesOnly={teamNamesOnly}
            onToggleTeamNamesOnly={toggleTeamNamesOnly}
            onLanesPerRowChange={setLanesPerRow}
          />
        </div>
        <div
          className={[
            "bg-white transition-[width] duration-200",
            doneCollapsed ? "w-16" : "w-1/5",
          ].join(" ")}
        >
          <DoneTeamsList
            teams={doneTeams}
            returnDoneTeamToLane={returnDoneTeamToLane}
            updateTeam={updateTeam}
            removeAllDone={() => removeAllTeamsByStatus("done")}
            undoRemoveAllDone={() => undoLastTeamRemoval("done")}
            showAthleteNames={showAthleteNames}
            collapsed={doneCollapsed}
            onToggleCollapse={() => setDoneCollapsed((prev) => !prev)}
          />
        </div>
      </div>

      <div className="xl:hidden h-[calc(100vh-80px)] bg-white">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="h-full flex flex-col">
          <div className="border-b border-gray-200 px-4">
            <TabsList className="grid w-full grid-cols-3 bg-gray-50">
              <TabsTrigger value="teams" className="flex items-center gap-1 sm:gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Команди</span>
                <span>({teams.length})</span>
              </TabsTrigger>
              <TabsTrigger value="lanes" className="flex items-center gap-1 sm:gap-2">
                <Flag className="w-4 h-4" />
                <span className="hidden sm:inline">{t("Lanes")}</span>
                <span>({activeLanesCount}/{lanes.length})</span>
              </TabsTrigger>
              <TabsTrigger value="done" className="flex items-center gap-1 sm:gap-2">
                <CheckCircle className="w-4 h-4" />
                <span className="hidden sm:inline">{t("Done")}</span>
                <span>({doneTeams.length})</span>
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="teams" className="flex-1 m-0">
            <TeamList
              teams={teams}
              competitionTeamNameKeys={competitionTeamNameKeys}
              addTeam={addTeam}
              addTeamsBulk={addTeamsBulk}
              fillLaneWithTeam={fillLaneWithTeam}
              removeTeam={removeTeam}
              updateTeam={updateTeam}
              removeAllTeams={() => removeAllTeamsByStatus("waiting")}
              undoRemoveAllTeams={() => undoLastTeamRemoval("waiting")}
              showAthleteNames={showAthleteNames}
              onToggleShowAthleteNames={toggleShowAthleteNames}
            />
          </TabsContent>
          <TabsContent value="lanes" className="flex-1 m-0">
            <TeamLanes
              exerciseId={exerciseId}
              lanes={lanes}
              lanesPerRow={lanesPerRow}
              autoFillLanes={autoFillLanes}
              clearLane={clearLane}
              clearAllLanes={clearAllLanes}
              returnFromNow={(laneId) => returnTeamToWaiting(laneId, "team")}
              returnFromReadyUp={(laneId) => returnTeamToWaiting(laneId, "readyUpTeam")}
              updateTeam={updateTeam}
              teamNamesOnly={teamNamesOnly}
              onToggleTeamNamesOnly={toggleTeamNamesOnly}
              onLanesPerRowChange={setLanesPerRow}
            />
          </TabsContent>
          <TabsContent value="done" className="flex-1 m-0">
            <DoneTeamsList
              teams={doneTeams}
              returnDoneTeamToLane={returnDoneTeamToLane}
              updateTeam={updateTeam}
              removeAllDone={() => removeAllTeamsByStatus("done")}
              undoRemoveAllDone={() => undoLastTeamRemoval("done")}
              showAthleteNames={showAthleteNames}
            />
          </TabsContent>
        </Tabs>
      </div>
      <ScrollToTopButton />
    </div>
  );
}
