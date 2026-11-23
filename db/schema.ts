import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const workspaces = sqliteTable("workspaces", {
  ownerId: text("owner_id").primaryKey(),
  payload: text("payload").notNull(),
  revision: integer("revision").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
});
export const workspaceArchives=sqliteTable("workspace_archives",{ownerId:text("owner_id").primaryKey(),payload:text("payload").notNull(),archivedAt:text("archived_at").notNull()});
export const appSettings=sqliteTable("app_settings",{key:text("key").primaryKey(),value:text("value").notNull()});
export const appUsers=sqliteTable("app_users",{id:text("id").primaryKey(),email:text("email").notNull(),name:text("name").notNull(),passwordHash:text("password_hash").notNull(),role:text("role").notNull(),districtIds:text("district_ids").notNull().default("[]"),enabled:integer("enabled").notNull().default(1),mustChangePassword:integer("must_change_password").notNull().default(0),createdAt:text("created_at").notNull()});
export const appSessions=sqliteTable("app_sessions",{tokenHash:text("token_hash").primaryKey(),userId:text("user_id").notNull(),expiresAt:text("expires_at").notNull()});
export const incidentRecords=sqliteTable("incident_records",{id:text("id").primaryKey(),districtId:text("district_id").notNull(),submitterId:text("submitter_id").notNull(),payload:text("payload").notNull(),revision:integer("revision").notNull().default(1),updatedAt:text("updated_at").notNull()});
export const incidentEvents=sqliteTable("incident_events",{id:text("id").primaryKey(),reportId:text("report_id").notNull(),actorId:text("actor_id").notNull(),actorName:text("actor_name").notNull(),action:text("action").notNull(),message:text("message").notNull(),createdAt:text("created_at").notNull()});
export const appNotifications=sqliteTable("app_notifications",{id:text("id").primaryKey(),userId:text("user_id").notNull(),title:text("title").notNull(),reportId:text("report_id"),createdAt:text("created_at").notNull(),readAt:text("read_at")});
export const evidenceFiles=sqliteTable("evidence_files",{id:text("id").primaryKey(),ownerId:text("owner_id").notNull(),districtId:text("district_id").notNull(),objectKey:text("object_key").notNull(),contentType:text("content_type").notNull(),originalName:text("original_name").notNull(),createdAt:text("created_at").notNull()});
export const userPreferences=sqliteTable("user_preferences",{userId:text("user_id").primaryKey(),scenario:text("scenario").notNull()});
export const auditEvents=sqliteTable("audit_events",{id:text("id").primaryKey(),actorId:text("actor_id").notNull(),actorName:text("actor_name").notNull(),districtId:text("district_id"),action:text("action").notNull(),targetId:text("target_id").notNull(),detail:text("detail").notNull(),createdAt:text("created_at").notNull()});
