const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const {format} = require('date-fns')
const isValid = require('date-fns/isValid')
const path = require('path')
const dbPath = path.join(__dirname, 'todoApplication.db')
const app = express()
app.use(express.json())

// initializing and connecting Database
let db = null
const initializingAndConnectDB = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () =>
      console.log('Server Running at http://localhost:3000/'),
    )
  } catch (err) {
    console.log(`DB ERROR: ${err.message}`)
    process.exit(1)
  }
}
initializingAndConnectDB()

// isValidPropertyValues function...
function isValidPropertyValues(priority, status, category) {
  let isValidValues = true
  let incorrectValue
  const isValidPriority = ['HIGH', 'MEDIUM', 'LOW'].includes(priority)
  const isValidStatus = ['status', 'TO DO', 'IN PROGRESS', 'DONE'].includes(
    status,
  )
  const isValidCategory = ['category', 'WORK', 'HOME', 'LEARNING'].includes(
    category,
  )
  if (!isValidPriority && priority !== undefined) {
    isValidValues = false
    incorrectValue = 'Priority'
  }
  if (!isValidStatus && status !== undefined) {
    isValidValues = false
    incorrectValue = 'Status'
  }
  if (!isValidCategory && category !== undefined) {
    isValidValues = false
    incorrectValue = 'Category'
  }

  if (isValidValues === true) {
    return false
  } else {
    return `Invalid Todo ${incorrectValue}`
  }
}

// API 1

// functions...
function isPriorityAndStatus(priority, status) {
  return priority !== undefined && status !== undefined
}

function isCateogoryAndStatus(category, status) {
  return category !== undefined && status !== undefined
}

function isCategoryAndPriority(category, priority) {
  return category !== undefined && priority !== undefined
}

app.get('/todos/', async (request, response) => {
  const {priority, status, search_q, category} = request.query
  let getTodosQuery

  switch (true) {
    case isPriorityAndStatus(priority, status):
      getTodosQuery = `SELECT id,todo,priority,status,category,due_date as dueDate FROM todo WHERE priority = "${priority}" AND status = "${status}";`
      break
    case isCateogoryAndStatus(category, status):
      getTodosQuery = `SELECT id,todo,priority,status,category,due_date as dueDate FROM todo WHERE category = "${category}" AND status = "${status}"`
      break
    case isCategoryAndPriority(category, priority):
      getTodosQuery = `SELECT id,todo,priority,status,category,due_date as dueDate FROM todo WHERE category = "${category}" AND priority = "${priority}"`
      break
    case status !== undefined:
      getTodosQuery = `SELECT id,todo,priority,status,category,due_date as dueDate FROM todo WHERE status = "${status}"`
      break
    case priority !== undefined:
      getTodosQuery = `SELECT id,todo,priority,status,category,due_date as dueDate FROM todo WHERE priority = "${priority}"`
      break
    case category !== undefined:
      getTodosQuery = `SELECT id,todo,priority,status,category,due_date as dueDate FROM todo WHERE category = "${category}"`
      break
    default:
      getTodosQuery = `SELECT id,todo,priority,status,category,due_date as dueDate FROM todo WHERE todo LIKE "%${search_q}%"`
      break
  }

  const havingError = isValidPropertyValues(priority, status, category)
  if (havingError === false) {
    const todoList = await db.all(getTodosQuery)
    response.send(todoList)
  } else {
    response.status(400)
    response.send(havingError)
  }
})

// Returns a specific todo based on the todo ID (API 2)

app.get('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  let getTodoQuery = `
  SELECT id,
  todo,
  priority,
  status,
  category,
  due_date as dueDate
  FROM todo 
  WHERE id = ${todoId};`

  const todo = await db.get(getTodoQuery)
  response.send(todo)
})

// Returns a list of all todos with a specific due date in the query parameter `/agenda/?date=2021-12-12` (API 3)

app.get('/agenda/', async (request, response) => {
  const {date} = request.query
  const isValidDate = isValid(new Date(date))

  let formatedDate
  if (isValidDate) {
    formatedDate = format(new Date(date), 'yyyy-MM-dd')
  }

  let getTodosQuery = `
    SELECT id,
    todo,
    priority,
    status,
    category,
    due_date as dueDate
    FROM todo 
    WHERE due_date = "${formatedDate}";`

  if (isValidDate) {
    const todo = await db.all(getTodosQuery)
    response.send(todo)
  } else {
    response.status(400)
    response.send('Invalid Due Date')
  }
})

// Create a todo in the todo table (API 4)

app.post('/todos/', async (request, response) => {
  const {id, todo, priority, status, category, dueDate} = request.body
  let formatedDate
  const isValidDate = isValid(new Date(dueDate))
  if (isValidDate) {
    formatedDate = format(new Date(dueDate), 'yyyy-MM-dd')
  }

  let createTodoQuery = `
    INSERT INTO 
    todo(id,todo,priority,status,category,due_date)
    values (
      ${id},
    "${todo}",
    "${priority}",
    "${status}",
    "${category}",
    "${formatedDate}");`

  const havingError = isValidPropertyValues(priority, status, category)

  if (havingError === false) {
    if (isValidDate) {
      await db.run(createTodoQuery)
      response.send('Todo Successfully Added')
    } else {
      response.status(400)
      response.send('Invalid Due Date')
    }
  } else {
    response.status(400)
    response.send(havingError)
  }
})

// Updates the details of a specific todo based on the todo ID (API 5)

app.put('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const {todo, priority, status, category, dueDate} = request.body

  let isValidDate
  let formatedDate
  if (dueDate !== undefined) {
    isValidDate = isValid(new Date(dueDate))

    if (isValidDate) {
      formatedDate = format(new Date(dueDate), 'yyyy-MM-dd')
    }
  }

  let updateTodoQuery
  let state

  switch (true) {
    case status !== undefined:
      updateTodoQuery = `UPDATE todo SET status = "${status}" WHERE id = ${todoId};`
      state = 'Status'
      break
    case priority !== undefined:
      updateTodoQuery = `UPDATE todo SET priority = "${priority}" WHERE id = ${todoId};`
      state = 'Priority'
      break
    case todo !== undefined:
      updateTodoQuery = `UPDATE todo SET todo = "${todo}" WHERE id = ${todoId};`
      state = 'Todo'
      break
    case category !== undefined:
      updateTodoQuery = `UPDATE todo SET category = "${category}" WHERE id = ${todoId};`
      state = 'Category'
      break
    default:
      updateTodoQuery = `UPDATE todo SET due_date = "${formatedDate}" WHERE id = ${todoId};`
      state = 'Due Date'
      break
  }

  const havingError = isValidPropertyValues(priority, status, category)

  if (havingError === false) {
    if (dueDate !== undefined && isValidDate === false) {
      response.status(400)
      response.send('Invalid Due Date')
    } else {
      await db.run(updateTodoQuery)
      response.send(`${state} Updated`)
    }
  } else {
    response.status(400)
    response.send(havingError)
  }
})

// Deletes a todo from the todo table based on the todo ID (API 6)

app.delete('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  let deleteTodoQuery = `
  DELETE
  FROM todo 
  WHERE id = ${todoId};`

  await db.run(deleteTodoQuery)
  response.send('Todo Deleted')
})

module.exports = app
