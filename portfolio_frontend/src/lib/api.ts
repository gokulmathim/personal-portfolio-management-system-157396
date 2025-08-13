 /* eslint-disable @typescript-eslint/no-explicit-any */
import { getToken } from './auth';

/**
 * API base URL configured via environment variable PUBLIC_API_BASE_URL.
 * Defaults to http://localhost:3001 for development to match running backend.
 */
export const API_BASE_URL =
  (import.meta as any).env?.PUBLIC_API_BASE_URL || 'http://localhost:3001';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type Id = string | number;

export type Project = {
  id?: Id;
  title: string;
  description?: string;
  url?: string;
  // repo_url is not supported by backend schema; it's kept here for UI convenience (not persisted)
  repo_url?: string;
  tags?: string[];
  image_url?: string;
  created_at?: string;
  updated_at?: string;
};

export type BlogPost = {
  id?: Id;
  slug: string;
  title: string;
  excerpt?: string;
  content?: string;
  cover_image_url?: string;
  tags?: string[];
  published_at?: string;
  updated_at?: string;
};

export type Profile = {
  name?: string;
  headline?: string;
  avatar_url?: string;
  location?: string;
  bio?: string;
  social?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
    email?: string;
    [key: string]: any;
  };
};

export type LoginResponse = {
  access_token: string;
  token_type?: string;
};

type BackendAbout = {
  id?: number;
  name?: string | null;
  title?: string | null;
  bio?: string | null;
  email?: string | null;
  location?: string | null;
  avatar_url?: string | null;
  social_links?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
};

/**
 * Ensure the path begins with a single leading slash and preserve trailing slash as specified.
 */
function normalizePath(p: string): string {
  if (!p) return '/';
  return p.startsWith('/') ? p : '/' + p;
}

/**
 * Internal: Perform an HTTP request to the backend API, handling JSON and auth header.
 */
async function request<T = any>(
  path: string,
  options: { method?: HttpMethod; body?: any; auth?: boolean; headers?: Record<string, string> } = {}
): Promise<T> {
  const url = `${API_BASE_URL}${normalizePath(path)}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  };
  if (options.auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: 'include',
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    if (isJson) {
      const err = await res.json().catch(() => null);
      message = (err && (err.message || err.detail)) || message;
    } else {
      const text = await res.text().catch(() => '');
      if (text) message = text;
    }
    throw new Error(message);
  }

  if (isJson) {
    return (await res.json()) as T;
  }
  // @ts-expect-error We intentionally coerce text to T when non-JSON responses are expected
  return (await res.text()) as T;
}

// PUBLIC_INTERFACE
export async function login(usernameOrEmail: string, password: string): Promise<LoginResponse> {
  /**
   * Authenticate an admin user and receive an access token.
   * The backend expects "username" and "password" (email value is used as username if provided).
   * @param usernameOrEmail - Admin username or email
   * @param password - Admin password
   * @returns LoginResponse containing access_token and token_type
   */
  return await request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { username: usernameOrEmail, password },
  });
}

// PUBLIC_INTERFACE
export async function getProfile(): Promise<Profile> {
  /**
   * Fetch public profile information for portfolio About section.
   * This adapts the backend /about/ schema to the frontend Profile shape.
   */
  const about = await request<BackendAbout>('/about/', { method: 'GET' });
  const social = (about?.social_links || {}) as Record<string, any>;
  return {
    name: about?.name || undefined,
    headline: about?.title || undefined,
    avatar_url: about?.avatar_url || undefined,
    location: about?.location || undefined,
    bio: about?.bio || undefined,
    social: {
      website: social.website || social.site || undefined,
      github: social.github || undefined,
      linkedin: social.linkedin || undefined,
      twitter: social.twitter || social.x || undefined,
      email: social.email || undefined,
      ...social,
    },
  };
}

// PUBLIC_INTERFACE
export async function getProjects(): Promise<Project[]> {
  /** Retrieve the list of public projects. */
  return await request<Project[]>('/projects/', { method: 'GET' });
}

// PUBLIC_INTERFACE
export async function getProjectById(id: Id): Promise<Project> {
  /** Retrieve a single project by ID. */
  return await request<Project>(`/projects/${id}`, { method: 'GET' });
}

// PUBLIC_INTERFACE
export async function createProject(project: Project): Promise<Project> {
  /**
   * Create a new project (admin). Requires Authorization Bearer token.
   * Only send fields supported by backend schema.
   */
  const body: Record<string, any> = {
    title: project.title,
    description: project.description || undefined,
    url: project.url || undefined,
    tags: Array.isArray(project.tags) ? project.tags : [],
    // Let is_featured default to false server-side unless explicitly set
    ...(Object.prototype.hasOwnProperty.call(project as any, 'is_featured')
      ? { is_featured: (project as any).is_featured }
      : {}),
  };
  return await request<Project>('/projects/', { method: 'POST', body, auth: true });
}

// PUBLIC_INTERFACE
export async function updateProject(id: Id, project: Partial<Project>): Promise<Project> {
  /**
   * Update an existing project (admin). Requires Authorization Bearer token.
   * Sends only fields accepted by backend.
   */
  const body: Record<string, any> = {};
  if (typeof project.title !== 'undefined') body.title = project.title;
  if (typeof project.description !== 'undefined') body.description = project.description;
  if (typeof project.url !== 'undefined') body.url = project.url;
  if (typeof project.tags !== 'undefined') body.tags = project.tags;
  if ((project as any)?.is_featured !== undefined) body.is_featured = (project as any).is_featured;

  return await request<Project>(`/projects/${id}`, { method: 'PUT', body, auth: true });
}

// PUBLIC_INTERFACE
export async function deleteProject(id: Id): Promise<{ success: boolean }> {
  /** Delete a project by ID (admin). Requires Authorization Bearer token. */
  await request(`/projects/${id}`, { method: 'DELETE', auth: true });
  return { success: true };
}

// PUBLIC_INTERFACE
export async function getBlogPosts(): Promise<BlogPost[]> {
  /** Retrieve the list of public blog posts. */
  return await request<BlogPost[]>('/blogs/', { method: 'GET' });
}

// PUBLIC_INTERFACE
export async function getBlogPostBySlug(slug: string): Promise<BlogPost> {
  /** Retrieve a blog post by slug (public). */
  const safeSlug = encodeURIComponent(slug);
  return await request<BlogPost>(`/blogs/slug/${safeSlug}`, { method: 'GET' });
}

// PUBLIC_INTERFACE
export async function createBlogPost(post: BlogPost): Promise<BlogPost> {
  /**
   * Create a new blog post (admin). Requires Authorization Bearer token.
   * Backend requires: title, slug, content, is_published (bool). Additional data can be stored in meta.
   */
  const body = {
    title: post.title,
    slug: post.slug,
    content: post.content || '',
    is_published: true,
    meta: {
      excerpt: post.excerpt || '',
      tags: Array.isArray(post.tags) ? post.tags : [],
    },
  };
  return await request<BlogPost>('/blogs/', { method: 'POST', body, auth: true });
}

// PUBLIC_INTERFACE
export async function updateBlogPost(id: Id, post: Partial<BlogPost>): Promise<BlogPost> {
  /**
   * Update an existing blog post (admin). Requires Authorization Bearer token.
   * Note: Backend expects numeric ID path param.
   */
  if (!String(id).match(/^\d+$/)) {
    throw new Error('updateBlogPost requires a numeric blog ID');
  }
  const body: Record<string, any> = {};
  if (typeof post.title !== 'undefined') body.title = post.title;
  if (typeof post.slug !== 'undefined') body.slug = post.slug;
  if (typeof post.content !== 'undefined') body.content = post.content;
  if (typeof (post as any).is_published !== 'undefined') body.is_published = (post as any).is_published;
  if (typeof post.excerpt !== 'undefined' || typeof post.tags !== 'undefined') {
    body.meta = {
      ...(typeof post.excerpt !== 'undefined' ? { excerpt: post.excerpt } : {}),
      ...(typeof post.tags !== 'undefined' ? { tags: post.tags } : {}),
    };
  }
  return await request<BlogPost>(`/blogs/${id}`, { method: 'PUT', body, auth: true });
}

// PUBLIC_INTERFACE
export async function deleteBlogPost(id: Id): Promise<{ success: boolean }> {
  /**
   * Delete a blog post by ID (admin). Requires Authorization Bearer token.
   * Note: Backend expects numeric ID path param.
   */
  if (!String(id).match(/^\d+$/)) {
    throw new Error('deleteBlogPost requires a numeric blog ID');
  }
  await request(`/blogs/${id}`, { method: 'DELETE', auth: true });
  return { success: true };
}

// PUBLIC_INTERFACE
export async function sendContactMessage(payload: {
  name: string;
  email: string;
  message: string;
}): Promise<{ success: boolean }> {
  /** Submit a contact message to the backend. */
  await request('/contacts/', { method: 'POST', body: payload });
  return { success: true };
}
