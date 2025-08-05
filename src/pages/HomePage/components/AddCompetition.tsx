import { Label } from "@radix-ui/react-label";
import { Button } from "../../../components/ui/button";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";
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
import { useState } from "react";
import { toast } from "sonner";

const AddCompetition = ({ open, setOpen }) => {
  const [name, setName] = useState("");
  const [lanes, setLanes] = useState(3);

  const addCompetition = async (e) => {
    e.preventDefault();

    if (!name.trim()) return;

    try {
      setOpen(false);

      await addDoc(collection(db, "competitions"), {
        name: name.trim(),
        lanes,
        createdAt: serverTimestamp(),
      });
      toast.success("Competition added!");
      setName("");
      setLanes(1);
    } catch (err) {
      console.error(err);
      toast.error("Error adding competition");
    }
  };

  return (
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
  );
};

export default AddCompetition;
