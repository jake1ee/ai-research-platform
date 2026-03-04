import { LayoutGrid } from "lucide-react";

export function Topbar({}){
    return ( 
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-3 md:hidden">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold tracking-tight text-lg">ModelCompare</span>
          </div>
          <h1 className="hidden md:block text-lg font-bold text-zinc-900">AI Evaluation Lab</h1>
          
          <div className="flex items-center gap-4 md:gap-6">
            <div className="hidden sm:flex flex-col items-end">
              <div className="flex items-center gap-2 text-xs font-medium mb-1">
                <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] uppercase tracking-wide">Pro Plan</span>
                <span className="text-zinc-600">213 / 300 Comparisons</span>
              </div>
              <div className="w-48 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 w-[71%] rounded-full"></div>
              </div>
            </div>
            <div className="hidden sm:block w-px h-8 bg-zinc-200"></div>
            <div className="w-8 h-8 rounded-full bg-zinc-200 border border-zinc-300 overflow-hidden cursor-pointer hover:ring-2 hover:ring-black transition-all">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
            </div>
          </div>
        </header>
        );
}