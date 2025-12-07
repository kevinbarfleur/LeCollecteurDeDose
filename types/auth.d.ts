declare module '#auth-utils' {
  interface User {
    id: string
    login: string
    displayName: string
    email?: string
    avatar: string
  }

  interface UserSession {
    loggedInAt: number
  }
}

export {}

