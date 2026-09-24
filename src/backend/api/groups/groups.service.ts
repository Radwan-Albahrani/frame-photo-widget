import { asc, eq } from "drizzle-orm";
import {
  browseFrom,
  childrenOf,
  collectSubtree,
  sameTree,
  toTree,
  type GroupBrowse,
  type GroupNode,
} from "@backend/api/groups/groups.tree";
import { db } from "@backend/core/db/client";
import { createId, now } from "@backend/core/db/ids";
import { albumGroups, albums, type AlbumGroupRow } from "@backend/core/db/schema";
import { nextSortOrder } from "@backend/core/db/sortOrder";

export type {
  GroupBrowse,
  GroupNode,
  GroupWithCounts,
} from "@backend/api/groups/groups.tree";

export class GroupsService {
  static sameTree(a: GroupNode[], b: GroupNode[]): boolean {
    return sameTree(a, b);
  }

  static async all(): Promise<AlbumGroupRow[]> {
    return db
      .select()
      .from(albumGroups)
      .orderBy(asc(albumGroups.sortOrder), asc(albumGroups.createdAt))
      .all();
  }

  static async browse(parentId: string | null): Promise<GroupBrowse> {
    const [groups, owned] = await Promise.all([
      GroupsService.all(),
      db.select({ groupId: albums.groupId }).from(albums).all(),
    ]);
    return browseFrom(
      groups,
      owned.map((album) => album.groupId),
      parentId
    );
  }

  static async tree(): Promise<GroupNode[]> {
    const groups = await GroupsService.all();
    return toTree(groups, childrenOf(groups));
  }

  static async byId(id: string): Promise<AlbumGroupRow | null> {
    const row = await db.select().from(albumGroups).where(eq(albumGroups.id, id)).get();
    return row ?? null;
  }

  static async create(name: string, parentId: string | null): Promise<AlbumGroupRow> {
    const timestamp = now();
    const row: AlbumGroupRow = {
      id: createId(),
      name: name.trim().length > 0 ? name.trim() : "Untitled",
      parentId,
      sortOrder: await nextSortOrder(albumGroups, albumGroups.sortOrder),
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
    return collectSubtree(id, childrenOf(await GroupsService.all()));
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
