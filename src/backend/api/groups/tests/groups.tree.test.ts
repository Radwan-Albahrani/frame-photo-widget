import { describe, expect, it } from "vitest";
import { browseFrom, childrenOf, collectSubtree, toTree } from "@backend/api/groups/groups.tree";
import type { AlbumGroupRow } from "@backend/core/db/schema";

function group(id: string, name: string, parentId: string | null, order = 0): AlbumGroupRow {
  return { id, name, parentId, sortOrder: order, createdAt: 0, updatedAt: 0 };
}

const travel = group("travel", "Travel", null);
const japan = group("japan", "Japan", "travel");
const kyoto = group("kyoto", "Kyoto", "japan");
const food = group("food", "Food", null, 1);
const nested = [travel, japan, kyoto, food];

describe("browseFrom", () => {
  it("counts a folder's own albums and its direct subfolders", () => {
    const albumGroupIds = ["travel", "travel", "travel", "travel", "japan"];

    const { children } = browseFrom(nested, albumGroupIds, null);
    const row = children.find((child) => child.id === "travel");

    expect(row?.childGroupCount).toBe(1);
  });

  it("counts albums nested any depth down, matching the covers the mosaic draws", () => {
    const albumGroupIds = ["travel", "japan", "kyoto"];

    const { children } = browseFrom(nested, albumGroupIds, null);

    expect(children.find((child) => child.id === "travel")?.albumCount).toBe(3);
  });

  it("never reports a folder of subfolders as empty", () => {
    const { children } = browseFrom(nested, ["kyoto"], null);
    const row = children.find((child) => child.id === "travel");

    expect(row?.albumCount).toBe(1);
    expect(row?.childGroupCount).toBe(1);
  });

  it("lists only the children of the requested parent", () => {
    const { children } = browseFrom(nested, [], "travel");

    expect(children.map((child) => child.id)).toEqual(["japan"]);
  });

  it("ignores albums that sit outside every folder", () => {
    const { children } = browseFrom(nested, [null, null, "travel"], null);

    expect(children.find((child) => child.id === "travel")?.albumCount).toBe(1);
  });

  it("gives every child a subtree including itself", () => {
    const { subtrees } = browseFrom(nested, [], null);

    expect(subtrees.travel).toEqual(["travel", "japan", "kyoto"]);
    expect(subtrees.food).toEqual(["food"]);
  });
});

describe("toTree", () => {
  it("names each folder by its full path, depth first", () => {
    expect(toTree(nested, childrenOf(nested))).toEqual([
      { id: "travel", name: "Travel", depth: 0, path: "Travel" },
      { id: "japan", name: "Japan", depth: 1, path: "Travel / Japan" },
      { id: "kyoto", name: "Kyoto", depth: 2, path: "Travel / Japan / Kyoto" },
      { id: "food", name: "Food", depth: 0, path: "Food" },
    ]);
  });
});

describe("collectSubtree", () => {
  it("survives a parent cycle rather than looping forever", () => {
    const cycle = [group("a", "A", "b"), group("b", "B", "a")];

    expect(collectSubtree("a", childrenOf(cycle))).toEqual(["a", "b"]);
  });
});
