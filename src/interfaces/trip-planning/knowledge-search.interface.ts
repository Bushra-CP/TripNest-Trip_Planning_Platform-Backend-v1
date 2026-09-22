export interface KnowledgeSearchQuery {
  query: string; //The question asked by the user.

  destination: string | null; //The destination that the current question is referring to.
  // null means that the destination is not known.
}
