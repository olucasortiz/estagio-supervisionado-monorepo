import * as React from "react";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "../../services/api";

export interface UserAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  initials: string;
  photoUrl?: string | null;
}

function resolvePhotoUrl(url?: string | null) {
  if (!url) return null;
  if (url.includes("/uploads/members")) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

export function UserAvatar({ initials, photoUrl, className, ...props }: UserAvatarProps) {
  const [imgError, setImgError] = React.useState(false);
  const resolved = !imgError ? resolvePhotoUrl(photoUrl) : null;

  if (resolved) {
    return (
      <div
        className={cn(
          "relative flex size-10 shrink-0 overflow-hidden rounded-full border border-border/80 bg-muted shadow-sm",
          className,
        )}
        {...props}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolved}
          alt={initials || "Usuário"}
          className="aspect-square size-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/80 bg-muted text-xs font-bold text-foreground shadow-sm",
        className,
      )}
      {...props}
    >
      <span>{initials || "?"}</span>
    </div>
  );
}
