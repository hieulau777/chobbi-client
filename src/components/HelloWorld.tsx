import { Sparkles } from "lucide-react";

export function HelloWorld() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3">
      <Sparkles className="h-5 w-5 text-primary" aria-hidden />
      <span className="font-medium">Hello World</span>
    </div>
  );
}
