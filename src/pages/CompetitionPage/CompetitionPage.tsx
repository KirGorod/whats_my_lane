import { useState } from "react";
import type { Competitor } from "../../types/competitor";
import { Category } from "../../types/category";
import CompetitorsList from "./components/CompetitorsList";
import Lanes from "./components/Lanes";
import DoneCompetitorsList from "./components/DoneCompetitorsList";
import { toast } from "sonner";

interface Lane {
  id: number;
  category: Category;
  competitor: Competitor | null;
}

export default function CompetitionPage() {
  const dummyCompetitors: Competitor[] = [
    { id: 1, name: "Alice Johnson", category: Category.H },
    { id: 2, name: "Bob Smith", category: Category.H },
    { id: 3, name: "Charlie Brown", category: Category.R },
    { id: 4, name: "Diana Prince", category: Category.R },
    { id: 5, name: "Ethan Hunt", category: Category.N },
    { id: 6, name: "Fiona Gallagher", category: Category.N },
  ];

  const [competitors, setCompetitors] =
    useState<Competitor[]>(dummyCompetitors);
  const [doneCompetitors, setDoneCompetitors] = useState<Competitor[]>([]);

  const [lanes, setLanes] = useState<Lane[]>([
    { id: 1, category: Category.H, competitor: null },
    { id: 2, category: Category.H, competitor: null },
    { id: 3, category: Category.R, competitor: null },
    { id: 4, category: Category.N, competitor: null },
  ]);

  const addCompetitor = (competitor: Competitor) => {
    setCompetitors((prev) => [...prev, competitor]);
  };

  const removeCompetitor = (index: number) => {
    const competitorToMove = competitors[index];
    setCompetitors((prev) => prev.filter((_, i) => i !== index));
    setDoneCompetitors((prev) => [...prev, competitorToMove]);
  };

  const autoFillLanes = () => {
    const emptyLanes = lanes.filter((lane) => !lane.competitor);

    if (emptyLanes.length === 0) {
      toast.error("All lanes are already occupied");
      return;
    }

    let availableCompetitors = [...competitors];
    let unfilledCount = 0;

    const updatedLanes = lanes.map((lane) => {
      if (!lane.competitor) {
        const matchIndex = availableCompetitors.findIndex(
          (c) => c.category === lane.category
        );
        if (matchIndex !== -1) {
          const matched = availableCompetitors[matchIndex];
          availableCompetitors.splice(matchIndex, 1);
          return { ...lane, competitor: matched };
        } else {
          unfilledCount++;
        }
      }
      return lane;
    });

    setLanes(updatedLanes);
    setCompetitors(availableCompetitors);

    if (unfilledCount > 0) {
      toast.warning(`${unfilledCount} lane(s) were not filled`);
    } else {
      toast.success("All empty lanes filled successfully");
    }
  };

  const clearLane = (laneId: number) => {
    setLanes((prev) => {
      const updated = prev.map((lane) => {
        if (lane.id === laneId && lane.competitor) {
          setDoneCompetitors((done) => {
            if (!done.find((d) => d.id === lane.competitor!.id)) {
              return [...done, lane.competitor!];
            }
            return done;
          });
          return { ...lane, competitor: null };
        }
        return lane;
      });
      return updated;
    });
    toast.success(`Lane ${laneId} cleared`);
  };

  const clearAllLanes = () => {
    const competitorsToMove = lanes
      .filter((lane) => lane.competitor)
      .map((lane) => lane.competitor!);

    if (competitorsToMove.length === 0) {
      toast.error("No lanes to clear");
      return;
    }

    setDoneCompetitors((done) => {
      const uniqueToAdd = competitorsToMove.filter(
        (c) => !done.find((d) => d.id === c.id)
      );
      return [...done, ...uniqueToAdd];
    });

    setLanes((prev) => prev.map((lane) => ({ ...lane, competitor: null })));

    toast.success(`Cleared ${competitorsToMove.length} lane(s)`);
  };

  const fillLaneWithCompetitor = (competitor: Competitor) => {
    const laneIndex = lanes.findIndex(
      (lane) =>
        lane.category === competitor.category && lane.competitor === null
    );

    if (laneIndex === -1) {
      toast.error(`No empty lane for category ${competitor.category}`);
      return;
    }

    // Update lanes only if we have a free lane
    setLanes((prevLanes) => {
      const updatedLanes = [...prevLanes];
      updatedLanes[laneIndex] = { ...updatedLanes[laneIndex], competitor };
      return updatedLanes;
    });

    // Remove from competitors list
    setCompetitors((prev) => prev.filter((c) => c.id !== competitor.id));
  };

  const returnDoneCompetitorToLane = (competitor: Competitor) => {
    const laneIndex = lanes.findIndex(
      (lane) =>
        lane.category === competitor.category && lane.competitor === null
    );

    if (laneIndex === -1) {
      toast.error(`No empty lane for category ${competitor.category}`);
      return;
    }

    // Assign to lane
    setLanes((prev) => {
      const updated = [...prev];
      updated[laneIndex] = { ...updated[laneIndex], competitor };
      return updated;
    });

    // Remove from done list
    setDoneCompetitors((prev) => prev.filter((c) => c.id !== competitor.id));

    toast.success(`${competitor.name} returned to lane ${laneIndex + 1}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex gap-4 h-full">
        <CompetitorsList
          competitors={competitors}
          removeCompetitor={removeCompetitor}
          addCompetitor={addCompetitor}
          fillLaneWithCompetitor={fillLaneWithCompetitor}
        />

        <Lanes
          lanes={lanes}
          autoFillLanes={autoFillLanes}
          clearLane={clearLane}
          clearAllLanes={clearAllLanes}
        />

        <DoneCompetitorsList
          doneCompetitors={doneCompetitors}
          returnDoneCompetitorToLane={returnDoneCompetitorToLane}
        />
      </div>
    </div>
  );
}
