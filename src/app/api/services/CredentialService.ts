import Logger from '@/app/api-helpers/logger'
import { CREDENTIALS_FILE } from '@/config/main'
import type { Account, Credentials } from '@/types/accounts'
import {
  checkIfExists,
  readEncryptedText,
  writeEncryptedFile,
} from './FileService'

const logger = new Logger('CredentialService')

type CredentialsStorage = Record<string, Credentials>

export class CredentialService {
  private static instance: CredentialService
  private credentialsCache: CredentialsStorage | null = null

  private constructor() {}

  public static getInstance(): CredentialService {
    if (!CredentialService.instance) {
      CredentialService.instance = new CredentialService()
    }
    return CredentialService.instance
  }

  private async loadCredentials(): Promise<CredentialsStorage> {
    // if (this.credentialsCache !== null) {
    //   return this.credentialsCache
    // }

    try {
      const exists = await checkIfExists(CREDENTIALS_FILE)
      if (!exists) {
        logger.log('Credentials file does not exist, creating empty storage')
        this.credentialsCache = {}
        await this.saveCredentials(this.credentialsCache)
        return this.credentialsCache
      }

      const encryptedContent = await readEncryptedText(CREDENTIALS_FILE)
      if (!encryptedContent) {
        logger.log('Credentials file is empty, initializing empty storage')
        this.credentialsCache = {}
        return this.credentialsCache
      }

      this.credentialsCache = JSON.parse(encryptedContent) as CredentialsStorage
      logger.log('Credentials loaded successfully')
      return this.credentialsCache
    } catch (error) {
      logger.error('Failed to load credentials', error)
      throw new Error('Failed to load credentials from storage')
    }
  }

  private async saveCredentials(
    credentials: CredentialsStorage,
  ): Promise<void> {
    try {
      await writeEncryptedFile(
        CREDENTIALS_FILE,
        JSON.stringify(credentials, null, 2),
      )
      this.credentialsCache = credentials
      logger.log('Credentials saved successfully')
    } catch (error) {
      logger.error('Failed to save credentials', error)
      throw new Error('Failed to save credentials to storage')
    }
  }

  /**
   * Get credentials for a specific account
   */
  public async getCredentials(account: Account): Promise<Credentials | null> {
    try {
      const storage = await this.loadCredentials()
      const credentials = storage[account.id]

      if (!credentials) {
        logger.log(
          `No credentials found for account ${account.id} (${account.name})`,
        )
        return null
      }

      logger.log(
        `Retrieved credentials for account ${account.id} (${account.name})`,
      )
      return credentials
    } catch (error) {
      logger.error(`Failed to get credentials for account ${account.id}`, error)
      throw error
    }
  }

  /**
   * Set credentials for a specific account
   */
  public async setCredentials(
    account: Account,
    credentials: Credentials,
  ): Promise<void> {
    try {
      const storage = await this.loadCredentials()
      storage[account.id] = credentials

      await this.saveCredentials(storage)
      logger.log(`Credentials set for account ${account.id} (${account.name})`)
    } catch (error) {
      logger.error(`Failed to set credentials for account ${account.id}`, error)
      throw error
    }
  }

  /**
   * Remove credentials for a specific account
   */
  public async removeCredentials(account: Account): Promise<void> {
    try {
      const storage = await this.loadCredentials()
      delete storage[account.id]

      await this.saveCredentials(storage)
      logger.log(
        `Credentials removed for account ${account.id} (${account.name})`,
      )
    } catch (error) {
      logger.error(
        `Failed to remove credentials for account ${account.id}`,
        error,
      )
      throw error
    }
  }

  /**
   * Check if credentials exist for a specific account
   */
  public async hasCredentials(account: Account): Promise<boolean> {
    try {
      const credentials = await this.getCredentials(account)
      return credentials !== null
    } catch (error) {
      logger.error(
        `Failed to check credentials for account ${account.id}`,
        error,
      )
      return false
    }
  }

  /**
   * Get all account IDs that have stored credentials
   */
  public async getAccountsWithCredentials(): Promise<string[]> {
    try {
      const storage = await this.loadCredentials()
      return Object.keys(storage)
    } catch (error) {
      logger.error('Failed to get accounts with credentials', error)
      throw error
    }
  }

  /**
   * Clear all credentials (useful for testing or reset operations)
   */
  public async clearAllCredentials(): Promise<void> {
    try {
      await this.saveCredentials({})
      logger.log('All credentials cleared')
    } catch (error) {
      logger.error('Failed to clear all credentials', error)
      throw error
    }
  }

  /**
   * Clear the cache (force reload from disk on next access)
   */
  public clearCache(): void {
    this.credentialsCache = null
    logger.log('Credentials cache cleared')
  }
}

// Export singleton instance
export default CredentialService.getInstance()
