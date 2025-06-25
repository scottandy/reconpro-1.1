import { Todo, CalendarEvent, TodoCategory, TodoSettings, TODO_CATEGORY_CONFIGS } from '../types/todo';
import { supabase } from './supabaseClient';

export class TodoManager {
  // Helper function to convert frontend Todo to database format
  private static toDatabaseFormat(todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>): any {
    return {
      title: todo.title,
      description: todo.description || null,
      priority: todo.priority,
      status: todo.status,
      category: todo.category,
      assigned_to_id: null, // Will be set to actual UUID in addTodo method
      assigned_by_id: null, // Will be set to actual UUID in addTodo method
      due_date: todo.dueDate || null,
      due_time: todo.dueTime || null,
      vehicle_id: todo.vehicleId || null,
      vehicle_name: todo.vehicleName || null,
      tags: todo.tags || [],
      notes: todo.notes || null,
      completed_at: todo.completedAt || null,
      completed_by_id: null // Will be set to actual UUID when completed
    };
  }

  // Helper function to convert database format to frontend Todo
  private static async fromDatabaseFormat(data: any): Promise<Todo> {
    // Convert assigned_to_id UUID to user initials
    let assignedTo = 'ALL';
    if (data.assigned_to_id) {
      try {
        const { data: assignedUser } = await supabase
          .from('profiles')
          .select('initials')
          .eq('id', data.assigned_to_id)
          .single();
        if (assignedUser) {
          assignedTo = assignedUser.initials;
        }
      } catch (error) {
        console.error('Error fetching assigned user initials:', error);
      }
    }

    // Convert assigned_by_id UUID to user initials
    let assignedBy = 'SYSTEM';
    if (data.assigned_by_id) {
      try {
        const { data: assignedByUser } = await supabase
          .from('profiles')
          .select('initials')
          .eq('id', data.assigned_by_id)
          .single();
        if (assignedByUser) {
          assignedBy = assignedByUser.initials;
        }
      } catch (error) {
        console.error('Error fetching assigned by user initials:', error);
      }
    }

    // Convert completed_by_id UUID to user initials
    let completedBy = null;
    if (data.completed_by_id) {
      try {
        const { data: completedByUser } = await supabase
          .from('profiles')
          .select('initials')
          .eq('id', data.completed_by_id)
          .single();
        if (completedByUser) {
          completedBy = completedByUser.initials;
        }
      } catch (error) {
        console.error('Error fetching completed by user initials:', error);
      }
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: data.status,
      category: data.category,
      assignedTo: assignedTo,
      assignedBy: assignedBy,
      dueDate: data.due_date,
      dueTime: data.due_time,
      vehicleId: data.vehicle_id,
      vehicleName: data.vehicle_name,
      tags: data.tags || [],
      notes: data.notes,
      completedAt: data.completed_at,
      completedBy: completedBy,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  static async getTodos(dealershipId: string): Promise<Todo[]> {
    try {
      // Get current user's information
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        return [];
      }

      // Get user's profile to check their role
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      // If user is admin or manager, show all todos
      if (userProfile && (userProfile.role === 'admin' || userProfile.role === 'manager')) {
        const { data, error } = await supabase
          .from('todos')
          .select('*')
          .eq('dealership_id', dealershipId)
          .order('created_at', { ascending: false });
        if (error) return [];
        
        // Convert all todos to frontend format
        const todos = await Promise.all((data || []).map(todo => this.fromDatabaseFormat(todo)));
        return todos;
      }

      // For regular users (technician, sales), only show their assigned todos or todos assigned to everyone
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('dealership_id', dealershipId)
        .or(`assigned_to_id.eq.${user.id},assigned_to_id.is.null,assigned_by_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      if (error) return [];
      
      const todos = await Promise.all((data || []).map(todo => this.fromDatabaseFormat(todo)));
      return todos;
    } catch (error) {
      console.error('Error in getTodos:', error);
      return [];
    }
  }

  static async addTodo(dealershipId: string, todoData: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>): Promise<Todo | null> {
    try {
      // Get current user's UUID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        return null;
      }

      const dbData = this.toDatabaseFormat(todoData);
      dbData.dealership_id = dealershipId;
      
      // Set the assigned_by_id to current user's UUID (required field)
      dbData.assigned_by_id = user.id;
      
      // Handle assigned_to_id - if it's 'ALL', set to null, otherwise try to find user by initials
      if (todoData.assignedTo && todoData.assignedTo !== 'ALL') {
        // Try to find user by initials in the same dealership
        const { data: assignedUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('dealership_id', dealershipId)
          .eq('initials', todoData.assignedTo)
          .single();
        
        if (assignedUser) {
          dbData.assigned_to_id = assignedUser.id;
        } else {
          // If user not found by initials, set to null (will be assigned to ALL)
          dbData.assigned_to_id = null;
        }
      } else {
        // If assignedTo is 'ALL' or empty, set to null
        dbData.assigned_to_id = null;
      }
      
      console.log('Adding todo with data:', dbData);
      
      const { data, error } = await supabase
        .from('todos')
        .insert([dbData])
        .select()
        .single();
      if (error) {
        console.error('Error adding todo to Supabase:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return null;
      }
      return await this.fromDatabaseFormat(data);
    } catch (error) {
      console.error('Error in addTodo:', error);
      return null;
    }
  }

  static async updateTodo(dealershipId: string, todoId: string, updates: Partial<Todo>): Promise<Todo | null> {
    try {
      // Get current user's UUID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        return null;
      }

      // Only convert fields that are actually being updated
      const dbUpdates: any = {
        updated_at: new Date().toISOString()
      };
      
      // Only include fields that are being updated
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
      if (updates.dueTime !== undefined) dbUpdates.due_time = updates.dueTime;
      if (updates.vehicleId !== undefined) dbUpdates.vehicle_id = updates.vehicleId;
      if (updates.vehicleName !== undefined) dbUpdates.vehicle_name = updates.vehicleName;
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      
      // Handle assigned_to_id if it's being updated
      if (updates.assignedTo !== undefined) {
        if (updates.assignedTo && updates.assignedTo !== 'ALL') {
          // Try to find user by initials in the same dealership
          const { data: assignedUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('dealership_id', dealershipId)
            .eq('initials', updates.assignedTo)
            .single();
          
          if (assignedUser) {
            dbUpdates.assigned_to_id = assignedUser.id;
          } else {
            dbUpdates.assigned_to_id = null;
          }
        } else {
          dbUpdates.assigned_to_id = null;
        }
      }
      
      // Handle completed_by_id if status is being set to completed
      if (updates.status === 'completed') {
        dbUpdates.completed_by_id = user.id;
        dbUpdates.completed_at = new Date().toISOString();
      }
      
      console.log('Updating todo with data:', dbUpdates);
      
      const { data, error } = await supabase
        .from('todos')
        .update(dbUpdates)
        .eq('id', todoId)
        .eq('dealership_id', dealershipId)
        .select()
        .single();
      if (error) {
        console.error('Error updating todo in Supabase:', error);
        return null;
      }
      return await this.fromDatabaseFormat(data);
    } catch (error) {
      console.error('Error in updateTodo:', error);
      return null;
    }
  }

  static async deleteTodo(dealershipId: string, todoId: string): Promise<boolean> {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', todoId)
      .eq('dealership_id', dealershipId);
    return !error;
  }

  static async getTodosByUser(dealershipId: string, userInitials: string): Promise<Todo[]> {
    try {
      // First get the user's UUID from their initials
      const { data: user } = await supabase
        .from('profiles')
        .select('id')
        .eq('dealership_id', dealershipId)
        .eq('initials', userInitials)
        .single();
      
      if (!user) {
        console.error('User not found with initials:', userInitials);
        return [];
      }
      
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('dealership_id', dealershipId)
        .or(`assigned_to_id.eq.${user.id},assigned_to_id.is.null,assigned_by_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      if (error) return [];
      
      const todos = await Promise.all((data || []).map(todo => this.fromDatabaseFormat(todo)));
      return todos;
    } catch (error) {
      console.error('Error in getTodosByUser:', error);
      return [];
    }
  }

  static async getTodosByCategory(dealershipId: string, category: TodoCategory): Promise<Todo[]> {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('category', category)
      .order('created_at', { ascending: false });
    if (error) return [];
    const todos = await Promise.all((data || []).map(todo => this.fromDatabaseFormat(todo)));
    return todos;
  }

  static async getTodosByVehicle(dealershipId: string, vehicleId: string): Promise<Todo[]> {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false });
    if (error) return [];
    const todos = await Promise.all((data || []).map(todo => this.fromDatabaseFormat(todo)));
    return todos;
  }

  static async getTodosByStatus(dealershipId: string, status: Todo['status']): Promise<Todo[]> {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('status', status)
      .order('created_at', { ascending: false });
    if (error) return [];
    const todos = await Promise.all((data || []).map(todo => this.fromDatabaseFormat(todo)));
    return todos;
  }

  static async getTodosByPriority(dealershipId: string, priority: Todo['priority']): Promise<Todo[]> {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('priority', priority)
      .order('created_at', { ascending: false });
    if (error) return [];
    const todos = await Promise.all((data || []).map(todo => this.fromDatabaseFormat(todo)));
    return todos;
  }

  static async getOverdueTodos(dealershipId: string): Promise<Todo[]> {
    const todos = await this.getTodos(dealershipId);
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);

    return todos.filter(todo => {
      if (todo.status === 'completed' || todo.status === 'cancelled') return false;
      if (!todo.dueDate) return false;

      if (todo.dueDate < today) return true;
      if (todo.dueDate === today && todo.dueTime && todo.dueTime < currentTime) return true;

      return false;
    });
  }

  static async getTodaysTodos(dealershipId: string): Promise<Todo[]> {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('dealership_id', dealershipId)
      .eq('due_date', new Date().toISOString().split('T')[0])
      .order('due_time', { ascending: true });
    if (error) return [];
    const todos = await Promise.all((data || []).map(todo => this.fromDatabaseFormat(todo)));
    return todos;
  }

  static async getUpcomingTodos(dealershipId: string, days: number = 7): Promise<Todo[]> {
    const todos = await this.getTodos(dealershipId);
    const today = new Date();
    const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    const todayStr = today.toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];

    return todos.filter(todo => {
      if (!todo.dueDate) return false;
      return todo.dueDate >= todayStr && todo.dueDate <= futureDateStr;
    });
  }

  static async searchTodos(dealershipId: string, query: string): Promise<Todo[]> {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('dealership_id', dealershipId)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,vehicle_name.ilike.%${query}%,notes.ilike.%${query}%`)
      .order('created_at', { ascending: false });
    if (error) return [];
    const todos = await Promise.all((data || []).map(todo => this.fromDatabaseFormat(todo)));
    return todos;
  }

  // Calendar Event Management
  static async getCalendarEvents(dealershipId: string): Promise<CalendarEvent[]> {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('dealership_id', dealershipId)
      .order('start_time', { ascending: true });
    if (error) return [];
    return (data || []).map(this.fromCalendarEventFormat);
  }

  static async addCalendarEvent(dealershipId: string, eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<CalendarEvent | null> {
    const dbData = await this.toCalendarEventFormat(eventData);
    dbData.dealership_id = dealershipId;
    
    const { data, error } = await supabase
      .from('calendar_events')
      .insert([dbData])
      .select()
      .single();
    if (error) return null;
    return this.fromCalendarEventFormat(data);
  }

  static async updateCalendarEvent(dealershipId: string, eventId: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
    const dbUpdates = await this.toCalendarEventFormat(updates as any);
    dbUpdates.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('calendar_events')
      .update(dbUpdates)
      .eq('id', eventId)
      .eq('dealership_id', dealershipId)
      .select()
      .single();
    if (error) return null;
    return this.fromCalendarEventFormat(data);
  }

  static async deleteCalendarEvent(dealershipId: string, eventId: string): Promise<boolean> {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId)
      .eq('dealership_id', dealershipId);
    return !error;
  }

  // Helper functions for calendar events
  private static async toCalendarEventFormat(event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<any> {
    // Get current user's UUID for created_by_id
    const { data: { user } } = await supabase.auth.getUser();
    
    return {
      title: event.title,
      description: event.description || null,
      start_time: event.start,
      end_time: event.end,
      event_type: event.type,
      is_all_day: event.allDay,
      location: event.location || null,
      attendees: event.attendees || [],
      created_by_id: user?.id || null
    };
  }

  private static fromCalendarEventFormat(data: any): CalendarEvent {
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      start: data.start_time,
      end: data.end_time,
      allDay: data.is_all_day,
      type: data.event_type,
      todoId: data.todo_id,
      assignedTo: data.assigned_to_id,
      vehicleId: data.vehicle_id,
      vehicleName: data.vehicle_name,
      location: data.location,
      attendees: data.attendees || [],
      color: data.color,
      createdBy: data.created_by_id || 'SYSTEM',
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  // Settings Management - Using Supabase with localStorage fallback
  static async getTodoSettings(dealershipId: string): Promise<TodoSettings> {
    try {
      // First try to get from Supabase
      const { data, error } = await supabase
        .from('todo_settings')
        .select('settings')
        .eq('dealership_id', dealershipId)
        .single();

      if (!error && data && data.settings) {
        const storedSettings = data.settings;
        
        // Merge with default settings
        const mergedSettings: TodoSettings = {
          defaultPriority: 'medium',
          defaultCategory: 'general',
          autoAssignToSelf: true,
          enableNotifications: true,
          showCompletedTasks: false,
          defaultView: 'list',
          reminderMinutes: 15,
          ...storedSettings
        };
        
        // Also save to localStorage as backup
        this.saveTodoSettingsToLocalStorage(dealershipId, mergedSettings);
        return mergedSettings;
      }
    } catch (error) {
      console.error('Error fetching todo settings from Supabase:', error);
    }

    // Fallback to localStorage
    return this.getTodoSettingsFromLocalStorage(dealershipId);
  }

  private static getTodoSettingsFromLocalStorage(dealershipId: string): TodoSettings {
    const key = `todo_settings_${dealershipId}`;
    const data = localStorage.getItem(key);
    
    if (data) {
      try {
      return JSON.parse(data);
      } catch (error) {
        console.error('Error parsing todo settings from localStorage:', error);
      }
    }

    // Default settings
    const defaultSettings: TodoSettings = {
      defaultPriority: 'medium',
      defaultCategory: 'general',
      autoAssignToSelf: true,
      enableNotifications: true,
      showCompletedTasks: false,
      defaultView: 'list',
      reminderMinutes: 15
    };

    this.saveTodoSettingsToLocalStorage(dealershipId, defaultSettings);
    return defaultSettings;
  }

  private static saveTodoSettingsToLocalStorage(dealershipId: string, settings: TodoSettings): void {
    const key = `todo_settings_${dealershipId}`;
    localStorage.setItem(key, JSON.stringify(settings));
  }

  static async saveTodoSettings(dealershipId: string, settings: TodoSettings): Promise<void> {
    try {
      // Save to Supabase
      const { error } = await supabase
        .from('todo_settings')
        .upsert({
          dealership_id: dealershipId,
          settings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'dealership_id'
        });

      if (error) {
        console.error('Error saving todo settings to Supabase:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error saving todo settings to Supabase:', error);
      // Continue to save to localStorage as backup
    }

    // Always save to localStorage as backup
    this.saveTodoSettingsToLocalStorage(dealershipId, settings);
  }

  // Statistics
  static async getTodoStats(dealershipId: string): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
    byCategory: Record<TodoCategory, number>;
    byPriority: Record<Todo['priority'], number>;
    byUser: Record<string, number>;
  }> {
    const todos = await this.getTodos(dealershipId);
    
    const stats = {
      total: todos.length,
      pending: todos.filter(t => t.status === 'pending').length,
      inProgress: todos.filter(t => t.status === 'in-progress').length,
      completed: todos.filter(t => t.status === 'completed').length,
      overdue: 0,
      byCategory: {} as Record<TodoCategory, number>,
      byPriority: {} as Record<Todo['priority'], number>,
      byUser: {} as Record<string, number>
    };

    // Calculate overdue todos
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);

    stats.overdue = todos.filter(todo => {
      if (todo.status === 'completed' || todo.status === 'cancelled') return false;
      if (!todo.dueDate) return false;

      if (todo.dueDate < today) return true;
      if (todo.dueDate === today && todo.dueTime && todo.dueTime < currentTime) return true;

      return false;
    }).length;

    // Initialize category counts
    Object.keys(TODO_CATEGORY_CONFIGS).forEach(category => {
      stats.byCategory[category as TodoCategory] = 0;
    });

    // Initialize priority counts
    ['low', 'medium', 'high', 'urgent'].forEach(priority => {
      stats.byPriority[priority as Todo['priority']] = 0;
    });

    // Count by category, priority, and user
    todos.forEach(todo => {
      if (stats.byCategory[todo.category] !== undefined) {
        stats.byCategory[todo.category]++;
      }
      if (stats.byPriority[todo.priority] !== undefined) {
        stats.byPriority[todo.priority]++;
      }
      if (todo.assignedTo && todo.assignedTo !== 'ALL') {
        stats.byUser[todo.assignedTo] = (stats.byUser[todo.assignedTo] || 0) + 1;
      }
    });

    return stats;
  }

  static getCategoryConfig(category: TodoCategory) {
    return TODO_CATEGORY_CONFIGS[category];
  }

  static formatDueDate(dueDate: string, dueTime?: string): string {
    const date = new Date(dueDate);
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    let dateStr = '';
    if (isToday) {
      dateStr = 'Today';
    } else if (isTomorrow) {
      dateStr = 'Tomorrow';
    } else {
      dateStr = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
    
    if (dueTime) {
      const [hours, minutes] = dueTime.split(':').map(Number);
      const timeStr = new Date(0, 0, 0, hours, minutes).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      return `${dateStr} at ${timeStr}`;
    }
    
    return dateStr;
  }
}