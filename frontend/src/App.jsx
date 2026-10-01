import { useEffect, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL

async function request(path, options) {
  const response = await fetch(`${API_URL}${path}`, options)
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.error || `Erreur de l’API (${response.status}).`)
  }

  return data
}

function getErrorMessage(error) {
  if (error instanceof TypeError) {
    return `Impossible de joindre l’API à ${API_URL}. Vérifiez qu’elle est démarrée.`
  }

  return error.message || 'Une erreur inattendue est survenue.'
}

function App() {
  const [tasks, setTasks] = useState([])
  const [title, setTitle] = useState('')
  const [assignee, setAssignee] = useState('')
  const [titleError, setTitleError] = useState('')
  const [notice, setNotice] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBusy, setIsBusy] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadTasks() {
      setIsLoading(true)

      try {
        const result = await request('/tasks', { signal: controller.signal })

        if (!Array.isArray(result)) {
          throw new Error('La réponse de l’API n’est pas une liste de tâches.')
        }

        setTasks(result)
      } catch (error) {
        if (!controller.signal.aborted) {
          setNotice({ type: 'error', text: getErrorMessage(error) })
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadTasks()
    return () => controller.abort()
  }, [reloadKey])

  async function addTask(event) {
    event.preventDefault()
    const trimmedTitle = title.trim()

    if (!trimmedTitle) {
      setTitleError('Le titre de la tâche est obligatoire.')
      return
    }

    setTitleError('')
    setIsBusy(true)
    try {
      await request('/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titre: trimmedTitle, assignee: assignee.trim() || null }),
      })
      setTitle('')
      setAssignee('')
      setReloadKey((key) => key + 1)
    } catch (error) {
      setNotice({ type: 'error', text: getErrorMessage(error) })
    } finally {
      setIsBusy(false)
    }
  }

  async function toggleTask(task) {
    setIsBusy(true)
    try {
      await request(`/tasks/${task.id}/completed`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complete: !task.completed }),
      })

      setReloadKey((key) => key + 1)
    } catch (error) {
      setNotice({ type: 'error', text: getErrorMessage(error) })
    } finally {
      setIsBusy(false)
    }
  }

  async function deleteTask(task) {
    setIsBusy(true)
    try {
      await request(`/tasks/${task.id}`, { method: 'DELETE' })
      setReloadKey((key) => key + 1)
    } catch (error) {
      setNotice({ type: 'error', text: getErrorMessage(error) })
    } finally {
      setIsBusy(false)
    }
  }

  async function removeAssignee(task) {
    setIsBusy(true)
    try {
      await request(`/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignee: null }),
      })
      setReloadKey((key) => key + 1)
    } catch (error) {
      setNotice({ type: 'error', text: getErrorMessage(error) })
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <main className="task-app">
      <header className="page-header">
        
        <div className="heading-row">
          <div>
            <h1>Mes tâches</h1>
            
          </div>
          <p className="task-total" aria-live="polite">
            <strong>{tasks.length}</strong>
            <span>{tasks.length > 1 ? 'nombre tâches' : 'nombre tâche'}</span>
          </p>
        </div>
      </header>

      <section className="composer-section" aria-labelledby="add-heading">
        <h2 id="add-heading">Ajouter une tâche</h2>
        <form className="task-form" onSubmit={addTask}>
          <div className="form-field">
            <label htmlFor="task-title">Titre de la tâche</label>
            <input
              id="task-title"
              name="title"
              type="text"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value)
                if (event.target.value.trim()) setTitleError('')
              }}
              placeholder="Ex. Préparer la réunion"
              maxLength={100}
              aria-required="true"
              aria-invalid={titleError ? 'true' : undefined}
              aria-describedby={titleError ? 'task-title-error' : undefined}
            />
          </div>
          <div className="form-field">
            <label htmlFor="task-assignee">Prénom du bénévole (facultatif)</label>
            <input
              id="task-assignee"
              name="assignee"
              type="text"
              value={assignee}
              onChange={(event) => setAssignee(event.target.value)}
              placeholder="Prénom uniquement"
              maxLength={50}
              autoComplete="off"
            />
          </div>
          <button className="add-button" type="submit" disabled={isBusy}>
            {isBusy ? 'En cours…' : 'Ajouter'}
          </button>
        </form>
        {titleError && <p className="field-error" id="task-title-error" role="alert">{titleError}</p>}
        <p className="privacy-notice">
          L’association collecte ce prénom uniquement pour indiquer qui s’occupe de la tâche. Il est conservé jusqu’à la suppression de la tâche. Vous pouvez le retirer avec le bouton « Retirer le bénévole » ou demander son effacement à contact@association.example.
        </p>
      </section>

      <section className="list-section" aria-labelledby="list-heading">
        <div className="list-heading-row">
          <h2 id="list-heading">Liste des tâches</h2>
        </div>

        {notice && (
          <p className={`notice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
            {notice.text}
          </p>
        )}

        {isLoading ? (
          <p className="list-state" role="status">Chargement des tâches…</p>
        ) : tasks.length === 0 ? (
          <p className="list-state">Aucune tâche à afficher.</p>
        ) : (
          <ul className="task-list">
            {tasks.map((task) => (
              <li className={`task-row${task.completed ? ' is-completed' : ''}`} key={task.id}>
                <div className="task-description">
                  <span className="task-title">{task.titre}</span>
                  <span className="task-assignee">
                    {task.assignee ? `Bénévole : ${task.assignee}` : 'Aucun bénévole indiqué'}
                  </span>
                </div>
                <label className="completion-label" htmlFor={`task-completed-${task.id}`}>
                  <input
                    id={`task-completed-${task.id}`}
                    type="checkbox"
                    checked={task.completed}
                    disabled={isBusy}
                    onChange={() => toggleTask(task)}
                  />
                  {task.completed ? 'Terminée' : 'À faire'}
                </label>
                <div className="task-actions">
                  {task.assignee && (
                    <button
                      className="remove-assignee-button"
                      type="button"
                      disabled={isBusy}
                      aria-label={`Retirer le bénévole ${task.assignee} de la tâche ${task.titre}`}
                      onClick={() => removeAssignee(task)}
                    >
                      Retirer le bénévole
                    </button>
                  )}
                  <button
                    className="delete-button"
                    type="button"
                    disabled={isBusy}
                    aria-label={`Supprimer la tâche ${task.titre}`}
                    onClick={() => deleteTask(task)}
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default App
