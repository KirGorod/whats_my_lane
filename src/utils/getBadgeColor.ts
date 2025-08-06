export const getBadgeColor = (category: string | null) => {
  switch (category) {
    case "H":
      return "bg-red-100 text-red-800";
    case "R":
      return "bg-green-100 text-green-800";
    case "N":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};
