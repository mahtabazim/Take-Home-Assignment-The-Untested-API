const request = require('supertest');
const app = require('../src/app');
describe('PATCH /tasks/:id/assign', () => {
  let task;

  beforeEach(async () => {
    const response = await request(app)
      .post('/tasks')
      .send({
        title: 'Test Task',
      });

    task = response.body;
  });

  test('assigns a task to a valid assignee', async () => {
    const response = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({
        assignee: 'Alice',
      });

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(task.id);
    expect(response.body.assignee).toBe('Alice');
  });

  test('rejects an empty assignee', async () => {
    const response = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({
        assignee: '',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('assignee cannot be empty');
  });

  test('rejects a whitespace-only assignee', async () => {
    const response = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({
        assignee: '   ',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('assignee cannot be empty');
  });

  test('rejects a non-string assignee', async () => {
    const response = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({
        assignee: 123,
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('assignee must be a string');
  });

  test('returns 404 for a non-existent task', async () => {
    const response = await request(app)
      .patch('/tasks/does-not-exist/assign')
      .send({
        assignee: 'Alice',
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Task not found');
  });

  test('trims whitespace around assignee', async () => {
    const response = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({
        assignee: '  Alice  ',
      });

    expect(response.status).toBe(200);
    expect(response.body.assignee).toBe('Alice');
  });
});