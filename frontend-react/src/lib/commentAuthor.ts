interface AuthorComment {
  authorId?: string;
  authorName?: string;
}

interface AuthorIncident {
  reporterId?: string;
  assignedTechnicianId?: string;
}

interface AuthorUser {
  id: string;
  displayName: string;
}

export function commentAuthor(
  comment: AuthorComment,
  incident: AuthorIncident,
  currentUser: AuthorUser | null,
  users: AuthorUser[] = []
): string {
  if (comment.authorName?.trim()) return comment.authorName;
  if (comment.authorId && comment.authorId === currentUser?.id) return currentUser.displayName;
  const author = users.find((user) => user.id === comment.authorId);
  if (author?.displayName) return author.displayName;
  if (comment.authorId && comment.authorId === incident.reporterId) return 'Employee';
  if (comment.authorId && comment.authorId === incident.assignedTechnicianId) return 'Technician';
  return 'Team member';
}
