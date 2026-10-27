import classNames from 'classnames'
import { Fragment, useEffect, useRef, useState } from 'react'
import { uiDocGroups, uiDocSections } from '../uidoc/catalog'
import './Ui.css'

function nearestLabel(sectionId: string): string | null {
	const heading = document.getElementById(sectionId)
	const links = [...document.querySelectorAll<HTMLAnchorElement>(`nav a[href="#${sectionId}"]`)]
	if (links.length === 0) return null
	if (!heading) return links[0].dataset.label ?? null
	const y = heading.getBoundingClientRect().top
	let best = links[0]
	let bestDist = Infinity
	for (const link of links) {
		const dist = Math.abs(link.getBoundingClientRect().top - y)
		if (dist < bestDist) {
			best = link
			bestDist = dist
		}
	}
	return best.dataset.label ?? null
}

export function UiPage() {
	const mainRef = useRef<HTMLElement>(null)
	const activeIdRef = useRef(window.location.hash.slice(1) || uiDocSections[0]?.id)
	const [activeId, setActiveId] = useState(activeIdRef.current)
	const [activeLabel, setActiveLabel] = useState<string | null>(null)

	useEffect(() => {
		const root = mainRef.current
		if (!root) return

		const id = window.location.hash.slice(1)
		if (id) document.getElementById(id)?.scrollIntoView()

		const follow = (sectionId: string) => {
			const label = nearestLabel(sectionId)
			if (!label) return
			setActiveLabel((prev) => (prev === label ? prev : label))
		}
		follow(activeIdRef.current)

		const visible = new Map<string, IntersectionObserverEntry>()
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) visible.set(entry.target.id, entry)
					else visible.delete(entry.target.id)
				}
				const top = [...visible.values()].sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
				if (!top) return
				activeIdRef.current = top.target.id
				setActiveId(top.target.id)
				follow(top.target.id)
			},
			{ root, rootMargin: '-8% 0px -55% 0px', threshold: 0 },
		)
		for (const section of uiDocSections) {
			const node = document.getElementById(section.id)
			if (node) observer.observe(node)
		}

		const onScroll = () => follow(activeIdRef.current)
		root.addEventListener('scroll', onScroll, { passive: true })
		return () => {
			observer.disconnect()
			root.removeEventListener('scroll', onScroll)
		}
	}, [])

	return (
		<div className="flex h-full bg-app text-fg">
			<nav className="ui-doc-nav w-[220px] shrink-0 overflow-y-auto px-4 py-8">
				{uiDocGroups.map((group) => (
					<div key={group.title} className="mt-6 first:mt-0">
						<div className="px-2 text-sm text-fg-2">{group.title}</div>
						<ul className="mt-1 flex flex-col items-start gap-0.5">
							{group.sections.flatMap((section) =>
								section.nav.map((label) => {
									const active = section.id === activeId && label === activeLabel
									return (
										<li key={label} className="max-w-full">
											<a
												href={`#${section.id}`}
												data-label={label}
												aria-current={active ? 'true' : undefined}
												className={classNames(
													'inline-block max-w-full rounded-md px-2 py-1.5 text-base transition-colors duration-150',
													active
														? 'bg-surface text-fg-bright'
														: 'text-fg hover:bg-surface-hover',
												)}
												onClick={(event) => {
													event.preventDefault()
													activeIdRef.current = section.id
													setActiveId(section.id)
													setActiveLabel(label)
													document.getElementById(section.id)?.scrollIntoView({
														behavior: 'smooth',
														block: 'start',
													})
													history.replaceState(null, '', `#${section.id}`)
												}}
											>
												{label}
											</a>
										</li>
									)
								}),
							)}
						</ul>
					</div>
				))}
			</nav>
			<div aria-hidden className="my-8 w-px shrink-0 bg-border" />
			<main ref={mainRef} className="min-w-0 flex-1 overflow-y-auto scroll-smooth px-10 py-8">
				<div className="mx-auto flex w-full max-w-3xl flex-col">
					{uiDocSections.map((section, index) => (
						<Fragment key={section.id}>
							{index > 0 && (
								<div className="py-16" aria-hidden>
									<div className="h-px w-full bg-border-hover" />
								</div>
							)}
							<section id={section.id} className="scroll-mt-8">
								<h2 className="text-2xl text-fg">{section.heading}</h2>
								<p className="mt-3 text-base leading-relaxed text-fg-2">{section.description}</p>
								<div className="mt-6 flex min-h-64 items-center justify-center rounded-xl border border-border-hover px-8 py-12">
									<div className="w-full">
										<section.Demo />
									</div>
								</div>
							</section>
						</Fragment>
					))}
				</div>
			</main>
		</div>
	)
}
