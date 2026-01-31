export interface SkillNode {
    id: string;
    name: string;
    parentId: string | null;
    path: string;
    children: SkillNode[];
}

export interface CreateSkill {
    name: string;
    parentId: string | null;
}