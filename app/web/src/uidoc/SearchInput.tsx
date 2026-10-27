import { SearchInput, type SearchInputVariant } from '../ui/SearchInput'
import { Preview } from './frame'

const variants: SearchInputVariant[] = ['bordered', 'borderless', 'ghost']

function SearchInputDemo() {
	return (
		<div className="grid gap-4">
			{variants.map((variant) => (
				<Preview key={variant} label={variant}>
					<SearchInput variant={variant} placeholder="搜索" className="w-56" />
				</Preview>
			))}
		</div>
	)
}

export const searchInputDoc = {
	id: 'search-input',
	heading: 'SearchInput',
	description: '搜索框的三种外观：bordered、borderless、ghost。',
	nav: ['SearchInput'],
	Demo: SearchInputDemo,
}
