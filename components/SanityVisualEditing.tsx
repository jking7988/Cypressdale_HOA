"use client";

import { VisualEditing } from "next-sanity/visual-editing";
import { useRouter } from "next/navigation";

export default function SanityVisualEditing() {
  const router = useRouter();

  return (
    <VisualEditing
      refresh={async () => {
        router.refresh();
        return;
      }}
    />
  );
}
