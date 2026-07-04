export const getBadgeColor = (category: string | null) => {
  switch (category) {
    case "H":
      return "bg-category-h/18 text-category-h border border-category-h/35";
    case "R":
      return "bg-category-r/18 text-category-r border border-category-r/35";
    case "N":
      return "bg-category-n/18 text-category-n border border-category-n/35";
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
};
