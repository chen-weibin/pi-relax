import { CloseIcon, PlusIcon } from '../icons'
import { Button, type ButtonVariant } from '../ui/Button'
import { Preview } from './frame'

const variants: ButtonVariant[] = ['solid', 'outline', 'ghost']
const sizes = ['sm', 'md', 'lg'] as const

function ButtonDemo() {
	return (
		<div className="flex flex-col gap-6">
			{variants.map((variant) => (
				<div key={variant} className="flex flex-wrap items-end justify-center gap-6">
					{sizes.map((size) => (
						<Preview key={size} label={`${variant} / ${size}`}>
							<Button variant={variant} size={size}>
								按钮
							</Button>
						</Preview>
					))}
				</div>
			))}
			<div className="flex flex-wrap items-end justify-center gap-6">
				{variants.map((variant) => (
					<Preview key={variant} label={`inverse / ${variant}`}>
						<Button tone="inverse" variant={variant}>
							浅色
						</Button>
					</Preview>
				))}
			</div>
			<div className="flex flex-wrap items-end justify-center gap-6">
				<Preview label="前后图标">
					<Button tone="inverse" prefix={<PlusIcon />} suffix={<CloseIcon />}>
						新建
					</Button>
				</Preview>
				<Preview label="禁用">
					<Button disabled>禁用</Button>
				</Preview>
				<Preview label="accent">
					<Button className="bg-accent! text-fg! hover:bg-[color-mix(in_srgb,var(--accent),black_10%)]! active:bg-[color-mix(in_srgb,var(--accent),black_18%)]!">
						绿色
					</Button>
				</Preview>
			</div>
			<figure className="mx-auto flex w-full max-w-xs flex-col gap-2">
				<figcaption className="text-center text-sm text-fg-3">block</figcaption>
				<Button block>整行</Button>
				<Button block tone="inverse" prefix={<PlusIcon />}>
					整行浅色
				</Button>
			</figure>
		</div>
	)
}

export const buttonDoc = {
	id: 'button',
	heading: 'Button',
	description: '带文字的按钮。变体、尺寸（圆角随尺寸变）、neutral / inverse，以及前后图标和整行。accent 是用 className 盖上的主题绿。',
	nav: ['Button'],
	Demo: ButtonDemo,
}
