import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import AddCompetitorDialog from "./AddCompetitorDialog";
import UploadCompetitorsCSV from "./UploadCompetitorsCSV";
import { Users, Search, Plus, Upload, AlertCircle } from "lucide-react";
import { Input } from "../../../components/ui/input";
import CompetitorCard from "./CompetitorCard";
import { toast } from "sonner";
import { db } from "../../../firebase";
import { doc, writeBatch } from "firebase/firestore";
// dnd-kit imports ...
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

type Competitor = {
  id: string;
  name: string;
  category: string;
  status?: string;
  orderRank?: number;
};

const SortableCompetitorRow = ({
  competitor,
  position,
  disabled,
  isPending,
  onFill,
  onRemove,
}: {
  competitor: Competitor;
  position: number;
  disabled: boolean; // DnD disabled flag
  isPending: boolean; // new
  onFill: (c: Competitor) => Promise<void> | void;
  onRemove: (c: Competitor) => Promise<void> | void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: competitor.id, disabled: disabled || isPending });

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
        competitor={competitor}
        position={position}
        onFill={onFill}
        onRemove={onRemove}
        isPending={isPending}
      />
    </div>
  );
};

const CompetitorsList = ({
  exerciseId,
  competitors,
  removeCompetitor,
  addCompetitor,
  fillLaneWithCompetitor,
}: {
  exerciseId: string;
  competitors: Competitor[]; // ordered by orderRank asc from parent
  removeCompetitor: (c: Competitor) => Promise<void> | void;
  addCompetitor: (c: Omit<Competitor, "id">) => Promise<void> | void;
  fillLaneWithCompetitor: (c: Competitor) => Promise<void> | void;
}) => {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  // 🔹 Track competitors currently performing an async action
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  // Keep a local master order of IDs; resync when incoming list changes.
  const [items, setItems] = useState<string[]>([]);
  useEffect(() => {
    setItems(competitors.map((c) => c.id));
  }, [competitors]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const filteredCompetitors = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const list = term
      ? competitors.filter((c) => c.name.toLowerCase().includes(term))
      : competitors;

    const orderIndex = new Map(items.map((id, idx) => [id, idx]));
    return [...list].sort(
      (a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0)
    );
  }, [competitors, searchTerm, items]);

  const filteredIds = useMemo(
    () => filteredCompetitors.map((c) => c.id),
    [filteredCompetitors]
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
    const merged: string[] = items.map((id) =>
      filteredSet.has(id) ? (replacementQueue.shift() as string) : id
    );

    setItems(merged);

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
    }
  };

  // 🔹 Wrap async actions to set/clear pending per competitor
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

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="hidden lg:flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold">
            {t("Competitors")} ({competitors.length})
          </h2>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <AddCompetitorDialog
              addCompetitor={addCompetitor}
              triggerButtonClass="p-2 rounded-full hover:bg-gray-100"
              triggerIcon={<Plus className="w-5 h-5 text-blue-600" />}
            />
            <UploadCompetitorsCSV
              exerciseId={exerciseId}
              triggerButtonClass="p-2 rounded-full hover:bg-gray-100"
              triggerIcon={<Upload className="w-5 h-5 text-green-600" />}
            />
          </div>
        )}
      </div>

      {/* Search */}
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

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredCompetitors.length === 0 ? (
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
              {filteredCompetitors.map((competitor, index) => (
                <SortableCompetitorRow
                  key={competitor.id}
                  competitor={competitor}
                  position={index + 1}
                  disabled={draggingDisabled}
                  isPending={pendingIds.has(competitor.id)}
                  onFill={handleFill}
                  onRemove={handleRemove}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
};

export default CompetitorsList;
