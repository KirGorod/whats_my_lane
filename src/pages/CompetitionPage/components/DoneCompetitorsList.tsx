import { useAuth } from "../../../context/AuthContext";

const DoneCompetitorsList = ({
  doneCompetitors,
  returnDoneCompetitorToLane,
}) => {
  const { isAdmin } = useAuth();
  return (
    <div className="w-1/4 bg-white rounded-lg shadow p-4 flex flex-col">
      <h2 className="text-lg font-bold mb-4">Done</h2>
      <ul className="space-y-2 overflow-y-auto">
        {[...doneCompetitors].reverse().map((competitor, index) => (
          <li
            key={competitor.id}
            className="p-2 bg-gray-100 rounded flex justify-between items-center gap-2"
          >
            <span>
              {competitor.name} ({competitor.category})
            </span>
            {isAdmin && (
              <button
                onClick={() => returnDoneCompetitorToLane(competitor)}
                className="text-xs text-green-500 hover:underline"
              >
                Return
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DoneCompetitorsList;
