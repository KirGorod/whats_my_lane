import { ReactNode, useEffect, useMemo, useState } from "react";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Badge } from "../../../components/ui/badge";
import { toast } from "sonner";
import { Download, Loader2, UsersRound, X } from "lucide-react";
import { COMPETITOR_CATEGORIES } from "../../../types/competitor";

type ApiCompetition = {
  id: string;
  title?: string;
  limitationGroup?: string | null;
  category?: string | null;
  date?: string;
  exercises?: Array<{
    id?: string;
    name?: string;
    identifier?: string;
  }>;
};

type ApiAthlete = {
  id?: string;
  name?: string | null;
  lastName?: string | null;
};

type PreviewAthlete = {
  id: string;
  name: string;
  category: string;
  competitionTitle: string;
  isFemale?: boolean;
};

type LoadAthletesDialogProps = {
  addCompetitor: (c: { name: string; category: string }) => Promise<void> | void;
  addCompetitorsBulk?: (
    list: Array<{ name: string; category: string }>
  ) => Promise<void> | void;
  triggerButtonClass?: string;
  triggerIcon?: ReactNode;
};

const EXERCISES = [
  { id: "663d514f580d117febe47864", name: "Ейрбайк" },
  { id: "663d5132580d117febe47863", name: "Жим лежачи на рази" },
  { id: "663d5273580d117febe47866", name: "Ривок гирі" },
  { id: "663d51a8580d117febe47865", name: "Веслування на тренажері" },
] as const;

const BASE_URL = "https://apitrenvet.allstrongman.com/api";

const normalizeCategory = (raw?: string | null) =>
  (raw ?? "").trim().toLowerCase();

const isFemaleCompetition = (comp?: ApiCompetition) =>
  (comp?.title ?? "").toUpperCase().includes("ЖІНКИ");

const formatDate = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "short",
  }).format(d);
};

export default function LoadAthletesDialog({
  addCompetitor,
  addCompetitorsBulk,
  triggerButtonClass,
  triggerIcon,
}: LoadAthletesDialogProps) {
  const [open, setOpen] = useState(false);
  const [leagues, setLeagues] = useState<ApiCompetition[]>([]);
  const [competitions, setCompetitions] = useState<ApiCompetition[]>([]);
  const [selectedLeague, setSelectedLeague] = useState("");
  const [selectedExercise, setSelectedExercise] = useState(EXERCISES[0].id);
  const [selectedCompetitionIds, setSelectedCompetitionIds] = useState<
    Set<string>
  >(new Set());
  const [fallbackCategory, setFallbackCategory] = useState("h1");
  const [excludeWomen, setExcludeWomen] = useState(true);
  const [missingCategories, setMissingCategories] = useState<string[]>([]);

  const [preview, setPreview] = useState<PreviewAthlete[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [loadingCompetitions, setLoadingCompetitions] = useState(false);
  const [loadingAthletes, setLoadingAthletes] = useState(false);
  const [saving, setSaving] = useState(false);

  const validCategories = useMemo(
    () => new Set(COMPETITOR_CATEGORIES.map((c) => c.toLowerCase())),
    []
  );

  const defaultTriggerIcon = useMemo(
    () => <UsersRound className="w-5 h-5 text-amber-600" />,
    []
  );

  useEffect(() => {
    if (!open) return;
    if (leagues.length) return;
    void loadLeagues();
  }, [open]);

  useEffect(() => {
    if (!selectedLeague || !selectedExercise) return;
    void loadCompetitions(selectedLeague, selectedExercise);
  }, [selectedLeague, selectedExercise, excludeWomen]);

  const loadLeagues = async () => {
    setLoadingLeagues(true);
    try {
      const res = await fetch(`${BASE_URL}/competitions?size=9&page=0`);
      const data = await res.json();
      const comps = data?.competitions ?? [];
      setLeagues(comps);
      if (!selectedLeague && comps.length) {
        setSelectedLeague(comps[0].id);
      }
    } catch (err) {
      console.error(err);
      toast.error("Не вдалося завантажити ліги");
    } finally {
      setLoadingLeagues(false);
    }
  };

  const loadCompetitions = async (leagueId: string, exerciseId: string) => {
    setLoadingCompetitions(true);
    setCompetitions([]);
    setSelectedCompetitionIds(new Set());
    setPreview([]);
    setMissingCategories([]);
    try {
      const all: ApiCompetition[] = [];
      for (let page = 0; page < 30; page++) {
        const url = `${BASE_URL}/competitions?filter=&parentCompetitionId=${leagueId}&size=10&page=${page}`;
        console.log(url);
        const res = await fetch(url);
        console.log(res);
        const data = await res.json();
        const comps: ApiCompetition[] = data?.competitions ?? [];
        all.push(...comps);

        // Stop when API returns empty page (no more data) or when we hit the natural last page (< page size)
        if (!comps.length || comps.length < 10) break;
      }
      console.log("competitions count:", all.length);
      const comps = all.filter(
        (c) => !excludeWomen || !isFemaleCompetition(c)
      );
      // filter to matching exercise if present; otherwise show all
      const matches = comps.filter((c) =>
        (c.exercises ?? []).some((ex) => ex.identifier === exerciseId)
      );
      const visible = (matches.length ? matches : comps).sort(
        (a, b) => Number(isFemaleCompetition(a)) - Number(isFemaleCompetition(b))
      );
      const preselected = matches.length ? matches : comps;
      const requiredCategories = COMPETITOR_CATEGORIES.filter(
        (cat) => !cat.toLowerCase().startsWith("w")
      );
      const presentCategories = new Set<string>();
      visible.forEach((c) => {
        const cat =
          normalizeCategory(c.limitationGroup) ||
          normalizeCategory(fallbackCategory);
        if (cat && !cat.startsWith("w")) presentCategories.add(cat);
      });
      const missing = requiredCategories.filter(
        (cat) => !presentCategories.has(cat.toLowerCase())
      );

      setCompetitions(visible);
      setSelectedCompetitionIds(new Set(preselected.map((c) => c.id)));
      setMissingCategories(missing);
    } catch (err) {
      console.error(err);
      toast.error("Не вдалося завантажити під-турніри");
    } finally {
      setLoadingCompetitions(false);
    }
  };

  const toggleCompetition = (id: string) => {
    setSelectedCompetitionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const loadAthletes = async () => {
    if (!selectedCompetitionIds.size) {
      return toast.error("Обери хоч один під-турнір");
    }
    setLoadingAthletes(true);
    const next: PreviewAthlete[] = [];
    const dedup = new Set<string>();
    let skippedInvalid = 0;

    try {
      for (const compId of selectedCompetitionIds) {
        const comp = competitions.find((c) => c.id === compId);
        const category =
          normalizeCategory(comp?.limitationGroup) ||
          normalizeCategory(fallbackCategory);
        if (!category || !validCategories.has(category)) {
          skippedInvalid += 1;
          continue;
        }

        const athletesURL = `${BASE_URL}/competitions/${compId}/athletes`;
        console.log("Athletes URL: ", athletesURL);
        const res = await fetch(athletesURL);
        const athletes: ApiAthlete[] = (await res.json()) ?? [];

        const compTitle = comp?.title ?? "Competition";
        const isFemaleComp =
          (compTitle ?? "").toUpperCase().includes("ЖІНКИ");

        athletes.forEach((ath, idx) => {
          const fullName = `${ath.lastName ?? ""} ${ath.name ?? ""}`.trim();
          if (!fullName) return;
          const key = `${fullName.toLowerCase()}|${category}`;
          if (dedup.has(key)) return;
          dedup.add(key);
          next.push({
            id: `${compId}-${ath.id ?? idx}`,
            name: fullName,
            category,
            competitionTitle: compTitle,
            isFemale: isFemaleComp,
          });
        });
      }

      setPreview(next);
      if (next.length) {
        toast.success(`Завантажено ${next.length} атлетів`);
      } else {
        toast.error("Атлетів не знайдено");
      }
      if (skippedInvalid) {
        toast.warning(
          `Пропущено ${skippedInvalid} під-турнір(ів) через невідому категорію. ${
            fallbackCategory
              ? "Перевір fallback або групу під-турніру."
              : "Спробуй вказати fallback категорію."
          }`
        );
      }
    } catch (err) {
      console.error(err);
      toast.error("Помилка при завантаженні атлетів");
    } finally {
      setLoadingAthletes(false);
    }
  };

  const removePreview = (id: string) => {
    setPreview((prev) => prev.filter((p) => p.id !== id));
  };

  const saveCompetitors = async () => {
    if (!preview.length) return toast.error("Немає кого додавати");
    const confirmed = window.confirm(
      `Are you sure you want to add ${preview.length} competitors?`
    );
    if (!confirmed) return;
    setSaving(true);
    try {
      const payload = preview.map((p) => ({
        name: p.name,
        category: p.category,
        isFemale: p.isFemale ?? false,
      }));
      if (addCompetitorsBulk) {
        await addCompetitorsBulk(payload);
      } else {
        for (const item of payload) {
          // fallback to single add if bulk not provided
          await addCompetitor(item);
        }
        toast.success(`Додано ${payload.length} атлетів`);
      }
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Не вдалося додати атлетів");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) {
      setPreview([]);
      setSelectedCompetitionIds(new Set());
      setFallbackCategory("h1");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={triggerButtonClass ?? "text-amber-700 hover:text-amber-900"}
          title="Load athletes from API"
        >
          {triggerIcon ?? defaultTriggerIcon}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Завантажити атлетів</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Ліга</p>
              <Select
                value={selectedLeague}
                onValueChange={(v) => setSelectedLeague(v)}
              >
                <SelectTrigger className="w-full justify-between">
                  <SelectValue placeholder="Оберіть лігу" className="truncate" />
                </SelectTrigger>
                <SelectContent>
                  {loadingLeagues ? (
                    <SelectItem value="loading">Завантаження...</SelectItem>
                  ) : (
                    leagues.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        <div className="flex items-center gap-2">
                          <span>{l.title ?? "Ліга"}</span>
                          {l.date && (
                            <Badge variant="secondary">{formatDate(l.date)}</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Вправа</p>
              <Select
                value={selectedExercise}
                onValueChange={(v) => setSelectedExercise(v)}
              >
                <SelectTrigger className="w-full justify-between">
                  <SelectValue placeholder="Оберіть вправу" className="truncate" />
                </SelectTrigger>
                <SelectContent>
                  {EXERCISES.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 text-sm text-muted-foreground select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-amber-600"
                  checked={excludeWomen}
                  onChange={(e) => setExcludeWomen(e.target.checked)}
                />
                <span>Без жінок</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                Під-турніри ({competitions.length})
              </p>
              <span className="text-xs text-muted-foreground">
                Обрано: {selectedCompetitionIds.size}/{competitions.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!competitions.length}
                onClick={() =>
                  setSelectedCompetitionIds(new Set(competitions.map((c) => c.id)))
                }
              >
                Вибрати всі
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!selectedCompetitionIds.size}
                onClick={() => setSelectedCompetitionIds(new Set())}
              >
                Скинути
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!competitions.length}
                onClick={() =>
                  setSelectedCompetitionIds(
                    new Set(
                      competitions
                        .filter((c) => !isFemaleCompetition(c))
                        .map((c) => c.id)
                    )
                  )
                }
              >
                Тільки чоловіки
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!competitions.length}
                onClick={() =>
                  setSelectedCompetitionIds(
                    new Set(
                      competitions
                        .filter((c) => isFemaleCompetition(c))
                        .map((c) => c.id)
                    )
                  )
                }
              >
                Тільки жінки
              </Button>
            </div>
            {competitions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Оберіть лігу та вправу, щоб побачити під-турніри.
              </p>
            ) : (
              <div className="h-64 rounded border overflow-y-auto divide-y">
                {competitions.map((c) => {
                  const checked = selectedCompetitionIds.has(c.id);
                  const cat =
                    normalizeCategory(c.limitationGroup) ||
                    normalizeCategory(fallbackCategory);
                  return (
                    <label
                      key={c.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">
                          {c.title ?? "Під-турнір"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {cat ? `Група: ${cat}` : "Група не вказана"}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCompetition(c.id)}
                        className="h-4 w-4 accent-amber-600"
                      />
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              Категорії з API мають співпасти з локальними:{" "}
              {COMPETITOR_CATEGORIES.join(", ")}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={loadAthletes}
              disabled={loadingAthletes || loadingCompetitions}
            >
              {loadingAthletes ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Завантаження
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Завантажити атлетів
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                Попередній список ({preview.length})
              </p>
              {preview.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreview([])}
                  className="h-8 px-2 text-xs"
                >
                  Очистити
                </Button>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Категорія за замовчуванням</p>
                <span className="text-xs text-muted-foreground">
                  Використаємо, якщо в під-турнірі нема limitationGroup
                </span>
              </div>
              <Select
                value={fallbackCategory}
                onValueChange={(v) => setFallbackCategory(v)}
              >
                <SelectTrigger className="w-full justify-between">
                  <SelectValue placeholder="Не вибрано" className="truncate" />
                </SelectTrigger>
                <SelectContent>
                  {COMPETITOR_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {preview.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Після завантаження атлети з'являться тут. Їх можна прибрати перед
                додаванням.
              </p>
            ) : (
              <div className="h-48 rounded border overflow-y-auto divide-y">
                {preview.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-sm">{p.name}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="uppercase">
                          {p.category}
                        </Badge>
                        <span>{p.competitionTitle}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePreview(p.id)}
                      className="h-8 w-8"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {missingCategories.length > 0 && (
              <p className="text-sm text-red-600">
                Warning: Missing categories for this exercise:{" "}
                {missingCategories.join(", ")}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Скасувати
          </Button>
          <Button onClick={saveCompetitors} disabled={saving || !preview.length}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Додаємо...
              </>
            ) : (
              "Додати до списку"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

}
