import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { Button } from "../../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Category } from "../../../types/category";
import { db } from "../../../firebase";
import { Clock, Flag, Play, Trash2 } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";

const Lane = ({ lane, exerciseId, clearLane }) => {
  const { isAdmin } = useAuth();
  const categories = Object.values(Category);
  const getCategoryColor = () => {};
  const removeLane = async (laneDocId: string) => {
    if (lane.competitor) {
      toast.warning("Cannot remove lane while it has a competitor");
      return;
    }

    try {
      await deleteDoc(doc(db, "exercises", exerciseId, "lanes", laneDocId));
    } catch (err) {
      console.error("Error removing lane", err);
    }
  };
  const updateLaneCategory = async (laneDocId: string, newCategory: string) => {
    if (lane.competitor) {
      toast.warning("Cannot change category when lane has a competitor");
      return;
    }
    try {
      await updateDoc(doc(db, "exercises", exerciseId, "lanes", laneDocId), {
        category: newCategory,
      });
    } catch (err) {
      console.error("Error updating category", err);
    }
  };

  return (
    <Card key={lane.id} className="border border-gray-200 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Lane {lane.id}</CardTitle>
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <Select
                value={lane.category ?? ""}
                onValueChange={(value) =>
                  updateLaneCategory(lane.laneDocId as string, value)
                }
              >
                <SelectTrigger className="w-24 h-8">
                  <SelectValue placeholder="Cat" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge className={getCategoryColor(lane.category)}>
                {lane.category}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Make content grow and push footer down */}
      <CardContent className="space-y-3 flex-grow">
        {/* Now */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex flex-col gap-2 items-center text-center">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">Now</span>
          </div>
          {lane.competitor ? (
            <div className="flex flex-col leading-tight">
              <div className="font-medium text-green-900 whitespace-pre-line">
                {lane.competitor.name}
              </div>
            </div>
          ) : (
            <div className="text-sm text-green-600 italic">No competitor</div>
          )}
        </div>

        {/* Ready Up */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex flex-col gap-2 items-center text-center">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">
              Ready Up
            </span>
          </div>
          {lane.readyUp ? (
            <div className="flex flex-col leading-tight">
              <div className="font-medium text-yellow-900 whitespace-pre-line">
                {lane.readyUp.name}
              </div>
            </div>
          ) : (
            <div className="text-sm text-yellow-600 italic">
              No ready competitor
            </div>
          )}
        </div>
      </CardContent>

      {/* Buttons stick to bottom */}
      {isAdmin && (
        <div className="flex items-center justify-between gap-2 px-4">
          <Button
            onClick={() => clearLane(lane.id)}
            size="sm"
            className="flex items-center justify-center gap-1 flex-1"
          >
            <Flag className="w-4 h-4" />
            Done
          </Button>

          {!lane.competitor && !lane.readyUp && (
            <Button
              onClick={() => removeLane(lane.laneDocId as string)}
              size="icon"
              variant="outline"
              className="h-8 w-8"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};

export default Lane;
