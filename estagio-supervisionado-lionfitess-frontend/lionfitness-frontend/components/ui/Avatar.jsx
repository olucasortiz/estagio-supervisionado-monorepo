"use client";

import { useState } from "react";
import { API_BASE_URL } from "../../services/api";

function getInitials(name) {
  if (!name || name === "-") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function resolvePhotoUrl(photoUrl) {
  if (!photoUrl) return null;
  if (photoUrl.includes("/uploads/members")) return null;
  if (/^https?:\/\//i.test(photoUrl)) return photoUrl;
  return `${API_BASE_URL}${photoUrl.startsWith("/") ? photoUrl : `/${photoUrl}`}`;
}

export default function Avatar({ name, photoUrl, size = "md", className = "", style = {} }) {
  const [imgError, setImgError] = useState(false);
  const resolved = !imgError ? resolvePhotoUrl(photoUrl) : null;
  const initials = getInitials(name);

  const sizes = {
    xs: "size-6 text-[10px]",
    sm: "size-8 text-xs",
    md: "size-9 text-xs",
    lg: "size-11 text-sm",
    xl: "size-14 text-base",
  };

  const sizeClass = sizes[size] || sizes.md;

  if (resolved) {
    return (
      <div
        className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/80 bg-muted shadow-sm ${sizeClass} ${className}`}
        style={style}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolved}
          alt={`Foto de ${name || "usuário"}`}
          className="size-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-border/80 bg-muted font-bold text-foreground shadow-sm ${sizeClass} ${className}`}
      style={style}
      title={name || "Usuário"}
    >
      {initials}
    </div>
  );
}
