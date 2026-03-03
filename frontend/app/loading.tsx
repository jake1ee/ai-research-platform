// app/loading.tsx
import { LayoutGrid, Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center font-sans">
      <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-6 animate-pulse shadow-lg">
        <LayoutGrid className="w-6 h-6 text-white" />
      </div>
      <div className="flex items-center gap-3 text-zinc-500 font-medium">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading ModelCompare...
      </div>
    </div>
  );
}