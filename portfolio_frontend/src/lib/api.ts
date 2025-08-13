/* eslint-disable @typescript-eslint/no-explicit-any */
import { getToken } from './auth';

/**
 * API base URL configured via environment variable PUBLIC_API_BASE_URL.
 * Defaults to http://localhost:5000 for development.
 */
export const API_BASE_URL =
  (import.meta as any).env?.PUBLIC_API_BASE_URL || 'http://localhost:5000';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type Id = string | number;

export type Project = {
  id?: Id;
  title: string;
  description?: string;
  url?: string;
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
  };
};

export type LoginResponse = {
  access_token: string;
  token_type?: string;
};

/**
 * Internal: Perform an HTTP request to the backend API, handling JSON and auth header.
 */
async function request<T = any>(
  path: string,
  options: { method?: HttpMethod; body?: any; auth?: boolean; headers?: Record<string, string> } = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
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
  // @ts-ignore
  return (await res.text()) as T;
}

// PUBLIC_INTERFACE
export async function login(email: string, password: string): Promise<LoginResponse> {
  /** Authenticate an admin user and receive an access token.
   * @param email - Admin email
   * @param password - Admin password
   * @returns LoginResponse containing access_token and optional token_type
   */
  return await request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

// PUBLIC_INTERFACE
export async function getProfile(): Promise<Profile> {
  /** Fetch public profile information for portfolio About section. */
  return await request<Profile>('/profile', { method: 'GET' });
}

// PUBLIC_INTERFACE
export async function getProjects(): Promise<Project[]> {
  /** Retrieve the list of public projects. */
  return await request<Project[]>('/projects', { method: 'GET' });
}

// PUBLIC_INTERFACE
export async function getProjectById(id: Id): Promise<Project> {
  /** Retrieve a single project by ID. */
  return await request<Project>(`/projects/${id}`, { method: 'GET' });
}

// PUBLIC_INTERFACE
export async function createProject(project: Project): Promise<Project> {
  /** Create a new project (admin). Requires Authorization Bearer token. */
  return await request<Project>('/projects', { method: 'POST', body: project, auth: true });
}

// PUBLIC_INTERFACE
export async function updateProject(id: Id, project: Partial<Project>): Promise<Project> {
  /** Update an existing project (admin). Requires Authorization Bearer token. */
  return await request<Project>(`/projects/${id}`, { method: 'PUT', body: project, auth: true });
}

// PUBLIC_INTERFACE
export async function deleteProject(id: Id): Promise<{ success: boolean }> {
  /** Delete a project by ID (admin). Requires Authorization Bearer token. */
  return await request<{ success: boolean }>(`/projects/${id}`, { method: 'DELETE', auth: true });
}

// PUBLIC_INTERFACE
export async function getBlogPosts(): Promise<BlogPost[]> {
  /** Retrieve the list of public blog posts. */
  return await request<BlogPost[]>('/blogs', { method: 'GET' });
}

// PUBLIC_INTERFACE
export async function getBlogPostBySlug(slug: string): Promise<BlogPost> {
  /** Retrieve a blog post by slug. */
  return await request<BlogPost>(`/blogs/${slug}`, { method: 'GET' });
}

// PUBLIC_INTERFACE
export async function createBlogPost(post: BlogPost): Promise<BlogPost> {
  /** Create a new blog post (admin). Requires Authorization Bearer token. */
  return await request<BlogPost>('/blogs', { method: 'POST', body: post, auth: true });
}

// PUBLIC_INTERFACE
export async function updateBlogPost(slugOrId: Id, post: Partial<BlogPost>): Promise<BlogPost> {
  /** Update an existing blog post (admin). Requires Authorization Bearer token. */
  return await request<BlogPost>(`/blogs/${slugOrId}`, { method: 'PUT', body: post, auth: true });
}

// PUBLIC_INTERFACE
export async function deleteBlogPost(slugOrId: Id): Promise<{ success: boolean }> {
  /** Delete a blog post by slug or ID (admin). Requires Authorization Bearer token. */
  return await request<{ success: boolean }>(`/blogs/${slugOrId}`, { method: 'DELETE', auth: true });
}

// PUBLIC_INTERFACE
export async function sendContactMessage(payload: {
  name: string;
  email: string;
  message: string;
}): Promise<{ success: boolean }> {
  /** Submit a contact message to the backend. */
  return await request<{ success: boolean }>('/contact', { method: 'POST', body: payload });
}
