import LandingPage from "@/components/landing/LandingPage";
import Navbar from "@/components/navbar/navbar";

export default function Home() {
  return (
    <div className="font-sans min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1">
        <LandingPage />
      </div>
    </div>
  );
}
