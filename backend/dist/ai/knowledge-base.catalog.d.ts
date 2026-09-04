export interface KnowledgeArticle {
    id: string;
    title: string;
    category: string;
    tags: string[];
    summary: string;
    steps: string[];
    tips?: string[];
    relatedPages?: string[];
}
export declare const DEFAULT_KNOWLEDGE_BASE: KnowledgeArticle[];
export declare function getFullKnowledgeBase(): KnowledgeArticle[];
export declare function saveKnowledgeBase(articles: KnowledgeArticle[]): void;
