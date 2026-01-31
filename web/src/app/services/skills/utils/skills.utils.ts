import {SkillNode} from '@domain/skill/skill.interface';
import {TreeNode} from 'primeng/api';

export const transformSkillsToTreeNodes = (skillNodes: SkillNode[]) => {
  const newNodes: TreeNode[] = [];
  const stack: Array<{ skillNode: SkillNode; destination: TreeNode[] }> = [];

  // Push all root nodes onto the stack.
  // We iterate from last to first so that, when we pop from the stack (LIFO),
  // nodes are processed in the original order of `skills`.
  for (let i = skillNodes.length - 1; i >= 0; i--) {
    stack.push({skillNode: skillNodes[i], destination: newNodes});
  }

  while (stack.length > 0) {
    // We can be sure that there will be a value, because stack.length is more than 0
    const currentTask = stack.pop()!;

    const treeNode: TreeNode = {
      key: currentTask.skillNode.id,
      label: currentTask.skillNode.name,
      children: [],
      data: currentTask.skillNode,
    };

    currentTask.destination.push(treeNode);

    const childrenLength = currentTask.skillNode.children.length;

    for (let i = childrenLength - 1; i >= 0; i--) {
      const child = currentTask.skillNode.children[i]
      stack.push({skillNode: child, destination: treeNode.children!});
    }
  }

  return newNodes;
}
