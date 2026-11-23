import {requireAccount} from "../../../lib/auth";
import {db} from "../../../lib/server";
export async function GET(request:Request){const user=await requireAccount(request,["officer","admin"]);if(user instanceof Response)return user;
 const stmt=user.role==="admin"?db().prepare("SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 500"):user.districtIds.length?db().prepare(`SELECT * FROM audit_events WHERE actor_id=? OR district_id IN (${user.districtIds.map(()=>"?").join(",")}) ORDER BY created_at DESC LIMIT 500`).bind(user.id,...user.districtIds):db().prepare("SELECT * FROM audit_events WHERE actor_id=? ORDER BY created_at DESC LIMIT 100").bind(user.id);
 return Response.json({events:(await stmt.all()).results},{headers:{"Cache-Control":"no-store"}});
}
