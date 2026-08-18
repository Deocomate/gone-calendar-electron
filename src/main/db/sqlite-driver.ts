import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export interface ISqliteRunResult {
  changes: number
  lastInsertRowid: number | bigint
}

export interface ISqliteStatement {
  run(...params: any[]): ISqliteRunResult
  get<T = any>(...params: any[]): T | undefined
  all<T = any>(...params: any[]): T[]
}

export interface ISqliteDatabase {
  exec(sql: string): void
  prepare(sql: string): ISqliteStatement
  transaction<T>(fn: () => T): () => T
  close(): void
}

/**
 * Universal driver wrapper that prefers node:sqlite (DatabaseSync)
 * and falls back to better-sqlite3 if node:sqlite is not bundled.
 */
export function createSqliteDriver(dbPath: string): ISqliteDatabase {
  if (dbPath !== ':memory:') {
    const dir = dirname(dbPath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }

  // 1. Try node:sqlite (Node 22.5+ / modern Electron)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DatabaseSync } = require('node:sqlite')
    const rawDb = new DatabaseSync(dbPath)

    // Configure WAL and foreign keys
    if (dbPath !== ':memory:') {
      rawDb.exec('PRAGMA journal_mode = WAL;')
    }
    rawDb.exec('PRAGMA foreign_keys = ON;')

    let txnDepth = 0

    const driver: ISqliteDatabase = {
      exec(sql: string): void {
        rawDb.exec(sql)
      },
      prepare(sql: string): ISqliteStatement {
        const stmt = rawDb.prepare(sql)
        return {
          run(...params: any[]): ISqliteRunResult {
            const res = stmt.run(...params)
            return {
              changes: Number(res.changes || 0),
              lastInsertRowid: res.lastInsertRowid ?? 0
            }
          },
          get<T = any>(...params: any[]): T | undefined {
            return stmt.get(...params) as T | undefined
          },
          all<T = any>(...params: any[]): T[] {
            return stmt.all(...params) as T[]
          }
        }
      },
      transaction<T>(fn: () => T): () => T {
        return () => {
          txnDepth++
          const savepointName = `sp_${Date.now()}_${txnDepth}`
          if (txnDepth === 1) {
            rawDb.exec('BEGIN')
          } else {
            rawDb.exec(`SAVEPOINT ${savepointName}`)
          }

          try {
            const result = fn()
            if (txnDepth === 1) {
              rawDb.exec('COMMIT')
            } else {
              rawDb.exec(`RELEASE SAVEPOINT ${savepointName}`)
            }
            return result
          } catch (innerError) {
            if (txnDepth === 1) {
              rawDb.exec('ROLLBACK')
            } else {
              rawDb.exec(`ROLLBACK TO SAVEPOINT ${savepointName}`)
            }
            throw innerError
          } finally {
            txnDepth--
          }
        }
      },
      close(): void {
        rawDb.close()
      }
    }

    return driver
  } catch (nodeSqliteErr) {
    console.warn('node:sqlite not available, falling back to better-sqlite3:', nodeSqliteErr)

    // 2. Fallback to better-sqlite3
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const BetterSqlite3 = require('better-sqlite3')
      const rawDb = new BetterSqlite3(dbPath)

      if (dbPath !== ':memory:') {
        rawDb.pragma('journal_mode = WAL')
      }
      rawDb.pragma('foreign_keys = ON')

      const driver: ISqliteDatabase = {
        exec(sql: string): void {
          rawDb.exec(sql)
        },
        prepare(sql: string): ISqliteStatement {
          const stmt = rawDb.prepare(sql)
          return {
            run(...params: any[]): ISqliteRunResult {
              const res = stmt.run(...params)
              return {
                changes: res.changes,
                lastInsertRowid: res.lastInsertRowid
              }
            },
            get<T = any>(...params: any[]): T | undefined {
              return stmt.get(...params) as T | undefined
            },
            all<T = any>(...params: any[]): T[] {
              return stmt.all(...params) as T[]
            }
          }
        },
        transaction<T>(fn: () => T): () => T {
          return rawDb.transaction(fn)
        },
        close(): void {
          rawDb.close()
        }
      }

      return driver
    } catch (betterSqliteErr) {
      throw new Error(
        `Failed to initialize SQLite driver. node:sqlite error: ${nodeSqliteErr}; better-sqlite3 error: ${betterSqliteErr}`
      )
    }
  }
}
