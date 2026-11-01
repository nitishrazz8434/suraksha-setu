import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const workspaces = sqliteTable("workspaces", {
  ownerId: text("owner_id").primaryKey(),
  payload: text("payload").notNull(),
  revision: integer("revision").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
});
export const workspaceArchives=sqliteTable("workspace_archives",{ownerId:text("owner_id").primaryKey(),payload:text("payload").notNull(),archivedAt:text("archived_at").notNull()});
