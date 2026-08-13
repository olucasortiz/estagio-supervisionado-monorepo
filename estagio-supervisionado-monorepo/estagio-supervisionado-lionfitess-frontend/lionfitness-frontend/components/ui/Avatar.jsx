"use client";

import { API_BASE_URL } from "../../services/api";

const COLORS = [
  { bg: "linear-gradient(135deg, #C0392B 0%, #E74C3C 100%)", text: "#fff" },
  { bg: "linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)", text: "#fff" },
  { bg: "linear-gradient(135deg, #059669 0%, #10B981 100%)", text: "#fff" },
  { bg: "linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)", text: "#fff" },
  { bg: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)", text: "#fff" },
  { bg: "linear-gradient(135deg, #0891B2 0%, #06B6D4 100%)", text: "#fff" },
];

function getInitials(name) {
  if (!name || name === "-") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColor(name) {
  const sum = (name || "").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return COLORS[sum % COLORS.length];
}

function resolvePhotoUrl(photoUrl) {
  if (!photoUrl) return null;
  if (photoUrl.includes("/uploads/members")) return null;
  if (/^https?:\/\//i.test(photoUrl)) return photoUrl;
  return `${API_BASE_URL}${photoUrl.startsWith("/") ? photoUrl : `/${photoUrl}`}`;
}

export default function Avatar({ name, photoUrl, size = "md", style = {} }) {
  const resolved = resolvePhotoUrl(photoUrl);
  const initials = getInitials(name);
  const colorScheme = getColor(name);

  const sizes = { sm: 32, md: 40, lg: 56, xl: 72 };
  const fontSizes = { sm: 11, md: 13, lg: 16, xl: 20 };
  const dim = sizes[size] || sizes.md;
  const fs = fontSizes[size] || fontSizes.md;

  const base = {
    width: dim, height: dim, borderRadius: "50%",
    flexShrink: 0, overflow: "hidden", ...style,
  };

  if (resolved) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolved}
        alt={`Foto de ${name || "usuário"}`}
        style={{ ...base, objectFit: "cover", display: "block" }}
        onError={(e) => { e.currentTarget.style.display = "none"; }}
      />
    );
  }

  return (
    <div style={{
      ...base,
      background: colorScheme.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: fs, color: colorScheme.text,
      letterSpacing: "0.5px",
    }}>
      {initials}
    </div>
  );
}
