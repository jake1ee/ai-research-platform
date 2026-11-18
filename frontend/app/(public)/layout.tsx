import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6">{children}</main>
      <Footer />
    </>
  );
}
