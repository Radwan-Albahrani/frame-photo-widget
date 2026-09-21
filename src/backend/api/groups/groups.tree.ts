import { groupBy } from "@backend/core/collections";
import type { AlbumGroupRow } from "@backend/core/db/schema";

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

export interface GroupBrowse {
  children: GroupWithCounts[];
  tree: GroupNode[];
  subtrees: Record<string, string[]>;
}

export type ChildMap = Map<string, AlbumGroupRow[]>;

export function childrenOf(groups: AlbumGroupRow[]): ChildMap {
  return groupBy(groups, (group) => group.parentId);
}

export function collectSubtree(id: string, byParent: ChildMap): string[] {
  const collected = new Set<string>([id]);
  let frontier = [id];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const parent of frontier) {
      for (const child of byParent.get(parent) ?? []) {
        if (collected.has(child.id)) continue;
        collected.add(child.id);
        next.push(child.id);
      }
    }
    frontier = next;
  }
  return [...collected];
}

export function toTree(groups: AlbumGroupRow[], byParent: ChildMap): GroupNode[] {
  const nodes: GroupNode[] = [];
  const walk = (level: AlbumGroupRow[], depth: number, prefix: string) => {
    for (const group of level) {
      const path = prefix.length === 0 ? group.name : `${prefix} / ${group.name}`;
      nodes.push({ id: group.id, name: group.name, depth, path });
      walk(byParent.get(group.id) ?? [], depth + 1, path);
    }
  };
  walk(
    groups.filter((group) => group.parentId === null),
    0,
    ""
  );
  return nodes;
}

// what: a folder card counts every album in its subtree, matching the covers its mosaic shows
export function browseFrom(
  groups: AlbumGroupRow[],
  albumGroupIds: (string | null)[],
  parentId: string | null
): GroupBrowse {
  const byParent = childrenOf(groups);
  const albumsByGroup = groupBy(albumGroupIds, (groupId) => groupId);
  const children = groups.filter((group) => group.parentId === parentId);

  const subtrees: Record<string, string[]> = {};
  for (const group of children) subtrees[group.id] = collectSubtree(group.id, byParent);

  return {
    children: children.map((group) => ({
      ...group,
      albumCount: subtrees[group.id].reduce(
        (total, id) => total + (albumsByGroup.get(id)?.length ?? 0),
        0
      ),
      childGroupCount: byParent.get(group.id)?.length ?? 0,
    })),
    tree: toTree(groups, byParent),
    subtrees,
  };
}
