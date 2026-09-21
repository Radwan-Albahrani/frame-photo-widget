import { asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@backend/core/db/client";
import { createId, now } from "@backend/core/db/ids";
import { albumGroups, albums, type AlbumGroupRow } from "@backend/core/db/schema";

export interface GroupNode {
  id: string;
  name: string;
  depth: number;
  path: string;
}

export interface GroupWithCounts extends AlbumGroupRow {
  albumCount: number;
  childGroupCount: number;
}

export class GroupsService {
  static async all(): Promise<AlbumGroupRow[]> {
    return db
      .select()
      .from(albumGroups)
      .orderBy(asc(albumGroups.sortOrder), asc(albumGroups.createdAt))
      .all();
  }

  static async children(parentId: string | null): Promise<GroupWithCounts[]> {
    const rows = await db
      .select({
        id: albumGroups.id,
        name: albumGroups.name,
        parentId: albumGroups.parentId,
        sortOrder: albumGroups.sortOrder,
        createdAt: albumGroups.createdAt,
        updatedAt: albumGroups.updatedAt,
        albumCount: sql<number>`(
          SELECT count(*) FROM ${albums} WHERE ${albums.groupId} = ${albumGroups.id}
        )`,
        childGroupCount: sql<number>`(
          SELECT count(*) FROM album_groups child WHERE child.parent_id = ${albumGroups.id}
        )`,
      })
      .from(albumGroups)
      .where(parentId === null ? isNull(albumGroups.parentId) : eq(albumGroups.parentId, parentId))
      .orderBy(asc(albumGroups.sortOrder), asc(albumGroups.createdAt))
      .all();
    return rows as GroupWithCounts[];
  }

  static async tree(): Promise<GroupNode[]> {
    const groups = await GroupsService.all();
    const nodes: GroupNode[] = [];
    const walk = (parentId: string | null, depth: number, prefix: string) => {
      for (const group of groups.filter((candidate) => candidate.parentId === parentId)) {
        const path = prefix.length === 0 ? group.name : `${prefix} / ${group.name}`;
        nodes.push({ id: group.id, name: group.name, depth, path });
        walk(group.id, depth + 1, path);
      }
    };
    walk(null, 0, "");
    return nodes;
  }

  static async byId(id: string): Promise<AlbumGroupRow | null> {
    const row = await db.select().from(albumGroups).where(eq(albumGroups.id, id)).get();
    return row ?? null;
  }

  static async create(name: string, parentId: string | null): Promise<AlbumGroupRow> {
    const timestamp = now();
    const highest = await db
      .select({ value: sql<number>`coalesce(max(${albumGroups.sortOrder}), -1)` })
      .from(albumGroups)
      .get();
    const row: AlbumGroupRow = {
      id: createId(),
      name: name.trim().length > 0 ? name.trim() : "Untitled",
      parentId,
      sortOrder: (highest?.value ?? -1) + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await db.insert(albumGroups).values(row).run();
    return row;
  }

  static async rename(id: string, name: string): Promise<void> {
    await db
      .update(albumGroups)
      .set({ name: name.trim(), updatedAt: now() })
      .where(eq(albumGroups.id, id))
      .run();
  }

  static async descendantIds(id: string): Promise<string[]> {
    const groups = await GroupsService.all();
    const collected: string[] = [id];
    let frontier = [id];
    while (frontier.length > 0) {
      const next = groups
        .filter((group) => group.parentId !== null && frontier.includes(group.parentId))
        .map((group) => group.id);
      const fresh = next.filter((candidate) => !collected.includes(candidate));
      collected.push(...fresh);
      frontier = fresh;
    }
    return collected;
  }

  // what: a group dropped inside its own subtree would orphan that whole branch
  static async canMove(id: string, parentId: string | null): Promise<boolean> {
    if (parentId === null) return true;
    if (parentId === id) return false;
    const descendants = await GroupsService.descendantIds(id);
    return !descendants.includes(parentId);
  }

  static async setParent(id: string, parentId: string | null): Promise<boolean> {
    if (!(await GroupsService.canMove(id, parentId))) return false;
    await db
      .update(albumGroups)
      .set({ parentId, updatedAt: now() })
      .where(eq(albumGroups.id, id))
      .run();
    return true;
  }

  static async remove(id: string): Promise<void> {
    const group = await GroupsService.byId(id);
    const parentId = group?.parentId ?? null;
    await db.update(albums).set({ groupId: parentId }).where(eq(albums.groupId, id)).run();
    await db.update(albumGroups).set({ parentId }).where(eq(albumGroups.parentId, id)).run();
    await db.delete(albumGroups).where(eq(albumGroups.id, id)).run();
  }
}
