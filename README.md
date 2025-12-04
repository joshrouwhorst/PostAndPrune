# Post & Prune

**Local backup, drafts & scheduling for open social media**

A Next.js application for viewing and managing your [Bluesky](https://bsky.app)
social media backup data and other open social media platforms (coming soon), create draft posts,
and schedule them to be published, all **local** and **private**.

## Project Overview

**Backup**

- Backup your Bluesky account locally
- Prune posts older than a given deadline
- Repost previously pruned posts (coming soon)

**Scheduling**

- Create drafts of posts and group them for scheduling (data all stored on local
  file system)
- Create schedules to publish from the draft post groups
  - This allows you to create a group of "Mundaine Monday" posts and schedule
    them to post every week on a Monday.
- Sort upcoming drafts so they post in the order you want

This app reads your Bluesky backup files and displays them in a clean,
browseable interface. You can create schedules and have posts automatically
sent (assuming you are continuously running this application).

## Quick Start

Make sure your `.env` file in the root of the project has this variable:

```txt
APP_DATA_ENCRYPTION_KEY='your value here'
```

APP_DATA_ENCRYPTION_KEY is an encryption key for encoding settings including
social media credentials for the app. For maximum security it should be 32
characters long.

You can also set a specific default data location for the project. This is
useful for local development if you have multiple accounts you're testing with.
You can have a different directory for each one. Set this default directory in
your `.env` file. If it does not exist, it should be created automatically.

```txt
DEFAULT_DATA_LOCATION="/Users/me/BskyBackup/data"
```

Also, if you want to make sure you don't accidentally post or delete to the live
account, you can set this in your `.env` file.

```txt
PREVENT_POSTING="true"
```

Install dependencies:

```shell
npm i
```

Run the development server:

```shell
npm run dev
```

Open [https://localhost:3000](https://localhost:3000) in your browser.

You should be redirected to
[https://localhost:3000/settings](https://localhost:3000/settings) until you
input required information for setup such as adding an account. Credentials are
encrypted on your filesystem and never sent to a third party.

### Bluesky Accounts

I recommend setting up an app password specifically for this. On the Bluesky app
you can go to Settings -> Privacy & Security -> App passwords to generate one.
There is no need to enable direct messages access at this time.

## Migrations

This application uses [Umzug](https://github.com/sequelize/umzug) to manage database schema and application data migrations. In Docker environments, migrations are automatically run during container startup. For development, you can also manage them manually using the CLI.

### Docker Container Startup (Production)

When running in a Docker container, the startup process is:

1. **Run Migrations**: Execute any pending migrations using `npm run migration:up`
2. **Start Application**: Launch the Next.js application with `npm start`
3. **Initialize Services**: Call `/api/util?action=init` to initialize background services
4. **Health Check**: Container reports healthy status once fully operational

This process is handled automatically by the Docker entrypoint script.

### Development Migration Management

#### Check Migration Status

View which migrations have been executed and which are pending:

```shell
npm run migration:status
```

#### Run Pending Migrations

Execute all pending migrations manually (development only):

```shell
npm run migration:up
```

#### Rollback Last Migration

Rollback the most recently executed migration (development only):

```shell
npm run migration:down
```

⚠️ **Warning**: Only rollback migrations if you understand the consequences. Data loss may occur.

#### Create New Migration

Generate a new migration file:

```shell
npm run migration:create "add user preferences"
```

This creates a new migration file in `src/migrations/files/` with the timestamp and name.

### Migration File Structure

Each migration file exports `up` and `down` functions:

```typescript
import type { MigrationContext } from '../umzug.js'

export async function up({ service }: MigrationContext) {
  console.log('Running migration: Add user preferences')
  
  // Get current app data
  const appData = await service.getAppData()
  
  // Modify data structure
  if (appData?.settings) {
    appData.settings.userPreferences = {
      theme: 'light',
      notifications: true
    }
  }
  
  // Save changes
  await service.saveAppData(appData)
  console.log('Added user preferences to app data')
}

export async function down({ service }: MigrationContext) {
  console.log('Rolling back migration: Add user preferences')
  
  const appData = await service.getAppData()
  
  // Remove the changes
  if (appData?.settings?.userPreferences) {
    delete appData.settings.userPreferences
  }
  
  await service.saveAppData(appData)
  console.log('Removed user preferences from app data')
}
```

### Migration Context

The `service` object provides methods to:

- `service.getAppData()` - Get current application data
- `service.saveAppData(data)` - Save modified application data
- `service.isPreviousVersionLessThan(version)` - Version comparison helpers
- `service.compareVersions(v1, v2)` - Compare semantic versions

### Migration Storage

Migration state is tracked in:

- **`.migrations.json`** - Records which migrations have been executed
- **`.app-version.json`** - Tracks application version changes

These files are automatically created and managed. Do not edit them manually.

### Best Practices

1. **Test Migrations**: Always test both `up` and `down` functions
2. **Backup Data**: Consider backing up critical data before major migrations
3. **Atomic Operations**: Keep migrations focused on single changes
4. **Version Checks**: Use version comparison helpers for conditional logic
5. **Error Handling**: Migrations will automatically stop on errors

### Troubleshooting

**Migration Failed in Development**
```shell
❌ Migration 20251201_example.ts failed: Error message
```
- Check the error message and fix the migration file
- Migrations stop on first failure to prevent data corruption

**Migration Failed in Docker**
- Check container logs: `docker logs <container_name>`
- Container will exit if migrations fail during startup
- Fix the migration and rebuild the container

**Module Not Found Errors**
- Ensure all imports use relative paths with `.js` extensions
- Check that imported files exist and are properly exported

## Unit Testing

This project uses Jest for unit testing.

Make sure you have all dependencies installed:

```sh
npm install
```

Run the tests with:

```sh
npm run test
```

Test files are located alongside source files, typically in `__tests__`
directories (e.g., `src/app/api/helpers/__tests__/`).

If you add new features, consider adding or updating test files to cover your
changes. For more information on Jest configuration, see `jest.config.ts`.

## Docker

[Docker Hub Repository](https://hub.docker.com/r/joshrouwhorst/bsky-backup)

Make sure to map the directory you want your backup and draft data to live in
to `/app/data` when creating your container.

ARM:

```shell
docker buildx build --platform linux/arm64 --load -t local/bsky-backup:latest .
```

AMD:

```shell
docker buildx build --platform linux/amd64 --load -t local/bsky-backup:latest .
```

## Important File Locations

### Configuration

- **Config**: `/src/config.ts` - Backup paths and API credentials
- **Types**: `/src/types.ts` - TypeScript interfaces for Bluesky data

### Core Components

- **Main Page**: `/src/app/page.tsx` - Entry point, renders PostList
- **PostList**: `/src/components/PostList.tsx` - Main feed component with compound ToolBar
- **Post**: `/src/components/Post.tsx` - Individual post display
- **EmbedCarousel**: `/src/components/EmbedCarousel.tsx` - Image gallery component

### Data Layer

- **Backup Service**: `/src/app/api/services/BackupService.ts` - File operations and data processing
- **Bluesky Helper**: `/src/app/api/helpers/bluesky.ts` - API interactions and post management
- **Transform Helper**: `/src/helpers/transformFeedViewPostToPostData.tsx` - Data transformation utilities

### API Routes

- **Image Server**: `/src/app/api/images/[...path]/route.ts` - Serves local backup images
- **Backup API**: `/src/app/api/backup/route.ts` - Backup operations
- **Prune API**: `/src/app/api/prune/route.ts` - Delete old posts

## Key Features

### 📁 Local File Access

- Reads backup from: `~/Library/Mobile Documents/com~apple~CloudDocs/Bluesky Backup/backup/`
- Serves images through `/api/images/` endpoint
- Handles both local and remote image fallbacks

### 🔧 Post Management

- View all posts with metadata
- Filter by replies, media, date ranges
- Prune old posts directly from the interface
- Backup current posts

### 🎨 UI Components

- Lazy loading images with fallbacks
- Responsive design with Tailwind CSS

## Usage Patterns

### Viewing Posts

```tsx
// Main page renders both components
<ToolBar />
<PostList />
```

### Adding Filters

```tsx
// In your components, use the context
const { posts, isLoading, filters } = useBskyBackupContext()
```

### Serving Images

```tsx
// Images are automatically served through the API
<img src={`/api/images/${localImagePath}`} />
```

## Development Notes

### File Structure

```txt
src/
├── app/
│   ├── api/                 # API routes
│   ├── page.tsx            # Main page
│   └── layout.tsx          # Root layout
├── components/             # React components
├── helpers/               # Data transformation
├── types.ts              # TypeScript definitions
└── config.ts             # Configuration
```

### Important Patterns

- **Server Components**: Main page fetches data at build time
- **Client Components**: Interactive UI marked with `'use client'`
- **Compound Components**: `PostList.ToolBar` pattern for related components
- **Type Safety**: Full TypeScript coverage for Bluesky data structures

### Troubleshooting

- **Image 404s**: Check backup path in config and API route logs
- **Type Errors**: Ensure proper imports from `/types.ts`
- **Auth Errors**: Verify Bluesky credentials in config

## Tech Stack

- **Next.js 15+** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **@atproto/api** - Bluesky API client

## Future Enhancements

- [ ] Multiple accounts
- [ ] Reposting deleted posts
  - [ ] Repost to previous datetime
  - [ ] Repost as new post. Duplicate?
- [ ] Advanced filtering for backup and drafts
- [ ] Post search functionality
- [ ] Export options
- [ ] Statistics dashboard
- [ ] Automated backup scheduling
- [ ] Mastodon support
