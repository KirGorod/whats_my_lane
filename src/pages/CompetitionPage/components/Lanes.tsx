import type { Competitor } from "../../../types/competitor";
import { Button } from "../../../components/ui/button";

interface Lane {
  id: number;
  category: string;
  competitor: Competitor | null;
}

interface Props {
  lanes: Lane[];
  autoFillLanes: () => void;
  clearLane: (laneId: number) => void;
  clearAllLanes: () => void;
}

const Lanes = ({ lanes, autoFillLanes, clearLane, clearAllLanes }: Props) => {
  return (
    <div className="w-1/2 bg-white rounded-lg shadow p-4 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Lanes</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={autoFillLanes}>
            Auto Fill
          </Button>
          <Button variant="destructive" onClick={clearAllLanes}>
            Clear All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-grow">
        {lanes.map((lane) => (
          <div
            key={lane.id}
            className="border rounded-lg p-4 flex flex-col items-center justify-center"
          >
            <p className="font-semibold">
              Lane {lane.id} ({lane.category})
            </p>
            {lane.competitor ? (
              <>
                <p className="text-sm text-gray-500">{lane.competitor.name}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => clearLane(lane.id)}
                  className="mt-2"
                >
                  Clear
                </Button>
              </>
            ) : (
              <p className="text-sm text-gray-400">Empty</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Lanes;
