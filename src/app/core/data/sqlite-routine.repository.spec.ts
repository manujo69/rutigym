import { SqliteService } from './sqlite.service';
import { SqliteRoutineRepository } from './sqlite-routine.repository';

/**
 * Simulates the web driver: every `run` opens a transaction on the single shared connection,
 * so a second `run` that starts while another is open fails the way jeep-sqlite does.
 */
class FakeConnection {
  inTransaction = false;
  failingRuns = 0;

  async run(): Promise<void> {
    if (this.inTransaction) {
      throw new Error('cannot start a transaction within a transaction');
    }
    this.inTransaction = true;
    await new Promise((resolve) => setTimeout(resolve, 2));
    this.inTransaction = false;
    if (this.failingRuns > 0) {
      this.failingRuns -= 1;
      throw new Error('fallo simulado de SQLite');
    }
  }

  query(): Promise<{ values: unknown[] }> {
    return Promise.resolve({ values: [] });
  }
}

class FakeSqlite {
  readonly connection = new FakeConnection();

  getConnection(): Promise<FakeConnection> {
    return Promise.resolve(this.connection);
  }

  persist(): Promise<void> {
    return Promise.resolve();
  }
}

describe('SqliteRoutineRepository writes', () => {
  let sqlite: FakeSqlite;
  let repository: SqliteRoutineRepository;

  beforeEach(() => {
    sqlite = new FakeSqlite();
    repository = new SqliteRoutineRepository(sqlite as unknown as SqliteService);
  });

  it('serializes overlapping writes instead of nesting transactions', async () => {
    // The store saves the series and the last values back to back on every stepper tap.
    const writes = [
      repository.setMeta('ultima-serie', '10'),
      repository.setMeta('ultimo-kg', '20'),
      repository.setMeta('otra-clave', '1'),
    ];

    await expectAsync(Promise.all(writes)).toBeResolved();
  });

  it('keeps accepting writes after one fails', async () => {
    sqlite.connection.failingRuns = 1;

    await expectAsync(repository.setMeta('rota', '1')).toBeRejected();
    await expectAsync(repository.setMeta('sana', '1')).toBeResolved();
  });
});
