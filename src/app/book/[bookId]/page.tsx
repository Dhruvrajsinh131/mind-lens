import Main from "@/components/main/main";
import Navbar from "@/components/navbar/navbar";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { BookProvider } from "@/contexts/BookContext";

interface BookPageProps {
  params: {
    bookId: string;
  };
}

export default async function BookPage({ params }: BookPageProps) {
  const { bookId } = await params;

  return (
    <ProtectedRoute>
      <BookProvider>
        <div className="font-sans h-screen flex flex-col">
          <Navbar />
          <div className="flex-1 overflow-hidden">
            <Main bookId={bookId} />
          </div>
        </div>
      </BookProvider>
    </ProtectedRoute>
  );
}
