/**
 * Type shims for @masonrykit/browser
 *
 * These declarations help avoid "missing module" errors for common non-code assets
 * that downstream apps might import alongside layout code. They are intentionally
 * minimal and do not leak globals.
 */

declare module '*.css' {
  const classes: Record<string, string>
  export default classes
}
declare module '*.scss' {
  const classes: Record<string, string>
  export default classes
}
declare module '*.sass' {
  const classes: Record<string, string>
  export default classes
}
declare module '*.less' {
  const classes: Record<string, string>
  export default classes
}

declare module '*.svg' {
  const src: string
  export default src
}

declare module '*.png' {
  const src: string
  export default src
}
declare module '*.jpg' {
  const src: string
  export default src
}
declare module '*.jpeg' {
  const src: string
  export default src
}
declare module '*.gif' {
  const src: string
  export default src
}
declare module '*.webp' {
  const src: string
  export default src
}
declare module '*.avif' {
  const src: string
  export default src
}

export {}
