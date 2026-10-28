import { Paragraph, type ParagraphProps } from './Paragraph'

export type HintProps = Omit<ParagraphProps, 'size'>

export function Hint({ color = 'fg-3', ...rest }: HintProps) {
	return <Paragraph size="sm" color={color} {...rest} />
}
