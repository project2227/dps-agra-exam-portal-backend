// Prepare an empty database at build time. It contains no users or secrets.
import {PGlite} from '@electric-sql/pglite'
import {citext} from '@electric-sql/pglite/contrib/citext'
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto'
import {writeFile} from 'node:fs/promises'
if(process.env.DPS_DISPOSABLE_STAGE!=='true'||process.env.DATABASE_URL!=='postgres://disposable-ai-stage-only')throw Error('Only the disposable stage may prepare this database.')
const pg=new PGlite({extensions:{citext,pgcrypto},postgresqlconf:['shared_buffers=16MB','work_mem=1MB','maintenance_work_mem=8MB']})
await pg.waitReady
const archive=await pg.dumpDataDir('gzip')
await writeFile(new URL('../.disposable-ai-stage.tgz',import.meta.url),new Uint8Array(await archive.arrayBuffer()))
await pg.close()
console.log('[staging] Empty disposable database prepared during the build.')
