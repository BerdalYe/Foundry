import type { Metadata } from "next";
import { LibraryView } from "@/components/library-view";

export const metadata: Metadata = {
  title: "Library — Foundry",
  description: "The sites you have saved on this device.",
};

export default function LibraryPage() {
  return <LibraryView />;
}
