import './styles/light.css'

export type MdEditorTheme = 'light'

export function MdEditor({ theme = 'light' }: { theme?: MdEditorTheme }) {
	return (
		<div className="min-h-4" data-theme={theme}>
			md-editor
		</div>
	)
}
