import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AddCompetition from "./components/AddCompetition";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  deleteDoc,
  query,
  doc,
} from "firebase/firestore";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";

export default function CompetitionsPage() {
  const { isAdmin } = useAuth();
  const [competitions, setCompetitions] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const competitionsQuery = query(
      collection(db, "competitions"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(competitionsQuery, (snapshot) => {
      const comps = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCompetitions(comps);
    });

    return () => unsubscribe();
  }, []);

  const removeCompetition = async (id) => {
    try {
      await deleteDoc(doc(db, "competitions", id));
      toast.success("Competition removed");
    } catch (err) {
      console.error(err);
      toast.error("Error removing competition");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Competitions</h1>
          {isAdmin && <AddCompetition open={open} setOpen={setOpen} />}
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
                {isAdmin && (
                  <button
                    className="text-red-500 hover:text-red-700"
                    onClick={() => removeCompetition(comp.id)}
                  >
                    Remove
                  </button>
                )}
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
