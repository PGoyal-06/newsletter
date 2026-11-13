import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { env } from "@/env";
import { UiGallery } from "@/features/design-system/gallery/UiGallery";

// Read the flag per request, so one build can serve the gallery or a 404.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "UI gallery · Morning Feed",
  robots: { index: false, follow: false },
};

export default function UiGalleryPage() {
  if (!env.enableUiGallery) notFound();
  return <UiGallery />;
}
