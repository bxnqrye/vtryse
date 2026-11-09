import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import ConfirmDialog from './ConfirmDialog'
import { onEnter } from '../utils/keys'

interface Goal {
  id: string
  user_id: string
  title: string
  target_date: string
}

interface GoalUpdate {
  id: string
  goal_id: string
  note: string
  created_at: string
}

function getDaysRemaining(targetDate: string) {
  const today = new Date()
  const target = new Date(targetDate)
  const diffTime = target.getTime() - today.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

function GoalPlannerSection() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [updates, setUpdates] = useState<GoalUpdate[]>([])
  const [profileNames, setProfileNames] = useState<Record<string, string>>({})
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [noteInputs, setNoteInputs] = useState<{ [goalId: string]: string }>({})
  const [errorMsg, setErrorMsg] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const notifyDataChanged = () => {
    window.dispatchEvent(new Event('calendar-data-changed'))
  }

  const fetchGoals = async () => {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .order('target_date', { ascending: true })

    if (error) setErrorMsg(error.message)
    else setGoals(data || [])
  }

  const fetchUpdates = async () => {
    const { data, error } = await supabase
      .from('goal_updates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) setErrorMsg(error.message)
    else setUpdates(data || [])
  }

  const fetchProfileNames = async () => {
    const { data } = await supabase.from('profiles').select('id, name')
    if (data) {
      const map: Record<string, string> = {}
      data.forEach((p) => {
        map[p.id] = p.name || 'Someone'
      })
      setProfileNames(map)
    }
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
      fetchGoals()
      fetchUpdates()
      fetchProfileNames()
    }
    init()
  }, [])

  const resetForm = () => {
    setTitle('')
    setTargetDate('')
    setEditingId(null)
    setErrorMsg('')
  }

  const startEditing = (goal: Goal) => {
    setEditingId(goal.id)
    setTitle(goal.title)
    setTargetDate(goal.target_date)
  }

  const handleAddGoal = async () => {
    if (!title || !targetDate) {
      setErrorMsg('Title and target date are required')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setErrorMsg('You must be logged in')
      return
    }

    if (editingId) {
      const { error } = await supabase
        .from('goals')
        .update({ title, target_date: targetDate })
        .eq('id', editingId)

      if (error) {
        setErrorMsg(error.message)
      } else {
        resetForm()
        fetchGoals()
        notifyDataChanged()
      }
    } else {
      const { error } = await supabase.from('goals').insert({
        user_id: user.id,
        title,
        target_date: targetDate,
      })

      if (error) {
        setErrorMsg(error.message)
      } else {
        resetForm()
        fetchGoals()
        notifyDataChanged()
      }
    }
  }

  const handleDeleteGoal = async (goalId: string) => {
    const { error } = await supabase.from('goals').delete().eq('id', goalId)
    if (error) {
      setErrorMsg(error.message)
    } else {
      fetchGoals()
      notifyDataChanged()
    }
    setConfirmDeleteId(null)
  }

  const handleAddUpdate = async (goalId: string) => {
    const note = noteInputs[goalId]
    if (!note) return

    const { error } = await supabase.from('goal_updates').insert({
      goal_id: goalId,
      note,
    })

    if (error) {
      setErrorMsg(error.message)
    } else {
      setNoteInputs({ ...noteInputs, [goalId]: '' })
      fetchUpdates()
      notifyDataChanged()
    }
  }

  return (
    <div className="h-[590px] min-h-0 flex flex-col overflow-hidden">
      <h2 className="text-[17px] font-fuzzy text-center g-label text-sm mt-2 mb-4">Calendar</h2>
      <div
        className="glass-soft p-3 flex flex-col gap-2 mb-3 shrink-0"
        onKeyDown={onEnter(handleAddGoal)}
      >
        
        {editingId && (
          <p className="text-[11px] t-muted">Editing - Save to update, or Cancel below</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="Goal title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="glass-input"
          />
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="glass-input"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={handleAddGoal} className="btn btn-primary flex-1">
            {editingId ? 'Save Changes' : 'Add Goal'}
          </button>
          {editingId && (
            <button onClick={resetForm} className="btn btn-ghost">
              Cancel
            </button>
          )}
        </div>
        {errorMsg && <p className="text-red-600 dark:text-red-400 text-xs">{errorMsg}</p>}
      </div>

      <ul className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-2 soft-scroll">
        {goals.map((goal) => {
          const daysLeft = getDaysRemaining(goal.target_date)
          const goalUpdates = updates.filter((u) => u.goal_id === goal.id)
          const isOwner = goal.user_id === currentUserId

          return (
            <li key={goal.id} className="glass-soft p-4">
              <div className="flex justify-between items-start gap-2">
                <p className="font-bold text-base t-accent">{goal.title}</p>
                {isOwner && (
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => startEditing(goal)} className="btn btn-ghost btn-sm">
                      Edit
                    </button>
                    <button onClick={() => setConfirmDeleteId(goal.id)} className="btn btn-ghost btn-sm !text-(--g-danger)">
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <p className="font-bold text-[14px]">
                Target: {goal.target_date} —{' '}
                <span className={daysLeft >= 0 ? '' : 'text-red-600 dark:text-red-400 font-semibold'}>
                  {daysLeft >= 0 ? `${daysLeft} days left` : 'Overdue'}
                </span>
              </p>
              <p className="text-[12px] t-muted">
                Added by {profileNames[goal.user_id] || 'Someone'}
              </p>

              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="Add progress note"
                  value={noteInputs[goal.id] || ''}
                  onChange={(e) =>
                    setNoteInputs({ ...noteInputs, [goal.id]: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddUpdate(goal.id)
                  }}
                  className="glass-input"
                />
                <button onClick={() => handleAddUpdate(goal.id)} className="btn btn-ghost btn-sm shrink-0">
                  Log Update
                </button>
              </div>

              {goalUpdates.length > 0 && (
                <ul className="mt-3 text-[13px] list-disc list-inside space-y-0.5">
                  {goalUpdates.map((u) => (
                    <li key={u.id}>{u.note}</li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete this goal?"
        message="This will also remove all its progress notes. This action cannot be undone."
        onConfirm={() => confirmDeleteId && handleDeleteGoal(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}

export default GoalPlannerSection
