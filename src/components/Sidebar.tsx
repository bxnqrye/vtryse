import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Notifications from "./Notifications";

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("name, username, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setName(data.name || "");
        setUsername(data.username || "");
        setAvatarUrl(data.avatar_url || "");
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const linkClass = (path: string) =>
    `nav-link ${location.pathname === path ? "nav-link-active" : ""}`;

  return (
    <>
      {/* Desktop show button (only when collapsed) */}
      {collapsed && (
        <button
          onClick={onToggle}
          className="hidden md:flex fixed top-3 left-3 z-50 glass rounded-xl w-10 h-10 items-center justify-center t-main text-xl"
          title="Show sidebar"
        >
          ☰
        </button>
      )}

      {/* Mobile top bar */}
      <div className={`bg-white/70 dark:bg-[#1f1a1a]/80 backdrop-blur-xl border border-black/10 dark:border-white/10`}>
        <h1 className="font-gaegu t-accent text-lg font-bold tracking-wide t-main">VTRyze</h1>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="t-main text-2xl leading-none"
        >
          {isOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Overlay when mobile menu is open */}
      {isOpen && (
          <div className="md:hidden fixed top-3 left-3 right-3 h-13 rounded-2xl flex items-center justify-between px-4 z-[60] bg-white/70 dark:bg-[#1f1a1a]/80 backdrop-blur-xl border border-black/10 dark:border-white/10">
            <h1 className="font-gaegu text-[30px] font-bold tracking-wide t-accent">VTRyze</h1>
            <button onClick={() => setIsOpen(!isOpen)} className="t-main text-2xl leading-none">
              {isOpen ? "✕" : "☰"}
            </button>
          </div>
      )}

      {/* Sidebar */}
      <aside
        className={`w-56 fixed left-0 top-0 bottom-0 z-50 rounded-l-none rounded-r-3xl border border-l-0 border-black/10 dark:border-white/10 bg-white/100 dark:bg-[#1f1a1a]/100 backdrop-blur-xl shadow-[0_0_30px_rgba(217,96,122,0.15)] dark:shadow-[0_0_40px_rgba(232,137,154,0.12)] flex flex-col p-4 transition-transform duration-200
        ${isOpen ? "translate-x-0" : "-translate-x-[120%]"} ${collapsed ? "md:-translate-x-[120%]" : "md:translate-x-0"}`}
      >
        {/* Desktop hide button */}
        <button
          onClick={onToggle}
          className="hidden md:flex absolute top-3 right-3 t-muted hover:t-main text-lg leading-none"
          title="Hide sidebar"
        >
          ‹
        </button>

        <div className="mb-3 px-2 hidden md:block">
          <h1 className="t-accent font-gaegu text-[30px] tracking-wide">VTRyze</h1>
        </div>
        <div className="mb-4 md:hidden h-12" />

        {/* Pfp + name + username */}
        <div className="glass-soft flex items-center gap-2 p-2 mb-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover border border-white/20 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-(--g-accent) flex items-center justify-center text-white font-semibold shrink-0">
              {name ? name.charAt(0).toUpperCase() : "?"}
            </div>
          )}
          <div className="flex flex-col min-w-0 leading-tight">
            <span className="text-[17px] font-semibold t-main truncate">
              {name || "User"}
            </span>
            {username && (
              <span className="text-[12px] t-muted truncate">{username}</span>
            )}
          </div>
        </div>

        <nav className="text-[#3f8a52] text-sm flex flex-col gap-1 mb-6 font-bold">
          <Link
            to="/dashboard"
            className={linkClass("/dashboard")}
            onClick={() => setIsOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            to="/settings"
            className={linkClass("/settings")}
            onClick={() => setIsOpen(false)}
          >
            Settings
          </Link>
        </nav>

        <Notifications />

        <button onClick={handleLogout} className="font-bold t-accent btn btn-ghost mt-3">
          Log Out
        </button>
      </aside>
    </>
  );
}

export default Sidebar;