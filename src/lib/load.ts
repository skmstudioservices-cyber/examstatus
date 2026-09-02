import examsData from '../data/exams.json';
import { enrichSeedPost } from './seed';
import { getPostBySlug, listPublishedPosts, listPublishedByBoard, relatedPosts } from './posts';
import type { Post } from './types';
import { BOARD_HUBS } from './types';

export async function loadPublished(
  db: D1Database | null,
  opts?: { category?: string; level?: string; state?: string; limit?: number }
): Promise<Post[]> {
  if (db) {
    try {
      const posts = await listPublishedPosts(db, opts);
      if (posts.length) return posts;
    } catch {
      /* fall through to JSON seed */
    }
  }
  let posts = (examsData as Record<string, unknown>[]).map(enrichSeedPost);
  if (opts?.category) posts = posts.filter((p) => p.category === opts.category);
  if (opts?.level) posts = posts.filter((p) => p.level === opts.level);
  if (opts?.state) {
    posts = posts.filter((p) => p.states.includes(opts.state!) || p.level === 'national');
  }
  if (opts?.limit) posts = posts.slice(0, opts.limit);
  return posts;
}

export async function loadPost(db: D1Database | null, slug: string): Promise<Post | null> {
  if (db) {
    try {
      const post = await getPostBySlug(db, slug);
      if (post) return post;
    } catch {
      /* fall through */
    }
  }
  const raw = (examsData as Record<string, unknown>[]).find((e) => e.slug === slug);
  return raw ? enrichSeedPost(raw) : null;
}

export async function loadRelated(db: D1Database | null, post: Post, limit = 4): Promise<Post[]> {
  if (db) {
    try {
      const related = await relatedPosts(db, post, limit);
      if (related.length) return related;
    } catch {
      /* fall through */
    }
  }
  const all = await loadPublished(db);
  return all.filter((p) => p.slug !== post.slug).slice(0, limit);
}

export async function loadBoardPosts(db: D1Database | null, boardSlug: string): Promise<Post[]> {
  const board = BOARD_HUBS.find((b) => b.slug === boardSlug);
  if (!board) return [];
  if (db) {
    try {
      const posts = await listPublishedByBoard(db, board.keywords);
      if (posts.length) return posts;
    } catch {
      /* fall through */
    }
  }
  const all = await loadPublished(db);
  const lower = board.keywords.map((k) => k.toLowerCase());
  return all.filter((p) => {
    const hay = `${p.organization} ${p.title} ${p.post_name}`.toLowerCase();
    return lower.some((kw) => hay.includes(kw));
  });
}
