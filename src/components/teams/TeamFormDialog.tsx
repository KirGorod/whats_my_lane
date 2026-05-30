import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  collectLibraryTeamNameKeys,
  createSavedTeam,
  subscribeTeamLibrary,
} from "../../lib/teamLibrary";
import { isTeamNameTaken, normalizeTeamName } from "../../lib/teamNames";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import type { SavedTeamInput } from "../../types/teamLibrary";

export const DEFAULT_TEAM_ATHLETE_FIELDS = 4;
const TEAM_ATHLETE_SUGGESTIONS_KEY = "whats_my_lane_team_athletes";

type DraftAthlete = {
  id: string;
  name: string;
};

export type TeamFormValues = SavedTeamInput;

const createDraftAthlete = (name = ""): DraftAthlete => ({
  id:
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
  name,
});

const createDraftAthletes = (count: number, names: string[] = []) => {
  const rows = names.map((name) => createDraftAthlete(name));
  while (rows.length < count) rows.push(createDraftAthlete());
  return rows;
};

const loadAthleteSuggestions = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TEAM_ATHLETE_SUGGESTIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      return parsed.filter((name): name is string => typeof name === "string");
    }
    if (!parsed || typeof parsed !== "object") return [];
    return Array.from(
      new Set(
        Object.values(parsed)
          .flatMap((names) => (Array.isArray(names) ? names : []))
          .filter((name): name is string => typeof name === "string")
      )
    );
  } catch {
    return [];
  }
};

const saveAthleteSuggestion = (name: string) => {
  const cleanName = name.trim();
  const current = loadAthleteSuggestions();
  if (!cleanName) return current;
  const next = Array.from(new Set([cleanName, ...current])).slice(0, 200);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      TEAM_ATHLETE_SUGGESTIONS_KEY,
      JSON.stringify(next)
    );
  }
  return next;
};

function SortableAthleteRow({
  athlete,
  index,
  canRemove,
  onChange,
  onCommit,
  onTabToNext,
  onRemove,
  inputRef,
}: {
  athlete: DraftAthlete;
  index: number;
  canRemove: boolean;
  onChange: (id: string, name: string) => void;
  onCommit: (name: string) => void;
  onTabToNext: (index: number, event: React.KeyboardEvent<HTMLInputElement>) => void;
  onRemove: (id: string) => void;
  inputRef?: (element: HTMLInputElement | null) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: athlete.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : undefined,
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex gap-2">
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="shrink-0 cursor-grab active:cursor-grabbing"
        title="Змінити порядок"
        {...attributes}
        {...listeners}
        tabIndex={-1}
      >
        <GripVertical className="w-4 h-4" />
      </Button>
      <Input
        ref={inputRef}
        list="team-athlete-suggestions"
        value={athlete.name}
        placeholder={`Атлет ${index + 1}`}
        onChange={(e) => onChange(athlete.id, e.target.value)}
        onBlur={(e) => onCommit(e.target.value)}
        onKeyDown={(e) => onTabToNext(index, e)}
      />
      {canRemove && (
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="shrink-0"
          tabIndex={-1}
          onClick={() => onRemove(athlete.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

export function TeamFormDialog({
  trigger,
  title,
  submitLabel,
  initialTeam,
  onSubmit,
  enableLibrarySave = false,
  saveToLibraryLabel,
  mode = "create",
}: {
  trigger: ReactNode;
  title: string;
  submitLabel: string;
  initialTeam?: TeamFormValues & { id?: string };
  onSubmit: (team: TeamFormValues) => Promise<void> | void;
  enableLibrarySave?: boolean;
  saveToLibraryLabel?: string;
  mode?: "create" | "edit";
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [athletes, setAthletes] = useState<DraftAthlete[]>(
    createDraftAthletes(DEFAULT_TEAM_ATHLETE_FIELDS)
  );
  const [athleteSuggestions, setAthleteSuggestions] = useState<string[]>([]);
  const [libraryTeamNameKeys, setLibraryTeamNameKeys] = useState<Set<string>>(
    new Set()
  );
  const [submitting, setSubmitting] = useState(false);
  const cityInputRef = useRef<HTMLInputElement | null>(null);
  const athleteInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const pendingAthleteFocusIndex = useRef<number | null>(null);

  const libraryButtonLabel =
    saveToLibraryLabel ??
    (mode === "edit"
      ? "Зберегти та зберегти в бібліотеку"
      : "Додати та зберегти в бібліотеку");

  const nameInLibrary = useMemo(
    () => isTeamNameTaken(name, libraryTeamNameKeys),
    [name, libraryTeamNameKeys]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!open) return;
    setName(initialTeam?.name ?? "");
    setCity(initialTeam?.city ?? "");
    setAthleteSuggestions(loadAthleteSuggestions());
    setAthletes(
      initialTeam?.athletes?.length
        ? createDraftAthletes(
            Math.max(DEFAULT_TEAM_ATHLETE_FIELDS, initialTeam.athletes.length),
            initialTeam.athletes
          )
        : createDraftAthletes(DEFAULT_TEAM_ATHLETE_FIELDS)
    );
  }, [initialTeam, open]);

  useEffect(() => {
    if (!open || !enableLibrarySave) return;
    const unsub = subscribeTeamLibrary(
      (teams) => setLibraryTeamNameKeys(collectLibraryTeamNameKeys(teams)),
      () => toast.error("Не вдалося завантажити бібліотеку команд")
    );
    return () => unsub();
  }, [open, enableLibrarySave]);

  useEffect(() => {
    const index = pendingAthleteFocusIndex.current;
    if (index === null) return;
    pendingAthleteFocusIndex.current = null;
    athleteInputRefs.current[index]?.focus();
  }, [athletes]);

  const reset = () => {
    setName("");
    setCity("");
    setAthletes(createDraftAthletes(DEFAULT_TEAM_ATHLETE_FIELDS));
    athleteInputRefs.current = [];
    pendingAthleteFocusIndex.current = null;
  };

  const buildTeamPayload = (): TeamFormValues | null => {
    const cleanAthletes = athletes
      .map((athlete) => athlete.name.trim())
      .filter(Boolean);
    const cleanCity = city.trim();
    if (!name.trim()) {
      toast.error("Вкажіть назву команди");
      return null;
    }
    cleanAthletes.forEach((athlete) => {
      setAthleteSuggestions(saveAthleteSuggestion(athlete));
    });
    return {
      name: name.trim(),
      ...(cleanCity ? { city: cleanCity } : {}),
      athletes: cleanAthletes,
    };
  };

  const saveToLibraryIfNew = async (payload: TeamFormValues) => {
    if (!enableLibrarySave) return;
    if (isTeamNameTaken(payload.name, libraryTeamNameKeys)) {
      toast.info("Команда вже є в бібліотеці");
      return;
    }
    try {
      await createSavedTeam(payload);
      setLibraryTeamNameKeys((prev) => {
        const next = new Set(prev);
        next.add(normalizeTeamName(payload.name));
        return next;
      });
      toast.success("Команду збережено в бібліотеці");
    } catch (err) {
      console.error(err);
      toast.error("Не вдалося зберегти команду в бібліотеці");
      throw err;
    }
  };

  const handleSubmit = async (
    event: React.FormEvent,
    alsoSaveToLibrary: boolean
  ) => {
    event.preventDefault();
    const payload = buildTeamPayload();
    if (!payload) return;

    setSubmitting(true);
    try {
      await onSubmit(payload);
      if (alsoSaveToLibrary) {
        await saveToLibraryIfNew(payload);
      }
      reset();
      setOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const submit = (event: React.FormEvent) => void handleSubmit(event, false);

  const updateAthlete = (id: string, nextName: string) => {
    setAthletes((prev) =>
      prev.map((athlete) =>
        athlete.id === id ? { ...athlete, name: nextName } : athlete
      )
    );
  };

  const rememberAthlete = (athleteName: string) => {
    const cleanName = athleteName.trim();
    if (!cleanName) return;
    setAthleteSuggestions(saveAthleteSuggestion(cleanName));
  };

  const removeAthlete = (id: string) => {
    setAthletes((prev) => prev.filter((athlete) => athlete.id !== id));
  };

  const addAthlete = () => {
    setAthletes((prev) => {
      pendingAthleteFocusIndex.current = prev.length;
      return [...prev, createDraftAthlete()];
    });
  };

  const handleTeamNameTab = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key !== "Tab" || event.shiftKey) return;
    const cityInput = cityInputRef.current;
    if (!cityInput) return;
    event.preventDefault();
    cityInput.focus();
  };

  const handleCityTab = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Tab" || event.shiftKey) return;
    const firstAthleteInput = athleteInputRefs.current[0];
    if (!firstAthleteInput) return;
    event.preventDefault();
    firstAthleteInput.focus();
  };

  const handleAthleteTab = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key !== "Tab" || event.shiftKey) return;
    const nextInput = athleteInputRefs.current[index + 1];
    if (!nextInput) return;
    event.preventDefault();
    nextInput.focus();
  };

  const handleAthleteDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setAthletes((prev) => {
      const oldIndex = prev.findIndex((athlete) => athlete.id === active.id);
      const newIndex = prev.findIndex((athlete) => athlete.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className={
          enableLibrarySave ? "sm:max-w-[520px]" : "sm:max-w-[480px]"
        }
      >
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="team-name">Назва команди</Label>
              <Input
                id="team-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleTeamNameTab}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="team-city">Місто</Label>
              <Input
                id="team-city"
                ref={cityInputRef}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyDown={handleCityTab}
                placeholder="Необов'язково"
              />
            </div>

            <div className="grid gap-2">
              <Label>Атлети</Label>
              <datalist id="team-athlete-suggestions">
                {athleteSuggestions.map((athlete) => (
                  <option key={athlete} value={athlete} />
                ))}
              </datalist>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={handleAthleteDragEnd}
              >
                <SortableContext
                  items={athletes.map((athlete) => athlete.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {athletes.map((athlete, index) => (
                      <SortableAthleteRow
                        key={athlete.id}
                        athlete={athlete}
                        index={index}
                        canRemove={athletes.length > 1}
                        onChange={updateAthlete}
                        onCommit={rememberAthlete}
                        onTabToNext={handleAthleteTab}
                        onRemove={removeAthlete}
                        inputRef={(element) => {
                          athleteInputRefs.current[index] = element;
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              <Button type="button" variant="outline" onClick={addAthlete}>
                <Plus className="w-4 h-4 mr-1" />
                Додати атлета
              </Button>
            </div>
          </div>

          {enableLibrarySave ? (
            <div className="mt-4 flex w-full flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-9 w-full whitespace-normal border-lime-400 bg-lime-100 px-3 py-2 text-center text-sm font-medium text-lime-950 shadow-xs hover:bg-lime-200 hover:text-lime-950 disabled:bg-lime-50 disabled:text-lime-600"
                disabled={submitting || nameInLibrary}
                title={
                  nameInLibrary ? "Команда вже в бібліотеці" : undefined
                }
                onClick={(event) => void handleSubmit(event, true)}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  libraryButtonLabel
                )}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <DialogClose asChild>
                  <Button
                    variant="outline"
                    type="button"
                    className="w-full"
                    disabled={submitting}
                  >
                    Скасувати
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    submitLabel
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button variant="outline" type="button" disabled={submitting}>
                  Скасувати
                </Button>
              </DialogClose>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  submitLabel
                )}
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
