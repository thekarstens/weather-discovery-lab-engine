Weather Discovery Lab – Engine v1

Goal:
- One master engine repo
- Separate data pack repos per lesson

Engine Responsibilities:
- Map setup
- UI (banner, story panel, tools)
- Layer loading system
- Mode (beginner/intermediate/advanced)
- Clock system
- Story navigation

Engine Does NOT Contain:
- Hardcoded dates
- Hardcoded file paths
- Event-specific filenames
- Lesson text

Lesson Packs Provide:
- lesson.json
- data paths
- time window
- storyboard
