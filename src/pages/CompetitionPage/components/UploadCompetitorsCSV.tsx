"use client";

import { useState } from "react";
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface UploadCompetitorsCSVProps {
  addCompetitor: (competitor: {
    id: number;
    name: string;
    category: string;
  }) => void;
}

export default function UploadCompetitorsCSV({
  addCompetitor,
}: UploadCompetitorsCSVProps) {
  const [open, setOpen] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedData = results.data as {
          id: number;
          name?: string;
          category?: string;
        }[];

        let addedCount = 0;
        parsedData.forEach((row) => {
          if (row.name && row.category) {
            addCompetitor({
              id: row.id,
              name: row.name.trim(),
              category: row.category.trim(),
            });
            addedCount++;
          }
        });

        toast.success(`CSV Uploaded`, {
          description: `Successfully added ${addedCount} competitors.`,
        });
        setOpen(false);
      },
      error: (error) => {
        toast.error(`Error parsing CSV`, {
          description: error.message,
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="mt-4">
          Upload CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Competitors CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Please upload a CSV file with columns: <b>name</b>, <b>category</b>.
          </p>
          <Input type="file" accept=".csv" onChange={handleFileUpload} />
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
