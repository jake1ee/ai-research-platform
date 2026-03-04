'use client';

import React from "react";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { 
  Sparkles, Play, Mic, Edit, Link as LinkIcon, CheckCircle2, 
  LayoutGrid, Zap, BarChart3, Shield, Code2, LineChart, Users, X,
  ArrowRight, BookOpen, AlertTriangle, CheckCircle, SplitSquareHorizontal,
  Activity, DollarSign, FileJson, Scale, Layers, Download, History,
  Terminal, Briefcase, GraduationCap, Cpu, Network, Settings2, Clock, Hash
} from "lucide-react";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export function LandingPage() {
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-300 font-sans selection:bg-indigo-500/30">
      {/* Navbar */}
      <nav className="w-full border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-black" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">ModelCompare</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#problem" onClick={(e) => scrollToSection(e, 'problem')} className="hover:text-white transition-colors">Problem</a>
            <a href="#solution" onClick={(e) => scrollToSection(e, 'solution')} className="hover:text-white transition-colors">Solution</a>
            <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" onClick={(e) => scrollToSection(e, 'pricing')} className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/Dashboard" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors hidden md:block">
              Dashboard
            </Link>
            <Link href="/compare" className="text-sm font-medium bg-white text-black px-5 py-2 rounded-full hover:bg-zinc-200 transition-colors">
              Start Comparing
            </Link>
          </div>
        </div>
      </nav>

      {/* 1. Hero Section */}
      <main className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={staggerContainer}
            className="flex flex-col items-center"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium mb-8 text-indigo-300">
              <Sparkles className="w-3 h-3" />
              <span>The Standard for AI Model Evaluation</span>
            </motion.div>
            
            <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 leading-[1.1] text-white max-w-4xl">
              Evaluate and Benchmark <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-cyan-400">LLMs with Precision</span>
            </motion.h1>
            
            <motion.p variants={fadeUp} className="text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl leading-relaxed">
              Compare latency, cost, and output quality across OpenAI, Anthropic, Google, and Meta models in real-time. Stop guessing, start measuring.
            </motion.p>
            
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Link href="/compare" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-white text-black rounded-full font-medium text-base hover:bg-zinc-200 transition-all">
                Start Comparing <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-white/5 text-white border border-white/10 rounded-full font-medium text-base hover:bg-white/10 transition-all">
                <BookOpen className="w-4 h-4" /> View Docs
              </a>
            </motion.div>

            {/* Trust Badges */}
            <motion.div variants={fadeUp} className="mt-20 pt-10 border-t border-white/5 w-full max-w-3xl">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-6 font-semibold">Supported Model Providers</p>
              <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-60 grayscale">
                <span className="text-xl font-bold font-serif">OpenAI</span>
                <span className="text-xl font-bold font-sans tracking-tight">Anthropic</span>
                <span className="text-xl font-bold font-sans">Google</span>
                <span className="text-xl font-bold font-sans">Meta</span>
                <span className="text-xl font-bold font-mono">Mistral</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </main>

      {/* 2. Problem Section */}
      <section id="problem" className="py-24 bg-[#0F0F0F] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 tracking-tight">The AI Engineering Dilemma</h2>
              <p className="text-zinc-400 text-lg mb-8 leading-relaxed">
                Building AI applications is easy. Optimizing them for production is hard. Engineering teams waste weeks building custom evaluation pipelines just to answer basic questions.
              </p>
              <ul className="space-y-6">
                {[
                  { title: "Choosing the right LLM is expensive", desc: "Blindly using GPT-4 for every task burns through your budget." },
                  { title: "Performance varies per task", desc: "A model great at coding might fail at JSON extraction." },
                  { title: "No transparent cost comparison", desc: "Calculating exact token costs across different pricing tiers is tedious." },
                  { title: "Hard to benchmark reliably", desc: "Latency spikes and non-deterministic outputs make testing a nightmare." }
                ].map((item, i) => (
                  <li key={i} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium mb-1">{item.title}</h4>
                      <p className="text-sm text-zinc-500">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-linear-to-tr from-red-500/10 to-transparent rounded-3xl blur-2xl" />
              <div className="relative bg-[#141414] border border-white/10 rounded-3xl p-8 font-mono text-sm text-zinc-400 shadow-2xl">
                <div className="flex gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                <div className="space-y-4">
                  <p><span className="text-red-400">Error:</span> Rate limit exceeded for model 'gpt-4'</p>
                  <p><span className="text-yellow-400">Warning:</span> Latency spike detected (4500ms)</p>
                  <p><span className="text-zinc-500">Log:</span> Output format invalid. Expected JSON.</p>
                  <p><span className="text-red-400">Error:</span> Cost threshold exceeded for current billing cycle.</p>
                  <div className="mt-8 p-4 bg-white/5 rounded border border-white/10 text-center">
                    <p className="text-white font-sans font-medium">Evaluation Pipeline Failed</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Solution Section */}
      <section id="solution" className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">The Ultimate Evaluation Platform</h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              ModelCompare provides a unified interface to test, measure, and optimize your prompts across every major foundation model.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: SplitSquareHorizontal, title: "Side-by-side comparison", desc: "Run identical prompts across multiple models simultaneously to instantly spot differences in reasoning and tone." },
              { icon: Activity, title: "Real-time latency tracking", desc: "Measure Time-to-First-Token (TTFT) and total generation time down to the millisecond." },
              { icon: DollarSign, title: "Automatic cost calculation", desc: "Exact token counting multiplied by real-time provider pricing tiers. Know exactly what each generation costs." },
              { icon: Settings2, title: "Deterministic mode", desc: "Lock temperature and seeds to ensure reproducible outputs for rigorous scientific benchmarking." },
              { icon: FileJson, title: "JSON validation", desc: "Automatically verify if the model's output strictly adheres to your required JSON schema." },
              { icon: Scale, title: "LLM-as-a-Judge scoring", desc: "Use a superior model (like GPT-4o) to automatically grade the outputs of smaller, cheaper models." }
            ].map((feature, i) => (
              <div key={i} className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/30">
                  <feature.icon className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. How It Works (3 Steps) */}
      <section className="py-24 bg-[#0F0F0F] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">How It Works</h2>
            <p className="text-zinc-400">Three simple steps to production-ready AI.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
            
            {[
              { step: "01", title: "Select Models", desc: "Choose from our library of 50+ foundation models or connect your own custom endpoints." },
              { step: "02", title: "Enter Prompt", desc: "Define your system instructions, user prompt, and configure generation parameters." },
              { step: "03", title: "Analyze Metrics", desc: "Hit run and watch as latency, cost, and quality metrics stream in real-time." }
            ].map((item, i) => (
              <div key={i} className="relative flex flex-col items-center text-center z-10">
                <div className="w-24 h-24 bg-[#141414] border border-white/10 rounded-full flex items-center justify-center mb-6 shadow-xl">
                  <span className="text-3xl font-bold text-white font-serif">{item.step}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-zinc-400 text-sm max-w-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Feature Grid (Core Features) */}
      <section id="features" className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">Everything you need to scale</h2>
            <p className="text-zinc-400 text-lg">A complete toolkit for AI engineering teams.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { icon: Layers, label: "Multi-model execution" },
              { icon: Clock, label: "Latency benchmarking" },
              { icon: DollarSign, label: "Cost analytics" },
              { icon: Hash, label: "Token analytics" },
              { icon: Code2, label: "Structured output validation" },
              { icon: Network, label: "Similarity scoring" },
              { icon: Scale, label: "LLM-as-a-Judge" },
              { icon: History, label: "Evaluation history" },
              { icon: Download, label: "Export to CSV/JSON" },
              { icon: History, label: "Prompt versioning" },
              { icon: Terminal, label: "API access" },
              { icon: Shield, label: "Enterprise SSO" }
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-3 p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors">
                <feat.icon className="w-5 h-5 text-indigo-400 shrink-0" />
                <span className="text-sm font-medium text-zinc-300">{feat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Use Cases */}
      <section className="py-24 bg-[#0F0F0F] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">Built for AI Professionals</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-8 bg-linear-to-br from-white/5 to-transparent border border-white/10 rounded-3xl">
              <Briefcase className="w-8 h-8 text-white mb-6" />
              <h3 className="text-xl font-bold text-white mb-3">AI Startups</h3>
              <p className="text-zinc-400 text-sm">Find the perfect balance between intelligence and unit economics before scaling to millions of users.</p>
            </div>
            <div className="p-8 bg-linear-to-br from-white/5 to-transparent border border-white/10 rounded-3xl">
              <GraduationCap className="w-8 h-8 text-white mb-6" />
              <h3 className="text-xl font-bold text-white mb-3">AI Researchers</h3>
              <p className="text-zinc-400 text-sm">Run rigorous, reproducible benchmarks across open-source and proprietary models with deterministic settings.</p>
            </div>
            <div className="p-8 bg-linear-to-br from-white/5 to-transparent border border-white/10 rounded-3xl">
              <Cpu className="w-8 h-8 text-white mb-6" />
              <h3 className="text-xl font-bold text-white mb-3">Engineering Teams</h3>
              <p className="text-zinc-400 text-sm">Optimize latency and cost by routing simpler tasks to smaller models while reserving heavy models for complex logic.</p>
            </div>
            <div className="p-8 bg-linear-to-br from-white/5 to-transparent border border-white/10 rounded-3xl">
              <Terminal className="w-8 h-8 text-white mb-6" />
              <h3 className="text-xl font-bold text-white mb-3">Prompt Engineers</h3>
              <p className="text-zinc-400 text-sm">A/B test prompt variations and instantly see how changes affect output quality and token consumption.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Pricing Section */}
      <section id="pricing" className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">Simple, Transparent Pricing</h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Start for free, upgrade when you need history and API access. Bring your own API keys.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free */}
            <div className="p-8 rounded-3xl border border-white/10 bg-white/5">
              <h3 className="text-xl font-bold text-white mb-2">Free</h3>
              <p className="text-sm text-zinc-400 mb-6">For individuals exploring models.</p>
              <div className="mb-8">
                <span className="text-5xl font-bold text-white">$0</span>
                <span className="text-zinc-500">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 text-sm text-zinc-300">
                <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-white" /> 100 comparisons / month</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-white" /> Up to 3 parallel models</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-white" /> Basic latency & cost tracking</li>
              </ul>
              <button className="w-full py-3 rounded-full border border-white/20 text-white font-medium hover:bg-white/10 transition-colors">
                Get Started
              </button>
            </div>

            {/* Pro */}
            <div className="p-8 rounded-3xl border border-indigo-500 bg-indigo-500/10 relative transform md:-translate-y-4 shadow-[0_0_40px_-10px_rgba(99,102,241,0.3)]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-500 text-white px-4 py-1 rounded-full text-xs font-bold tracking-wide">
                Most Popular
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Pro</h3>
              <p className="text-sm text-indigo-200 mb-6">For professional AI engineers.</p>
              <div className="mb-8">
                <span className="text-5xl font-bold text-white">$49</span>
                <span className="text-indigo-300">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 text-sm text-zinc-300">
                <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-indigo-400" /> Unlimited comparisons</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-indigo-400" /> Up to 10 parallel models</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-indigo-400" /> Full analytics & history</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-indigo-400" /> LLM-as-a-Judge scoring</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-indigo-400" /> CSV/JSON Export</li>
              </ul>
              <button className="w-full py-3 rounded-full bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors">
                Start 14-Day Trial
              </button>
            </div>

            {/* Enterprise */}
            <div className="p-8 rounded-3xl border border-white/10 bg-white/5">
              <h3 className="text-xl font-bold text-white mb-2">Enterprise</h3>
              <p className="text-sm text-zinc-400 mb-6">For teams scaling AI in production.</p>
              <div className="mb-8">
                <span className="text-5xl font-bold text-white">$249</span>
                <span className="text-zinc-500">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 text-sm text-zinc-300">
                <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-white" /> Everything in Pro</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-white" /> Team workspace & sharing</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-white" /> API Access for CI/CD</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-white" /> Custom model endpoints</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-white" /> Priority support</li>
              </ul>
              <button className="w-full py-3 rounded-full border border-white/20 text-white font-medium hover:bg-white/10 transition-colors">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Final CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-indigo-500/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-64 bg-indigo-500/30 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 tracking-tight">Ready to optimize your AI stack?</h2>
          <p className="text-xl text-zinc-300 mb-10">
            Join thousands of engineers building better, faster, and cheaper AI applications.
          </p>
          <Link href="/compare" className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-white text-black rounded-full font-bold text-lg hover:bg-zinc-200 transition-all hover:scale-105">
            Start Comparing Now <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0A0A0A] py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
              <LayoutGrid className="w-3 h-3 text-black" />
            </div>
            <span className="font-bold text-white">ModelCompare</span>
          </div>
          
          <div className="flex gap-8 text-sm text-zinc-500">
            <a href="#" className="hover:text-white transition-colors">Documentation</a>
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
          
          <p className="text-sm text-zinc-600">
            © {new Date().getFullYear()} ModelCompare. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
