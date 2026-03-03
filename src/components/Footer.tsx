import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-border bg-secondary mt-auto flex items-center justify-center border-t px-6 py-6">
      <Link href="/" className="flex items-center">
        <Image
          src="/logo-white.png"
          alt="Chobbi"
          width={120}
          height={40}
          className="h-8 w-auto"
        />
      </Link>
    </footer>
  );
}
