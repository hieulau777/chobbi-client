import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AlertTokenAfterAuth } from "@/components/AlertTokenAfterAuth";

export default function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <AlertTokenAfterAuth />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
