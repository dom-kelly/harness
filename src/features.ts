type Feature = {
	id: string
	path: string
	summary: string
}

export const features: ReadonlyArray<Feature> = [
	{ id: 'home', path: '/', summary: 'Landing page placeholder.' },
	{ id: 'health', path: '/health', summary: 'Liveness plus deployed git SHA.' },
]
