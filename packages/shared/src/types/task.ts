export interface Category {
  id: string;
  name: string;
  color: string; // hex color, e.g. '#3b82f6'
}

export interface Task {
  id: string;
  title: string;
  categoryId: string;
  createdAt: string; // ISO 8601
}
