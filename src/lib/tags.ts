export type TagNode = {
  label: string;
  path: string;
  children: TagNode[];
};

export function buildTagTree(tags: string[]): TagNode[] {
  const roots: TagNode[] = [];
  for (const tag of tags) {
    let siblings = roots;
    let path = "";
    for (const label of tag.split("/")) {
      path = path ? `${path}/${label}` : label;
      let node = siblings.find((candidate) => candidate.path === path);
      if (!node) {
        node = { label, path, children: [] };
        siblings.push(node);
      }
      siblings = node.children;
    }
  }
  return roots;
}

export function matchesTag(tags: string[], selected: string): boolean {
  return tags.some((tag) => tag === selected || tag.startsWith(`${selected}/`));
}

export const tagBreadcrumb = (path: string) => path.split("/").join(" › ");
export const tagLabel = (path: string) => path.split("/").at(-1) ?? path;
