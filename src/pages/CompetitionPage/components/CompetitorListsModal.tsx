import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  Library,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  createCompetitorList,
  deleteCompetitorList,
  subscribeCompetitorLists,
  updateCompetitorList,
} from "../../../lib/competitorLists";
import {
  COMPETITOR_CATEGORIES,
  type Competitor,
} from "../../../types/competitor";
import type {
  CompetitorList,
  CompetitorListAthlete,
} from "../../../types/competitorList";

const DEFAULT_CATEGORY = "h1";

function CreateListDialog({
  onCreate,
}: {
  onCreate: (name: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Введіть назву списку");
      return;
    }
    setSaving(true);
    try {
      await onCreate(trimmed);
      setName("");
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Створити
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <form onSubmit={(e) => void handleSubmit(e)}>
          <DialogHeader>
            <DialogTitle>Новий список</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Label htmlFor="list-name">Назва</Label>
            <Input
              id="list-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Назва списку"
              className="mt-1.5"
              autoFocus
            />
          </div>
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Скасувати
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saving}>
              Створити
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RenameListDialog({
  list,
  onRename,
}: {
  list: CompetitorList;
  onRename: (name: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(list.name);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setName(list.name);
  }, [open, list.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Введіть назву списку");
      return;
    }
    setSaving(true);
    try {
      await onRename(trimmed);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Перейменувати"
        >
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <form onSubmit={(e) => void handleSubmit(e)}>
          <DialogHeader>
            <DialogTitle>Перейменувати список</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Label htmlFor="rename-list">Назва</Label>
            <Input
              id="rename-list"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5"
              autoFocus
            />
          </div>
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Скасувати
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saving}>
              Зберегти
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditListAthleteDialog({
  athlete,
  athleteIndex,
  nameSuggestions,
  disabled = false,
  onSave,
}: {
  athlete: CompetitorListAthlete;
  athleteIndex: number;
  nameSuggestions: string[];
  disabled?: boolean;
  onSave: (patch: CompetitorListAthlete) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(athlete.name);
  const [category, setCategory] = useState(athlete.category);
  const [saving, setSaving] = useState(false);
  const datalistId = `edit-list-athlete-suggestions-${athleteIndex}`;

  useEffect(() => {
    if (!open) return;
    setName(athlete.name);
    setCategory(athlete.category);
  }, [open, athlete.name, athlete.category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !category) return;
    setSaving(true);
    try {
      await onSave({ name: trimmed, category });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-500 hover:text-gray-900 shrink-0"
          title="Редагувати"
          disabled={disabled}
        >
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={(e) => void handleSubmit(e)}>
          <DialogHeader>
            <DialogTitle>Редагувати атлета</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 mt-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-athlete-name">Ім'я</Label>
              <Input
                id="edit-athlete-name"
                list={datalistId}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ім'я атлета"
                autoComplete="off"
                autoFocus
              />
              <datalist id={datalistId}>
                {nameSuggestions.map((suggestion) => (
                  <option key={suggestion} value={suggestion} />
                ))}
              </datalist>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-athlete-category">Категорія</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="edit-athlete-category">
                  <SelectValue placeholder="Оберіть категорію" />
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
          </div>
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Скасувати
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={saving || !name.trim() || !category}
            >
              Зберегти
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ListDetailView({
  list,
  nameSuggestions,
  onBack,
  onRename,
  onUpdateAthletes,
}: {
  list: CompetitorList;
  nameSuggestions: string[];
  onBack: () => void;
  onRename: (name: string) => Promise<void>;
  onUpdateAthletes: (athletes: CompetitorListAthlete[]) => Promise<void>;
}) {
  const [athleteName, setAthleteName] = useState("");
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const datalistId = `competitor-list-athlete-suggestions-${list.id}`;

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const handleAddAthlete = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = athleteName.trim();
    if (!name) {
      toast.error("Введіть ім'я атлета");
      nameInputRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      await onUpdateAthletes([
        ...list.athletes,
        { name, category },
      ]);
      setAthleteName("");
      setCategory(DEFAULT_CATEGORY);
    } finally {
      setSaving(false);
      requestAnimationFrame(() => {
        nameInputRef.current?.focus();
      });
    }
  };

  const handleEditAthlete = async (
    index: number,
    patch: CompetitorListAthlete
  ) => {
    setSaving(true);
    try {
      await onUpdateAthletes(
        list.athletes.map((athlete, i) => (i === index ? patch : athlete))
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAthlete = async (index: number) => {
    setSaving(true);
    try {
      await onUpdateAthletes(list.athletes.filter((_, i) => i !== index));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-0 flex-1 gap-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onBack}
          title="Назад"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{list.name}</p>
          <p className="text-xs text-muted-foreground">
            {list.athletes.length} атлетів
          </p>
        </div>
        <RenameListDialog list={list} onRename={onRename} />
      </div>

      <form
        onSubmit={(e) => void handleAddAthlete(e)}
        className="flex flex-col sm:flex-row gap-2 items-end"
      >
        <div className="flex-1 w-full min-w-0">
          <Label htmlFor="athlete-name" className="text-xs">
            Ім'я
          </Label>
          <Input
            id="athlete-name"
            ref={nameInputRef}
            list={datalistId}
            value={athleteName}
            onChange={(e) => setAthleteName(e.target.value)}
            placeholder="Ім'я атлета"
            className="mt-1"
            autoComplete="off"
          />
          <datalist id={datalistId}>
            {nameSuggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <div className="w-full sm:w-28 shrink-0">
          <Label className="text-xs">Категорія</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="mt-1">
              <SelectValue />
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
        <Button type="submit" size="sm" disabled={saving} className="shrink-0">
          <Plus className="w-4 h-4 mr-1" />
          Додати
        </Button>
      </form>

      <div className="flex-1 min-h-0 rounded border overflow-y-auto divide-y">
        {list.athletes.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground text-center">
            Список порожній. Додайте атлетів.
          </p>
        ) : (
          list.athletes.map((athlete, index) => (
            <div
              key={`${athlete.name}-${athlete.category}-${index}`}
              className="flex items-center justify-between gap-2 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">{athlete.name}</p>
                <p className="text-xs text-muted-foreground">
                  {athlete.category}
                </p>
              </div>
              <div className="flex items-center shrink-0">
                <EditListAthleteDialog
                  athlete={athlete}
                  athleteIndex={index}
                  nameSuggestions={nameSuggestions}
                  disabled={saving}
                  onSave={(patch) => handleEditAthlete(index, patch)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-700"
                  title="Видалити"
                  disabled={saving}
                  onClick={() => void handleRemoveAthlete(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function CompetitorListsModal({
  addCompetitorsBulk,
  undoCompetitorsBulkAdd,
}: {
  addCompetitorsBulk?: (
    list: Array<Omit<Competitor, "id">>,
    options?: { silent?: boolean }
  ) => Promise<string[]> | string[];
  undoCompetitorsBulkAdd?: (ids: string[]) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<CompetitorList[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [lowPriority, setLowPriority] = useState(true);
  const [loadingListId, setLoadingListId] = useState<string | null>(null);
  const [lastAdded, setLastAdded] = useState<{
    ids: string[];
    listName: string;
  } | null>(null);
  const [undoing, setUndoing] = useState(false);

  useEffect(() => {
    if (!open) {
      setEditingListId(null);
      setSearchTerm("");
      setLowPriority(true);
      return;
    }
    setLoading(true);
    const unsub = subscribeCompetitorLists(
      (next) => {
        setLists(next);
        setLoading(false);
      },
      () => {
        toast.error("Не вдалося завантажити списки");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [open]);

  const filteredLists = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return lists;
    return lists.filter(
      (list) =>
        list.name.toLowerCase().includes(term) ||
        list.athletes.some(
          (a) =>
            a.name.toLowerCase().includes(term) ||
            a.category.toLowerCase().includes(term)
        )
    );
  }, [lists, searchTerm]);

  const editingList = useMemo(
    () => lists.find((l) => l.id === editingListId) ?? null,
    [lists, editingListId]
  );

  const athleteNameSuggestions = useMemo(() => {
    const names = new Set<string>();
    for (const competitorList of lists) {
      for (const athlete of competitorList.athletes) {
        const name = athlete.name.trim();
        if (name) names.add(name);
      }
    }
    return [...names].sort((a, b) =>
      a.localeCompare(b, "uk", { sensitivity: "base" })
    );
  }, [lists]);

  const handleCreate = async (name: string) => {
    try {
      await createCompetitorList({ name, athletes: [] });
      toast.success("Список створено");
    } catch (err) {
      console.error(err);
      toast.error("Не вдалося створити список");
      throw err;
    }
  };

  const handleRename = async (list: CompetitorList, name: string) => {
    try {
      await updateCompetitorList(list.id, {
        name,
        athletes: list.athletes,
      });
      toast.success("Список оновлено");
    } catch (err) {
      console.error(err);
      toast.error("Не вдалося оновити список");
      throw err;
    }
  };

  const handleUpdateAthletes = async (
    list: CompetitorList,
    athletes: CompetitorListAthlete[]
  ) => {
    try {
      await updateCompetitorList(list.id, {
        name: list.name,
        athletes,
      });
    } catch (err) {
      console.error(err);
      toast.error("Не вдалося оновити атлетів");
      throw err;
    }
  };

  const handleDelete = async (list: CompetitorList) => {
    try {
      await deleteCompetitorList(list.id);
      if (editingListId === list.id) setEditingListId(null);
      toast.success("Список видалено");
    } catch (err) {
      console.error(err);
      toast.error("Не вдалося видалити список");
    }
  };

  const handleLoad = async (list: CompetitorList) => {
    if (!addCompetitorsBulk) return;
    if (!list.athletes.length) {
      toast.info("Список порожній");
      return;
    }
    setLoadingListId(list.id);
    try {
      const ids = await addCompetitorsBulk(
        list.athletes.map((a) => ({
          name: a.name,
          category: a.category,
          ...(lowPriority ? { lowPriority: true } : {}),
        })),
        { silent: true }
      );
      const addedIds = ids ?? [];
      setLastAdded({ ids: addedIds, listName: list.name });
      toast.success(`Додано ${addedIds.length} атлетів з «${list.name}»`, {
        action: undoCompetitorsBulkAdd
          ? {
              label: "Відмінити",
              onClick: () => {
                void (async () => {
                  try {
                    await undoCompetitorsBulkAdd(addedIds);
                    setLastAdded((prev) =>
                      prev?.ids.join() === addedIds.join() ? null : prev
                    );
                  } catch {
                    /* toast handled in undoCompetitorsBulkAdd */
                  }
                })();
              },
            }
          : undefined,
      });
    } catch (err) {
      console.error(err);
      toast.error("Не вдалося завантажити список");
    } finally {
      setLoadingListId(null);
    }
  };

  const handleUndoLastAdd = async () => {
    if (!undoCompetitorsBulkAdd || !lastAdded?.ids.length) return;
    setUndoing(true);
    try {
      await undoCompetitorsBulkAdd(lastAdded.ids);
      setLastAdded(null);
    } catch {
      /* toast handled in undoCompetitorsBulkAdd */
    } finally {
      setUndoing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="Списки учасників"
          className="text-violet-600 hover:text-violet-800"
        >
          <Library className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editingList ? editingList.name : "Списки учасників"}
          </DialogTitle>
        </DialogHeader>

        {editingList ? (
          <ListDetailView
            list={editingList}
            nameSuggestions={athleteNameSuggestions}
            onBack={() => setEditingListId(null)}
            onRename={(name) => handleRename(editingList, name)}
            onUpdateAthletes={(athletes) =>
              handleUpdateAthletes(editingList, athletes)
            }
          />
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <Input
                placeholder="Пошук списку або атлета"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <CreateListDialog onCreate={handleCreate} />
            </div>

            {addCompetitorsBulk && (
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm select-none">
                  <input
                    type="checkbox"
                    checked={lowPriority}
                    onChange={(e) => setLowPriority(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Найнижчий пріоритет при завантаженні
                </label>
                {undoCompetitorsBulkAdd && lastAdded && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    disabled={undoing}
                    onClick={() => void handleUndoLastAdd()}
                    title={`Скасувати додавання з «${lastAdded.listName}»`}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Відмінити ({lastAdded.ids.length})
                  </Button>
                )}
              </div>
            )}

            <div className="flex-1 min-h-0 mt-1 rounded border overflow-y-auto divide-y">
              {loading ? (
                <p className="p-4 text-sm text-muted-foreground text-center">
                  Завантаження...
                </p>
              ) : filteredLists.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground text-center">
                  {lists.length === 0
                    ? "Немає списків. Створіть перший."
                    : "Нічого не знайдено"}
                </p>
              ) : (
                filteredLists.map((list) => (
                  <div
                    key={list.id}
                    className="flex items-start justify-between gap-3 px-3 py-3"
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left hover:opacity-80"
                      onClick={() => setEditingListId(list.id)}
                    >
                      <p className="font-medium text-sm truncate">{list.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {list.athletes.length} атлетів
                      </p>
                      {list.athletes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {list.athletes.slice(0, 6).map((a, i) => (
                            <span
                              key={`${a.name}-${i}`}
                              className="inline-block max-w-full truncate rounded bg-slate-100 px-1.5 py-0.5 text-[11px] leading-tight text-slate-600"
                              title={`${a.name} (${a.category})`}
                            >
                              {a.name}
                            </span>
                          ))}
                          {list.athletes.length > 6 && (
                            <span className="text-[11px] text-muted-foreground self-center">
                              +{list.athletes.length - 6}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      {addCompetitorsBulk && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700"
                          title="Завантажити в змагання"
                          disabled={
                            !list.athletes.length ||
                            loadingListId === list.id
                          }
                          onClick={() => void handleLoad(list)}
                        >
                          <Upload className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Редагувати атлетів"
                        onClick={() => setEditingListId(list.id)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
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
                            <AlertDialogTitle>
                              Видалити список?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              «{list.name}» буде видалено. Учасники в уже
                              створених змаганнях не зміняться.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Скасувати</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => void handleDelete(list)}
                            >
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
