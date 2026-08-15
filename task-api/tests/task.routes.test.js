const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task API routes', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    test('returns all tasks', async () => {
      await request(app)
        .post('/tasks')
        .send({ title: 'Task 1' });

      await request(app)
        .post('/tasks')
        .send({ title: 'Task 2' });

      const response = await request(app)
        .get('/tasks')
        .expect(200);

      expect(response.body).toHaveLength(2);
    });

    test('returns empty array when there are no tasks', async () => {
      const response = await request(app)
        .get('/tasks')
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('GET /tasks?status=', () => {
    test('filters tasks by status', async () => {
      await request(app)
        .post('/tasks')
        .send({
          title: 'Todo task',
          status: 'todo',
        });

      await request(app)
        .post('/tasks')
        .send({
          title: 'Done task',
          status: 'done',
        });

      const response = await request(app)
        .get('/tasks')
        .query({ status: 'todo' })
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe('todo');
    });

    test('returns empty array for status with no matches', async () => {
      const response = await request(app)
        .get('/tasks')
        .query({ status: 'in_progress' })
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('GET /tasks pagination', () => {
    beforeEach(async () => {
      await request(app)
        .post('/tasks')
        .send({ title: 'Task 1' });

      await request(app)
        .post('/tasks')
        .send({ title: 'Task 2' });

      await request(app)
        .post('/tasks')
        .send({ title: 'Task 3' });
    });

    test('returns first page', async () => {
      const response = await request(app)
        .get('/tasks')
        .query({
          page: 1,
          limit: 2,
        })
        .expect(200);

      expect(response.body).toHaveLength(2);

      // This test exposes the current off-by-one bug.
      expect(response.body[0].title).toBe('Task 1');
      expect(response.body[1].title).toBe('Task 2');
    });

    test('returns second page', async () => {
      const response = await request(app)
        .get('/tasks')
        .query({
          page: 2,
          limit: 2,
        })
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Task 3');
    });

    test('handles invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/tasks')
        .query({
          page: 'abc',
          limit: 'xyz',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /tasks', () => {
    test('creates a task', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'New task',
          description: 'Test description',
          priority: 'high',
          status: 'todo',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        title: 'New task',
        description: 'Test description',
        priority: 'high',
        status: 'todo',
        completedAt: null,
      });

      expect(response.body.id).toEqual(expect.any(String));
      expect(response.body.createdAt).toEqual(expect.any(String));
    });

    test('rejects missing title', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({})
        .expect(400);

      expect(response.body.error).toBe(
        'title is required and must be a non-empty string'
      );
    });

    test('rejects empty title', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: '   ' })
        .expect(400);

      expect(response.body.error).toBe(
        'title is required and must be a non-empty string'
      );
    });

    test('rejects invalid status', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Invalid status',
          status: 'invalid',
        })
        .expect(400);

      expect(response.body.error).toContain('status must be one of');
    });

    test('rejects invalid priority', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Invalid priority',
          priority: 'invalid',
        })
        .expect(400);

      expect(response.body.error).toContain(
        'priority must be one of'
      );
    });

    test('rejects invalid due date', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Invalid date',
          dueDate: 'not-a-date',
        })
        .expect(400);

      expect(response.body.error).toBe(
        'dueDate must be a valid ISO date string'
      );
    });

    test('accepts a valid due date', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Future task',
          dueDate: '2030-01-01T00:00:00.000Z',
        })
        .expect(201);

      expect(response.body.dueDate).toBe(
        '2030-01-01T00:00:00.000Z'
      );
    });
  });

  describe('PUT /tasks/:id', () => {
    let task;

    beforeEach(async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Original task',
          priority: 'high',
        });

      task = response.body;
    });

    test('updates a task', async () => {
      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({
          title: 'Updated task',
          priority: 'low',
        })
        .expect(200);

      expect(response.body.title).toBe('Updated task');
      expect(response.body.priority).toBe('low');
      expect(response.body.id).toBe(task.id);
    });

    test('returns 404 for unknown task', async () => {
      const response = await request(app)
        .put('/tasks/00000000-0000-0000-0000-000000000000')
        .send({
          title: 'Updated',
        })
        .expect(404);

      expect(response.body).toEqual({
        error: 'Task not found',
      });
    });

    test('rejects empty title', async () => {
      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({
          title: '',
        })
        .expect(400);

      expect(response.body.error).toBe(
        'title must be a non-empty string'
      );
    });

    test('does not allow id to be changed', async () => {
      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({
          id: 'HACKED-ID',
        })
        .expect(200);

      expect(response.body.id).toBe(task.id);
    });

    test('does not allow createdAt to be changed', async () => {
      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({
          createdAt: '2000-01-01T00:00:00.000Z',
        })
        .expect(200);

      expect(response.body.createdAt).toBe(task.createdAt);
    });

    test('does not allow completedAt to be changed', async () => {
      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({
          completedAt: '2000-01-01T00:00:00.000Z',
        })
        .expect(200);

      expect(response.body.completedAt).toBeNull();
    });

    test('does not accept arbitrary fields', async () => {
      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({
          foo: 'bar',
        })
        .expect(200);

      expect(response.body.foo).toBeUndefined();
    });
  });

  describe('DELETE /tasks/:id', () => {
    let task;

    beforeEach(async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Delete me',
        });

      task = response.body;
    });

    test('deletes an existing task', async () => {
      await request(app)
        .delete(`/tasks/${task.id}`)
        .expect(204);

      await request(app)
        .get('/tasks')
        .expect(200)
        .then(response => {
          expect(response.body).toHaveLength(0);
        });
    });

    test('returns 404 when deleting unknown task', async () => {
      const response = await request(app)
        .delete('/tasks/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Task not found',
      });
    });

    test('returns 404 when deleting the same task twice', async () => {
      await request(app)
        .delete(`/tasks/${task.id}`)
        .expect(204);

      await request(app)
        .delete(`/tasks/${task.id}`)
        .expect(404);
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    let task;

    beforeEach(async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Complete me',
          priority: 'high',
        });

      task = response.body;
    });

    test('completes a task', async () => {
      const response = await request(app)
        .patch(`/tasks/${task.id}/complete`)
        .expect(200);

      expect(response.body.status).toBe('done');
      expect(response.body.completedAt).toEqual(expect.any(String));
    });

    test('returns 404 for unknown task', async () => {
      const response = await request(app)
        .patch(
          '/tasks/00000000-0000-0000-0000-000000000000/complete'
        )
        .expect(404);

      expect(response.body).toEqual({
        error: 'Task not found',
      });
    });

    test('preserves task priority when completing', async () => {
      const response = await request(app)
        .patch(`/tasks/${task.id}/complete`)
        .expect(200);

      expect(response.body.priority).toBe('high');
    });

    test('can be called twice', async () => {
      const first = await request(app)
        .patch(`/tasks/${task.id}/complete`)
        .expect(200);

      const second = await request(app)
        .patch(`/tasks/${task.id}/complete`)
        .expect(200);

      expect(first.body.status).toBe('done');
      expect(second.body.status).toBe('done');
      expect(second.body.completedAt).toEqual(expect.any(String));
    });
  });

  describe('GET /tasks/stats', () => {
    test('returns task counts', async () => {
      await request(app)
        .post('/tasks')
        .send({
          title: 'Todo',
          status: 'todo',
        });

      await request(app)
        .post('/tasks')
        .send({
          title: 'Progress',
          status: 'in_progress',
        });

      await request(app)
        .post('/tasks')
        .send({
          title: 'Done',
          status: 'done',
        });

      const response = await request(app)
        .get('/tasks/stats')
        .expect(200);

      expect(response.body).toMatchObject({
        todo: 1,
        in_progress: 1,
        done: 1,
        overdue: 0,
      });
    });

    test('counts overdue incomplete tasks', async () => {
      await request(app)
        .post('/tasks')
        .send({
          title: 'Overdue',
          status: 'todo',
          dueDate: '2020-01-01T00:00:00.000Z',
        });

      const response = await request(app)
        .get('/tasks/stats')
        .expect(200);

      expect(response.body.overdue).toBe(1);
    });

    test('does not count completed overdue tasks', async () => {
      await request(app)
        .post('/tasks')
        .send({
          title: 'Completed overdue',
          status: 'done',
          dueDate: '2020-01-01T00:00:00.000Z',
        });

      const response = await request(app)
        .get('/tasks/stats')
        .expect(200);

      expect(response.body.overdue).toBe(0);
    });
  });
});
