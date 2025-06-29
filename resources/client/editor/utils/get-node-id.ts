export function getNodeIds(nodes: NodeListOf<HTMLElement>): string[] {
  const ids: string[] = [];
  nodes.forEach(node => {
    const nodeId = getNodeId(node);
    if (nodeId) {
      ids.push(nodeId);
    }
  });
  return ids;
}

export function getNodeId(node: HTMLElement): string | null {
  return node?.dataset?.arId || null;
}
