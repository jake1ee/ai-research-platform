import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <p className="num text-sm text-accent">404</p>
      <h1 className="mt-2 text-2xl font-semibold">Nothing here</h1>
      <p className="mt-2 text-muted">That model or benchmark doesn&apos;t exist.</p>
      <Link href="/" className="mt-6 inline-block text-sm text-accent hover:underline">Back to the leaderboard</Link>
    </div>
  );
}
