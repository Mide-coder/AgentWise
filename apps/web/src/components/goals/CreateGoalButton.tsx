"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { CreateGoalModal } from "./CreateGoalModal";

export function CreateGoalButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary text-sm">
        <Plus className="w-4 h-4" />
        New Goal
      </button>
      {open && <CreateGoalModal onClose={() => setOpen(false)} />}
    </>
  );
}
