import { NumberStepper } from '../ui/NumberStepper'
import { Preview } from './frame'

function NumberStepperDemo() {
	return (
		<Preview label="0–8">
			<NumberStepper defaultValue={2} min={0} max={8} ariaLabel="数量" />
		</Preview>
	)
}

export const numberStepperDoc = {
	id: 'number-stepper',
	heading: 'NumberStepper',
	description: '圆角数字步进。这里限制在 0 到 8。',
	nav: ['NumberStepper'],
	Demo: NumberStepperDemo,
}
