import { Dumbbell, Edit, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../../components/ui/alert-dialog";
import { statusOptions } from "../../../types/exercise";
import { Link } from "react-router-dom";
import { statusBadgeClass } from "../../../utils/statusStyles";

const ExerciseCard = ({ exercise, handleEdit, handleDelete }) => {
  return (
    <Card key={exercise.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Link
            to={`/competitions/${exercise.id}`}
            className="font-semibold cursor-pointer"
          >
            <CardTitle className="text-lg flex items-center gap-2">
              <Dumbbell className="w-5 h-5" />
              {exercise.name}
            </CardTitle>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(exercise)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Exercise</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{exercise.name}"?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(exercise)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap mt-2">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadgeClass(
              exercise.status
            )}`}
          >
            {statusOptions.find((s) => s.value === exercise.status)?.label}
          </span>
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
            {exercise.numberOfLanes} Lanes
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Time to Start:
          </span>
          <span className="text-sm text-gray-600">
            {new Date(exercise.timeToStart).toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExerciseCard;
