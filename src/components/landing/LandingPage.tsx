import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, Variants } from 'framer-motion';
import { 
  Sparkles, 
  Play, 
  Microscope, 
  Settings2, 
  CheckCircle2, 
  LayoutGrid, 
  BarChart3, 
  Code2, 
  Network, 
  X,
  ArrowRight,
  Database,
  Cpu,
  BrainCircuit,
  Eye,
  Activity,
  Box
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// --- Reusable Animation Variants ---
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

// --- Premium Flashlight Card ---
const FlashlightCard = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  return (
    <div
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      className={cn("relative overflow-hidden rounded-3xl border border-border/50 bg-secondary/5 p-8 group transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10", className)}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, hsl(var(--primary)/0.08), transparent 40%)`,
        }}
      />
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100 z-20"
        style={{
          borderImage: `radial-gradient(300px circle at ${mousePos.x}px ${mousePos.y}px, hsl(var(--primary)/0.5), transparent) 1`,
          borderWidth: '1px',
          borderStyle: 'solid',
          borderRadius: 'inherit'
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

interface LandingPageProps {
  onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 overflow-x-hidden">
      {/* Dynamic Background Mesh */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[140px] rounded-full opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[140px] rounded-full opacity-30" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <LayoutGrid className="w-4 h-4 text-background" />
            </div>
            <span className="text-xl font-bold tracking-tight">ModelCompare</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Platform</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it Works</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onLogin} className="hidden md:flex hover:bg-secondary/50">
              Sign In
            </Button>
            <Button variant="premium" size="sm" onClick={onLogin} className="rounded-full px-6">
              Start Free Trial
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-32 pb-24 md:pt-48 md:pb-32 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <motion.div 
          initial="hidden" 
          animate="visible" 
          variants={staggerContainer}
          className="flex flex-col items-start text-left"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/30 border border-border/50 text-xs font-medium mb-8 backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">The AI Evaluation Standard</span>
          </motion.div>
          
          <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 leading-[1.05] perspective-[1000px]">
            Evaluate LLMs <br />
            with <span className="text-transparent bg-clip-text bg-gradient-to-b from-primary to-primary/50">Precision.</span>
          </motion.h1>
          
          <motion.p variants={fadeUp} className="text-xl text-muted-foreground mb-10 max-w-lg leading-relaxed font-medium">
            Move beyond token costs. Deep insights, granular analytics, automated benchmarking, and research-grade evaluation for modern AI teams.
          </motion.p>
          
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <button onClick={onLogin} className="w-full sm:w-auto flex items-center justify-center px-8 py-4 bg-foreground text-background rounded-full font-bold text-base hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)] border-beam">
              Explore the Platform
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
            <Button variant="outline" size="lg" className="h-14 px-8 rounded-full border-border/50 bg-background/50 backdrop-blur-sm w-full sm:w-auto hover:bg-secondary/50" onClick={onLogin}>
              View Benchmarks
            </Button>
          </motion.div>
        </motion.div>

        {/* High-Fidelity Dashboard Mockup */}
        <motion.div 
          initial={{ opacity: 0, x: 50, rotationY: -10 }}
          animate={{ opacity: 1, x: 0, rotationY: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="relative w-full aspect-square md:aspect-[4/3] bg-card/40 backdrop-blur-xl rounded-[2rem] border border-border/60 shadow-2xl shadow-primary/5 p-4 flex flex-col perspective-1000"
        >
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 to-transparent rounded-[2rem] pointer-events-none" />
          
          {/* Mockup Header */}
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
            </div>
            <div className="ml-auto flex items-center gap-2 px-3 py-1 rounded-md bg-background/50 border border-border/50 text-xs font-mono text-muted-foreground">
              <Database className="w-3 h-3" /> evaluation_run_842.json
            </div>
          </div>
          
          {/* Mockup Body */}
          <div className="flex-1 grid grid-cols-12 grid-rows-6 gap-3">
            {/* Main Chart Area */}
            <div className="col-span-12 row-span-4 rounded-xl border border-border/40 bg-background/60 p-4 flex flex-col relative overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm font-semibold text-muted-foreground">Latency vs Quality Score</div>
                <div className="text-xs px-2 py-1 rounded bg-primary/10 text-primary font-mono">Real-time</div>
              </div>
              <div className="flex-1 relative flex items-end justify-between px-4 pb-2 gap-2">
                {[30, 45, 20, 60, 80, 50, 90, 75, 100, 65, 85].map((h, i) => (
                  <motion.div 
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: 1, delay: 0.5 + i * 0.05, ease: "easeOut" }}
                    className="w-full bg-gradient-to-t from-primary/60 to-primary/10 rounded-t-sm relative group"
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono bg-foreground text-background px-1 rounded">
                      {h}ms
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Insight Chips */}
            <div className="col-span-6 row-span-2 rounded-xl border border-border/40 bg-secondary/10 p-4 flex flex-col justify-center gap-2 group hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-2 text-primary">
                <BrainCircuit className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Automated Insight</span>
              </div>
              <p className="text-sm font-medium leading-snug">GPT-4o outperforms Claude 3.5 in logical reasoning by 14% on dataset A.</p>
            </div>
            
            <div className="col-span-6 row-span-2 rounded-xl border border-border/40 bg-emerald-500/5 p-4 flex flex-col justify-center gap-2 border-emerald-500/20 group hover:border-emerald-500/40 transition-colors">
              <div className="flex items-center gap-2 text-emerald-500">
                <Settings2 className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Router Trigger</span>
              </div>
              <p className="text-sm font-medium leading-snug text-emerald-500/90">Switched default model to Llama 3 to reduce costs by 42%.</p>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Philosophy Section */}
      <section className="py-24 border-y border-border/40 bg-secondary/5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
              You're not selling tokens. <br/>
              <span className="text-muted-foreground">You're selling intelligence.</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-xl text-muted-foreground leading-relaxed">
              ModelCompare shifts the focus from cost-counting to capability-building. We provide the infrastructure to test, evaluate, and deploy the right models for the right tasks.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Core Pillars (Bento Grid) */}
      <section id="features" className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <FlashlightCard className="col-span-1 md:col-span-2 lg:col-span-2 lg:row-span-2 min-h-[400px] flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6">
                <Eye className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-3xl font-bold mb-4">Deep Insights</h3>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8 flex-1">
                Go beyond basic metrics. Use LLM-as-a-Judge to evaluate response quality, tone consistency, and logical coherence. Identify hallucination patterns before they hit production.
              </p>
              <div className="bg-background/80 rounded-xl p-4 border border-border/50 font-mono text-sm">
                <div className="flex justify-between items-center text-muted-foreground mb-3">
                  <span>Evaluation Output</span>
                  <span className="text-emerald-500">Pass</span>
                </div>
                <div className="space-y-2 text-foreground/80">
                  <p><span className="text-blue-400">Coherence:</span> 0.94</p>
                  <p><span className="text-blue-400">Factual Acc:</span> 0.99</p>
                  <p><span className="text-blue-400">Tone Match:</span> 0.88</p>
                </div>
              </div>
            </FlashlightCard>

            <FlashlightCard className="col-span-1 md:col-span-1 lg:col-span-2">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6">
                <Activity className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Granular Analytics</h3>
              <p className="text-muted-foreground">
                Track TTFT (Time To First Token), total latency, and exact costs down to the 6th decimal. Visualize performance distributions across different models instantly.
              </p>
            </FlashlightCard>

            <FlashlightCard className="col-span-1 md:col-span-1 lg:col-span-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
                <Network className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold mb-3">Workflow Automation</h3>
              <p className="text-muted-foreground text-sm">
                Trigger CI/CD pipelines, update model routing configs, or alert Slack when evaluation thresholds fail.
              </p>
            </FlashlightCard>

            <FlashlightCard className="col-span-1 md:col-span-1 lg:col-span-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6">
                <Microscope className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold mb-3">Research Lab</h3>
              <p className="text-muted-foreground text-sm">
                A/B test prompts scientifically. Manage prompt versioning and connect datasets directly to test suites.
              </p>
            </FlashlightCard>

          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-32 border-t border-border/40 bg-secondary/5">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="max-w-7xl mx-auto px-6"
        >
          <motion.div variants={fadeUp} className="text-center mb-20 max-w-2xl mx-auto">
            <h2 className="text-4xl font-bold tracking-tight mb-4">From prompt to production</h2>
            <p className="text-muted-foreground text-lg">Integrate our SDK in 2 minutes and transform your raw AI usage into structured, actionable intelligence.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {/* Connecting line for desktop */}
            <div className="hidden lg:block absolute top-12 left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-border/10 via-border to-border/10 z-0"></div>

            {[
              { icon: Box, title: "1. Instrument", desc: "Wrap your existing API calls with our lightweight SDK. Zero configuration needed." },
              { icon: Database, title: "2. Collect", desc: "We securely log inputs, outputs, tokens, and latency to your dedicated vault." },
              { icon: BrainCircuit, title: "3. Evaluate", desc: "Custom judge models automatically score responses based on your criteria." },
              { icon: Play, title: "4. Automate", desc: "Use Webhooks to block deployments if model quality degrades." }
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp} className="relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-3xl bg-background border border-border/50 shadow-xl shadow-background/50 flex items-center justify-center mb-8 relative">
                  <div className="absolute inset-0 bg-primary/5 rounded-3xl animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                  <item.icon className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-20"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/20 border border-border/50 text-sm font-medium mb-6">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span className="text-muted-foreground">Bring Your Own Key (BYOK) Architecture</span>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Transparent Pricing</motion.h2>
            <motion.p variants={fadeUp} className="text-xl text-muted-foreground max-w-2xl mx-auto">
              You only pay for platform features and analytics, not token markups.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free */}
            <FlashlightCard className="p-8 flex flex-col h-full bg-background border-border/40">
              <h3 className="text-2xl font-bold mb-2">Explorer</h3>
              <p className="text-muted-foreground mb-8">Perfect for independent researchers.</p>
              <div className="mb-8">
                <span className="text-5xl font-black">$0</span>
                <span className="text-muted-foreground font-medium">/forever</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-center gap-3 text-foreground/80"><CheckCircle2 className="w-5 h-5 text-primary" /> 1,000 evaluations / mo</li>
                <li className="flex items-center gap-3 text-foreground/80"><CheckCircle2 className="w-5 h-5 text-primary" /> Basic latency & cost analytics</li>
                <li className="flex items-center gap-3 text-muted-foreground"><X className="w-5 h-5" /> No LLM Judge mode</li>
                <li className="flex items-center gap-3 text-muted-foreground"><X className="w-5 h-5" /> No Automation triggers</li>
              </ul>
              <Button variant="outline" className="w-full h-12 rounded-xl text-base" onClick={onLogin}>Get Started Free</Button>
            </FlashlightCard>

            {/* Pro */}
            <FlashlightCard className="p-8 flex flex-col h-full border-primary/50 bg-primary/5 relative shadow-2xl shadow-primary/10 transform md:-translate-y-4">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-foreground text-background px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
                Most Popular
              </div>
              <h3 className="text-2xl font-bold mb-2 text-primary">Builder</h3>
              <p className="text-muted-foreground mb-8">For AI engineers & fast teams.</p>
              <div className="mb-8">
                <span className="text-5xl font-black">$49</span>
                <span className="text-muted-foreground font-medium">/month</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-center gap-3 font-medium"><CheckCircle2 className="w-5 h-5 text-primary" /> 10,000 evaluations / mo</li>
                <li className="flex items-center gap-3 font-medium"><CheckCircle2 className="w-5 h-5 text-primary" /> Custom LLM-as-a-Judge</li>
                <li className="flex items-center gap-3 font-medium"><CheckCircle2 className="w-5 h-5 text-primary" /> Advanced Visual Analytics</li>
                <li className="flex items-center gap-3 font-medium"><CheckCircle2 className="w-5 h-5 text-primary" /> Webhooks & Automations</li>
              </ul>
              <Button variant="premium" className="w-full h-12 rounded-xl text-base border-beam" onClick={onLogin}>Start 14-Day Trial</Button>
            </FlashlightCard>

            {/* Scale */}
            <FlashlightCard className="p-8 flex flex-col h-full bg-background border-border/40">
              <h3 className="text-2xl font-bold mb-2">Scale</h3>
              <p className="text-muted-foreground mb-8">For production ML workloads.</p>
              <div className="mb-8">
                <span className="text-5xl font-black">$199</span>
                <span className="text-muted-foreground font-medium">/month</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-center gap-3 text-foreground/80"><CheckCircle2 className="w-5 h-5 text-foreground" /> 100,000+ evaluations / mo</li>
                <li className="flex items-center gap-3 text-foreground/80"><CheckCircle2 className="w-5 h-5 text-foreground" /> Unlimited Team Seats</li>
                <li className="flex items-center gap-3 text-foreground/80"><CheckCircle2 className="w-5 h-5 text-foreground" /> Batch processing API</li>
                <li className="flex items-center gap-3 text-foreground/80"><CheckCircle2 className="w-5 h-5 text-foreground" /> Priority Slack Support</li>
              </ul>
              <Button variant="outline" className="w-full h-12 rounded-xl text-base" onClick={onLogin}>Contact Sales</Button>
            </FlashlightCard>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <FlashlightCard className="p-12 md:p-24 bg-card/50 border-border/50 relative overflow-hidden">
            <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 relative z-10">Stop guessing. <br/><span className="text-muted-foreground">Start measuring.</span></h2>
            <p className="text-xl text-muted-foreground mb-12 max-w-xl mx-auto relative z-10">
              Join leading AI teams who use ModelCompare to build reliable, high-performance LLM features.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 relative z-10">
              <Button variant="premium" size="lg" onClick={onLogin} className="h-14 px-10 rounded-full text-lg border-beam">
                Get Started Free
              </Button>
            </div>
          </FlashlightCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12 bg-background">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-foreground rounded flex items-center justify-center">
              <LayoutGrid className="w-3 h-3 text-background" />
            </div>
            <span className="font-bold tracking-tight">ModelCompare</span>
          </div>
          
          <div className="flex gap-8 text-sm font-medium text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Documentation</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
          </div>
          
          <p className="text-sm font-medium text-muted-foreground/60">
            © {new Date().getFullYear()} ModelCompare. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
