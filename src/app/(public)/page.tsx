import { redirect } from "next/navigation";

export default function Home() {
  // The login bootstrap resumes an existing session or shows the real login form.
  redirect("/login");
}
