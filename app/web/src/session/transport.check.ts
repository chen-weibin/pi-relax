import { projectRows } from './groupCatalog'
import { toCatalogSession } from './service'
import {
	createTransportState,
	historyFailed,
	historyLoaded,
	onSseOpen,
	pushEvent,
	selectSession,
} from './transport'

function assert(condition: boolean, message: string) {
	if (!condition) throw new Error(message)
}

let state = createTransportState<string>()
assert(pushEvent(state, 'a', 'x').forward === null, 'drop when nothing is open')

const selected = selectSession(state, 'a')
assert(selected.effects[0]?.type === 'load-history', 'select loads history')
assert(selected.state.phase === 'loading' && selected.state.queue.length === 0, 'select starts empty')
state = selected.state
state = pushEvent(state, 'a', 'one').state
const other = pushEvent(state, 'b', 'nope')
assert(other.forward === null && other.state.queue.length === 1, 'other session is dropped')
state = pushEvent(state, 'a', 'two').state
assert(state.queue.join() === 'one,two', 'queue while history is loading')

const failed = historyFailed(state, state.generation)
assert(failed.phase === 'error' && failed.queue.length === 0, 'failure clears the queue')
assert(historyLoaded(failed, failed.generation).replay.length === 0, 'failure does not replay')

const again = selectSession(failed, 'a')
assert(again.state.queue.length === 0 && again.effects[0]?.type === 'load-history', 'retry clears and reloads')
state = again.state
state = pushEvent(state, 'a', '1').state
state = pushEvent(state, 'a', '2').state
const loaded = historyLoaded(state, state.generation)
assert(loaded.replay.join() === '1,2', 'replay in arrival order')
assert(loaded.state.phase === 'ready' && loaded.state.queue.length === 0, 'ready drops the queue')
assert(pushEvent(loaded.state, 'a', '3').forward === '3', 'forward after history lands')

assert(onSseOpen(loaded.state, true).effects.length === 0, 'first open does not refetch')
const reopened = onSseOpen(loaded.state, false)
assert(reopened.effects[0]?.type === 'load-lists', 'reconnect reloads lists')
assert(reopened.effects[1]?.type === 'load-history', 'reconnect reloads history')
assert(reopened.state.queue.length === 0, 'reconnect clears the queue')

const switched = selectSession(loaded.state, 'b')
assert(switched.state.openSessionId === 'b' && switched.state.queue.length === 0, 'switch clears the previous queue')
assert(switched.effects[0]?.type === 'load-history', 'switch reloads history')
assert(historyLoaded(switched.state, loaded.state.generation).replay.length === 0, 'stale history is ignored')

const rows = projectRows(
	[
		{ id: 'p1', cwd: '/default', name: 'Registered', position: 2, created: '', modified: '' },
		{ id: 'p2', cwd: '/other', name: 'Other', position: 1, created: '', modified: '' },
	],
	'/default',
)
assert(rows[0]?.id === 'default' && rows[0].name === '/default', 'default workspace stays first')
assert(rows.length === 2 && rows[1]?.id === 'p2', 'registered default cwd is not repeated')

const catalog = toCatalogSession({
	id: 's',
	cwd: '/proj',
	name: '  ',
	firstMessage: 'hello',
	created: '',
	modified: '',
	status: 'other',
	completed: true,
})
assert(catalog.name === '  ' && catalog.status === 'idle', 'unknown status becomes idle')
assert(!('completed' in catalog), 'catalog drops list-only fields')

console.log('session transport ok')
