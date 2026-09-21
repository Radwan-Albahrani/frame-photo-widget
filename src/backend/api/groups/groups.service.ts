import { asc, eq } from "drizzle-orm";
import { db } from "@backend/core/db/client";
import { createId, now } from "@backend/core/db/ids";
import { albumGroups, albums, type AlbumGroupRow } from "@backend/core/db/schema";
import { nextSortOrder } from "@backend/core/db/sortOrder";

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

function tally(keys: (string | null)[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const key of keys) {
    if (key === null) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function childrenByParent(groups: AlbumGroupRow[]): Map<string, string[]> {
  const byParent = new Map<string, string[]>();
  for (const group of groups) {
    if (group.parentId === null) continue;
    const siblings = byParent.get(group.parentId);
    if (siblings === undefined) byParent.set(group.parentId, [group.id]);
    else siblings.push(group.id);
  }
  return byParent;
}

function collectSubtree(id: string, byParent: Map<string, string[]>): string[] {
  const collected = new Set<string>([id]);
  let frontier = [id];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const parent of frontier) {
      for (const child of byParent.get(parent) ?? []) {
        if (collected.has(child)) continue;
        collected.add(child);
        next.push(child);
      }
    }
    frontier = next;
  }
  return [...collected];
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
    const [groups, owned] = await Promise.all([
      GroupsService.all(),
      db.select({ groupId: albums.groupId }).from(albums).all(),
    ]);
    const albumTally = tally(owned.map((album) => album.groupId));
    const folderTally = tally(groups.map((group) => group.parentId));

    return groups
      .filter((group) => group.parentId === parentId)
      .map((group) => ({
        ...group,
        albumCount: albumTally.get(group.id) ?? 0,
        childGroupCount: folderTally.get(group.id) ?? 0,
      }));
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

  static async subtrees(ids: string[]): Promise<Record<string, string[]>> {
    const byParent = childrenByParent(await GroupsService.all());
    const subtrees: Record<string, string[]> = {};
    for (const id of ids) subtrees[id] = collectSubtree(id, byParent);
    return subtrees;
  }

  static async descendantIds(id: string): Promise<string[]> {
    const subtrees = await GroupsService.subtrees([id]);
    return subtrees[id] ?? [id];
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
