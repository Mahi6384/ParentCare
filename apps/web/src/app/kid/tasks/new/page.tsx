import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import KidNavBar from "@/components/kid/KidNavBar";
import NewTaskForm from "./NewTaskForm";
import type { HealthProfile } from "@/types";

/*
  /kid/tasks/new — Task Creation Page

  Server Component: fetches the family + parent's health profile, then
  renders a two-column shell.

  LEFT  : NewTaskForm (Client Component) — handles all interactive state
  RIGHT : Papa's Health Profile + Recent Agent Notes (static, Server-rendered)

  The sidebar is kept in the Server Component intentionally — it never
  changes in response to user input, so it needs zero client JavaScript.
  Only NewTaskForm ships JS to the browser.
*/

// ── Sidebar sub-components (pure Server Component JSX) ────────

function ProfileRow({
    label,
    value,
}: {
    label: string;
    value: React.ReactNode;
}) {
    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "100px 1fr",
                gap: 8,
                padding: "7px 0",
                borderTop: "0.5px solid var(--pc-hair)",
                alignItems: "start",
            }}
        >
            <span
                style={{
                    fontSize: 11.5,
                    color: "var(--pc-ink3)",
                    paddingTop: 2,
                }}
            >
                {label}
            </span>
            <span style={{ fontSize: 13, color: "var(--pc-ink2)" }}>
                {value}
            </span>
        </div>
    );
}

function HealthProfileSidebar({
    healthProfile,
    agentNotes,
}: {
    healthProfile: HealthProfile | null;
    agentNotes: { id: string; note: string; created_at: string }[] | null;
}) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Papa's Health Profile card */}
            <div className="pc-card" style={{ padding: 16 }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 14,
                    }}
                >
                    <span
                        style={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            color: "var(--pc-ink3)",
                        }}
                    >
                        Papa&apos;s Health Profile
                    </span>
                    <Link
                        href="/onboarding/chat"
                        style={{
                            fontSize: 12,
                            color: "var(--pc-brand)",
                            textDecoration: "none",
                        }}
                    >
                        ✏ Edit
                    </Link>
                </div>

                {healthProfile ? (
                    <>
                        <ProfileRow
                            label="Age"
                            value={
                                healthProfile.age
                                    ? `${healthProfile.age} years`
                                    : "—"
                            }
                        />
                        <ProfileRow
                            label="Conditions"
                            value={
                                healthProfile.conditions.length === 0 ||
                                healthProfile.conditions.every(
                                    (c) => c === "none",
                                ) ? (
                                    <span style={{ color: "var(--pc-ink4)" }}>
                                        None noted
                                    </span>
                                ) : (
                                    <div
                                        style={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 4,
                                        }}
                                    >
                                        {healthProfile.conditions
                                            .filter((c) => c !== "none")
                                            .map((c) => (
                                                <span
                                                    key={c}
                                                    className="pc-pill pc-pill-warn"
                                                >
                                                    {c.replace(/_/g, " ")}
                                                </span>
                                            ))}
                                    </div>
                                )
                            }
                        />
                        <ProfileRow
                            label="Restrictions"
                            value={
                                healthProfile.restrictions.length === 0 ||
                                healthProfile.restrictions.every(
                                    (r) => r === "none",
                                ) ? (
                                    <span style={{ color: "var(--pc-ink4)" }}>
                                        None
                                    </span>
                                ) : (
                                    <div
                                        style={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 4,
                                        }}
                                    >
                                        {healthProfile.restrictions
                                            .filter((r) => r !== "none")
                                            .map((r) => (
                                                <span
                                                    key={r}
                                                    className="pc-pill pc-pill-neutral"
                                                >
                                                    {r.replace(/_/g, " ")}
                                                </span>
                                            ))}
                                    </div>
                                )
                            }
                        />
                        <ProfileRow
                            label="Fitness"
                            value={healthProfile.fitness_level}
                        />
                        <ProfileRow
                            label="Equipment"
                            value={
                                healthProfile.equipment.length === 0 ||
                                healthProfile.equipment.every(
                                    (e) => e === "none",
                                )
                                    ? "—"
                                    : healthProfile.equipment
                                          .filter((e) => e !== "none")
                                          .join(", ")
                            }
                        />
                        <ProfileRow
                            label="Food region"
                            value={healthProfile.food_region || "—"}
                        />
                        <ProfileRow
                            label="Language"
                            value={healthProfile.language_preference || "—"}
                        />
                    </>
                ) : (
                    <div style={{ textAlign: "center", padding: "16px 0" }}>
                        <p
                            style={{
                                fontSize: 13,
                                color: "var(--pc-ink3)",
                                margin: "0 0 12px",
                            }}
                        >
                            Health profile not set up yet.
                        </p>
                        <Link
                            href="/onboarding/chat"
                            className="pc-btn-ghost"
                            style={{ fontSize: 12 }}
                        >
                            Set up profile →
                        </Link>
                    </div>
                )}
            </div>

            {/* Recent Agent Notes */}
            <div className="pc-card" style={{ padding: 16 }}>
                <div
                    style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "var(--pc-ink3)",
                        marginBottom: 12,
                    }}
                >
                    Recent Agent Notes
                </div>

                {agentNotes && agentNotes.length > 0 ? (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                        }}
                    >
                        {agentNotes.map((n, i) => (
                            <div key={n.id}>
                                {i > 0 && (
                                    <div
                                        style={{
                                            height: "0.5px",
                                            background: "var(--pc-hair)",
                                            margin: "12px 0 0",
                                        }}
                                    />
                                )}
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: "var(--pc-ink4)",
                                        marginBottom: 4,
                                        fontFamily: "var(--pc-mono)",
                                    }}
                                >
                                    {new Date(n.created_at).toLocaleDateString(
                                        "en-IN",
                                        { day: "numeric", month: "short" },
                                    )}
                                </div>
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: 12.5,
                                        lineHeight: 1.55,
                                        color: "var(--pc-ink2)",
                                        fontStyle: "italic",
                                    }}
                                >
                                    &ldquo;{n.note}&rdquo;
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p
                        style={{
                            margin: 0,
                            fontSize: 12.5,
                            color: "var(--pc-ink4)",
                            lineHeight: 1.55,
                        }}
                    >
                        No notes yet. Saathi will add observations here as Papa
                        completes tasks.
                    </p>
                )}
            </div>
        </div>
    );
}

// ── Page (Server Component) ───────────────────────────────────

export default async function NewTaskPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Round 1 — two independent queries, run in parallel
    const [{ data: profile }, { data: family }] = await Promise.all([
        supabase.from("users").select("name").eq("id", user!.id).single(),
        supabase.from("families").select("id, parent_id").eq("kid_id", user!.id).single(),
    ]);

    const parentId = family?.parent_id ?? null;

    // Round 2 — three independent queries that all need parentId, run in parallel
    const [{ data: healthProfile }, { data: parentUser }, { data: agentNotes }] =
        await Promise.all([
            parentId
                ? supabase.from("health_profiles").select("*").eq("parent_id", parentId).single()
                : Promise.resolve({ data: null }),
            parentId
                ? supabase.from("users").select("timezone").eq("id", parentId).single()
                : Promise.resolve({ data: null }),
            parentId
                ? supabase
                      .from("agent_notes")
                      .select("id, note, created_at")
                      .eq("parent_id", parentId)
                      .order("created_at", { ascending: false })
                      .limit(3)
                : Promise.resolve({ data: [] }),
        ]);

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "var(--pc-bg)",
                color: "var(--pc-ink)",
            }}
        >
            {/* Shared nav bar — "Tasks" is the active tab */}
            <KidNavBar userName={profile?.name ?? ""} activeTab="tasks" />

            {/* Two-column body — same grid as /kid/dashboard */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 360px",
                    gap: 24,
                    padding: "24px 28px 60px",
                }}
            >
                {/* LEFT — interactive form (Client Component) */}
                <NewTaskForm
                    familyId={family?.id}
                    healthProfile={healthProfile as HealthProfile | null}
                    parentId={parentId}
                    parentTimezone={parentUser?.timezone ?? "Asia/Kolkata"}
                />

                {/* RIGHT — static sidebar (Server Component JSX) */}
                <HealthProfileSidebar
                    healthProfile={healthProfile as HealthProfile | null}
                    agentNotes={agentNotes ?? []}
                />
            </div>
        </div>
    );
}
