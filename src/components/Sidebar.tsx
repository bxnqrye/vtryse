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
      <div className="md:hidden fixed top-3 left-3 right-3 h-13 glass rounded-2xl flex items-center justify-between px-4 z-[60]">
        <h1 className="text-lg font-bold tracking-wide t-main">vtryse</h1>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="t-main text-2xl leading-none"
        >
          {isOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Overlay when mobile menu is open */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`w-56 fixed left-0 top-0 bottom-0 z-50 glass rounded-l-none rounded-r-3xl border-l-0 flex flex-col p-4 transition-transform duration-200 bg-[#6d5758]/20
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

        <div className="mb-6 px-2 hidden md:block">
          <h1 className="text-2xl text-trace font-bold tracking-wide">vtryse</h1>
          <p className="text-[#3f8a52] text-[11px] t-accent font-bold tracking-wide">Trace Your Progress</p>
        </div>
        <div className="mb-4 md:hidden h-12" />

        {/* Pfp + name + username */}
        <div className="glass-soft flex items-center gap-3.5 p-4.5 mb-6">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              className="w-9 h-9 rounded-full object-cover border border-white/20 shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-(--g-accent) flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {name ? name.charAt(0).toUpperCase() : "?"}
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold t-main truncate">
              {name || "User"}
            </span>
            {username && (
              <span className="text-xs t-muted truncate">{username}</span>
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

        <button onClick={handleLogout} className="btn btn-ghost mt-3">
          Log Out
        </button>
      </aside>
    </>
  );
}

export default Sidebar;