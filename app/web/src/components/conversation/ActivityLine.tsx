import { FlipText } from '../../ui/FlipText'

export function ActivityLine({ label, onLocate }: { label: string; onLocate?: () => void }) {
	return (
		<button type="button" onClick={onLocate} className="w-fit text-left text-base">
			<FlipText text={label} shimmer />
		</button>
	)
}
