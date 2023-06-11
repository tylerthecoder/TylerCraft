declare module '!!raw-loader!*' {
	const contents: string
	export = contents
}

declare module '*.glsl' {
	const value: string
	export default value
}