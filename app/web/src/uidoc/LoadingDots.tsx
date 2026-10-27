import { LoadingDots, type LoadingDotsVariant } from '../ui/LoadingDots'
import { Preview } from './frame'

const variants: LoadingDotsVariant[] = ['bounce', 'fade', 'pulse']

function LoadingDotsDemo() {
	return (
		<div className="grid grid-cols-3 gap-4">
			{variants.map((variant) => (
				<Preview key={variant} label={variant}>
					<LoadingDots variant={variant} />
				</Preview>
			))}
		</div>
	)
}

export const loadingDotsDoc = {
	id: 'loading-dots',
	heading: 'LoadingDots',
	description: '三个点的加载动效。bounce、fade、pulse 并排。',
	nav: ['LoadingDots'],
	Demo: LoadingDotsDemo,
}
