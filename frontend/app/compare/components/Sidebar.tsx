import { Activity, History, BarChart3, CreditCard, LayoutGrid, Settings } from "lucide-react";

export function Sidebar({}){
    return (  
      <aside className="hidden md:flex w-64 bg-white border-r border-zinc-200 fixed h-full flex-col z-20">
        <div className="h-16 flex items-center px-6 border-b border-zinc-200">
           <a href="/" className="flex items-center">
             <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center mr-2">
                <LayoutGrid className="w-4 h-4 text-white" />
             </div>
             <span className="font-bold tracking-tight text-lg">ModelCompare</span>
           </a>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-8">
          <nav className="space-y-1">
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-2">Workspace</div>
            <a href="#" className="flex items-center gap-3 px-3 py-2 bg-zinc-100 text-black rounded-lg font-medium text-sm">
              <Activity className="w-4 h-4" /> Evaluation Lab
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-zinc-600 hover:bg-zinc-50 hover:text-black rounded-lg font-medium text-sm transition-colors">
              <History className="w-4 h-4" /> History
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-zinc-600 hover:bg-zinc-50 hover:text-black rounded-lg font-medium text-sm transition-colors">
              <BarChart3 className="w-4 h-4" /> Analytics
            </a>
          </nav>
          
          <nav className="space-y-1">
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-2">Account</div>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-zinc-600 hover:bg-zinc-50 hover:text-black rounded-lg font-medium text-sm transition-colors">
              <Settings className="w-4 h-4" /> Settings
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-zinc-600 hover:bg-zinc-50 hover:text-black rounded-lg font-medium text-sm transition-colors">
              <CreditCard className="w-4 h-4" /> Billing
            </a>
          </nav>

          <div className="mt-auto">
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-2">Recent Evaluations</div>
            <div className="space-y-2">
              {[
                { prompt: "Write a python script to...", models: 3, time: "2h ago" },
                { prompt: "Explain quantum computing...", models: 2, time: "5h ago" },
                { prompt: "Translate this JSON to...", models: 4, time: "1d ago" },
              ].map((item, i) => (
                <div key={i} className="p-3 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 cursor-pointer transition-colors">
                  <p className="text-xs font-medium text-zinc-900 truncate">{item.prompt}</p>
                  <div className="flex items-center justify-between mt-2 text-[10px] text-zinc-500">
                    <span>{item.models} models</span>
                    <span>{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
      );
}