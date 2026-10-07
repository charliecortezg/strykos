import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-portal-token",
};
const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const BUCKET = "player-documents";
const DOC_TYPES = ["curp", "acta", "foto", "constancia_estudios"];
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "application/pdf": "pdf" };

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function docsEnabled(org: any) {
  return Boolean(org?.features && org.features.documentos === true);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const admin = createClient(URL_, SERVICE);
  try {
    const body = await req.json();
    const action: string = body.action;

    // ---------- STAFF (sesión normal) ----------
    if (action === "sign") {
      const auth = req.headers.get("Authorization") ?? "";
      if (!auth.startsWith("Bearer ")) return json({ error: "Sin sesión" }, 401);
      const userClient = createClient(URL_, ANON, { global: { headers: { Authorization: auth } } });
      const { data: u } = await userClient.auth.getUser();
      if (!u?.user) return json({ error: "Sin sesión" }, 401);
      const { data: path, error } = await userClient.rpc("docs_url_firmada", {
        p_document_id: body.document_id, p_accion: body.accion === "descargo" ? "descargo" : "vio",
      });
      if (error || !path) return json({ error: "Sin permiso" }, 403);
      const { data: s, error: se } = await admin.storage.from(BUCKET).createSignedUrl(path as string, 60, body.accion === "descargo" ? { download: true } : undefined);
      if (se) return json({ error: se.message }, 500);
      return json({ url: s.signedUrl });
    }

    // ---------- PORTAL FAMILIAR ----------
    if (action === "portal-login") {
      const orgCode = String(body.org_code ?? "").toLowerCase().trim();
      const phone = String(body.phone ?? "").replace(/\D/g, "").slice(-10);
      const pin = String(body.pin ?? "");
      const { data: org } = await admin.from("organizations").select("id, features").eq("org_code", orgCode).eq("is_active", true).maybeSingle();
      if (!org) return json({ error: "Código de academia no encontrado" }, 400);
      const { data: g } = await admin.from("guardians").select("id").eq("organization_id", org.id).eq("phone_normalized", phone).maybeSingle();
      if (!g || pin !== phone.slice(-4)) return json({ error: "Datos incorrectos" }, 401);
      const token = crypto.randomUUID() + crypto.randomUUID();
      await admin.from("tutor_auth_tokens").insert({
        organization_id: org.id, guardian_id: g.id, token_hash: await sha256(token),
        expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      });
      return json({ token });
    }

    if (action.startsWith("portal-")) {
      const token = req.headers.get("x-portal-token") ?? "";
      if (!token) return json({ error: "Sesión vencida" }, 401);
      const { data: t } = await admin.from("tutor_auth_tokens").select("guardian_id, organization_id, expires_at")
        .eq("token_hash", await sha256(token)).maybeSingle();
      if (!t || new Date(t.expires_at).getTime() < Date.now()) return json({ error: "Sesión vencida" }, 401);
      const { data: org } = await admin.from("organizations").select("features").eq("id", t.organization_id).maybeSingle();
      if (!docsEnabled(org)) return json({ error: "Función no disponible" }, 403);
      const gid = t.guardian_id as string;
      await admin.from("tutor_auth_tokens").update({ last_used_at: new Date().toISOString() }).eq("token_hash", await sha256(token));

      if (action === "portal-children") {
        const { data: links } = await admin.from("player_guardians").select("player_id, players(id, full_name, organization_id)").eq("guardian_id", gid);
        const out = [];
        for (const l of links ?? []) {
          const p: any = (l as any).players;
          if (!p || p.organization_id !== t.organization_id) continue;
          const { data: st } = await admin.rpc("docs_estado_jugador", { p_player_id: p.id, p_guardian_id: gid });
          out.push({ id: p.id, full_name: p.full_name, estado: st });
        }
        return json({ children: out });
      }

      const playerId = body.player_id as string;
      if (action === "portal-estado") {
        const { data, error } = await admin.rpc("docs_estado_jugador", { p_player_id: playerId, p_guardian_id: gid });
        if (error) return json({ error: "Sin permiso" }, 403);
        return json(data);
      }
      if (action === "portal-datos") {
        const { error } = await admin.rpc("docs_guardar_datos_base", {
          p_player_id: playerId, p_nombre: body.nombre ?? null, p_fecha_nac: body.fecha_nac || null, p_curp: body.curp ?? null, p_guardian_id: gid,
        });
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }
      if (action === "portal-upload-url") {
        const { data: ok } = await admin.rpc("docs_tutor_de", { _guardian: gid, _player: playerId });
        if (!ok || !DOC_TYPES.includes(body.doc_type) || !EXT[body.mime_type]) return json({ error: "Sin permiso" }, 403);
        if (body.doc_type === "foto" && body.mime_type === "application/pdf") return json({ error: "La foto debe ser imagen" }, 400);
        const path = `${t.organization_id}/${playerId}/${body.doc_type}/${crypto.randomUUID()}.${EXT[body.mime_type]}`;
        const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
        if (error) return json({ error: error.message }, 500);
        return json({ path, token: data.token });
      }
      if (action === "portal-submit") {
        const { data, error } = await admin.rpc("docs_subir", {
          p_player_id: playerId, p_doc_type: body.doc_type, p_storage_path: body.path, p_source: "familia",
          p_mime_type: body.mime_type, p_guardian_id: gid,
        });
        if (error) return json({ error: error.message }, 400);
        return json({ id: data });
      }
      if (action === "portal-sign") {
        const { data: path, error } = await admin.rpc("docs_url_firmada", { p_document_id: body.document_id, p_accion: "vio", p_guardian_id: gid });
        if (error || !path) return json({ error: "Sin permiso" }, 403);
        const { data: s } = await admin.storage.from(BUCKET).createSignedUrl(path as string, 60);
        return json({ url: s?.signedUrl });
      }
    }
    return json({ error: "Acción inválida" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
