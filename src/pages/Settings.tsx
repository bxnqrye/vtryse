import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import SearchableSelect from "../components/SearchableSelect";
import { COUNTRIES } from "../utils/countries";
import { ALL_TIMEZONES } from "../utils/timezone";

function Settings() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [theme, setThemeState] = useState("dark");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");

  const [shareCode, setShareCode] = useState("");
  const [showAcceptInput, setShowAcceptInput] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [shareMsg, setShareMsg] = useState("");

  const [shareLocation, setShareLocation] = useState(true);
  const [country, setCountry] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [locationMsg, setLocationMsg] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;

      if (error) {
        setErrorMsg(error.message);
      } else if (data) {
        setName(data.name || "");
        setUsername(data.username || "");
        setAvatarUrl(data.avatar_url || "");
        setThemeState(data.theme || "dark");
        setShareLocation(data.share_location !== false);
        setCountry(data.country || "");
        setTimezone(data.timezone || "UTC");
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyTheme = (selectedTheme: string) => {
    const isDark =
      selectedTheme === "dark" ||
      (selectedTheme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("vtryse-theme", selectedTheme);
  };

  const handleThemeChange = async (newTheme: string) => {
    setThemeState(newTheme);
    applyTheme(newTheme);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ theme: newTheme })
      .eq("id", user.id);

    if (error) setErrorMsg(error.message);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      setErrorMsg(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    setAvatarUrl(newAvatarUrl);

    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: newAvatarUrl })
      .eq("id", user.id);

    if (error) setErrorMsg(error.message);
    else setSuccessMsg("Profile picture updated!");

    setUploading(false);
  };

  const handleSaveAccount = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ name, username })
      .eq("id", user.id);

    if (error) {
      setErrorMsg(error.message);
      setSuccessMsg("");
    } else {
      setErrorMsg("");
      setSuccessMsg("Saved successfully!");
    }
  };

  const handleChangePassword = async () => {
    setPasswordMsg("");

    if (!newPassword || newPassword !== confirmPassword) {
      setPasswordMsg("Passwords do not match");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordMsg(error.message);
    } else {
      setPasswordMsg("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleShareWithOthers = async () => {
    const { data, error } = await supabase.rpc("create_share_code");
    if (error) {
      setShareMsg("Failed to generate code: " + error.message);
    } else {
      setShareCode(data);
      setShareMsg("");
    }
  };

  const handleAcceptSharing = async () => {
    if (!redeemCode) {
      setShareMsg("Enter a code first");
      return;
    }
    const { data, error } = await supabase.rpc("redeem_share_code", {
      input_code: redeemCode,
    });
    if (error || !data) {
      setShareMsg("Invalid or expired code");
    } else {
      setShareMsg("Successfully joined the shared dashboard! Refreshing...");
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  const handleToggleShareLocation = async () => {
    const newValue = !shareLocation;
    setShareLocation(newValue);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ share_location: newValue })
      .eq("id", user.id);

    if (error) setErrorMsg(error.message);
  };

  const handleSaveLocation = async () => {
    setLocationMsg("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ country, timezone })
      .eq("id", user.id);

    if (error) setLocationMsg(error.message);
    else setLocationMsg("Location saved!");
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete your account? This cannot be undone.",
    );
    if (!confirmed) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.functions.invoke("delete-account", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      setErrorMsg("Failed to delete account: " + error.message);
    } else {
      await supabase.auth.signOut();
      window.location.href = "/";
    }
  };

  const card = "glass p-4 sm:p-5";
  const okText = "text-green-700 dark:text-green-400";
  const errText = "text-red-600 dark:text-red-400";

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-5xl mx-auto">
      <header className="mb-4 sm:mb-5">
        <p className="g-label mb-1">Preferences</p>
        <h1 className="text-[clamp(1.25rem,4vw,1.5rem)] font-semibold t-main">Settings</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 items-start">
        {/* Left column */}
        <div className="flex flex-col gap-3 sm:gap-4 min-w-0">
          {/* Account */}
          <div className={card}>
            <p className="g-label mb-4">Account</p>

            <div className="flex items-center gap-4 mb-4">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover border border-white/20"
                />
              ) : (
                <div className="w-16 h-16 rounded-full glass-soft !rounded-full flex items-center justify-center t-muted text-xs">
                  No photo
                </div>
              )}
              <label className="btn btn-ghost btn-sm cursor-pointer">
                {uploading ? "Uploading..." : "Change photo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>

            <div className="flex flex-col gap-2 mb-4">
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="glass-input"
              />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="glass-input"
              />
            </div>

            <button onClick={handleSaveAccount} className="btn btn-primary">
              Save Changes
            </button>

            {errorMsg && <p className={`${errText} text-xs mt-2`}>{errorMsg}</p>}
            {successMsg && <p className="t-muted text-xs mt-2">{successMsg}</p>}
          </div>

          {/* Theme */}
          <div className={card}>
            <p className="g-label mb-4">Theme</p>
            <div className="flex gap-2">
              {["light", "dark", "system"].map((t) => (
                <button
                  key={t}
                  onClick={() => handleThemeChange(t)}
                  className={`btn flex-1 capitalize ${
                    theme === t ? "btn-primary" : "btn-ghost"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Country & Timezone */}
          <div className={card}>
            <p className="g-label mb-4">Country &amp; Timezone</p>

            <div className="flex flex-col gap-2 mb-4">
              <SearchableSelect
                options={COUNTRIES.map((c) => ({ value: c.name, label: c.name }))}
                value={country}
                onChange={(val) => {
                  setCountry(val);
                  const match = COUNTRIES.find((c) => c.name === val);
                  if (match) setTimezone(match.timezone);
                }}
                placeholder="Search country..."
              />
              <SearchableSelect
                options={ALL_TIMEZONES.map((tz) => ({ value: tz, label: tz }))}
                value={timezone}
                onChange={setTimezone}
                placeholder="Search timezone..."
              />
            </div>

            <button onClick={handleSaveLocation} className="btn btn-primary">
              Save
            </button>

            {locationMsg && (
              <p className={`text-xs mt-2 ${locationMsg.includes("saved") ? okText : errText}`}>
                {locationMsg}
              </p>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3 sm:gap-4 min-w-0">
          {/* Privacy */}
          <div className={card}>
            <p className="g-label mb-4">Privacy</p>

            <div className="flex flex-col gap-2 mb-4">
              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="glass-input"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="glass-input"
              />
            </div>

            <button onClick={handleChangePassword} className="btn btn-primary">
              Update Password
            </button>

            {passwordMsg && (
              <p className={`text-xs mt-2 ${passwordMsg.includes("success") ? okText : errText}`}>
                {passwordMsg}
              </p>
            )}
          </div>

          {/* Location Sharing */}
          <div className={card}>
            <p className="g-label mb-3">Location Sharing</p>
            <p className="text-xs t-muted mb-4 leading-relaxed">
              Show your location, time, and weather to people sharing your dashboard.
            </p>
            <button
              onClick={handleToggleShareLocation}
              className={`btn ${shareLocation ? "btn-primary" : "btn-ghost"}`}
            >
              {shareLocation ? "Sharing Enabled" : "Sharing Disabled"}
            </button>
          </div>

          {/* Sharing */}
          <div className={card}>
            <p className="g-label mb-4">Sharing</p>

            <div className="flex flex-col gap-4">
              <div>
                <button onClick={handleShareWithOthers} className="btn btn-primary">
                  Share with Others
                </button>
                {shareCode && (
                  <div className="glass-soft mt-3 p-3">
                    <p className="text-[11px] t-muted mb-1">Share this code</p>
                    <p className="text-lg font-mono font-semibold t-accent tracking-widest break-all">
                      {shareCode}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <button
                  onClick={() => setShowAcceptInput(!showAcceptInput)}
                  className="btn btn-ghost"
                >
                  Accept Sharing
                </button>
                {showAcceptInput && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter code"
                      value={redeemCode}
                      onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="glass-input flex-1 min-w-0 font-mono tracking-widest"
                    />
                    <button onClick={handleAcceptSharing} className="btn btn-primary">
                      Join
                    </button>
                  </div>
                )}
              </div>

              {shareMsg && (
                <p className={`text-xs ${shareMsg.includes("Success") ? okText : errText}`}>
                  {shareMsg}
                </p>
              )}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="glass glass-danger p-4 sm:p-5">
            <p className="text-[11px] font-bold text-(--g-danger) uppercase tracking-widest mb-2">
              Danger Zone
            </p>
            <p className="text-xs t-muted mb-4">
              This action is permanent and cannot be undone.
            </p>
            <button onClick={handleDeleteAccount} className="btn btn-danger">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
