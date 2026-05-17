import request from 'supertest'
import { app } from '../app'

describe('GET /health', () => {
  it('returns 200 with healthy status', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('healthy')
    expect(res.body).toHaveProperty('uptime')
    expect(res.body).toHaveProperty('timestamp')
  })
})

describe('GET /ready', () => {
  it('returns 200 with ready status', async () => {
    const res = await request(app).get('/ready')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ready')
  })
})

describe('Todos API', () => {
  let createdId: string

  it('GET /todos — returns list', async () => {
    const res = await request(app).get('/todos')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body).toHaveProperty('total')
  })

  it('POST /todos — creates a todo', async () => {
    const res = await request(app)
      .post('/todos')
      .send({ title: 'Test todo item' })
    expect(res.status).toBe(201)
    expect(res.body.data.title).toBe('Test todo item')
    expect(res.body.data.completed).toBe(false)
    createdId = res.body.data.id
  })

  it('POST /todos — rejects empty title', async () => {
    const res = await request(app).post('/todos').send({ title: '' })
    expect(res.status).toBe(400)
  })

  it('GET /todos/:id — returns the created todo', async () => {
    const res = await request(app).get(`/todos/${createdId}`)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(createdId)
  })

  it('PATCH /todos/:id — marks as completed', async () => {
    const res = await request(app)
      .patch(`/todos/${createdId}`)
      .send({ completed: true })
    expect(res.status).toBe(200)
    expect(res.body.data.completed).toBe(true)
  })

  it('DELETE /todos/:id — deletes the todo', async () => {
    const res = await request(app).delete(`/todos/${createdId}`)
    expect(res.status).toBe(204)
  })

  it('GET /todos/:id — 404 after deletion', async () => {
    const res = await request(app).get(`/todos/${createdId}`)
    expect(res.status).toBe(404)
  })

  it('404 for unknown routes', async () => {
    const res = await request(app).get('/nonexistent')
    expect(res.status).toBe(404)
  })
})
