import type { Competitor } from "../../../types/competitor";
import AddCompetitorDialog from "./AddCompetitorDialog";

const CompetitorsList = ({
  competitors,
  removeCompetitor,
  addCompetitor,
  fillLaneWithCompetitor,
}) => {
  return (
    <div className="w-1/4 bg-white rounded-lg shadow p-4 flex flex-col">
      <h2 className="text-lg font-bold mb-4">Competitors</h2>
      <ul className="space-y-2 overflow-y-auto">
        {competitors.map((competitor, index) => (
          <li
            key={competitor.id}
            className="p-2 bg-gray-100 rounded flex justify-between items-center gap-2"
          >
            <span>
              {competitor.name} ({competitor.category})
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => fillLaneWithCompetitor(competitor)}
                className="text-xs text-green-500 hover:underline"
              >
                Fill Lane
              </button>
              <button
                onClick={() => removeCompetitor(index)}
                className="text-xs text-blue-500 hover:underline"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      <AddCompetitorDialog addCompetitor={addCompetitor} />
    </div>
  );
};

export default CompetitorsList;
