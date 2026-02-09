import { Heart, Home as HomeIcon, Star, Zap, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-2xl font-semibold">Hello World</h1>
      <div className="flex gap-6 [&_svg]:h-8 [&_svg]:w-8">
        <Heart />
        <HomeIcon />
        <Star />
        <Zap />
        <Sparkles />
      </div>
    </div>
  );
}
