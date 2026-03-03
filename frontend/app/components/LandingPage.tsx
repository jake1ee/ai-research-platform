"use client";

import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { 
  Sparkles, Play, Mic, Edit, Link as LinkIcon, CheckCircle2, 
  LayoutGrid, Zap, BarChart3, Shield, Code2, LineChart, Users, X
} from "lucide-react";

// Animation variants for reusability
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-zinc-200">
      {/* Navbar */}
      <nav className="w-full border-b border-zinc-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">ModelCompare</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-600">
            <Link href="#features" className="hover:text-black transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-black transition-colors">How it Works</Link>
            <Link href="#pricing" className="hover:text-black transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-zinc-600 hover:text-black transition-colors hidden md:block">
              Login
            </Link>
            <Link href="/signup" className="text-sm font-medium bg-black text-white px-6 py-2.5 rounded-full hover:bg-zinc-800 transition-colors">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center overflow-hidden">
        <motion.div 
          initial="hidden" 
          animate="visible" 
          variants={staggerContainer}
          className="flex flex-col items-start text-left"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-100 text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            <span>AI Model Evaluation for teams!</span>
          </motion.div>
          
          <motion.h1 variants={fadeUp} className="text-6xl md:text-7xl font-bold tracking-tighter mb-6 leading-[1.05] text-black">
            Model Evaluation <br />
            Platform for <br />
            Modern Teams
          </motion.h1>
          
          <motion.p variants={fadeUp} className="text-xl text-zinc-500 mb-10 max-w-lg leading-relaxed">
            Automate your testing. Connect to your APIs. Maximize model performance and minimize costs.
          </motion.p>
          
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link href="/compare" className="w-full sm:w-auto flex items-center justify-center px-8 py-4 bg-black text-white rounded-full font-medium text-lg hover:bg-zinc-800 transition-all hover:scale-105 active:scale-95">
              Try Now
            </Link>
          </motion.div>
        </motion.div>

        {/* Hero Mockup */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="relative w-full aspect-square md:aspect-4/3 bg-white rounded-3xl border border-zinc-200 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] p-6 flex flex-col"
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1.5 h-6 bg-black rounded-full"></div>
            <h3 className="font-bold text-lg">Model Workflows</h3>
            <div className="ml-auto flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
            </div>
          </div>
          
          <div className="grow rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 space-y-4 font-mono text-sm">
            <div className="flex items-center gap-3 text-zinc-500 mb-4">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-sans font-bold">AI</span>
              Processing prompt data...
            </div>
            <p><span className="font-bold text-black">GPT-4o:</span> We need to improve the onboarding flow by next sprint.</p>
            <p><span className="font-bold text-black">Claude 3:</span> What aspects should we prioritize?</p>
            <p><span className="font-bold text-black">Llama 3:</span> User testing showed sign-up completion is only 67%.</p>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2 }}
              className="mt-6 p-3 bg-yellow-50 border-l-2 border-yellow-400 text-yellow-800 font-sans"
            >
              <span className="font-bold">Action Item:</span> Improve onboarding flow
            </motion.div>
          </div>
        </motion.div>
      </main>

      {/* How it Works Section */}
      <section id="how-it-works" className="bg-zinc-50 py-32 border-t border-zinc-100">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="max-w-7xl mx-auto px-6"
        >
          <motion.div variants={fadeUp} className="text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight mb-4 text-black">How ModelCompare Works</h2>
            <p className="text-zinc-500 text-lg">From prompt to production, we transform your evaluation into automated workflows.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Mic, title: "Capture", desc: "Record and transcribe your prompts with AI precision, capturing every detail." },
              { icon: Edit, title: "Process", desc: "Extract action items, decisions, and key insights using smart AI." },
              { icon: LinkIcon, title: "Connect", desc: "Seamlessly integrate with your productivity tools, automatically syncing." },
              { icon: Play, title: "Automate", desc: "Trigger workflows based on model content - from scheduling to updating." }
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp} className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow hover:-translate-y-1 duration-300">
                <div className="w-12 h-12 rounded-full border border-zinc-200 flex items-center justify-center mb-6">
                  <item.icon className="w-5 h-5 text-zinc-700" />
                </div>
                <h3 className="text-lg font-bold mb-3 text-black">{item.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

       {/* Marketing Sections */}
      <div className="bg-white">
        
        {/* Why Choose Us Section */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-24">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-black">Why Choose ModelCompare</motion.h2>
            <motion.p variants={fadeUp} className="text-zinc-500 text-lg max-w-2xl mx-auto">
              Stop guessing which model is best. Connect your prompts to reality with powerful, unbiased analytics.
            </motion.p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            <motion.div variants={fadeUp} className="p-8 rounded-3xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 transition-colors">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-zinc-200">
                <Zap className="w-6 h-6 text-black" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-black">Real-time Latency Tracking</h3>
              <p className="text-zinc-500 leading-relaxed">
                Monitor exactly how long each model takes to generate responses. Optimize your app's perceived performance instantly.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="p-8 rounded-3xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 transition-colors">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-zinc-200">
                <BarChart3 className="w-6 h-6 text-black" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-black">Granular Cost Analytics</h3>
              <p className="text-zinc-500 leading-relaxed">
                Calculate exact token usage and costs down to the 6th decimal place. Never overpay for AI generation again.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="p-8 rounded-3xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 transition-colors">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-zinc-200">
                <Shield className="w-6 h-6 text-black" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-black">Unbiased & Secure</h3>
              <p className="text-zinc-500 leading-relaxed">
                We route directly to provider APIs. Your prompts stay yours, and we don't store your evaluation data.
              </p>
            </motion.div>
          </motion.div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="bg-zinc-50 py-32 border-t border-zinc-200">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="text-center mb-16"
            >
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-zinc-200 text-sm font-medium mb-6 text-zinc-600">
                <Shield className="w-4 h-4 text-indigo-500" />
                <span>Bring Your Own Key (BYOK) Architecture</span>
              </motion.div>
              <motion.h2 variants={fadeUp} className="text-4xl font-bold tracking-tight mb-4 text-black">Simple, Transparent Pricing</motion.h2>
              <motion.p variants={fadeUp} className="text-zinc-500 text-lg max-w-2xl mx-auto">
                You only pay for platform features and analytics, not token markups. Start with a 7-day Pro trial.
              </motion.p>
            </motion.div>

            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center"
            >
              {/* Free - Explorer */}
              <motion.div variants={fadeUp} className="p-8 rounded-3xl border border-zinc-200 bg-white shadow-sm">
                <h3 className="text-xl font-bold mb-1 text-black">Explorer</h3>
                <p className="text-sm text-zinc-500 mb-6">Perfect for experimentation.</p>
                <div className="mb-8">
                  <span className="text-5xl font-bold text-black">$0</span>
                  <span className="text-sm text-zinc-500 ml-2">/forever</span>
                </div>
                <ul className="space-y-4 mb-8 text-sm text-zinc-600">
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-zinc-900" /> 20 comparisons / month</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-zinc-900" /> Compare up to 3 models</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-zinc-900" /> Basic latency & cost tracking</li>
                  <li className="flex items-center gap-3 text-zinc-400"><X className="w-5 h-5" /> No prompt history</li>
                  <li className="flex items-center gap-3 text-zinc-400"><X className="w-5 h-5" /> No LLM Judge mode</li>
                </ul>
                <button className="w-full py-3 rounded-full border border-zinc-200 font-medium text-black hover:bg-zinc-50 transition-colors">
                  Get Started Free
                </button>
              </motion.div>

              {/* Pro - Builder (Highlighted) */}
              <motion.div variants={fadeUp} className="p-8 rounded-3xl border-2 border-black bg-white relative shadow-xl transform md:-translate-y-4">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-1 rounded-full text-xs font-bold tracking-wide">
                  Most Popular
                </div>
                <h3 className="text-xl font-bold mb-1 text-black">Builder</h3>
                <p className="text-sm text-zinc-500 mb-6">For AI engineers & indie hackers.</p>
                <div className="mb-8">
                  <span className="text-5xl font-bold text-black">$29</span>
                  <span className="text-sm text-zinc-500 ml-2">/month</span>
                </div>
                <ul className="space-y-4 mb-8 text-sm text-zinc-600">
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-600" /> 300 comparisons / month</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-600" /> Compare up to 5 models</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-600" /> Visual performance analytics</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-600" /> LLM-as-a-Judge scoring (50/mo)</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-600" /> Prompt history & CSV export</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-600" /> Custom model routing</li>
                </ul>
                <button className="w-full py-3 rounded-full bg-black text-white font-medium hover:bg-zinc-800 transition-colors">
                  Start 7-Day Free Trial
                </button>
              </motion.div>

              {/* Team - Scale */}
              <motion.div variants={fadeUp} className="p-8 rounded-3xl border border-zinc-200 bg-white shadow-sm">
                <h3 className="text-xl font-bold mb-1 text-black">Scale</h3>
                <p className="text-sm text-zinc-500 mb-6">For startups & product teams.</p>
                <div className="mb-8">
                  <span className="text-5xl font-bold text-black">$99</span>
                  <span className="text-sm text-zinc-500 ml-2">/month</span>
                </div>
                <ul className="space-y-4 mb-8 text-sm text-zinc-600">
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-zinc-900" /> 2,000 comparisons / month</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-zinc-900" /> Unlimited models per request</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-zinc-900" /> Batch benchmarking (CSV)</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-zinc-900" /> Shared team workspace</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-zinc-900" /> API automation & Webhooks</li>
                </ul>
                <button className="w-full py-3 rounded-full border border-zinc-200 font-medium text-black hover:bg-zinc-50 transition-colors">
                  Start Team Trial
                </button>
              </motion.div>
            </motion.div>

            {/* Add-ons & Enterprise Banner */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-16 max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm"
            >
              <div className="text-center md:text-left mb-4 md:mb-0">
                <h4 className="font-bold text-black mb-1">Need more volume?</h4>
                <p className="text-sm text-zinc-500">
                  <span className="font-medium text-zinc-700">+$5</span> per 500 extra comparisons &nbsp;|&nbsp; <span className="font-medium text-zinc-700">+$10</span> per 100 Judge evaluations
                </p>
              </div>
              <div className="h-px w-full md:w-px md:h-12 bg-zinc-200 my-4 md:my-0 mx-6 hidden md:block"></div>
              <div className="text-center md:text-right">
                <h4 className="font-bold text-black mb-1">Enterprise Requirements?</h4>
                <p className="text-sm text-zinc-500 mb-2">SLA, On-premise, Dedicated Pipelines.</p>
                <Link href="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Contact Sales →</Link>
              </div>
            </motion.div>

          </div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-3xl mx-auto px-6 py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-4 text-black">Frequently Asked Questions</h2>
            <p className="text-zinc-500">Everything you need to know about ModelCompare.</p>
          </div>
          
          <div className="space-y-6">
            {[
              { q: "How are costs calculated?", a: "Costs are calculated in real-time using the exact input and output token counts returned by the provider's API, multiplied by their official pricing tiers." },
              { q: "Do you store my prompts?", a: "No. We act as a passthrough. Your prompts are sent directly to the model providers and are never stored in our databases." },
              { q: "Can I add my own custom models?", a: "Yes! On the Pro plan, you can connect any OpenAI-compatible endpoint, including local models running on Ollama or vLLM." }
            ].map((faq, i) => (
              <div key={i} className="p-6 rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <h3 className="text-lg font-bold text-black mb-2">{faq.q}</h3>
                <p className="text-zinc-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-zinc-200 bg-white py-12">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                <LayoutGrid className="w-3 h-3 text-white" />
              </div>
              <span className="font-bold text-black">ModelCompare</span>
            </div>
            
            <div className="flex gap-6 text-sm text-zinc-500">
              <Link href="#" className="hover:text-black transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-black transition-colors">Terms of Service</Link>
              <Link href="#" className="hover:text-black transition-colors">Contact Support</Link>
            </div>
            
            <p className="text-sm text-zinc-400">
              © {new Date().getFullYear()} ModelCompare. All rights reserved.
            </p>
          </div>
        </footer>

      </div>
    </div>
  );
}