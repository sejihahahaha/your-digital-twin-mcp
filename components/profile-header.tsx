export function ProfileHeader() {
  return (
    <div className="border-b border-border bg-card px-6 py-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-card-foreground">
            Chat with Krystel
          </h1>
          <p className="text-sm text-muted-foreground">
            Ask me about my experience, projects, and background
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium text-primary">Active</span>
        </div>
      </div>
    </div>
  )
}
