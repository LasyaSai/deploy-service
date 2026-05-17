import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../logger'

export interface Todo {
  id: string
  title: string
  completed: boolean
  createdAt: string
  updatedAt: string
}

// In-memory store (swap for DB in production)
const todos: Map<string, Todo> = new Map()

// Seed one item
todos.set('seed-1', {
  id: 'seed-1',
  title: 'Deploy this API properly',
  completed: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

export const todoRouter = Router()

// GET /todos
todoRouter.get('/', (_req: Request, res: Response) => {
  const list = Array.from(todos.values())
  logger.info('todos.list', { count: list.length })
  res.json({ data: list, total: list.length })
})

// GET /todos/:id
todoRouter.get('/:id', (req: Request, res: Response) => {
  const todo = todos.get(req.params.id)
  if (!todo) {
    logger.warn('todos.get.notFound', { id: req.params.id })
    return res.status(404).json({ error: 'Todo not found' })
  }
  res.json({ data: todo })
})

// POST /todos
todoRouter.post('/', (req: Request, res: Response) => {
  const { title } = req.body as { title?: string }
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: '`title` is required and must be a non-empty string' })
  }

  const todo: Todo = {
    id: uuidv4(),
    title: title.trim(),
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  todos.set(todo.id, todo)
  logger.info('todos.created', { id: todo.id })
  res.status(201).json({ data: todo })
})

// PATCH /todos/:id
todoRouter.patch('/:id', (req: Request, res: Response) => {
  const todo = todos.get(req.params.id)
  if (!todo) return res.status(404).json({ error: 'Todo not found' })

  const { title, completed } = req.body as Partial<Pick<Todo, 'title' | 'completed'>>
  if (title !== undefined) todo.title = title
  if (completed !== undefined) todo.completed = completed
  todo.updatedAt = new Date().toISOString()

  todos.set(todo.id, todo)
  logger.info('todos.updated', { id: todo.id })
  res.json({ data: todo })
})

// DELETE /todos/:id
todoRouter.delete('/:id', (req: Request, res: Response) => {
  if (!todos.has(req.params.id)) return res.status(404).json({ error: 'Todo not found' })
  todos.delete(req.params.id)
  logger.info('todos.deleted', { id: req.params.id })
  res.status(204).send()
})
