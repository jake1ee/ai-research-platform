import Link from "next/link";
import { LayoutGrid } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-6 shadow-sm">
          <LayoutGrid className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-zinc-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-600">
          Or{" "}
          <Link href="/signup" className="font-medium text-black hover:underline">
            start your 7-day free trial
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-zinc-200 sm:rounded-3xl sm:px-10">
          <form className="space-y-6" action="#" method="POST">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700">Email address</label>
              <div className="mt-1">
                <input id="email" name="email" type="email" required className="block w-full appearance-none rounded-xl border border-zinc-300 px-4 py-3 placeholder-zinc-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700">Password</label>
              <div className="mt-1">
                <input id="password" name="password" type="password" required className="block w-full appearance-none rounded-xl border border-zinc-300 px-4 py-3 placeholder-zinc-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 rounded border-zinc-300 text-black focus:ring-black" />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-zinc-900">Remember me</label>
              </div>
              <div className="text-sm">
                <a href="#" className="font-medium text-black hover:underline">Forgot your password?</a>
              </div>
            </div>

            <div>
              <button type="submit" className="flex w-full justify-center rounded-full border border-transparent bg-black py-3 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-colors">
                Sign in
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}