export type CommentComposerKind = 'COMMENT' | 'INTERNAL_NOTE' | 'INFORMATION_REQUEST';

export interface CommentPayload {
  body: string;
  kind: 'NOTE' | 'INFORMATION_REQUEST';
  visibility: 'PUBLIC' | 'INTERNAL';
}

export function createCommentPayload(body: string, composerKind: CommentComposerKind): CommentPayload {
  return {
    body: body.trim(),
    kind: composerKind === 'INFORMATION_REQUEST' ? 'INFORMATION_REQUEST' : 'NOTE',
    visibility: composerKind === 'INTERNAL_NOTE' ? 'INTERNAL' : 'PUBLIC',
  };
}
