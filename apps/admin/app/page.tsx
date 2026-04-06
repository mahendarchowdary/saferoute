import { useAuthStore } from "@/store/auth";
import { redirect } from "next/navigation";

export default function Home() {
  const { isAuthenticated } = useAuthStore.getState();

  if (isAuthenticated) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
