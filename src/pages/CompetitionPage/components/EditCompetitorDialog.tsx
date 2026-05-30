import { useEffect, useState } from "react";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Pencil } from "lucide-react";
import { COMPETITOR_CATEGORIES } from "../../../types/competitor";

type Competitor = {
  id: string;
  name: string;
  category: string;
};

export default function EditCompetitorDialog({
  competitor,
  updateCompetitor,
  disabled = false,
}: {
  competitor: Competitor;
  updateCompetitor: (
    c: Competitor,
    patch: Pick<Competitor, "name" | "category">
  ) => Promise<void> | void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(competitor.name);
  const [category, setCategory] = useState(competitor.category);

  useEffect(() => {
    if (!open) return;
    setName(competitor.name);
    setCategory(competitor.category);
  }, [open, competitor.name, competitor.category]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-500 hover:text-gray-900 disabled:opacity-50 disabled:pointer-events-none"
          title="Редагувати учасника"
          disabled={disabled}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const trimmed = name.trim();
            if (!trimmed || !category) return;
            await updateCompetitor(competitor, { name: trimmed, category });
            setOpen(false);
          }}
        >
          <DialogHeader>
            <DialogTitle>Редагувати учасника</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-3">
              <Input
                type="text"
                placeholder="Ім'я учасника"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-4"
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="edit-category">Категорія</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="edit-category">
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
            <Button type="submit" disabled={!name.trim() || !category}>
              Зберегти
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
