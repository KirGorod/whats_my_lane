import { Fragment, useMemo, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import AddCompetitorDialog from "./AddCompetitorDialog";
import UploadCompetitorsCSV from "./UploadCompetitorsCSV";
import LoadAthletesDialog from "./LoadAthletesDialog";
import { Users, Search, Plus, FileUp, AlertCircle, Download, Trash2, RotateCcw } from "lucide-react";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import CompetitorCard from "./CompetitorCard";
import { toast } from "sonner";
import { db } from "../../../firebase";
import { doc, writeBatch } from "firebase/firestore";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";
import type { ExerciseType } from "../../../types/exercise";
import type { LaneModel } from "../../../types/lane";
import {
  computeAutofillQueueOrder,
  QUEUE_ORDER_AUTOFILL_MODE,
  type QueuedCompetitor,
} from "../../../utils/autofillOrder";
import { getRoundGroupClass } from "../../../utils/laneTypeStyles";

type Competitor = {
  id: string;
  name: string;
  category: string;
  status?: string;
  orderRank?: number;
};

const SortableCompetitorRow = ({
  item,
  disabled,
  isPending,
  onFill,
  onRemove,
  onUpdate,
}: {
  item: QueuedCompetitor;
  disabled: boolean;
  isPending: boolean;
  onFill: (c: Competitor) => Promise<void> | void;
  onRemove: (c: Competitor) => Promise<void> | void;
  onUpdate: (
    c: Competitor,
    patch: Pick<Competitor, "name" | "category">
  ) => Promise<void> | void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.competitor.id,
    disabled: disabled || isPending,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
    cursor: disabled || isPending ? "default" : "grab",
    filter: isPending ? "grayscale(1)" : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CompetitorCard
        competitor={item.competitor}
        targetLaneId={item.targetLaneId}
        onFill={onFill}
        onRemove={onRemove}
        onUpdate={onUpdate}
        isPending={isPending}
      />
    </div>
  );
};

function groupByRound(items: QueuedCompetitor[]) {
  const groups = new Map<number, QueuedCompetitor[]>();
  for (const item of items) {
    const arr = groups.get(item.roundNumber) ?? [];
    arr.push(item);
    groups.set(item.roundNumber, arr);
  }
  return [...groups.entries()].sort(([a], [b]) => a - b);
}

const CompetitorsList = ({
  exerciseId,
  competitors,
  lanes,
  exerciseType,
  onOrderRankSavingChange,
  removeCompetitor,
  addCompetitor,
  addCompetitorsBulk,
  updateCompetitor,
  removeAllCompetitors,
  undoRemoveAllCompetitors,
  fillLaneWithCompetitor,
}: {
  exerciseId: string;
  competitors: Competitor[];
  lanes: LaneModel[];
  exerciseType: ExerciseType;
  onOrderRankSavingChange?: (saving: boolean) => void;
  removeCompetitor: (c: Competitor) => Promise<void> | void;
  addCompetitor: (c: Omit<Competitor, "id">) => Promise<void> | void;
  addCompetitorsBulk?: (
    c: Array<Omit<Competitor, "id">>
  ) => Promise<void> | void;
  updateCompetitor: (
    c: Competitor,
    patch: Pick<Competitor, "name" | "category">
  ) => Promise<void> | void;
  removeAllCompetitors?: () => Promise<void> | void;
  undoRemoveAllCompetitors?: () => Promise<void> | void;
  fillLaneWithCompetitor: (c: Competitor) => Promise<void> | void;
}) => {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const queueOrder = useMemo(
    () =>
      computeAutofillQueueOrder(
        competitors,
        lanes,
        exerciseType,
        QUEUE_ORDER_AUTOFILL_MODE
      ),
    [competitors, lanes, exerciseType]
  );

  const filteredQueue = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return queueOrder;
    return queueOrder.filter((q) =>
      q.competitor.name.toLowerCase().includes(term)
    );
  }, [queueOrder, searchTerm]);

  const filteredGroups = useMemo(
    () => groupByRound(filteredQueue),
    [filteredQueue]
  );

  const filteredIds = useMemo(
    () => filteredQueue.map((q) => q.competitor.id),
    [filteredQueue]
  );

  const allIds = useMemo(
    () => queueOrder.map((q) => q.competitor.id),
    [queueOrder]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const draggingDisabled = !!searchTerm.trim().length || !isAdmin;

  const handleDragEnd = async (event: DragEndEvent) => {
    if (draggingDisabled) return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldFilteredIndex = filteredIds.indexOf(String(active.id));
    const newFilteredIndex = filteredIds.indexOf(String(over.id));
    if (oldFilteredIndex === -1 || newFilteredIndex === -1) return;

    const newFilteredOrder = arrayMove(
      filteredIds,
      oldFilteredIndex,
      newFilteredIndex
    );

    const filteredSet = new Set(filteredIds);
    const replacementQueue = [...newFilteredOrder];
    const merged: string[] = allIds.map((id) =>
      filteredSet.has(id) ? (replacementQueue.shift() as string) : id
    );

    onOrderRankSavingChange?.(true);
    try {
      const batch = writeBatch(db);
      merged.forEach((competitorId, idx) => {
        const ref = doc(
          db,
          "exercises",
          exerciseId,
          "competitors",
          competitorId
        );
        batch.update(ref, { orderRank: idx + 1 });
      });
      await batch.commit();
      toast.success("Order updated");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save new order");
    } finally {
      onOrderRankSavingChange?.(false);
    }
  };

  const withPending =
    (id: string, fn: () => Promise<void> | void) => async () => {
      setPendingIds((prev) => new Set(prev).add(id));
      try {
        await Promise.resolve(fn());
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    };

  const handleFill = (c: Competitor) =>
    withPending(c.id, () => fillLaneWithCompetitor(c))();
  const handleRemove = (c: Competitor) =>
    withPending(c.id, () => removeCompetitor(c))();
  const handleUpdate = (
    c: Competitor,
    patch: Pick<Competitor, "name" | "category">
  ) => withPending(c.id, () => updateCompetitor(c, patch))();

  const handleRemoveAll = async () => {
    if (!removeAllCompetitors) return;
    const confirm = window.prompt(
      "Введіть 'remove' або 'видалити' щоб підтвердити видалення ВСІХ учасників"
    );
    if (!confirm) return;
    const ok =
      confirm.trim().toLowerCase() === "remove" ||
      confirm.trim().toLowerCase() === "видалити";
    if (!ok) {
      toast.error("Потрібно ввести 'remove' або 'видалити'");
      return;
    }
    await removeAllCompetitors();
  };

  const handleUndoRemoveAll = async () => {
    if (!undoRemoveAllCompetitors) return;
    const ok = window.confirm("Відновити останніх видалених учасників?");
    if (!ok) return;
    await undoRemoveAllCompetitors();
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold">
              {t("Competitors")} ({competitors.length})
            </h2>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <AddCompetitorDialog
              addCompetitor={addCompetitor}
              triggerButtonClass="p-2 rounded-full hover:bg-gray-100"
              triggerIcon={<Plus className="w-5 h-5 text-blue-600" />}
            />
            <LoadAthletesDialog
              addCompetitor={addCompetitor}
              addCompetitorsBulk={addCompetitorsBulk}
              triggerButtonClass="p-2 rounded-full hover:bg-gray-100"
              triggerIcon={<Download className="w-5 h-5 text-amber-600" />}
            />
            <UploadCompetitorsCSV
              exerciseId={exerciseId}
              triggerButtonClass="p-2 rounded-full hover:bg-gray-100"
              triggerIcon={<FileUp className="w-5 h-5 text-green-600" />}
            />
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
              disabled={!undoRemoveAllCompetitors}
            >
              <RotateCcw className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder={t("SearchCompetitors")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        {isAdmin && searchTerm && (
          <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 inline-flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {t("DragDropDisabled")}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredQueue.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {searchTerm ? t("NoCompetitorsMatch") : t("NoCompetitorsAvailable")}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <SortableContext
              items={filteredIds}
              strategy={verticalListSortingStrategy}
            >
              {filteredGroups.map(([roundNumber, items]) => {
                const isUnassigned = items.every(
                  (item) => item.targetLaneId == null
                );
                return (
                  <Fragment key={roundNumber}>
                    <div
                      className={[
                        "rounded-lg border-l-4 p-3 mb-4",
                        getRoundGroupClass(roundNumber, isUnassigned),
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold shrink-0">
                            {roundNumber}
                          </span>
                          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                            {t("ExitRound", { defaultValue: "Round" })}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-gray-500 tabular-nums">
                          {t("ExitRoundAthleteCount", {
                            defaultValue: "{{count}} athletes",
                            count: items.length,
                          })}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <SortableCompetitorRow
                            key={item.competitor.id}
                            item={item}
                            disabled={draggingDisabled}
                            isPending={pendingIds.has(item.competitor.id)}
                            onFill={handleFill}
                            onRemove={handleRemove}
                            onUpdate={handleUpdate}
                          />
                        ))}
                      </div>
                    </div>
                  </Fragment>
                );
              })}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
};

export default CompetitorsList;
