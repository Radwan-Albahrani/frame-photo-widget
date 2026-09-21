import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const albumGroups = sqliteTable("album_groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const albums = sqliteTable("albums", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  coverPhotoId: text("cover_photo_id"),
  groupId: text("group_id").references(() => albumGroups.id, { onDelete: "set null" }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const photos = sqliteTable(
  "photos",
  {
    id: text("id").primaryKey(),
    albumId: text("album_id")
      .notNull()
      .references(() => albums.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    width: integer("width").notNull().default(0),
    height: integer("height").notNull().default(0),
    bytes: integer("bytes").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("photos_album_order").on(table.albumId, table.sortOrder)]
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export type AlbumGroupRow = typeof albumGroups.$inferSelect;
export type AlbumRow = typeof albums.$inferSelect;
export type PhotoRow = typeof photos.$inferSelect;
export type SettingRow = typeof settings.$inferSelect;
