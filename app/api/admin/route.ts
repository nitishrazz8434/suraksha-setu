import { z } from "zod";
import { requireAccount, mutationGuard, accountSchema, hashPassword, account, audit, type UserRow } from "../../../lib/auth";
import { db } from "../../../lib/server";
import { readWorkspace } from "../../../lib/persistence";
import { SHARED_WORKSPACE } from "../../../lib/access";

const districtIdsSchema = z.array(z.string().min(1).max(120)).max(100).default([]);
const adminActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), ...accountSchema.shape, role: z.enum(["officer", "citizen"]), districtIds: districtIdsSchema }),
  z.object({ action: z.literal("update"), id: z.string().uuid(), enabled: z.boolean(), role: z.enum(["citizen", "officer"]), districtIds: districtIdsSchema }),
  z.object({ action: z.literal("reset-password"), id: z.string().uuid(), password: accountSchema.shape.password }),
]);

export async function GET(request: Request) {
  const user = await requireAccount(request, ["admin"]);
  if (user instanceof Response) return user;
  const users = (await db().prepare("SELECT * FROM app_users ORDER BY created_at DESC LIMIT 2000").all<UserRow>()).results.map(account);
  return Response.json({ users }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const guard = mutationGuard(request);
  if (guard) return guard;
  const user = await requireAccount(request, ["admin"]);
  if (user instanceof Response) return user;

  try {
    const raw = await request.text();
    if (raw.length > 10000) return Response.json({ error: "Request too large" }, { status: 413 });
    const input: unknown = JSON.parse(raw);
    const body = adminActionSchema.parse(input);
    const ids = body.action === "reset-password" ? [] : body.districtIds;
    if (ids.length) {
      const { workspace } = await readWorkspace(SHARED_WORKSPACE);
      if (ids.some(id => !workspace.districts.some(district => district.id === id))) throw new Error("Choose registered districts");
    }

    if (body.action === "create") {
      if (body.role === "officer" && !ids.length) throw new Error("Assign at least one district to an officer");
      const id = crypto.randomUUID();
      await db().prepare("INSERT INTO app_users(id,email,name,password_hash,role,district_ids,must_change_password,created_at) VALUES(?,?,?,?,?,?,1,?)")
        .bind(id, body.email, body.name, await hashPassword(body.password), body.role, JSON.stringify(body.role === "officer" ? ids : []), new Date().toISOString()).run();
      await audit(user, "account.create", id, `${body.role} account; assigned districts: ${ids.join(", ")}`);
      return Response.json({ ok: true }, { status: 201 });
    }

    if (body.id === user.id) throw new Error("Use Account settings for your own profile. Your administrator access cannot be disabled here.");
    const old = await db().prepare("SELECT * FROM app_users WHERE id=?").bind(body.id).first<UserRow>();
    if (!old) throw new Error("Account not found");
    if (body.action === "update") {
      if (old.role === "admin") throw new Error("Administrator permissions cannot be changed here");
      if (body.role === "officer" && !ids.length) throw new Error("Assign at least one district");
      await db().batch([
        db().prepare("UPDATE app_users SET enabled=?,role=?,district_ids=? WHERE id=?").bind(body.enabled ? 1 : 0, body.role, JSON.stringify(body.role === "officer" ? ids : []), body.id),
        db().prepare("DELETE FROM app_sessions WHERE user_id=?").bind(body.id),
      ]);
      await audit(user, "account.permissions", body.id, `${body.enabled ? "Enabled" : "Disabled"}; ${body.role}; districts ${ids.join(", ")}; sessions revoked`);
    } else {
      await db().batch([
        db().prepare("UPDATE app_users SET password_hash=?,must_change_password=1 WHERE id=?").bind(await hashPassword(body.password), body.id),
        db().prepare("DELETE FROM app_sessions WHERE user_id=?").bind(body.id),
      ]);
      await audit(user, "account.reset-password", body.id, "Temporary password set; change required; sessions revoked");
    }
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid administrative request";
    return Response.json({ error: /UNIQUE/i.test(message) ? "That email already has an account" : message }, { status: 400 });
  }
}
