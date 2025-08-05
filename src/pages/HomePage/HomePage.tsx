import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState([
    { id: 1, name: "Summer Championship", lanes: 6 },
    { id: 2, name: "Winter Cup", lanes: 8 },
  ]);

  const [name, setName] = useState("");
  const [lanes, setLanes] = useState(3);
  const [open, setOpen] = useState(false);

  const addCompetition = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCompetitions((prev) => [
      ...prev,
      { id: Date.now(), name: name.trim(), lanes: parseInt(lanes, 10) },
    ]);

    setName("");
    setLanes(1);
    setOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Competitions</h1>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Add competition</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={addCompetition}>
                <DialogHeader>
                  <DialogTitle>Add competition</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4">
                  <div className="grid gap-3">
                    <Label htmlFor="competition-name">Competition Name</Label>
                    <Input
                      id="competition-name"
                      type="text"
                      placeholder="Competition Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="lanes">Number of Lanes</Label>
                    <Input
                      id="lanes"
                      type="number"
                      placeholder="Lanes"
                      value={lanes}
                      onChange={(e) => setLanes(e.target.value)}
                      min={1}
                    />
                  </div>
                </div>

                <DialogFooter className="mt-4">
                  <DialogClose asChild>
                    <Button variant="outline" type="button">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit">Add</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {competitions.length > 0 ? (
          <ul className="space-y-3">
            {competitions.map((comp) => (
              <li
                key={comp.id}
                className="flex justify-between items-center bg-gray-100 p-4 rounded-lg"
              >
                <div>
                  <Link
                    to={`/competitions/${comp.id}`}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    {comp.name}
                  </Link>
                  <p className="text-sm text-gray-500">Lanes: {comp.lanes}</p>
                </div>
                <button
                  className="text-red-500 hover:text-red-700"
                  onClick={() =>
                    setCompetitions((prev) =>
                      prev.filter((c) => c.id !== comp.id)
                    )
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No competitions yet.</p>
        )}
      </div>
    </div>
  );
}
