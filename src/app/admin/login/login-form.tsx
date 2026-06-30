"use client";

import { useState } from "react";

export default function LoginForm() {
  const [error, setError] = useState("");

  async function submit(formData: FormData) {
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password")
      })
    });
    if (res.ok) {
      location.href = "/admin";
    } else {
      setError("Invalid login.");
    }
  }

  return (
    <form className="panel form" action={submit} style={{ width: "min(32rem, 100%)" }}>
      <p className="eyebrow">Admin</p>
      <h1 style={{ fontSize: "clamp(2.8rem, 10vw, 5rem)" }}>George Dashboard</h1>
      <input name="email" type="email" placeholder="Admin email" required />
      <input name="password" type="password" placeholder="Password" required />
      <button className="button">Log in</button>
      {error && <p className="toast">{error}</p>}
    </form>
  );
}
