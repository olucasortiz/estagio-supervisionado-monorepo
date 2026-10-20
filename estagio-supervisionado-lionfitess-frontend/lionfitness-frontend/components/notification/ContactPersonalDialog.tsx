"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ContactPersonalDialog({ personalName }: { personalName: string }) {
  const handleOpenChat = () => {
    window.dispatchEvent(new CustomEvent("open-lion-chat"));
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleOpenChat}
      className="cursor-pointer"
      title={`Abrir conversa com ${personalName}`}
    >
      <MessageCircle className="size-4" /> Falar com meu personal
    </Button>
  );
}

