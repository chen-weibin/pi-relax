import { placeNewProject, projectRows } from './groupCatalog'
import { toCatalogSession } from './service'
import {
	clearOpenSession,
	createTransportState,
	historyArrived,
	historyFailed,
	onSseOpen,
	pushEvent,
	releaseLive,
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
assert(releaseLive(failed, failed.generation).replay.length === 0, 'failure does not replay')

const again = selectSession(failed, 'a')
assert(again.state.queue.length === 0 && again.effects[0]?.type === 'load-history', 'retry clears and reloads')
state = again.state
state = pushEvent(state, 'a', '1').state
state = pushEvent(state, 'a', '2').state
const arrived = historyArrived(state, state.generation, true)
assert(arrived.phase === 'ready' && arrived.queue.length === 0 && !arrived.live, 'history with messages drops the earlier queue')
const held = pushEvent(arrived, 'a', '3')
assert(held.forward === null && held.state.queue.join() === '3', 'events stay queued until replace')
const released = releaseLive(held.state, held.state.generation)
assert(released.replay.join() === '3', 'replay only what arrived after the history body')
assert(released.state.live && released.state.queue.length === 0, 'release forwards from then on')
assert(pushEvent(released.state, 'a', '4').forward === '4', 'forward after history is painted')
const empty = historyArrived(
	pushEvent(selectSession(createTransportState<string>(), 'a').state, 'a', 'kept').state,
	1,
	false,
)
assert(empty.queue.join() === 'kept', 'empty history keeps the queue')
assert(releaseLive(empty, empty.generation).replay.join() === 'kept', 'empty history replays the whole queue')

assert(onSseOpen(released.state, true).effects.length === 0, 'first open does not refetch')
const reopened = onSseOpen(released.state, false)
assert(reopened.effects[0]?.type === 'load-lists', 'reconnect reloads lists')
assert(reopened.effects[1]?.type === 'load-history', 'reconnect reloads history')
assert(reopened.state.queue.length === 0 && !reopened.state.live, 'reconnect clears the queue')

const switched = selectSession(released.state, 'b')
assert(switched.state.openSessionId === 'b' && switched.state.queue.length === 0, 'switch clears the previous queue')
assert(switched.effects[0]?.type === 'load-history', 'switch reloads history')
assert(historyArrived(switched.state, released.state.generation, true) === switched.state, 'stale history is ignored')
const cleared = clearOpenSession(switched.state)
assert(cleared.openSessionId === null && cleared.phase === 'idle' && cleared.queue.length === 0, 'draft clears the open session')
assert(cleared.generation === switched.state.generation + 1, 'draft invalidates in-flight history')
assert(clearOpenSession(cleared) === cleared, 'clearing twice keeps the generation')

const placed = placeNewProject(
	[{ id: 'p2', cwd: '/other', name: 'Other', position: 1, created: '', modified: '' }],
	{ id: 'p3', cwd: '/new', name: 'New', position: 3, created: '', modified: '' },
)
assert(placed[0]?.id === 'p3', 'new project is placed first')
const created = placed[0]
assert(created !== undefined && placeNewProject(placed, created) === placed, 'same cwd is not inserted twice')

const rows = projectRows(
	[
		{ id: 'p1', cwd: '/default', name: 'Registered', position: 2, created: '', modified: '' },
		{ id: 'p2', cwd: '/other', name: 'Other', position: 1, created: '', modified: '' },
	],
	'/default',
	'workspace',
)
assert(rows[0]?.id === 'default' && rows[0].name === 'workspace', 'default workspace stays first')
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
