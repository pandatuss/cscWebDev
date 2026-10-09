import { useState } from "react";
import { ImageIcon } from "lucide-react";

export function ContentImage({ src, alt }: { src?: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-t-2xl bg-primary-soft">
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary-soft to-background text-accent-foreground/60"
          role="img"
          aria-label={`${alt} (no image)`}
        >
          <ImageIcon className="size-8" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
