import { createTaskQueries, type TaskDataApi } from '@pomoroutine/shared';
import { fetchTasks, insertTask, updateTask, deleteTask, reorderTasks } from '@/lib/supabase/tasks';
import {
  fetchCategories,
  insertCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from '@/lib/supabase/categories';
import { toast } from '@/lib/toast';

export const taskDataApi: TaskDataApi = {
  fetchTasks,
  fetchCategories,
  insertTask,
  updateTask,
  deleteTask,
  reorderTasks,
  insertCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  toast,
};

export const taskQueries = createTaskQueries(taskDataApi);
