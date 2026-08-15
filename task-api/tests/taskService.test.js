const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create()', () => {
    test('creates a task with generated id and timestamps', () => {
      const task = taskService.create({
        title: 'Test task',
      });

      expect(task).toMatchObject({
        title: 'Test task',
        description: '',
        status: 'todo',
        priority: 'medium',
        dueDate: null,
        completedAt: null,
      });

      expect(task.id).toEqual(expect.any(String));
      expect(task.createdAt).toEqual(expect.any(String));
    });

    test('creates a task with supplied fields', () => {
      const task = taskService.create({
        title: 'Custom task',
        description: 'Description',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2030-01-01T00:00:00.000Z',
      });

      expect(task).toMatchObject({
        title: 'Custom task',
        description: 'Description',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2030-01-01T00:00:00.000Z',
      });
    });
  });

  describe('getAll()', () => {
    test('returns all tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const tasks = taskService.getAll();

      expect(tasks).toHaveLength(2);
      expect(tasks.map(t => t.title)).toEqual([
        'Task 1',
        'Task 2',
      ]);
    });

    test('returns an empty array when there are no tasks', () => {
      expect(taskService.getAll()).toEqual([]);
    });
  });

  describe('findById()', () => {
    test('finds an existing task', () => {
      const created = taskService.create({
        title: 'Find me',
      });

      const found = taskService.findById(created.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
    });

    test('returns undefined for an unknown id', () => {
      expect(
        taskService.findById('00000000-0000-0000-0000-000000000000')
      ).toBeUndefined();
    });
  });

  describe('getByStatus()', () => {
    test('returns tasks with the requested status', () => {
      taskService.create({
        title: 'Todo task',
        status: 'todo',
      });

      taskService.create({
        title: 'Done task',
        status: 'done',
      });

      const result = taskService.getByStatus('todo');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Todo task');
    });

    test('returns empty array for a status with no matches', () => {
      taskService.create({
        title: 'Todo task',
        status: 'todo',
      });

      expect(taskService.getByStatus('in_progress')).toEqual([]);
    });
  });

  describe('getPaginated()', () => {
    beforeEach(() => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });
    });

    test('returns the first page using 1-based page numbers', () => {
      const result = taskService.getPaginated(1, 2);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Task 1');
      expect(result[1].title).toBe('Task 2');
    });

    test('returns the second page', () => {
      const result = taskService.getPaginated(2, 2);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Task 3');
    });

    test('returns empty array when page is beyond available data', () => {
      expect(taskService.getPaginated(10, 2)).toEqual([]);
    });
  });

  describe('update()', () => {
    test('updates mutable task fields', () => {
      const task = taskService.create({
        title: 'Original',
      });

      const updated = taskService.update(task.id, {
        title: 'Updated',
        priority: 'high',
      });

      expect(updated.title).toBe('Updated');
      expect(updated.priority).toBe('high');
      expect(updated.id).toBe(task.id);
    });

    test('returns null for an unknown task', () => {
      const result = taskService.update(
        '00000000-0000-0000-0000-000000000000',
        { title: 'Updated' }
      );

      expect(result).toBeNull();
    });

    test('does not allow immutable id to be changed', () => {
      const task = taskService.create({
        title: 'Immutable ID',
      });

      const updated = taskService.update(task.id, {
        id: 'HACKED-ID',
      });

      expect(updated.id).toBe(task.id);
    });

    test('does not allow createdAt to be changed', () => {
      const task = taskService.create({
        title: 'Immutable timestamp',
      });

      const originalCreatedAt = task.createdAt;

      const updated = taskService.update(task.id, {
        createdAt: '2000-01-01T00:00:00.000Z',
      });

      expect(updated.createdAt).toBe(originalCreatedAt);
    });
  });

  describe('remove()', () => {
    test('removes an existing task', () => {
      const task = taskService.create({
        title: 'Delete me',
      });

      expect(taskService.remove(task.id)).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    test('returns false for an unknown task', () => {
      expect(
        taskService.remove(
          '00000000-0000-0000-0000-000000000000'
        )
      ).toBe(false);
    });
  });

  describe('completeTask()', () => {
    test('marks a task as done and sets completedAt', () => {
      const task = taskService.create({
        title: 'Complete me',
      });

      const completed = taskService.completeTask(task.id);

      expect(completed.status).toBe('done');
      expect(completed.completedAt).toEqual(expect.any(String));
    });

    test('returns null for an unknown task', () => {
      expect(
        taskService.completeTask(
          '00000000-0000-0000-0000-000000000000'
        )
      ).toBeNull();
    });

    test('preserves priority when completing a task', () => {
      const task = taskService.create({
        title: 'High priority task',
        priority: 'high',
      });

      const completed = taskService.completeTask(task.id);

      expect(completed.priority).toBe('high');
    });
  });

  describe('getStats()', () => {
    test('counts tasks by status', () => {
      taskService.create({
        title: 'Todo',
        status: 'todo',
      });

      taskService.create({
        title: 'Progress',
        status: 'in_progress',
      });

      taskService.create({
        title: 'Done',
        status: 'done',
      });

      expect(taskService.getStats()).toMatchObject({
        todo: 1,
        in_progress: 1,
        done: 1,
      });
    });

    test('counts overdue incomplete tasks', () => {
      taskService.create({
        title: 'Overdue',
        status: 'todo',
        dueDate: '2020-01-01T00:00:00.000Z',
      });

      expect(taskService.getStats().overdue).toBe(1);
    });

    test('does not count completed overdue tasks', () => {
      taskService.create({
        title: 'Completed overdue',
        status: 'done',
        dueDate: '2020-01-01T00:00:00.000Z',
      });

      expect(taskService.getStats().overdue).toBe(0);
    });

    test('does not count tasks without a due date', () => {
      taskService.create({
        title: 'No due date',
        status: 'todo',
        dueDate: null,
      });

      expect(taskService.getStats().overdue).toBe(0);
    });
  });
});
