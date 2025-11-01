Based on my analysis of your project, here are the tasks needed to implement multi-account support for posting to Bluesky and eventually other platforms:

## **Multi-Account Support Implementation Tasks**

### **1. Data Structure Changes**

#### **Account Management Types**

- **Create new types in `src/types/accounts.ts`:**

  ```typescript
  export interface Account {
    id: string
    name: string // User-friendly name like "Personal", "Business"
    platform: SocialPlatform
    credentials: PlatformCredentials
    isActive: boolean
    isDefault?: boolean
    createdAt: string
  }

  export interface PlatformCredentials {
    bluesky?: {
      identifier: string
      password: string
      displayName?: string
    }
    mastodon?: {
      instanceUrl: string
      accessToken: string
      displayName?: string
    }
    // Add more platforms as needed
  }
  ```

#### **Update Existing Types**

- **Modify `Settings` interface in types.ts:**

  - Remove single account fields (`bskyIdentifier`, `bskyPassword`, `bskyDisplayName`)
  - Add `accounts: Account[]` field
  - Add `defaultAccountId?: string` field

- **Update `Schedule` interface in scheduler.ts:**
  - Change `platforms: SocialPlatform[]` to `accounts: { accountId: string, platforms: SocialPlatform[] }[]`
  - This allows different accounts per platform per schedule

### **2. Settings & Configuration Updates**

#### **Settings Service Refactor**

- **Update SettingsService.ts:**
  - Add account management functions: `addAccount()`, `updateAccount()`, `deleteAccount()`, `getAccounts()`
  - Migrate existing single Bluesky credentials to first account during upgrade
  - Add account validation logic

#### **Configuration Changes**

- **Update main.ts:**
  - Keep existing environment variables for backward compatibility during migration
  - Add `SUPPORTED_SOCIAL_PLATFORMS` to include `['bluesky', 'mastodon', 'threads', 'linkedin']`

### **3. Authentication System Overhaul**

#### **Platform-Specific Authentication Services**

- **Create `src/app/api-helpers/auth/` directory with:**
  - `BlueskyAuth.ts` - Move current Bluesky logic here, modify to work with Account objects
  - `MastodonAuth.ts` - New Mastodon authentication
  - `AuthManager.ts` - Central authentication manager that routes to platform-specific auth

#### **Update Bluesky Helper**

- **Modify bluesky.ts:**
  - Change `createAgent()` to accept `Account` parameter instead of using global settings
  - Update `getAgent()` to work with specific accounts
  - Add account-specific agent caching (`Map<accountId, AtpAgent>`)

### **4. UI/UX Changes**

#### **Account Management Interface**

- **Create new pages/components:**
  - page.tsx - Account listing and management
  - page.tsx - Add new account
  - page.tsx - Edit account
  - `src/components/AccountSelector.tsx` - Dropdown for selecting accounts
  - `src/components/AccountList.tsx` - List accounts with status

#### **Settings Page Updates**

- **Update SettingsForm.tsx:**
  - Remove single account fields
  - Add account management section
  - Add migration helper for existing users

#### **Schedule Management Updates**

- **Update ScheduleEditForm.tsx:**
  - Replace platform selection with account + platform selection
  - Add account validation (ensure account supports selected platforms)

#### **Navigation Updates**

- **Update frontend.ts:**
  - Add "Accounts" to `HEADER_NAV_ITEMS`

### **5. Posting System Refactor**

#### **Platform Abstraction**

- **Create `src/app/api/services/platforms/` directory:**
  - `PlatformInterface.ts` - Abstract interface for all platforms
  - `BlueskyPlatform.ts` - Bluesky implementation
  - `MastodonPlatform.ts` - Mastodon implementation
  - `PlatformFactory.ts` - Factory to get platform instances

#### **Draft Publishing Updates**

- **Update DraftPostService.ts:**
  - Modify `publishDraftPost()` to accept account IDs instead of platform names
  - Update `sendToSocialPlatform()` to use account-specific authentication
  - Add cross-posting logic for multiple accounts

#### **Schedule Posting Updates**

- **Update SchedulePostService.ts:**
  - Modify `publishNextPost()` to handle multiple accounts per schedule
  - Add account availability checking before posting
  - Add per-account error handling and retry logic

### **6. API Route Updates**

#### **New Account API Routes**

- **Create `src/app/api/accounts/` directory:**
  - route.ts - GET (list accounts), POST (create account)
  - route.ts - GET, PUT, DELETE for specific accounts
  - route.ts - Test account connection

#### **Update Existing Routes**

- **Modify posting routes to accept account parameters:**
  - route.ts
  - route.ts (for publishing)

### **7. Migration & Backward Compatibility**

#### **Data Migration**

- **Create `src/app/api/services/MigrationService.ts`:**
  - Detect old single-account settings
  - Migrate existing Bluesky credentials to first Account object
  - Preserve existing schedules with new account structure
  - Add migration status tracking

#### **Settings Migration**

- **Update app initialization to run migration:**
  - Check if migration needed on startup
  - Provide UI feedback during migration
  - Handle migration errors gracefully

### **8. Platform Integration - Mastodon**

#### **Mastodon API Integration**

- **Create `src/app/api-helpers/mastodon.ts`:**
  - Authentication with OAuth2
  - Post creation with media upload
  - Account information retrieval
  - Error handling specific to Mastodon API

#### **Mastodon Configuration**

- **Add Mastodon-specific settings:**
  - Instance URL selection
  - OAuth app registration handling
  - Rate limiting configuration

### **9. Error Handling & Logging**

#### **Account-Specific Error Handling**

- **Update error handling throughout:**
  - Account-specific error messages
  - Platform-specific error codes
  - Account status tracking (active/inactive based on errors)

#### **Enhanced Logging**

- **Update logger.ts:**
  - Add account context to log messages
  - Platform-specific log formatting
  - Account-specific log filtering

### **10. Testing Updates**

#### **Update Existing Tests**

- **Modify all existing tests to work with accounts:**
  - DraftPostService.test.ts
  - SchedulePostService.test.ts
  - bluesky.test.ts

#### **New Test Suites**

- **Create tests for new functionality:**
  - Account management service tests
  - Platform factory tests
  - Migration service tests
  - Multi-platform posting tests

### **11. Security Considerations**

#### **Credential Storage**

- **Enhance encryption for multiple credentials:**
  - Per-account credential encryption
  - Secure credential migration
  - Account credential validation

#### **API Security**

- **Add account-based authorization:**
  - Ensure users can only access their own accounts
  - Validate account ownership for posting operations

---

## **Implementation Priority**

1. **Phase 1:** Data structures and basic account management (Tasks 1-2)
2. **Phase 2:** Authentication system overhaul (Task 3)
3. **Phase 3:** UI for account management (Task 4)
4. **Phase 4:** Posting system refactor (Task 5)
5. **Phase 5:** Migration and API updates (Tasks 6-7)
6. **Phase 6:** Platform expansion (Task 8)
7. **Phase 7:** Polish and testing (Tasks 9-11)

This represents a significant architectural change that will enable your app to scale to multiple accounts across multiple platforms while maintaining backward compatibility.
