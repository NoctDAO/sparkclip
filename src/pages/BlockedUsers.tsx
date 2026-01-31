import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { BlockedUsersList } from "@/components/settings/BlockedUsersList";

export default function BlockedUsers() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[var(--app-height)] bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center p-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-bold text-lg ml-2">Blocked accounts</h1>
      </header>

      <div className="py-2">
        <BlockedUsersList />
      </div>
    </div>
  );
}
