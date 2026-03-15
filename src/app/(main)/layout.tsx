import { Suspense } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AlertTokenAfterAuth } from "@/components/AlertTokenAfterAuth";
import { ChatWidget } from "@/components/ChatWidget";

export default function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Suspense fallback={null}>
        <AlertTokenAfterAuth />
      </Suspense>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <ChatWidget />
    </>
  );
}
