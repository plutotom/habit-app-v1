import { redirect } from "next/navigation";

export default function AppNewPage() {
  redirect("/app/habits/new");
}

